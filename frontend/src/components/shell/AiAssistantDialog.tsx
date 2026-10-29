import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowUp, Sparkles } from "lucide-react"
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
  "Super Admin": ["Summarise AI token spend this week", "Any unusual audit events today?", "Which tenant grew fastest?"],
}

function cannedReply(role: UserRole, prompt: string): string {
  const p = prompt.toLowerCase()
  if (p.includes("summar") && (p.includes("class") || p.includes("live")))
    return "Your last live class, “RAG Systems Lab”, had 9 chapters. The key ideas: chunk documents by semantic boundaries, embed with a consistent model, re-rank the top 20 hits, and evaluate with faithfulness and answer relevance. Chapter 6 (re-ranking) is worth a rewatch."
  if (p.includes("quiz") || p.includes("revise"))
    return "Focus on three areas: cosine vs dot-product similarity, chunk size trade-offs, and why hybrid search (BM25 + vectors) helps on rare terms. The replay chapters “Embeddings 101” and “Hybrid retrieval” cover all three in about 18 minutes."
  if (p.includes("chapter"))
    return "Suggested chapters: 00:00 Welcome and goals · 04:12 Why retrieval beats fine-tuning here · 11:40 Chunking strategies · 23:05 Embedding models compared · 34:18 Building the index · 47:52 Re-ranking · 58:30 Evaluating answers · 1:08:10 Q&A."
  if (p.includes("behind") || p.includes("weak") || p.includes("flag"))
    return "4 learners have not watched the last two replays and have an assessment due in 3 days: Diya S., Kabir R., Ishita V. and Rahul P. A short nudge with the chapter links usually brings them back."
  if (p.includes("refund") || p.includes("transfer") || p.includes("reply"))
    return "Draft: “Hi! I've moved you to the Weekend cohort starting 9 Nov. Your replays, notes and progress carry over, and live classes now appear in your schedule. Reply here if anything looks off.”"
  if (p.includes("revenue") || p.includes("token") || p.includes("tenant") || p.includes("capacity"))
    return "This week: ₹4.82L revenue (+18%), 1.42M AI tokens (62% chapter generation, 28% tutor, 10% grading assist). The October Generative AI cohort is at 92% capacity; consider opening a second batch."
  return role === "Student"
    ? "Good question. Here's a short answer, with a pointer to the replay chapter that covers it in depth. Ask a follow-up if you want an example in Python."
    : "Here's a quick summary based on the latest activity in your workspace. Ask a follow-up to drill into a specific course, batch or learner."
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

/** "Ask AI" assistant: role-aware suggestions, simulated streaming replies. */
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
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" })
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
        // Reveal the reply word by word to feel like streaming.
        const words = reply.split(" ")
        words.forEach((_, i) =>
          timers.current.push(
            setTimeout(() => {
              setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, text: words.slice(0, i + 1).join(" ") } : msg)))
            }, i * 28),
          ),
        )
      }, 650),
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(640px,calc(100dvh-2rem))] max-w-xl flex-col gap-0 overflow-hidden p-0">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[image:var(--gradient-primary)] text-white shadow-[var(--glow-primary)]">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <DialogTitle className="text-base">Quantum AI</DialogTitle>
            <DialogDescription className="text-caption">Answers use your courses, replays and activity. Demo responses.</DialogDescription>
          </div>
        </div>

        <div ref={listRef} className="min-h-[220px] flex-1 space-y-3 overflow-y-auto px-5 py-4" aria-live="polite">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Try one of these:</p>
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
            Ask Quantum AI
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
            placeholder="Ask anything about your courses…"
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
