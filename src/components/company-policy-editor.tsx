"use client";
import { useState, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { keepWhole } from "@/lib/keep-whole";
import { useRouter } from "next/navigation";
import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowClockwise";
import { formatBusinessDateTimeInput, formatBusinessTimestamp, policyEffectiveInstant } from "@/lib/business-time";
import type { PolicyRevision } from "@/lib/business-improvements/company-policies/service";
import type { CompanyPolicySettings } from "@/lib/business-improvements/company-policies/model";
import { Status } from "./kit/kit";
import { Notice } from "@/app/app/settings/wave-c-kit";
import { ButtonLabel, Field, FieldErrors, FormActions, useFieldErrors } from "@/app/app/settings/wave-c-form";

const fields = [
  ["lateness", "Lateness"],
  ["earlyDeparture", "Early departure"],
  ["longEntry", "Unusually long entry"],
  ["missingClockIn", "No clock‑in recorded"],
  ["missingClockOut", "No clock‑out recorded"],
  ["overtimeRisk", "Actual-time overtime risk"],
] as const;
type Tone = "info" | "done" | "urgent";
const subscribe = () => () => {};

/** Wave C: Company policies on the kit form pattern. One card per rule; the field names and the
 * command sent to the server are unchanged, and a failed save keeps its retained request for a safe retry. */
export function CompanyPolicyEditor({
  history,
  locations,
  timeZone,
}: {
  timeZone: string;
  history: PolicyRevision[];
  locations: { id: string; name: string }[];
}) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const submitGate = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);
  const [scope, setScope] = useState(""),
    [notice, setNotice] = useState<{ tone: Tone; title?: string; text: string } | null>(null),
    [busy, setBusy] = useState(false),
    [retry, setRetry] = useState<object | null>(null);
  const [modes, setModes] = useState<Record<string, string>>({});
  const current = history.find((h) => h.locationId === (scope || null));
  const { errors, handlers } = useFieldErrors(Object.fromEntries(fields.flatMap(([key]) => [
    [`${key}.threshold`, { missing: "Enter the threshold in minutes.", range: "Enter whole minutes, 0 or more." }],
    [`${key}.effective`, { missing: "Choose when this rule starts.", fallback: "Choose a date and time when this rule starts." }],
  ])));
  const say = (tone: Tone, text: string, title?: string) => { setNotice({ tone, text, title }); if (tone !== "info") requestAnimationFrame(() => feedback.current?.focus()); };

  async function submit(form: HTMLFormElement) {
    if (submitGate.current) return;
    const data = new FormData(form),
      attendance: Record<string, unknown> = {},
      labor: Record<string, unknown> = { ...(current?.settings.labor ?? {}) };
    for (const [key] of fields) {
      if (retry) break;
      const mode = data.get(`${key}.mode`),
        section = key === "overtimeRisk" ? labor : attendance;
      if (mode === "inherit") {
        delete section[key];
        continue;
      }
      if (mode === "none") {
        section[key] = null;
        continue;
      }
      const rule: Record<string, unknown> = {
        thresholdMinutes: Number(data.get(`${key}.threshold`)),
        comparison: data.get(`${key}.comparison`),
        effectiveFrom: policyEffectiveInstant(String(data.get(`${key}.effective`) ?? ""), (key === "overtimeRisk" ? current?.settings.labor?.overtimeRisk : current?.settings.attendance?.[key])?.effectiveFrom, timeZone),
      };
      if (key === "longEntry")
        Object.assign(rule, {
          basis: data.get(`${key}.basis`),
          appliesTo: data.get(`${key}.appliesTo`),
        });
      if (key === "missingClockIn" || key === "missingClockOut")
        Object.assign(rule, {
          association: "CAPTURED_PUBLISHED_SHIFT",
          cutoff:
            key === "missingClockOut"
              ? "AFTER_SCHEDULE_END"
              : data.get(`${key}.cutoff`),
        });
      if (key === "overtimeRisk")
        Object.assign(rule, {
          basis: data.get(`${key}.basis`),
          window: data.get(`${key}.window`),
          aggregation: data.get(`${key}.aggregation`),
          dayBoundaryTime: data.get(`${key}.boundary`),
          ...(data.get(`${key}.window`) === "BUSINESS_WEEK"
            ? { weekStartsOn: Number(data.get(`${key}.weekStart`)) }
            : {}),
        });
      section[key] = rule;
    }
    const settings = { version: 1, attendance, labor } as CompanyPolicySettings;
    const command = retry ?? {
      operationId: crypto.randomUUID(),
      expectedRevision: current?.revision ?? 0,
      locationId: scope || null,
      settings,
    };
    setRetry(command);
    submitGate.current = true;
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/company-policies", {
        method: "POST",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "x-nevora-company-policies": "1",
        },
        body: JSON.stringify(command),
      });
      if (response.status === 401 || response.status === 403) { setRetry(null); say("urgent", "Your access ended. Sign in again to edit policies.", "Sign in again"); return; }
      if (response.status === 400) {
        setRetry(null);
        say("urgent", "Check the thresholds and effective dates, then save again.", "Not saved");
        return;
      }
      if (response.status === 409) {
        setRetry(null);
        say("urgent", "Policies changed somewhere else. Reload before editing again.", "Not saved");
        return;
      }
      if (!response.ok) throw Error();
      setRetry(null);
      say("done", "Your team’s attendance review uses them from their effective dates.", "Policies saved");
      router.refresh();
    } catch {
      say("urgent", "We couldn’t confirm whether your changes were saved. Retry safely with the same request, or reload to check the current policies.", "Save not confirmed");
    } finally {
      submitGate.current = false;
      setBusy(false);
    }
  }
  const locked = busy || retry !== null || !hydrated;
  const scopeHistory = history.filter((h) => h.locationId === (scope || null));
  return (
    <div className="wc-main">
      <section className="nv-card" aria-labelledby="policy-scope-title">
        <div className="nv-card__head">
          <h2 className="nv-card__title" id="policy-scope-title">Where these rules apply</h2>
          <span className="nv-card__meta">{current ? `Saved version ${current.revision}` : "No saved changes yet"}</span>
        </div>
        <div className="nv-card__body wc-fields">
          <Field kind="select" label="Policy scope" id="policy-scope" value={scope} disabled={locked}
            help={<><p>{scope ? "Location rules use the company default unless you set their own. Choose Off to turn a rule off at this location." : "Set the company default for each attendance review rule. A rule that’s off flags nothing."}</p>
              <p>Company time: {timeZone.split("/").at(-1)?.replaceAll("_", " ")}</p></>}
            onChange={(e) => { setScope(e.target.value); setModes({}); setNotice(null); }}>
            <option value="">Company default</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Field>
        </div>
      </section>
      <form
        noValidate
        key={scope + ":" + (current?.revision ?? 0)}
        className="wc-form"
        data-guard={hydrated ? undefined : ""}
        aria-busy={busy}
        aria-label="Attendance rules"
        {...handlers}
        onSubmit={(e) => {
          e.preventDefault();
          if (!e.currentTarget.checkValidity()) return;
          void submit(e.currentTarget).catch(() => say("urgent", "Choose a valid effective date and time in your company timezone. Times skipped or repeated by daylight saving time need a different selection.", "Check the effective date"));
        }}
      >
        <FieldErrors errors={errors}>
          {fields.map(([key, label]) => {
            const rule = (
              key === "overtimeRisk"
                ? current?.settings.labor?.overtimeRisk
                : current?.settings.attendance?.[key]
            ) as Record<string, unknown> | null | undefined;
            const mode = modes[key] ?? (rule === undefined ? "inherit" : rule === null ? "none" : "configured");
            const id = `policy-${key}`;
            return (
              <fieldset key={key} disabled={locked} className="nv-card wc-rule" aria-labelledby={`${id}-title`}>
                <div className="nv-card__head">
                  <h2 className="nv-card__title" id={`${id}-title`}>{label}</h2>
                  <span className="nv-card__meta"><Status tone={mode === "configured" ? "done" : "neutral"}>{mode === "configured" ? "Custom" : mode === "none" ? "Off" : scope ? "Company default" : "Off by default"}</Status></span>
                </div>
                <div className="nv-card__body wc-fields">
                  <Field kind="select" label="Rule setting" id={`${id}-mode`} name={`${key}.mode`} value={mode}
                    onChange={event => setModes(value => ({ ...value, [key]: event.target.value }))}>
                    <option value="inherit">{scope ? "Use company default" : "Off by default"}</option>
                    <option value="none">Off</option>
                    <option value="configured">Custom threshold</option>
                  </Field>
                  <div className="wc-rule__fields wc-pair" hidden={mode !== "configured"}>
                    <Field label="Threshold" unit="min" id={`${id}-threshold`} name={`${key}.threshold`} type="number" min="0" max="525600" inputMode="numeric" required={mode === "configured"}
                      defaultValue={rule ? String(rule.thresholdMinutes) : ""} />
                    <Field kind="select" label="Comparison" id={`${id}-comparison`} name={`${key}.comparison`} defaultValue={String(rule?.comparison ?? "GT")}>
                      <option value="GT">Greater than</option>
                      <option value="GTE">Greater than or equal to</option>
                    </Field>
                    <Field label="Effective from" id={`${id}-effective`} name={`${key}.effective`} type="datetime-local" required={mode === "configured"}
                      defaultValue={formatBusinessDateTimeInput(rule?.effectiveFrom ? String(rule.effectiveFrom) : undefined, timeZone)} />
                    {key === "longEntry" && <>
                      <Field kind="select" label="Time basis" id={`${id}-basis`} name={`${key}.basis`} defaultValue={String(rule?.basis ?? "RECORDED_ELAPSED")}>
                        <option value="RECORDED_ELAPSED">Recorded elapsed</option>
                        <option value="EFFECTIVE_ELAPSED">Effective elapsed after corrections</option>
                      </Field>
                      <Field kind="select" label="Entries" id={`${id}-applies`} name={`${key}.appliesTo`} defaultValue={String(rule?.appliesTo ?? "BOTH")}>
                        <option value="OPEN">Currently open</option>
                        <option value="CLOSED">Completed</option>
                        <option value="BOTH">Open and completed</option>
                      </Field>
                    </>}
                    {key === "missingClockIn" && (
                      <Field kind="select" label="Observation cutoff" id={`${id}-cutoff`} name={`${key}.cutoff`} defaultValue={String(rule?.cutoff ?? "AFTER_SCHEDULE_END")}>
                        <option value="AFTER_SCHEDULE_START">After published start</option>
                        <option value="AFTER_SCHEDULE_END">After published end</option>
                      </Field>
                    )}
                    {key === "overtimeRisk" && <>
                      <Field kind="select" label="Time basis" id={`${id}-basis`} name={`${key}.basis`} defaultValue={String(rule?.basis ?? "EFFECTIVE_ELAPSED_INCLUDING_BREAKS")}>
                        <option value="RECORDED_ELAPSED_INCLUDING_BREAKS">Recorded elapsed including breaks</option>
                        <option value="EFFECTIVE_ELAPSED_INCLUDING_BREAKS">Effective elapsed including breaks</option>
                      </Field>
                      <Field kind="select" label="Window" id={`${id}-window`} name={`${key}.window`} defaultValue={String(rule?.window ?? "BUSINESS_WEEK")}>
                        <option value="BUSINESS_DAY">Business day</option>
                        <option value="BUSINESS_WEEK">Business week</option>
                      </Field>
                      <Field kind="select" label="Aggregation" id={`${id}-aggregation`} name={`${key}.aggregation`} defaultValue={String(rule?.aggregation ?? "COMPANY")}>
                        <option value="COMPANY">Across the company</option>
                        <option value="LOCATION">At this location</option>
                      </Field>
                      <Field label="Business day starts" id={`${id}-boundary`} type="time" name={`${key}.boundary`} defaultValue={String(rule?.dayBoundaryTime ?? "00:00")} />
                      <Field kind="select" label="Week starts on" id={`${id}-week`} name={`${key}.weekStart`} defaultValue={String(rule?.weekStartsOn ?? 1)}>
                        {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day, i) => <option key={day} value={i}>{day}</option>)}
                      </Field>
                    </>}
                  </div>
                </div>
              </fieldset>
            );
          })}
        </FieldErrors>
        <p className="nv-sr" role="status" aria-live="polite">{busy ? "Saving…" : ""}</p>
        <FormActions sticky>
          {notice ? <div ref={feedback} tabIndex={-1} className="wc-feedback" role={notice.tone === "urgent" ? "alert" : "status"}><Notice tone={notice.tone} title={notice.title} action={notice.title === "Sign in again" ? <Link className="nv-link" href="/login">Go to sign in</Link> : undefined}>{notice.text}</Notice></div> : null}
          <button className="nv-btn" data-kind="primary" disabled={busy} type="submit"><ButtonLabel pending={busy} idle={retry ? "Retry the same save" : "Save policies"} busy="Saving…" /></button>
        </FormActions>
      </form>
      <section className="nv-card" aria-labelledby="policy-history-title">
        <div className="nv-card__head"><h2 className="nv-card__title" id="policy-history-title">Policy history</h2></div>
        {scopeHistory.length ? <ul className="nv-rows">
          {scopeHistory.map((h) => (
            <li key={h.operationId}><div className="nv-row">
              <span className="nv-row__text">
                <span className="nv-row__title">Version {h.revision}</span>
                <span className="nv-row__meta">{keepWhole(formatBusinessTimestamp(h.changedAt, timeZone))} · {h.changedKeys.map(key => fields.find(([name]) => key.includes(name))?.[1] ?? "Policy setting").join(", ") || "No rule changes"}</span>
              </span>
            </div></li>
          ))}
        </ul> : <div className="nv-card__body"><p className="wc-muted">No saved policy changes for this scope yet.</p></div>}
        <div className="wc-card-actions"><button className="nv-link" type="button" disabled={busy} onClick={() => window.location.reload()}><ArrowClockwiseIcon size={18} aria-hidden="true" />Reload policies</button></div>
      </section>
    </div>
  );
}
