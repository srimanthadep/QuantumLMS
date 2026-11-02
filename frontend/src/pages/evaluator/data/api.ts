import { api } from "@/lib/api"
import type {
  Evaluation,
  EvaluationDraft,
  EvaluatorProfile,
  FilePreview,
  ProfilePatch,
  QueueData,
  ReevaluationItem,
  Reports,
  Scores,
  Workspace,
} from "./types"

/** Calls to /api/evaluator. Errors arrive as ApiError with a message that can be shown as is. */

export const loadQueue = () => api.get<QueueData>("/evaluator/queue", "The queue couldn't be loaded.")
export const loadReevaluations = () => api.get<ReevaluationItem[]>("/evaluator/reevaluations", "Re-evaluation requests couldn't be loaded.")
export const loadProfile = () => api.get<EvaluatorProfile>("/evaluator/profile", "Your evaluator profile couldn't be loaded.")
export const loadReports = () => api.get<Reports>("/evaluator/reports", "Reports couldn't be loaded.")
export const loadWorkspace = (id: string) => api.get<Workspace>(`/evaluator/submissions/${id}`, "This submission couldn't be opened.")
export const loadFilePreview = (id: string) => api.get<FilePreview>(`/evaluator/submissions/${id}/file/preview`, "The file couldn't be shown.")
export const fileLink = async (id: string) => (await api.get<{ url: string }>(`/evaluator/submissions/${id}/file`, "The file couldn't be opened.")).url

export const saveDraft = (id: string, draft: EvaluationDraft) => api.put<Evaluation>(`/evaluator/submissions/${id}/evaluation`, draft, "The draft couldn't be saved.")
export const finishEvaluation = (id: string, draft: EvaluationDraft, release: boolean) =>
  api.post<{ evaluation: Evaluation; released: boolean }>(`/evaluator/submissions/${id}/evaluation/finish`, { ...draft, release }, "The evaluation couldn't be finished.")
export const reopenEvaluation = (id: string) => api.post<Evaluation>(`/evaluator/submissions/${id}/evaluation/reopen`, {}, "The evaluation couldn't be reopened.")
export const discardDraft = (id: string) => api.del(`/evaluator/submissions/${id}/evaluation`, "The draft couldn't be discarded.")
export const releaseEvaluations = (ids: string[]) =>
  api.post<{ released: number; skipped: number }>("/evaluator/release", { submission_ids: ids }, "The results couldn't be released.")

export const startReevaluation = (id: string) => api.post<ReevaluationItem>(`/evaluator/reevaluations/${id}/start`, {}, "The request couldn't be opened.")
export const resolveReevaluation = (id: string, body: { decision: "revise" | "uphold"; resolution: string; scores?: Scores }) =>
  api.post<ReevaluationItem>(`/evaluator/reevaluations/${id}/resolve`, { scores: {}, ...body }, "The decision couldn't be saved.")

export const updateProfile = (patch: ProfilePatch) => api.patch<EvaluatorProfile>("/evaluator/profile", patch, "Your settings couldn't be saved.")
export const resetEvaluatorDemo = () => api.post("/evaluator/demo/reset", {}, "The demo data couldn't be reset.")
