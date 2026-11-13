import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { BotAvatar } from "bot-avatars"
import { ArrowUp } from "lucide-react"
import type { UserRole } from "@/types"
import { useSession } from "@/app/session"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { duration, ease } from "@/lib/motion"

interface Message {
  id: number
  from: "user" | "ai"
  text: string
}

const SUGGESTIONS: Record<UserRole, string[]> = {
  Student: ["Summarise my last live class", "What should I revise before the RAG quiz?", "Explain attention in two sentences"],
  Teacher: ["Draft chapter titles for today's recording", "Which learners are falling behind?", "Suggest a quiz on vector search"],
  Evaluator: ["Summarise this week's grading queue", "Flag submissions near the deadline", "Draft feedback for a weak RAG eval"],
  Support: ["Draft a reply for a batch transfer", "What is the refund policy?", "Summarise open escalations"],
  Admin: ["Which batches are close to capacity?", "Summarise October revenue", "List instructors with pending reviews"],
  "Super Admin": ["Summarise AI token spend this week", "Any unusual audit events today?", "Which cohort grew fastest?"],
}

function cannedReply(_role:UserRole,_prompt:string):string {
  return "The AI assistant is not connected to an inference service. I cannot inspect your learning records, report metrics or perform account actions. Use the relevant workspace or contact Support."
}

interface AiCtx {
  open: (prefill?: string) => void
}
const AiAssistantContext = createContext<AiCtx>({ open: () => {} })

/** Owns the assistant dialog; mount once around the routes. */
export function AiAssistantProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false)
  const [prefill, setPrefill] = useState<string | undefined>()
  const open = useCallback((text?: string) => {
    setPrefill(text)
    setOpen(true)
  }, [])
  const value = useMemo(() => ({ open }), [open])
  return (
    <AiAssistantContext.Provider value={value}>
      {children}
      <AiAssistantDialog open={isOpen} onOpenChange={setOpen} prefill={prefill} />
    </AiAssistantContext.Provider>
  )
}

export function useAiAssistant() {
  return useContext(AiAssistantContext)
}

/** Clover: role-aware learning companion with simulated streaming replies. */
export default function AiAssistantDialog({ open, onOpenChange, prefill }: { open: boolean; onOpenChange: (o: boolean) => void; prefill?: string }) {
  const { role } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [thinking, setThinking] = useState(false)
  const idRef = useRef(0)
  const listRef = useRef<HTMLDivElement>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    if (open && prefill) setInput(prefill)
  }, [open, prefill])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, thinking])

  const ask = (text: string) => {
    const q = text.trim()
    if (!q || thinking) return
    setMessages((m) => [...m, { id: ++idRef.current, from: "user", text: q }])
    setInput("")
    setThinking(true)
    const reply = cannedReply(role, q)
    timers.current.push(
      setTimeout(() => {
        setThinking(false)
        const id = ++idRef.current
        setMessages((m) => [...m, { id, from: "ai", text: "" }])
        // Reveal the reply in 2-word batches to feel like smooth streaming without timer flood.
        const words = reply.split(" ")
        let idx = 0
        const streamTimer = setInterval(() => {
          idx = Math.min(words.length, idx + 2)
          const partial = words.slice(0, idx).join(" ")
          setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, text: partial } : msg)))
          if (idx >= words.length) clearInterval(streamTimer)
        }, 45)
        timers.current.push(streamTimer as unknown as ReturnType<typeof setTimeout>)
      }, 450),
    )
  }

  if (!open && messages.length === 0) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(640px,calc(100dvh-2rem))] max-w-xl flex-col gap-0 overflow-hidden p-0">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center">
            <BotAvatar
              type="clover"
              face="mouth"
              state={thinking ? "working" : "default"}
              size={46}
              shading="plastic"
              highlight={1.1}
              rim={0.7}
              turn={0.6}
              jumpEvery={0}
              aria-hidden="true"
            />
          </span>
          <div>
            <DialogTitle className="text-base">Clover</DialogTitle>
            <DialogDescription className="text-caption">AI inference is not configured. No account actions are performed.</DialogDescription>
          </div>
        </div>

        <div ref={listRef} className="min-h-[220px] flex-1 space-y-3 overflow-y-auto px-5 py-4" aria-live="polite">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">The assistant is unavailable until an inference service is connected.</p>
              <div className="flex flex-col gap-2">
                {SUGGESTIONS[role].map((s, i) => (
                  <motion.button
                    key={s}
                    type="button"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: duration.base, ease: ease.out, delay: i * 0.05 }}
                    onClick={() => ask(s)}
                    className="rounded-md border border-border bg-surface px-3 py-2 text-left text-sm text-foreground transition-colors hover:border-primary-border hover:bg-primary-soft"
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            </div>
          )}
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: duration.base, ease: ease.out }}
                className={cn("flex", m.from === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-6",
                    m.from === "user" ? "bg-primary text-primary-foreground" : "border border-border bg-surface text-foreground",
                  )}
                >
                  {m.text || "\u00a0"}
                </div>
              </motion.div>
            ))}
            {thinking && (
              <motion.div key="thinking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-1 px-1 py-2" aria-label="Thinking">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            ask(input)
          }}
          className="flex items-end gap-2 border-t border-border p-3"
        >
          <label htmlFor="ai-input" className="sr-only">
            Message Clover
          </label>
          <textarea
            id="ai-input"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                ask(input)
              }
            }}
            placeholder="Ask Clover about your courses…"
            className="max-h-32 min-h-[40px] flex-1 resize-none rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-foreground placeholder:text-subtle-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20"
          />
          <button
            type="submit"
            disabled={!input.trim() || thinking}
            aria-label="Send"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-[opacity,transform] hover:bg-primary-hover active:scale-95 disabled:opacity-40"
          >
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
