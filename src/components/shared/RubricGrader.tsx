import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RubricCriterion, TestSubmission } from "@/types/lms";
import { mockDataService } from "@/services/mockDataService";
import { useNotifications } from "@/context/NotificationContext";
import { Award, Sparkles, CheckCircle2, Save, FileCheck, ShieldAlert } from "lucide-react";

interface RubricGraderProps {
  submission: TestSubmission;
  blindGrading?: boolean;
  onGradeSubmitted?: () => void;
}

export const RubricGrader: React.FC<RubricGraderProps> = ({
  submission,
  blindGrading = true,
  onGradeSubmitted,
}) => {
  const [rubrics, setRubrics] = useState<RubricCriterion[]>(submission.rubricScores);
  const [feedback, setFeedback] = useState(submission.evaluatorFeedback);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { addNotification } = useNotifications();

  const handleScoreChange = (id: string, newScore: number) => {
    setRubrics((prev) =>
      prev.map((r) => (r.id === id ? { ...r, score: Math.max(0, Math.min(newScore, r.maxScore)) } : r))
    );
  };

  const rubricTotal = rubrics.reduce((acc, curr) => acc + (curr.score || 0), 0);
  const totalScore = submission.objectiveScore + rubricTotal;
  const maxScore = submission.objectiveMaxScore + rubrics.reduce((acc, curr) => acc + curr.maxScore, 0);

  const handleSaveDraft = () => {
    setIsSaving(true);
    setTimeout(() => {
      mockDataService.saveDraftGrade(submission.id, rubrics, feedback);
      setIsSaving(false);
      addNotification({
        title: "Evaluation Draft Saved",
        message: `Draft grades for ${submission.testTitle} were saved.`,
        type: "grade",
      });
    }, 400);
  };

  const handleSubmitFinal = () => {
    setIsSaving(true);
    setTimeout(() => {
      mockDataService.submitGrade(submission.id, rubrics, feedback);
      setIsSaving(false);
      setIsSuccess(true);
      addNotification({
        title: "Grade Published",
        message: `Final evaluation (${totalScore}/${maxScore}) published for submission #${submission.id}.`,
        type: "grade",
      });
      setTimeout(() => {
        setIsSuccess(false);
        onGradeSubmitted?.();
      }, 1000);
    }, 500);
  };

  return (
    <Card className="border-border/80 shadow-md rounded-2xl overflow-hidden">
      <CardHeader className="bg-muted/20 border-b border-border/70 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <Award className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="text-sm sm:text-base font-bold">
                Rubric Evaluation Suite
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {blindGrading ? (
                  <span className="inline-flex items-center gap-1 text-primary font-semibold">
                    <ShieldAlert className="h-3 w-3" /> Blind Grading Enabled ({submission.studentName})
                  </span>
                ) : (
                  <span>Student: {submission.studentName}</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Score</p>
              <p className="text-lg font-extrabold text-primary">
                {totalScore} <span className="text-xs text-muted-foreground font-normal">/ {maxScore}</span>
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-5">
        {/* AI Suggested Score Recommendation Proposal */}
        {submission.aiSuggestedScore && (
          <div className="p-3.5 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                AI-Assisted Grading Recommendation
              </div>
              <Badge variant="accent" className="text-xs font-bold">
                Suggested: {submission.aiSuggestedScore} / 100
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {submission.aiRationale}
            </p>
            <p className="text-[10px] text-muted-foreground italic">
              * Non-authoritative proposal. Evaluator retains complete final discretion.
            </p>
          </div>
        )}

        {/* Objective tests summary */}
        <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-muted/10">
          <div>
            <p className="text-xs font-bold text-foreground">Part 1: Auto-Graded Objective Section</p>
            <p className="text-[11px] text-muted-foreground">Synthesized MCQs & Schema Assertions</p>
          </div>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
            {submission.objectiveScore} / {submission.objectiveMaxScore} pts
          </span>
        </div>

        {/* Dynamic Rubric sliders */}
        <div className="space-y-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Part 2: Subjective & Code Rubric Criteria
          </p>

          {rubrics.map((crit) => (
            <div key={crit.id} className="p-3.5 rounded-xl border border-border/70 bg-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">{crit.criteria}</span>
                <span className="text-xs font-bold text-primary font-mono">
                  {crit.score} / {crit.maxScore}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={crit.maxScore}
                value={crit.score}
                onChange={(e) => handleScoreChange(crit.id, Number(e.target.value))}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <p className="text-[11px] text-muted-foreground leading-normal">
                {crit.rationale}
              </p>
            </div>
          ))}
        </div>

        {/* Qualitative Feedback */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">
            Evaluator Qualitative Feedback:
          </label>
          <textarea
            rows={4}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Write constructive observations on code cleanliness, time/space complexity, and architecture..."
            className="w-full rounded-xl border border-input bg-background/80 p-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border/70">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="text-xs h-9 gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            Save Draft
          </Button>
          <Button
            size="sm"
            onClick={handleSubmitFinal}
            disabled={isSaving}
            className="text-xs h-9 font-bold gap-1.5 shadow-sm"
          >
            {isSuccess ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                Published!
              </>
            ) : (
              <>
                <FileCheck className="h-3.5 w-3.5" />
                Submit Final Evaluation
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
