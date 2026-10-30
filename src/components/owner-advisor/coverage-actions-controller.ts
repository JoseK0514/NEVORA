import type { CoveragePlans } from "@/lib/owner-advisor/coverage-plan-contracts";
import { parseCoverageAction, type CoverageActionCommand, type CoverageActionResult } from "@/lib/owner-advisor/coverage-actions";
import { parseCoverageActionResult } from "./coverage-actions-response";
export type CoverageActionView = {
  stage: "idle" | "busy" | "review" | "saved" | "uncertain" | "blocked" | "paused";
  result: CoverageActionResult | null; acknowledged: boolean; message: string;
};
const initial = (): CoverageActionView => ({ stage: "idle", result: null, acknowledged: false, message: "" });
const terms = (a: CoverageActionResult["review"]["assignments"][number]) => ({ employeeId: a.employeeId, locationId: a.locationId, startTime: a.startTime, endTime: a.endTime, positionId: a.positionId, isDesignatedLead: a.isDesignatedLead });
/** Volatile only. No background business writes. An uncertain operation retains its
 * exact original command through pause, expiry and failed recovery. */
export function createCoverageActionController(changed: (view: CoverageActionView) => void, request: typeof fetch = fetch, uuid: () => string = () => crypto.randomUUID()) {
  let v = initial(), authority: string | null = null, active = false, stopped = false, epoch = 0;
  let pending: CoverageActionCommand | null = null, operation: AbortController | null = null;
  let expiry: ReturnType<typeof setTimeout> | undefined;
  const publish = (patch: Partial<CoverageActionView>) => { v = { ...v, ...patch }; if (!stopped) changed(v); };
  const pause = () => {
    active = false; epoch++; operation?.abort(); operation = null; clearTimeout(expiry);
    publish({ ...initial(), stage: "paused", message: "Draft information is hidden until your access is refreshed." });
  };
  const arm = (ms: number) => { clearTimeout(expiry); expiry = setTimeout(pause, ms); };
  const access = (next: string, validForMs: number) => {
    if (stopped || !next || validForMs <= 0 || validForMs > 15000) return;
    if (authority !== null && authority !== next) { pause(); pending = null; publish({ ...initial(), stage: "blocked", message: "Your access changed. Start a new comparison." }); }
    authority = next;
    if (!active) publish({ ...initial(), stage: pending ? "uncertain" : "idle", message: pending ? "Resume the original request before starting another draft." : "" });
    active = true; arm(validForMs);
  };
  async function send(command: CoverageActionCommand) {
    if (!active || stopped || v.stage === "busy") return;
    const generation = epoch, expected = authority, started = performance.now();
    operation = new AbortController(); pending = command;
    publish({ stage: "busy", acknowledged: false, message: "" });
    try {
      const response = await request("/api/owner/advisor", { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "x-nevora-owner-advisor": "1", "Content-Type": "application/json" }, body: JSON.stringify(command), signal: AbortSignal.any([operation.signal, AbortSignal.timeout(60000)]) });
      if (generation !== epoch || !active || stopped) return;
      if (!response.ok) {
        if ([400, 401, 403, 404, 409].includes(response.status)) {
          pending = null;
          publish({ ...initial(), stage: "blocked", message: response.status === 409 ? "The review changed or expired. Compare the current day plans again; no replacement was selected." : "This draft action is unavailable under your current access. Refresh before continuing." });
          return;
        }
        throw Error("Uncertain response");
      }
      const result = parseCoverageActionResult(await response.json());
      if (generation !== epoch || !active || stopped) return;
      const remaining = result.validForMs - (performance.now() - started);
      if (result.authority !== expected || remaining <= 0) throw Error("Stale authority");
      if (command.op === "prepare_coverage_draft") {
        if (result.state !== "coverage_review" || result.review.id !== command.requestId || result.review.date !== command.date || result.review.sourceVersion !== command.sourceVersion || JSON.stringify(result.review.assignments.map(terms)) !== JSON.stringify(command.assignments)) throw Error("Mismatched review");
      } else if (result.review.id !== command.reviewId || (command.op === "apply_coverage_draft" && (result.state !== "coverage_saved" || result.receipt?.operationId !== command.requestId)) || (command.op === "check_coverage_draft" && result.state !== "coverage_checked")) throw Error("Mismatched receipt");
      arm(remaining); pending = null;
      publish({ result, stage: result.receipt ? "saved" : "review", message: "", acknowledged: false });
    } catch {
      if (generation === epoch && active && !stopped) publish({ result: null, stage: "uncertain", acknowledged: false, message: "The reply could not be verified. Check the original request; it may already have completed." });
    } finally { if (generation === epoch) operation = null; }
  }
  return {
    access, pause,
    stop() { pause(); stopped = true; pending = null; },
    async prepare(plans: CoveragePlans, index: number) {
      if (!active || pending || v.stage === "busy") return;
      const plan = plans.alternatives[index];
      if (plans.state !== "ready" || !plans.sourceVersion || !plan || plan.status === "INVALID" || !plan.assignments.length || plan.assignments.some(a => a.publication !== "DRAFT" || a.positionId === undefined)) {
        publish({ ...initial(), stage: "blocked", message: "This allocation needs a fresh draft-only comparison. Review published schedules in Scheduling." }); return;
      }
      const assignments = plan.assignments.map(a => ({ employeeId: a.employeeId, locationId: a.locationId, startTime: a.startTime, endTime: a.endTime, positionId: a.positionId!, isDesignatedLead: a.isDesignatedLead }));
      await send(parseCoverageAction({ op: "prepare_coverage_draft", requestId: uuid(), date: plans.date, sourceVersion: plans.sourceVersion, assignments }));
    },
    acknowledge(value: boolean) { if (v.stage === "review" && !pending) publish({ acknowledged: value }); },
    async save() {
      if (!active || v.stage !== "review" || !v.acknowledged || !v.result || pending) return;
      if (Date.parse(v.result.review.expiresAt) <= Date.now()) { publish({ acknowledged: false, stage: "blocked", result: null, message: "This review expired. Compare the current day plans again." }); return; }
      await send({ op: "apply_coverage_draft", requestId: uuid(), reviewId: v.result.review.id, acknowledged: true });
    },
    async recover() { if (active && pending && v.stage === "uncertain") await send(pending); },
    async check() { if (active && v.stage === "saved" && v.result?.receipt && !pending) await send({ op: "check_coverage_draft", requestId: uuid(), reviewId: v.result.review.id }); },
    dismiss() { if (!pending && v.stage !== "busy") publish(initial()); },
  };
}
