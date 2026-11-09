import type { GenerationExplanation } from "./types";
import {
  schedulingIssueMessage,
  type ValidationIssue,
} from "../validate-shift";
/** A person with many rejected variants counts once per reason. Warnings are not rejections. */
export function aggregateGenerationRejections(
  items: { employeeId: string; issues: ValidationIssue[] }[],
): GenerationExplanation[] {
  const groups = new Map<ValidationIssue["code"], Set<string>>();
  for (const item of items)
    for (const issue of item.issues.filter((i) => i.severity === "error")) {
      const ids = groups.get(issue.code) ?? new Set<string>();
      ids.add(item.employeeId);
      groups.set(issue.code, ids);
    }
  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, ids]) => ({
      code,
      message: schedulingIssueMessage(code),
      employeeIds: [...ids].sort(),
      distinctEmployeeCount: ids.size,
    }));
}
