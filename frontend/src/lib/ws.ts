import { useEffect, useRef, useState, useCallback } from "react"

export interface WsEventMessage {
  channel: string
  event: string
  payload?: any
  sender?: {
    id?: string
    name?: string
    role?: string
  }
  timestamp?: string
}

type MessageListener = (event: string, payload: any, sender?: any) => void

class WebSocketClient {
  private socket: WebSocket | null = null
  private listeners = new Map<string, Set<MessageListener>>()
  private statusListeners = new Set<(status: "connected" | "connecting" | "disconnected") => void>()
  private status: "connected" | "connecting" | "disconnected" = "disconnected"
  private reconnectTimeout: any = null
  private heartbeatInterval: any = null
  private retryCount = 0

  constructor() {
    if (typeof window !== "undefined") {
      this.connect()
    }
  }

  private getUrl(): string {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:"
    const host = window.location.host
    return `${proto}//${host}/ws`
  }

  private setStatus(newStatus: "connected" | "connecting" | "disconnected") {
    if (this.status === newStatus) return
    this.status = newStatus
    for (const cb of this.statusListeners) {
      try {
        cb(newStatus)
      } catch {
        // Ignored
      }
    }
  }

  public getStatus() {
    return this.status
  }

  public connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return
    }

    this.setStatus("connecting")
    try {
      this.socket = new WebSocket(this.getUrl())

      this.socket.onopen = () => {
        this.setStatus("connected")
        this.retryCount = 0

        // Re-subscribe to all active channels
        for (const channel of this.listeners.keys()) {
          this.sendRaw({ action: "subscribe", channel })
        }

        // Start heartbeat ping
        this.startHeartbeat()
      }

      this.socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.channel && msg.event) {
            const subs = this.listeners.get(msg.channel)
            if (subs) {
              for (const listener of subs) {
                listener(msg.event, msg.payload, msg.sender)
              }
            }
          }
        } catch {
          // Handshake or non-JSON message
        }
      }

      this.socket.onclose = () => {
        this.setStatus("disconnected")
        this.stopHeartbeat()
        this.scheduleReconnect()
      }

      this.socket.onerror = () => {
        this.setStatus("disconnected")
        this.socket?.close()
      }
    } catch {
      this.setStatus("disconnected")
      this.scheduleReconnect()
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.sendRaw({ action: "ping" })
      }
    }, 25_000)
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return
    const delay = Math.min(1000 * Math.pow(1.5, this.retryCount), 10_000)
    this.retryCount++
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null
      this.connect()
    }, delay)
  }

  private sendRaw(data: unknown) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data))
    }
  }

  public subscribe(channel: string, listener: MessageListener): () => void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set())
      this.sendRaw({ action: "subscribe", channel })
    }
    this.listeners.get(channel)!.add(listener)

    return () => {
      const subs = this.listeners.get(channel)
      if (subs) {
        subs.delete(listener)
        if (subs.size === 0) {
          this.listeners.delete(channel)
          this.sendRaw({ action: "unsubscribe", channel })
        }
      }
    }
  }

  public publish(channel: string, event: string, payload?: any, sender?: any) {
    this.sendRaw({
      action: "publish",
      channel,
      event,
      payload,
      sender,
    })
  }

  public onStatusChange(callback: (status: "connected" | "connecting" | "disconnected") => void): () => void {
    this.statusListeners.add(callback)
    callback(this.status)
    return () => {
      this.statusListeners.delete(callback)
    }
  }
}

export const ws = new WebSocketClient()

/**
 * React hook to subscribe to real-time events on a channel.
 */
export function useChannel(channel: string | null | undefined, onEvent: MessageListener) {
  const handlerRef = useRef(onEvent)
  handlerRef.current = onEvent

  useEffect(() => {
    if (!channel) return
    const unsubscribe = ws.subscribe(channel, (event, payload, sender) => {
      handlerRef.current(event, payload, sender)
    })
    return () => unsubscribe()
  }, [channel])
}

/**
 * React hook for live WebSocket connection status.
 */
export function useWsStatus() {
  const [status, setStatus] = useState<"connected" | "connecting" | "disconnected">(ws.getStatus())

  useEffect(() => {
    return ws.onStatusChange(setStatus)
  }, [])

  return status
}

