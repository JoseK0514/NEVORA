"use client";
import { useEffect, useState } from "react";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import type { readAttendancePolicies } from "@/lib/business-improvements/attendance-policy/service";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { CONFIGURED_ATTENDANCE_COPY } from "./configured-attendance-policies-copy";
type Result = Awaited<ReturnType<typeof readAttendancePolicies>>;
type Words = (typeof CONFIGURED_ATTENDANCE_COPY)["en"];
const checkedAt = (value: string, t: Words) => {
  const date = new Date(value.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00"));
  return Number.isFinite(date.getTime()) ? t.times(new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date)) : t.justNow;
};
const minutes = (ns: string, t: Words) =>
  t.minutes((Number(BigInt(ns) / BigInt(1000000000)) / 60).toFixed(1));
export function ConfiguredAttendancePolicies() {
  const t = CONFIGURED_ATTENDANCE_COPY[usePortalLang()], names = t.names;
  const [result, setResult] = useState<Result | null>(null),
    [status, setStatus] = useState(t.loading);
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
      clear(t.loading);
      if (document.visibilityState === "hidden" || !navigator.onLine) {
        setStatus(t.offlineHidden);
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
            clear(t.expired),
          Math.min(body.validForMs, 45000),
        );
      } catch {
        if (active && current === generation)
          clear(t.unavailable);
      }
    };
    const visible = () =>
        document.visibilityState === "hidden"
          ? clear(t.paused)
          : void load(),
      offline = () => clear(t.offline);
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
  }, [t]);
  // Final verification F (F02): a quiet disclosure row inside the attendance review's card, above its footer, with a
  // 16px caret that turns when it opens (details and summary carry the expanded state), never a card of its own.
  return (
    <details className="c-arev__compare">
      <summary className="c-arev__compare-s">
        <span>{t.whatWeCompare}</span>
        <CaretDownIcon className="c-arev__compare-ic" weight="bold" aria-hidden="true" />
      </summary>
      <div className="c-arev__compare-b">
      <p>{t.disclaimer}</p>
      {status && <p role="status">{status}</p>}
      {result?.state === "ready" && (
        <>
          {/* TC-32: a readable check time; source hashes and revision numbers stay out of the manager's view. */}
          <p>{t.checked(checkedAt(result.observedAt, t))}</p>
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
                      ? t.notConfigured
                      : d.state === "unverifiable"
                        ? t.unverifiable
                        : t.observations(d.observations.length)}
                    {d.observations.map((o) => (
                      <div key={o.measurementId}>
                        {result.labels.employees.find(
                          (e) => e.id === o.employeeId,
                        )?.name ?? o.employeeId}{" "}
                        · {t.observed} {minutes(o.valueNanoseconds, t)} · {t.threshold}{" "}
                        {minutes(o.thresholdNanoseconds, t)}
                        <details>
                          <summary>{t.sourceReference}</summary>
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
      </div>
    </details>
  );
}
