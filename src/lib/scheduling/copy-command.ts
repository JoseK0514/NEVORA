import { isValidWeekStart } from "../date-utils";

export type CopyCommand = {
  operationId: string;
  weekStart: string;
  kind: "PREVIOUS_WEEK" | "TEMPLATE";
  templateId?: string;
};

export function isCopyOperationId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function parseCopyCommand(value: unknown): CopyCommand {
  if (!value || typeof value !== "object") throw Error("Invalid copy command");
  const v = value as Record<string, unknown>;
  if (
    !isCopyOperationId(v.operationId) ||
    typeof v.weekStart !== "string" ||
    !isValidWeekStart(v.weekStart) ||
    !["PREVIOUS_WEEK", "TEMPLATE"].includes(String(v.kind)) ||
    Object.keys(v).some(
      (k) => !["operationId", "weekStart", "kind", "templateId"].includes(k),
    )
  )
    throw Error("Invalid copy command");
  if (
    (v.kind === "TEMPLATE" &&
      (typeof v.templateId !== "string" ||
        !v.templateId ||
        v.templateId.length > 200)) ||
    (v.kind === "PREVIOUS_WEEK" && v.templateId !== undefined)
  )
    throw Error("Invalid template");
  return {
    operationId: v.operationId.toLowerCase(),
    weekStart: v.weekStart,
    kind: v.kind as CopyCommand["kind"],
    ...(v.kind === "TEMPLATE" ? { templateId: String(v.templateId) } : {}),
  };
}
