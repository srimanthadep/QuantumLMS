import React, { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, Sparkles, AlertCircle, ArrowUpRight, HelpCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GroundedAiTutorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lectureTitle: string;
  onSeekTimestamp?: (seconds: number) => void;
  onOpenDoubtModal?: (timestampSeconds: number, question: string) => void;
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  citations?: Array<{ timestampFormatted: string; timestampSeconds: number; chapterTitle: string }>;
  isUncertain?: boolean;
}

const PRELOADED_QUESTIONS = [
  "How does HNSW graph skip-list compare to IVF-PQ?",
  "What is the recommended chunk size and overlap?",
  "How to prevent lost-in-the-middle during reranking?",
];

export const GroundedAiTutor: React.FC<GroundedAiTutorProps> = ({
  open,
  onOpenChange,
  lectureTitle,
  onSeekTimestamp,
  onOpenDoubtModal,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "ai-welcome",
      sender: "ai",
      text: `Hello! I am your lecture-grounded AI tutor. Every answer I give is strictly indexed from **${lectureTitle}** with verifiable video timestamp citations.`,
      timestamp: "Just now",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isThinking, setIsThinking] = useState(false);

  const handleSend = (queryText?: string) => {
    const q = queryText || inputValue;
    if (!q.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: q,
      timestamp: "Just now",
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputValue("");
    setIsThinking(true);

    setTimeout(() => {
      let aiResponse: ChatMessage;

      if (q.toLowerCase().includes("hnsw") || q.toLowerCase().includes("ivf") || q.toLowerCase().includes("graph")) {
        aiResponse = {
          id: `ai-${Date.now()}`,
          sender: "ai",
          text: "In this lecture, Prof. Verma explains that HNSW constructs hierarchical multi-layer skip-lists in vector space. Upper layers perform fast greedy searches across broad clusters, while lower layers refine local accuracy. When memory is severely constrained, IVF-PQ compresses vectors into 8-bit quantization centroids, cutting RAM by ~80% with only ~2% recall loss.",
          timestamp: "Just now",
          citations: [
            { timestampFormatted: "00:24:18", timestampSeconds: 1458, chapterTitle: "HNSW Graph Construction" },
            { timestampFormatted: "01:12:40", timestampSeconds: 4360, chapterTitle: "IVF-PQ vs HNSW Memory Nuance" },
          ],
        };
      } else if (q.toLowerCase().includes("chunk") || q.toLowerCase().includes("size") || q.toLowerCase().includes("overlap")) {
        aiResponse = {
          id: `ai-${Date.now()}`,
          sender: "ai",
          text: "Prof. Verma strongly advises against fixed arbitrary character chunking because it splits thoughts across sentences. The course standard is 500-token semantic chunks along natural paragraph breaks with a 10% (50-token) sliding overlap to preserve boundary context.",
          timestamp: "Just now",
          citations: [
            { timestampFormatted: "00:08:45", timestampSeconds: 525, chapterTitle: "Chunking Heuristics" },
          ],
        };
      } else {
        aiResponse = {
          id: `ai-${Date.now()}`,
          sender: "ai",
          text: "I searched the complete transcript and slides for this lecture, but this specific subtopic is not explicitly covered in this session. To avoid hallucinations, I recommend forwarding your question directly to Prof. Verma.",
          timestamp: "Just now",
          isUncertain: true,
        };
      }

      setMessages((prev) => [...prev, aiResponse]);
      setIsThinking(false);
    }, 600);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-card border-l border-border/80">
        <SheetHeader className="p-4 border-b border-border/70 bg-muted/20 text-left">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary ring-2 ring-primary/20">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <SheetTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                Grounded AI Tutor
                <Badge variant="accent" className="text-[9px] px-1.5 py-0 h-4 uppercase">
                  Verified
                </Badge>
              </SheetTitle>
              <SheetDescription className="text-[11px] text-muted-foreground truncate max-w-[260px]">
                Strictly citing: {lectureTitle}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Message feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 sleek-scrollbar">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex flex-col space-y-1.5 text-xs max-w-[90%]",
                m.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              <div
                className={cn(
                  "p-3.5 rounded-2xl leading-relaxed shadow-2xs",
                  m.sender === "user"
                    ? "bg-primary text-primary-foreground rounded-br-xs font-medium"
                    : "bg-muted/50 border border-border/70 text-foreground rounded-bl-xs"
                )}
              >
                <p className="whitespace-pre-line">{m.text}</p>

                {/* Citations block */}
                {m.citations && m.citations.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-border/60 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Cited Lecture Moments:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {m.citations.map((c, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => onSeekTimestamp?.(c.timestampSeconds)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-card border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground font-bold text-[10px] transition-all shadow-2xs"
                        >
                          <span>▶ {c.timestampFormatted}</span>
                          <span className="text-[9px] font-normal opacity-80 truncate max-w-[120px]">
                            {c.chapterTitle}
                          </span>
                          <ArrowUpRight className="h-2.5 w-2.5" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Uncertainty block */}
                {m.isUncertain && (
                  <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-[11px]">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Not in course material
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs w-full gap-1 border-amber-500/30 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-semibold"
                      onClick={() => onOpenDoubtModal?.(0, inputValue || "Concept clarification from lecture")}
                    >
                      <HelpCircle className="h-3 w-3" />
                      Forward to Teacher Desk
                    </Button>
                  </div>
                )}
              </div>

              <span className="text-[10px] text-muted-foreground px-1">{m.timestamp}</span>
            </div>
          ))}

          {isThinking && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-muted/40 border border-border/60 text-xs text-muted-foreground w-40">
              <Sparkles className="h-3.5 w-3.5 animate-spin text-primary" />
              <span>Grounding answer...</span>
            </div>
          )}
        </div>

        {/* Quick chip prompts */}
        <div className="p-2.5 border-t border-border/60 bg-muted/10 space-y-1.5">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">
            Suggested Queries
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PRELOADED_QUESTIONS.map((pq, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(pq)}
                className="text-[11px] text-left px-2.5 py-1 rounded-lg bg-card border border-border/70 hover:border-primary/40 hover:text-primary transition-colors text-muted-foreground truncate max-w-full"
              >
                {pq}
              </button>
            ))}
          </div>
        </div>

        {/* Input box */}
        <div className="p-3 border-t border-border/70 bg-card">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask anything covered in this lecture..."
              className="text-xs h-9 bg-muted/30"
            />
            <Button type="submit" size="sm" className="h-9 px-3 gap-1 shrink-0">
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
};
