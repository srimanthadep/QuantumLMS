import type { FastifyInstance, FastifyRequest } from "fastify"
import type { WebSocket } from "ws"
import { eq } from "drizzle-orm"
import { support_tickets } from "./db/schema.js"
import type { AuthUser } from "./auth/users.js"
import { authenticate, me } from "./http.js"
import { forbidden } from "./errors.js"
import type { AppContext } from "./context.js"

export interface WsMessagePayload {
  action: "subscribe" | "unsubscribe" | "publish" | "ping"
  channel?: string
  event?: string
  payload?: any
  sender?: {
    id?: string
    name?: string
    role?: string
  }
}

// Global active subscriptions map
// channelName -> Set of WebSocket clients
const channelSubscribers = new Map<string, Set<WebSocket>>()
// client -> Set of channels it subscribed to
const clientSubscriptions = new Map<WebSocket, Set<string>>()

/**
 * Broadcast an event to all clients subscribed to a given channel.
 */
export function broadcastToChannel(channel: string, event: string, payload: any, sender?: any) {
  const subscribers = channelSubscribers.get(channel)
  if (!subscribers || subscribers.size === 0) return

  const message = JSON.stringify({
    channel,
    event,
    payload: channel === "evaluators" ? { refresh: true } : payload,
    sender,
    timestamp: new Date().toISOString(),
  })

  for (const client of subscribers) {
    if (client.readyState === 1 /* OPEN */) {
      try {
        client.send(message)
      } catch {
        // Cleaned up on socket close/error
      }
    }
  }
}

/**
 * Subscribe a socket to a channel.
 */
export function subscribeToChannel(socket: WebSocket, channel: string) {
  if (!channelSubscribers.has(channel)) {
    channelSubscribers.set(channel, new Set())
  }
  channelSubscribers.get(channel)!.add(socket)

  if (!clientSubscriptions.has(socket)) {
    clientSubscriptions.set(socket, new Set())
  }
  clientSubscriptions.get(socket)!.add(channel)
}

/**
 * Unsubscribe a socket from a channel.
 */
export function unsubscribeFromChannel(socket: WebSocket, channel: string) {
  const subs = channelSubscribers.get(channel)
  if (subs) {
    subs.delete(socket)
    if (subs.size === 0) channelSubscribers.delete(channel)
  }

  clientSubscriptions.get(socket)?.delete(channel)
}

/**
 * Clean up all channel subscriptions for a disconnected socket.
 */
export function cleanupSocket(socket: WebSocket) {
  const channels = clientSubscriptions.get(socket)
  if (channels) {
    for (const ch of channels) {
      const subs = channelSubscribers.get(ch)
      if (subs) {
        subs.delete(socket)
        if (subs.size === 0) channelSubscribers.delete(ch)
      }
    }
    clientSubscriptions.delete(socket)
  }
}

/**
 * Get active connection statistics.
 */
export function getWsStats() {
  let totalSubscribers = 0
  for (const set of channelSubscribers.values()) {
    totalSubscribers += set.size
  }
  return {
    activeSockets: clientSubscriptions.size,
    totalChannels: channelSubscribers.size,
    channelList: Array.from(channelSubscribers.keys()),
    totalSubscribers,
  }
}

/**
 * Register WebSocket routes on Fastify.
 */
export async function canSubscribe(ctx: AppContext, user: AuthUser, channel: string): Promise<boolean> {
  if (channel === `user:${user.id}` || channel === `chat:${user.id}`) return true
  if (channel === "evaluators") return user.role === "Evaluator"
  if (channel === "notifications") return ["Admin", "Super Admin"].includes(user.role)
  if (channel.startsWith("chat:") && channel.length <= 150) {
    if (["Support", "Admin", "Super Admin"].includes(user.role)) return true
    const id = channel.slice(5)
    const ticket = await ctx.db.query.support_tickets.findFirst({ where: eq(support_tickets.id, id) })
    return ticket?.student_id === user.id
  }
  return false
}

export async function wsRoutes(app: FastifyInstance, ctx: AppContext) {
  const connections = new Map<string, number>()
  const guard = async (req: FastifyRequest) => {
    if (!req.headers.authorization) {
      const protocol = req.headers["sec-websocket-protocol"]?.split(",").map((p) => p.trim()).find((p) => p.startsWith("bearer."))
      if (protocol) req.headers.authorization = `Bearer ${protocol.slice(7)}`
    }
    await authenticate(ctx)(req, {} as never)
    if ((connections.get(me(req).id) ?? 0) >= 5) throw forbidden("Too many live connections.")
  }
  const handleConnection = (socket: WebSocket, req: FastifyRequest) => {
    let user = me(req)
    connections.set(user.id, (connections.get(user.id) ?? 0) + 1)
    subscribeToChannel(socket, `user:${user.id}`)
    let messages = 0
    let windowAt = Date.now()
    let closed = false
    const clean = () => {
      if (closed) return
      closed = true
      cleanupSocket(socket)
      clearInterval(revalidate)
      connections.set(user.id, Math.max(0, (connections.get(user.id) ?? 1) - 1))
    }
    const validate = async () => {
      user = await ctx.resolveUser(await ctx.verifyToken(user.token))
      for (const channel of clientSubscriptions.get(socket) ?? []) {
        if (!(await canSubscribe(ctx, user, channel))) unsubscribeFromChannel(socket, channel)
      }
    }
    const revalidate = setInterval(() => { void validate().catch(() => { socket.close(1008, "Session expired"); clean() }) }, 15_000)
    revalidate.unref()
    let queue = Promise.resolve()
    socket.on("message", (raw) => {
      if (Date.now() - windowAt > 60_000) { messages = 0; windowAt = Date.now() }
      if (++messages > 60 || raw.toString().length > 8192) { socket.close(1008, "Rate limit"); clean(); return }
      queue = queue.then(async () => {
        if (closed) return
        await validate()
        const msg = JSON.parse(raw.toString()) as WsMessagePayload
        const channel = typeof msg.channel === "string" ? msg.channel : ""
        if (msg.action === "ping") { socket.send(JSON.stringify({ action: "pong" })); return }
        if (msg.action === "unsubscribe") { unsubscribeFromChannel(socket, channel); return }
        if (!(await canSubscribe(ctx, user, channel))) throw forbidden("Channel access denied.")
        if (msg.action === "subscribe") {
          if ((clientSubscriptions.get(socket)?.size ?? 0) >= 20) throw forbidden("Too many subscriptions.")
          subscribeToChannel(socket, channel)
          socket.send(JSON.stringify({ action: "subscribed", channel }))
        } else if (msg.action === "publish" && channel.startsWith("chat:") && msg.event === "typing") {
          broadcastToChannel(channel, "typing", { typing: msg.payload?.typing === true }, { id: user.id, name: user.full_name, role: user.role })
        } else throw forbidden("This client event is not allowed.")
      }).catch(() => { if (!closed && socket.readyState === 1) socket.send(JSON.stringify({ action: "error", message: "Action denied." })) })
    })
    socket.on("close", clean)
    socket.on("error", clean)
    socket.send(JSON.stringify({ action: "connected" }))
  }
  app.get("/ws", { websocket: true, preValidation: guard }, handleConnection)
  app.get("/api/ws", { websocket: true, preValidation: guard }, handleConnection)
  app.get("/api/ws/stats", { preHandler: authenticate(ctx, ["Super Admin"]) }, async () => getWsStats())
}
