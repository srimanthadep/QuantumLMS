import type { FastifyInstance, FastifyRequest } from "fastify"
import type { WebSocket } from "ws"
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
    payload,
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
export async function wsRoutes(app: FastifyInstance, _ctx: AppContext) {
  const handleConnection = (socket: WebSocket, req: FastifyRequest) => {
    // Auto-subscribe from query string channel if provided (e.g. /ws?channel=chat:chat-1)
    const query = (req.query as Record<string, string>) || {}
    if (query.channel) {
      subscribeToChannel(socket, query.channel)
      socket.send(
        JSON.stringify({
          action: "subscribed",
          channel: query.channel,
          timestamp: new Date().toISOString(),
        }),
      )
    }

    socket.on("message", (raw: any) => {
      try {
        const text = typeof raw === "string" ? raw : raw.toString()
        const msg: WsMessagePayload = JSON.parse(text)

        switch (msg.action) {
          case "subscribe":
            if (msg.channel) {
              subscribeToChannel(socket, msg.channel)
              socket.send(
                JSON.stringify({
                  action: "subscribed",
                  channel: msg.channel,
                  timestamp: new Date().toISOString(),
                }),
              )
            }
            break

          case "unsubscribe":
            if (msg.channel) {
              unsubscribeFromChannel(socket, msg.channel)
              socket.send(
                JSON.stringify({
                  action: "unsubscribed",
                  channel: msg.channel,
                  timestamp: new Date().toISOString(),
                }),
              )
            }
            break

          case "publish":
            if (msg.channel && msg.event) {
              broadcastToChannel(msg.channel, msg.event, msg.payload, msg.sender)
            }
            break

          case "ping":
            socket.send(JSON.stringify({ action: "pong", timestamp: new Date().toISOString() }))
            break

          default:
            break
        }
      } catch (err) {
        req.log.warn({ err }, "Invalid WebSocket message format")
      }
    })

    socket.on("close", () => {
      cleanupSocket(socket)
    })

    socket.on("error", () => {
      cleanupSocket(socket)
    })

    // Welcome acknowledgment
    socket.send(
      JSON.stringify({
        action: "connected",
        message: "Quantum LMS Real-Time Gateway connected",
        timestamp: new Date().toISOString(),
      }),
    )
  }

  // Register both /ws and /api/ws for seamless proxy routing
  app.get("/ws", { websocket: true }, handleConnection)
  app.get("/api/ws", { websocket: true }, handleConnection)

  // Status and telemetry route
  app.get("/api/ws/stats", async () => {
    return getWsStats()
  })
}

