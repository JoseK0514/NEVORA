"use client";

import { useState } from "react";
import { SelectField } from "./select-field";
import type {
  OperationalRuleProfile,
  RuleSetting,
} from "../lib/shift-changes/types";
import { PolicySaveForm } from "./policy-save-form";
import { PendingButton } from "./wave-a/pending-button";
import { saveOperationalRulesAction } from "../app/app/employees/actions";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { OPERATIONAL_RULE_FIELDS_COPY } from "./operational-rule-fields-copy";

const rules = ["minimumRest", "maximumShift", "maximumDaily", "breaks", "projectedOvertime"] as const;
type Words = (typeof OPERATIONAL_RULE_FIELDS_COPY)["en"];
const reviewStatusOptions = (t: Words) => (["UNKNOWN", "NOT_APPLICABLE", "CONFIGURED"] as const).map(value => ({ value, label: t.status[value] }));

function RuleFields({
  rule,
  title,
  setting,
}: {
  rule: (typeof rules)[number];
  title: string;
  setting: RuleSetting<unknown>;
}) {
  const lang = usePortalLang(), t = OPERATIONAL_RULE_FIELDS_COPY[lang];
  const [status, setStatus] = useState(setting.status);
  const value = (setting.status === "CONFIGURED"
    ? setting.value
    : {}) as Record<string, string | number | boolean>;

  const numeric = (name: string, label: string) => (
    <label className="wa-field">
      <span className="wa-field__label">{label}</span>
      <input
        name={`${rule}.${name}`}
        type="number"
        min="0"
        max="525600"
        step="1"
        required
        defaultValue={(value[name] as number) ?? ""}
      />
    </label>
  );

  return (
    <div className="wa-rule">
      <h3 className="wa-rule__title">{title}</h3>
      <SelectField
        className="wa-select"
        name={`${rule}.status`}
        label={t.reviewStatus}
        value={status}
        onChange={(event) =>
          setStatus(event.target.value as typeof status)
        }
        options={reviewStatusOptions(t)}
      />
      {status === "CONFIGURED" ? (
        <div className="wa-rule__values">
          {rule === "breaks" ? (
            <>
              {numeric("afterMinutes", t.breakAfter)}
              {numeric("minimumMinutes", t.minimumBreak)}
              <SelectField
                className="wa-select"
                name={`${rule}.paid`}
                label={t.breakPayment}
                required
                defaultValue={
                  typeof value.paid === "boolean" ? String(value.paid) : ""
                }
                options={[
                  { value: "", label: t.chooseExplicitly },
                  { value: "true", label: t.paid },
                  { value: "false", label: t.unpaid },
                ]}
              />
            </>
          ) : rule === "projectedOvertime" ? (
            <>
              {numeric("weeklyMinutes", t.weeklyThreshold)}
              <SelectField
                className="wa-select"
                name={`${rule}.routing`}
                label={t.routing}
                required
                defaultValue={(value.routing as string) ?? ""}
                options={[
                  { value: "", label: t.chooseRouting },
                  { value: "MANAGER_REVIEW", label: t.managerReview },
                  { value: "ALLOW", label: t.allow },
                ]}
              />
            </>
          ) : (
            numeric("minutes", t.duration)
          )}
          <SelectField
            className="wa-select"
            name={`${rule}.timeBasis`}
            label={t.timeBasis}
            required
            defaultValue={(value.timeBasis as string) ?? ""}
            options={[
              { value: "", label: t.chooseTimeBasis },
              { value: "ELAPSED", label: t.elapsed },
              { value: "WALL_CLOCK", label: t.wallClock },
            ]}
          />
          {rule === "maximumDaily" ? (
            <SelectField
              className="wa-select"
              name={`${rule}.window`}
              label={t.dailyWindow}
              required
              defaultValue={(value.window as string) ?? ""}
              options={[
                { value: "", label: t.chooseWindow },
                { value: "BUSINESS_CALENDAR_DAY", label: t.businessDay },
                { value: "ROLLING_24_HOURS", label: t.rolling },
              ]}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function OperationalRuleFields({
  employeeId,
  profile,
  canEdit,
}: {
  employeeId: string;
  profile: OperationalRuleProfile;
  canEdit: boolean;
}) {
  const lang = usePortalLang(), t = OPERATIONAL_RULE_FIELDS_COPY[lang];
  // Wave A: the Owner review sits behind one disclosure in its own card. The words are unchanged (legal wording: Jose approves).
  return (
    <details className="wa-disclosure" data-tone="neutral">
      <summary className="wa-disclosure__summary">{t.summary}</summary>
      <div className="wa-card-body">
      <p className="wa-field__help" lang={lang}>{t.disclaimer}</p>
      {canEdit ? (
        <PolicySaveForm
          revision={profile.revision}
          action={saveOperationalRulesAction}
        >
          <input type="hidden" name="employeeId" value={employeeId} />
          {rules.map(rule => (
            <RuleFields
              key={rule}
              rule={rule}
              title={t.rules[rule]}
              setting={profile[rule]}
            />
          ))}
          <PendingButton pending={t.saving} block>{t.save}</PendingButton>
        </PolicySaveForm>
      ) : (
        <dl className="wa-facts wa-facts--flush">
          {rules.map(rule => (
            <div className="wa-fact" key={rule}>
              <dt>{t.rules[rule]}</dt>
              <dd>
                {profile[rule].status === "UNKNOWN"
                  ? t.unknown
                  : profile[rule].status === "NOT_APPLICABLE"
                    ? t.notApplicable
                    : Object.entries(profile[rule].value)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(" · ")}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {profile.reviewedAt ? <p className="wa-field__help">{t.lastReview(profile.reviewedAt)}</p> : null}
      </div>
    </details>
  );
}
