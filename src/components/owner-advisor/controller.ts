import {
  record,
  type AdvisorAnswer,
  type AdvisorCommand,
  type AdvisorSnapshot,
} from "@/lib/owner-advisor/contracts";
import { parseAnswer, parseSaved, parseSnapshot } from "./public-response";
export type AdvisorView = {
  snapshot: AdvisorSnapshot | null;
  answer: AdvisorAnswer | null;
  question: string;
  priorities: string;
  dirty: boolean;
  busy: "ask" | "save" | null;
  loading: boolean;
  message: string;
  uncertain: boolean;
  conflict: boolean;
};
export const initialView: AdvisorView = {
  snapshot: null,
  answer: null,
  question: "",
  priorities: "",
  dirty: false,
  busy: null,
  loading: true,
  message: "",
  uncertain: false,
  conflict: false,
};
const errors: Record<string, string> = {
  busy: "Another investigation is running. Refresh history before trying again.",
  daily_limit:
    "Today’s investigation limit has been reached. Try again tomorrow.",
  forbidden: "Your Owner access ended. Sign in again to continue.",
  disabled: "AI manager is not available.",
  unavailable: "Your AI manager isn’t connected yet.",
  invalid: "Check your question or priorities and try again.",
  prior_attempt_failed:
    "The earlier investigation failed or has an uncertain result. Review history before starting a new request.",
  cancelled:
    "The investigation timed out or was cancelled. Refresh history before starting again.",
  limit: "This investigation reached its limit. Try a narrower question.",
  provider_failed:
    "The AI manager could not answer. Review history, then try a narrower question.",
  conflict:
    "Priorities changed elsewhere. Your edit is preserved. Review the saved priorities before saving again.",
};
export function createAdvisorController(
  changed: (v: AdvisorView) => void,
  request: typeof fetch = fetch,
) {
  let v = { ...initialView },
    stopped = false,
    paused = true,
    generation = 0,
    contentVersion = 0,
    latest = -Infinity,
    authority: string | null = null;
  let read: AbortController | undefined,
    operation: AbortController | undefined,
    poll: ReturnType<typeof setTimeout> | undefined,
    expiry: ReturnType<typeof setTimeout> | undefined;
  const publish = (patch: Partial<AdvisorView>) => {
    v = { ...v, ...patch };
    if (!stopped) changed(v);
  };
  function clearTimers() {
    clearTimeout(poll);
    clearTimeout(expiry);
  }
  function retire(
    message = "View paused. Return while online to refresh your access.",
  ) {
    generation++;
    read?.abort();
    operation?.abort();
    read = undefined;
    operation = undefined;
    clearTimers();
    publish({ ...initialView, loading: false, message });
  }
  function fresh(
    result: { authority: string; observedAt: string; validForMs: number },
    started: number,
  ) {
    const observed = Date.parse(result.observedAt),
      remaining = result.validForMs - (performance.now() - started);
    if (remaining <= 0 || observed < latest) throw Error("Stale response");
    if (authority !== null && authority !== result.authority) {
      retire("Your access changed. Refresh to continue.");
      authority = null;
      throw Error("Authority changed");
    }
    authority = result.authority;
    latest = observed;
    clearTimers();
    expiry = setTimeout(() => {
      retire("Current access expired. Refresh to continue.");
      if (!paused) void refresh();
    }, remaining);
    poll = setTimeout(() => void refresh(), remaining * 0.6);
  }
  async function refresh(minObserved = -Infinity) {
    if (stopped || paused || read) return false;
    const epoch = generation,
      version = contentVersion,
      controller = new AbortController();
    read = controller;
    const started = performance.now();
    const timeout = setTimeout(() => controller.abort(), 10000);
    publish({ loading: !v.snapshot });
    try {
      const response = await request("/api/owner/advisor", {
        cache: "no-store",
        credentials: "same-origin",
        redirect: "error",
        headers: { "x-nevora-owner-advisor": "1" },
        signal: controller.signal,
      });
      if (
        epoch !== generation ||
        paused ||
        stopped ||
        controller.signal.aborted
      )
        return;
      if ([401, 403, 404].includes(response.status)) {
        retire(errors[response.status === 404 ? "disabled" : "forbidden"]);
        return;
      }
      if (!response.ok) throw Error("Read failed");
      const result = parseSnapshot(await response.json());
      if (epoch !== generation || paused || stopped) return;
      if (controller.signal.aborted) return;
      if (version !== contentVersion) {
        queueMicrotask(() => void refresh());
        return;
      }
      if (Date.parse(result.observedAt) < minObserved)
        throw Error("Read predates operation");
      fresh(result, started);
      publish({
        snapshot: result,
        loading: false,
        uncertain: false,
        ...(!v.dirty ? { priorities: result.profile.priorities } : {}),
      });
      return true;
    } catch {
      if (epoch === generation && !paused && !stopped && read === controller)
        publish({
          loading: false,
          message: v.uncertain
            ? v.message
            : "Current information could not be refreshed. Try refreshing again.",
        });
    } finally {
      clearTimeout(timeout);
      if (read === controller) read = undefined;
    }
  }
  async function refreshAfterOperation(minObserved = -Infinity) {
    contentVersion++;
    read?.abort();
    read = undefined;
    return refresh(minObserved);
  }
  async function submit(command: AdvisorCommand) {
    if (!v.snapshot || v.busy || v.uncertain || paused || stopped) return;
    const epoch = generation,
      controller = new AbortController();
    operation = controller;
    publish({ busy: command.op === "ask" ? "ask" : "save", message: "" });
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
      const response = await request("/api/owner/advisor", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        redirect: "error",
        headers: {
          "x-nevora-owner-advisor": "1",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
        signal: controller.signal,
      });
      if (epoch !== generation || paused || stopped) return;
      if ([401, 403, 404].includes(response.status)) {
        retire(errors[response.status === 404 ? "disabled" : "forbidden"]);
        return;
      }
      const body: unknown = await response.json();
      if (epoch !== generation || paused || stopped) return;
      if (!response.ok) {
        const code =
          record(body) && typeof body.code === "string" ? body.code : "";
        publish({
          message:
            errors[code] ??
            "The request failed. Refresh history before trying again.",
          conflict: code === "conflict" && command.op === "save_priorities",
          uncertain: [
            "prior_attempt_failed",
            "cancelled",
            "provider_failed",
            "busy",
          ].includes(code),
        });
        await refreshAfterOperation();
        return;
      }
      const result =
        command.op === "ask" ? parseAnswer(body) : parseSaved(body);
      controller.signal.throwIfAborted();
      if (result.authority !== authority) {
        retire("Your access changed. Refresh to continue.");
        return;
      }
      // Fence reads begun before this operation completed. A fresh GET anchors
      // the result to a new monotonic request start, even after a long POST.
      const authorized = await refreshAfterOperation(
        Date.parse(result.observedAt),
      );
      if (epoch !== generation || paused || stopped) return;
      controller.signal.throwIfAborted();
      if (!authorized) throw Error("Fresh access required");
      if (result.state === "answered")
        publish({
          answer: result.answer,
          question: "",
          message: "Answer received. Review its sources before deciding.",
        });
      else if (
        v.snapshot &&
        v.snapshot.profile.revision > result.profile.revision
      )
        publish({
          priorities: result.profile.priorities,
          dirty: true,
          conflict: true,
          message:
            "Your priorities were saved, then changed elsewhere. Review the current saved priorities before saving again.",
        });
      else
        publish({
          snapshot: v.snapshot
            ? { ...v.snapshot, profile: result.profile }
            : null,
          priorities: result.profile.priorities,
          dirty: false,
          conflict: false,
          message: "Priorities saved.",
        });
    } catch {
      if (epoch === generation && !paused && !stopped) {
        publish({
          uncertain: true,
          message:
            "The result is unknown after a connection interruption or cancellation. Refresh history before starting another request.",
        });
        await refreshAfterOperation();
      }
    } finally {
      clearTimeout(timeout);
      if (operation === controller) {
        operation = undefined;
        publish({ busy: null });
      }
    }
  }
  return {
    start() {
      if (stopped) return;
      paused = false;
      void refresh();
    },
    refresh,
    pause() {
      paused = true;
      retire();
    },
    stop() {
      stopped = true;
      paused = true;
      retire();
    },
    editQuestion(question: string) {
      publish({ question });
    },
    editPriorities(priorities: string) {
      publish({ priorities, dirty: true });
    },
    reviewConflict() {
      publish({
        conflict: false,
        message:
          "Review complete. Save your edit deliberately to replace the current priorities.",
      });
    },
    ask() {
      if (
        v.snapshot?.connection !== "available" ||
        !v.question.trim() ||
        v.question.length > 2000
      )
        return Promise.resolve();
      return submit({
        op: "ask",
        requestId: crypto.randomUUID(),
        message: v.question,
      });
    },
    save() {
      if (v.conflict || v.priorities.length > 2000) return Promise.resolve();
      return submit({
        op: "save_priorities",
        requestId: crypto.randomUUID(),
        expectedRevision: v.snapshot?.profile.revision ?? 0,
        priorities: v.priorities,
      });
    },
    cancel() {
      operation?.abort();
    },
  };
}
