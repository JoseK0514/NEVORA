"use client";
import { useEffect, useState } from "react";
import type { readAttendancePolicies } from "@/lib/business-improvements/attendance-policy/service";
type Result = Awaited<ReturnType<typeof readAttendancePolicies>>;
const names: Record<string, string> = {
  missing_clock_in: "No clock-in",
  missing_clock_out: "No clock-out",
  policy_lateness: "Lateness",
  policy_early_departure: "Early departure",
  unusually_long_entry: "Unusually long entry",
  overtime_risk: "Actual-time overtime risk",
};
const checkedAt = (value: string) => {
  const date = new Date(value.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00"));
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date) : "just now";
};
const minutes = (ns: string) =>
  `${(Number(BigInt(ns) / BigInt(1000000000)) / 60).toFixed(1)} minutes`;
export function ConfiguredAttendancePolicies() {
  const [result, setResult] = useState<Result | null>(null),
    [status, setStatus] = useState("Loading configured attendance comparisons");
  useEffect(() => {
    let active = true,
      controller: AbortController | null = null,
      expiry: ReturnType<typeof setTimeout> | undefined,
      generation = 0;
    const clear = (message: string) => {
      generation++;
      controller?.abort();
      clearTimeout(expiry);
      setResult(null);
      setStatus(message);
    };
    const load = async () => {
      clear("Loading configured attendance comparisons");
      if (document.visibilityState === "hidden" || !navigator.onLine) {
        setStatus("Policy observations unavailable while offline or hidden");
        return;
      }
      const current = generation;
      controller = new AbortController();
      try {
        const response = await fetch("/api/manager/attendance?policies=1", {
          credentials: "same-origin",
          cache: "no-store",
          headers: { "x-nevora-attendance": "1" },
          signal: controller.signal,
        });
        const body = (await response.json()) as Result;
        if (!active || current !== generation) return;
        if (
          !response.ok ||
          body.state !== "ready" ||
          !Array.isArray(body.locations) ||
          !Number.isFinite(body.validForMs) ||
          body.validForMs <= 0
        )
          throw Error();
        setResult(body);
        setStatus("");
        expiry = setTimeout(
          () =>
            clear(
              "Policy observations expired. Refresh to review current facts.",
            ),
          Math.min(body.validForMs, 45000),
        );
      } catch {
        if (active && current === generation)
          clear(
            "Configured attendance observations unavailable. Refresh to try again.",
          );
      }
    };
    const visible = () =>
        document.visibilityState === "hidden"
          ? clear("Policy observations paused")
          : void load(),
      offline = () => clear("Policy observations unavailable offline");
    void load();
    window.addEventListener("focus", load);
    window.addEventListener("online", load);
    window.addEventListener("offline", offline);
    document.addEventListener("visibilitychange", visible);
    return () => {
      active = false;
      generation++;
      controller?.abort();
      clearTimeout(expiry);
      window.removeEventListener("focus", load);
      window.removeEventListener("online", load);
      window.removeEventListener("offline", offline);
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);
  return (
    <details className="panel">
      <summary>What we compare</summary>
      <p>
        Factual comparisons use configured thresholds and saved source
        revisions. They do not establish absence, disciplinary outcomes,
        overtime pay, or processed payroll.
      </p>
      {status && <p role="status">{status}</p>}
      {result?.state === "ready" && (
        <>
          {/* TC-32: a readable check time; source hashes and revision numbers stay out of the manager's view. */}
          <p>Checked {checkedAt(result.observedAt)}</p>
          {result.locations.map((location) => (
            <section key={location.locationId}>
              <h3>
                {result.labels.locations.find(
                  (l) => l.id === location.locationId,
                )?.name ?? location.locationId}
              </h3>
              <ul>
                {location.detectors.map((d) => (
                  <li key={d.kind}>
                    <strong>{names[d.kind]}</strong>:{" "}
                    {d.reason === "policy_not_selected"
                      ? "Not configured"
                      : d.state === "unverifiable"
                        ? "Unverifiable — complete source evidence is unavailable"
                        : `${d.observations.length} observations`}
                    {d.observations.map((o) => (
                      <div key={o.measurementId}>
                        {result.labels.employees.find(
                          (e) => e.id === o.employeeId,
                        )?.name ?? o.employeeId}{" "}
                        · observed {minutes(o.valueNanoseconds)} · threshold{" "}
                        {minutes(o.thresholdNanoseconds)}
                        <details>
                          <summary>Source reference</summary>
                          {o.sourceVersion}
                        </details>
                      </div>
                    ))}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </details>
  );
}
