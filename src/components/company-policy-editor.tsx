"use client";
import { useState } from "react";
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
}: {
  history: PolicyRevision[];
  locations: { id: string; name: string }[];
}) {
  const [scope, setScope] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [retry, setRetry] = useState<object | null>(null);
  const current = history.find((h) => h.locationId === (scope || null));
  async function submit(form: HTMLFormElement) {
    const data = new FormData(form),
      attendance: Record<string, unknown> = {},
      labor: Record<string, unknown> = { ...(current?.settings.labor ?? {}) };
    for (const [key] of fields) {
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
        effectiveFrom: data.get(`${key}.effective`),
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
          "Review thresholds and ISO effective timestamps, including timezone. Correct the fields and save again.",
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
      setNotice("Saved. Reload to see the current revision.");
    } catch {
      setNotice(
        "Outcome unconfirmed. Retry the same command. Your original values and operation reference are retained.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <label>
        Policy scope{" "}
        <select
          value={scope}
          disabled={busy || retry !== null}
          onChange={(e) => setScope(e.target.value)}
        >
          <option value="">Company default</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>
      <p>
        Revision {current?.revision ?? 0}. Missing location fields inherit
        company values; Not Configured explicitly disables a rule.
      </p>
      <form
        key={scope + ":" + (current?.revision ?? 0)}
        className="employee-form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(e.currentTarget);
        }}
      >
        {fields.map(([key, label]) => {
          const rule = (
            key === "overtimeRisk"
              ? current?.settings.labor?.overtimeRisk
              : current?.settings.attendance?.[key]
          ) as Record<string, unknown> | null | undefined;
          return (
            <fieldset key={key} disabled={busy || retry !== null}>
              <legend>{label}</legend>
              <label>
                Configuration{" "}
                <select
                  name={`${key}.mode`}
                  defaultValue={
                    rule === undefined
                      ? "inherit"
                      : rule === null
                        ? "none"
                        : "configured"
                  }
                >
                  <option value="inherit">
                    {scope
                      ? "Inherit company default"
                      : "Not Configured (absent)"}
                  </option>
                  <option value="none">Not Configured (explicit)</option>
                  <option value="configured">Configured</option>
                </select>
              </label>
              <label>
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
                Effective from (ISO timestamp with timezone){" "}
                <input
                  name={`${key}.effective`}
                  placeholder="2030-01-01T00:00:00Z"
                  defaultValue={String(rule?.effectiveFrom ?? "")}
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
                      <option>OPEN</option>
                      <option>CLOSED</option>
                      <option>BOTH</option>
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
                      <option>BUSINESS_DAY</option>
                      <option>BUSINESS_WEEK</option>
                    </select>
                  </label>
                  <label>
                    Aggregation{" "}
                    <select
                      name={`${key}.aggregation`}
                      defaultValue={String(rule?.aggregation ?? "COMPANY")}
                    >
                      <option>COMPANY</option>
                      <option>LOCATION</option>
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
                    Week starts (0 Sunday–6 Saturday){" "}
                    <input
                      type="number"
                      min="0"
                      max="6"
                      name={`${key}.weekStart`}
                      defaultValue={String(rule?.weekStartsOn ?? 1)}
                    />
                  </label>
                </>
              )}
            </fieldset>
          );
        })}
        <button className="button primary" disabled={busy} type="submit">
          {retry ? "Retry original policy command" : "Save policy revision"}
        </button>
        <button
          className="button secondary"
          type="button"
          onClick={() => window.location.reload()}
        >
          Reload policies
        </button>
        <p role="status">{notice}</p>
      </form>
      <h2>Policy history</h2>
      <ul>
        {history
          .filter((h) => h.locationId === (scope || null))
          .map((h) => (
            <li key={h.operationId}>
              Revision {h.revision} · {h.changedAt} ·{" "}
              {h.changedKeys.join(", ") || "No configured field changes"}
            </li>
          ))}
      </ul>
      <p>
        Finance calculations: unavailable until trusted calculation methods and
        required customer inputs are supplied.
      </p>
    </>
  );
}
