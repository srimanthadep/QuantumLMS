import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockDataService } from "@/services/mockDataService";
import { useNotifications } from "@/context/NotificationContext";
import { HelpCircle, Clock, CheckCircle2 } from "lucide-react";

interface DoubtSubmissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseTitle: string;
  batchName: string;
  classTitle: string;
  timestampSeconds?: number;
  initialQuestion?: string;
  onSuccess?: () => void;
}

export const DoubtSubmissionModal: React.FC<DoubtSubmissionModalProps> = ({
  open,
  onOpenChange,
  courseTitle,
  batchName,
  classTitle,
  timestampSeconds = 0,
  initialQuestion = "",
  onSuccess,
}) => {
  const [question, setQuestion] = useState(initialQuestion);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { addNotification } = useNotifications();

  const formatSeconds = (sec: number) => {
    const total = Math.floor(sec);
    const hrs = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      mockDataService.addDoubt({
        studentId: "usr-student-1",
        studentName: "Arjun Mehta",
        courseTitle,
        batchName,
        classTitle,
        timestampSeconds,
        timestampFormatted: formatSeconds(timestampSeconds),
        question,
        status: "open",
      });

      addNotification({
        title: "Doubt Submitted Successfully",
        message: `Your query on "${classTitle}" @ ${formatSeconds(timestampSeconds)} has been logged for teacher review.`,
        type: "doubt",
        link: "/student/doubts",
      });

      setIsSubmitting(false);
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setQuestion("");
        onOpenChange(false);
        onSuccess?.();
      }, 1000);
    }, 400);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 rounded-2xl border-border/80 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <HelpCircle className="h-4 w-4" />
            </span>
            <DialogTitle className="text-base font-bold text-foreground">
              Ask Contextual Timestamp Doubt
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Anchored to {classTitle}
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 animate-bounce" />
            <h4 className="font-bold text-sm text-foreground">Doubt Dispatched!</h4>
            <p className="text-xs text-muted-foreground">
              Our AI engine and teaching faculty have been notified.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Timestamp Badge */}
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-primary/20 bg-primary/5">
              <span className="text-xs text-foreground font-semibold flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" />
                Video Timestamp Anchor:
              </span>
              <span className="text-xs font-mono font-bold text-primary px-2 py-0.5 rounded bg-card border border-primary/30">
                {formatSeconds(timestampSeconds)}
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                Your Doubt / Query:
              </label>
              <textarea
                rows={4}
                required
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Explain what concept is unclear at this exact moment in the lecture..."
                className="w-full rounded-xl border border-input bg-background/80 p-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-muted/30 border border-border/60 text-[11px] text-muted-foreground leading-relaxed">
              💡 <strong>AI Pre-Answer:</strong> Once submitted, our grounded AI assistant will generate an instant draft citation answer, followed by human faculty review.
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !question.trim()}
                className="text-xs h-9 font-bold"
              >
                {isSubmitting ? "Submitting..." : "Submit Doubt"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
