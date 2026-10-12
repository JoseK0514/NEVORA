"use client";
import { useState,useRef } from "react";
import {useRouter} from "next/navigation";
import {formatBusinessDateTimeInput,formatBusinessTimestamp,policyEffectiveInstant} from "@/lib/business-time";
import type { PolicyRevision } from "@/lib/business-improvements/company-policies/service";
import type { CompanyPolicySettings } from "@/lib/business-improvements/company-policies/model";
const fields = [
  ["lateness", "Lateness"],
  ["earlyDeparture", "Early departure"],
  ["longEntry", "Unusually long entry"],
  ["missingClockIn", "Missing clock-in"],
  ["missingClockOut", "Missing clock-out"],
  ["overtimeRisk", "Actual-time overtime risk"],
] as const;
export function CompanyPolicyEditor({
  history,
  locations,
  timeZone,
}: {
  timeZone: string;
  history: PolicyRevision[];
  locations: { id: string; name: string }[];
}) {
  const router=useRouter();
  const submitGate=useRef(false);
  const [scope, setScope] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [retry, setRetry] = useState<object | null>(null);
  const [modes,setModes] = useState<Record<string,string>>({});
  const current = history.find((h) => h.locationId === (scope || null));
  async function submit(form: HTMLFormElement) {
    if(submitGate.current)return;
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
    submitGate.current=true;
    setBusy(true);
    setNotice("Saving…");
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
      if (response.status === 400) {
        setRetry(null);
        setNotice(
          "Check the thresholds and effective dates, then save again.",
        );
        return;
      }
      if (response.status === 409) {
        setRetry(null);
        setNotice("Policies changed. Reload before editing again.");
        return;
      }
      if (!response.ok) throw Error();
      setRetry(null);
      setNotice("Policies saved.");
      router.refresh();
    } catch {
      setNotice(
        "We could not confirm whether your changes were saved. Retry safely using the retained request, or refresh to check the current policies.",
      );
    } finally {
      submitGate.current=false;
      setBusy(false);
    }
  }
  return (
    <div className="company-policy-editor">
      <div className="policy-scope-panel"><label>
        Policy scope{" "}
        <select
          value={scope}
          disabled={busy || retry !== null}
          onChange={(e) => {setScope(e.target.value);setModes({});setNotice("");}}
        >
          <option value="">Company default</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>
      <p>{scope ? "Location rules use company defaults unless you set an override. Choose Disabled to turn a rule off at this location." : "Set company defaults for attendance and recorded-time review. Disabled rules do not produce comparisons."}</p><small>Version {current?.revision ?? 0} · Dates use {timeZone.replaceAll("_"," ")}</small></div>
      <form
        key={scope + ":" + (current?.revision ?? 0)}
        className="employee-form policy-form"
        aria-busy={busy}
        onSubmit={(e) => {
          e.preventDefault();
          void submit(e.currentTarget).catch(() => setNotice("Choose a valid effective date and time in your company timezone. Times skipped or repeated by daylight saving time need a different selection."));
        }}
      >
        {fields.map(([key, label]) => {
          const rule = (
            key === "overtimeRisk"
              ? current?.settings.labor?.overtimeRisk
              : current?.settings.attendance?.[key]
          ) as Record<string, unknown> | null | undefined;
          const mode=modes[key] ?? (rule === undefined ? "inherit" : rule === null ? "none" : "configured");
          return (
            <fieldset key={key} disabled={busy || retry !== null}>
              <legend>{label}</legend>
              <label>
                Rule setting{" "}
                <select
                  name={`${key}.mode`}
                  value={mode}
                  onChange={event=>setModes(value=>({...value,[key]:event.target.value}))}
                >
                  <option value="inherit">
                    {scope
                      ? "Inherit company default"
                      : "Disabled by default"}
                  </option>
                  <option value="none">Disabled</option>
                  <option value="configured">Custom threshold</option>
                </select>
              </label>
              <div className="policy-rule-fields" hidden={mode !== "configured"}><label>
                Threshold minutes{" "}
                <input
                  name={`${key}.threshold`}
                  type="number"
                  min="0"
                  max="525600"
                  defaultValue={rule ? String(rule.thresholdMinutes) : ""}
                />
              </label>
              <label>
                Comparison{" "}
                <select
                  name={`${key}.comparison`}
                  defaultValue={String(rule?.comparison ?? "GT")}
                >
                  <option value="GT">Greater than</option>
                  <option value="GTE">Greater than or equal</option>
                </select>
              </label>
              <label>
                Effective from{" "}
                <input
                  name={`${key}.effective`}
                  type="datetime-local"
                  defaultValue={formatBusinessDateTimeInput(rule?.effectiveFrom ? String(rule.effectiveFrom) : undefined,timeZone)}
                />
              </label>
              {key === "longEntry" && (
                <>
                  <label>
                    Time basis{" "}
                    <select
                      name={`${key}.basis`}
                      defaultValue={String(rule?.basis ?? "RECORDED_ELAPSED")}
                    >
                      <option value="RECORDED_ELAPSED">Recorded elapsed</option>
                      <option value="EFFECTIVE_ELAPSED">
                        Effective elapsed after corrections
                      </option>
                    </select>
                  </label>
                  <label>
                    Entries{" "}
                    <select
                      name={`${key}.appliesTo`}
                      defaultValue={String(rule?.appliesTo ?? "BOTH")}
                    >
                      <option value="OPEN">Currently open</option>
                      <option value="CLOSED">Completed</option>
                      <option value="BOTH">Open and completed</option>
                    </select>
                  </label>
                </>
              )}
              {key === "missingClockIn" && (
                <label>
                  Observation cutoff{" "}
                  <select
                    name={`${key}.cutoff`}
                    defaultValue={String(rule?.cutoff ?? "AFTER_SCHEDULE_END")}
                  >
                    <option value="AFTER_SCHEDULE_START">
                      After published start
                    </option>
                    <option value="AFTER_SCHEDULE_END">
                      After published end
                    </option>
                  </select>
                </label>
              )}
              {key === "overtimeRisk" && (
                <>
                  <label>
                    Time basis{" "}
                    <select
                      name={`${key}.basis`}
                      defaultValue={String(
                        rule?.basis ?? "EFFECTIVE_ELAPSED_INCLUDING_BREAKS",
                      )}
                    >
                      <option value="RECORDED_ELAPSED_INCLUDING_BREAKS">
                        Recorded elapsed including breaks
                      </option>
                      <option value="EFFECTIVE_ELAPSED_INCLUDING_BREAKS">
                        Effective elapsed including breaks
                      </option>
                    </select>
                  </label>
                  <label>
                    Window{" "}
                    <select
                      name={`${key}.window`}
                      defaultValue={String(rule?.window ?? "BUSINESS_WEEK")}
                    >
                      <option value="BUSINESS_DAY">Business day</option>
                      <option value="BUSINESS_WEEK">Business week</option>
                    </select>
                  </label>
                  <label>
                    Aggregation{" "}
                    <select
                      name={`${key}.aggregation`}
                      defaultValue={String(rule?.aggregation ?? "COMPANY")}
                    >
                      <option value="COMPANY">Across the company</option>
                      <option value="LOCATION">At this location</option>
                    </select>
                  </label>
                  <label>
                    Business day starts{" "}
                    <input
                      type="time"
                      name={`${key}.boundary`}
                      defaultValue={String(rule?.dayBoundaryTime ?? "00:00")}
                    />
                  </label>
                  <label>
                    Week starts on{" "}
                    <select
                      name={`${key}.weekStart`}
                      defaultValue={String(rule?.weekStartsOn ?? 1)}
                    >{["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map((day,i)=><option key={day} value={i}>{day}</option>)}</select>
                  </label>
                </>
              )}
            </div></fieldset>
          );
        })}
        <div className="policy-actions"><button className="button primary" disabled={busy} type="submit">
          {busy ? "Saving…" : retry ? "Retry retained save" : "Save policies"}
        </button>
        <button
          className="button secondary"
          type="button"
          disabled={busy}
          onClick={() => window.location.reload()}
        >
          Reload policies
        </button>
        </div><p className="policy-notice" role="status" aria-live="polite">{notice}</p>
      </form>
      <section className="policy-history"><h2>Policy history</h2>
      <ul>
        {history
          .filter((h) => h.locationId === (scope || null))
          .map((h) => (
            <li key={h.operationId}>
              Version {h.revision} · {formatBusinessTimestamp(h.changedAt,timeZone)} ·{" "}
              {h.changedKeys.map(key=>fields.find(([name])=>key.includes(name))?.[1] ?? "Policy setting").join(", ") || "No rule changes"}
            </li>
          ))}
      </ul>
      {!history.some(h=>h.locationId === (scope || null)) ? <p>No saved policy changes for this scope yet.</p> : null}</section>
    </div>
  );
}
