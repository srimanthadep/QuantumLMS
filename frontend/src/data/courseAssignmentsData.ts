import type { ModuleAssignmentItem, StudentModuleSubmission } from "../types"
export type { ModuleAssignmentItem, StudentModuleSubmission }

export const MODULE_ASSIGNMENTS: Record<string, ModuleAssignmentItem> = {}

export function getModuleAssignment(moduleId: string): ModuleAssignmentItem | undefined {
  return MODULE_ASSIGNMENTS[moduleId]
}

export function saveModuleAssignment(assignment: ModuleAssignmentItem): void {
  MODULE_ASSIGNMENTS[assignment.moduleId] = assignment
}
