"use client";

import { useState } from "react";
import { SelectField } from "./select-field";
import type {
  OperationalRuleProfile,
  RuleSetting,
} from "../lib/shift-changes/types";
import { PolicySaveForm } from "./policy-save-form";
import { saveOperationalRulesAction } from "../app/app/employees/actions";

const rules = [
  ["minimumRest", "Minimum rest"],
  ["maximumShift", "Maximum shift duration"],
  ["maximumDaily", "Maximum daily duration"],
  ["breaks", "Scheduled breaks"],
  ["projectedOvertime", "Projected overtime routing"],
] as const;

const reviewStatusOptions = [
  { value: "UNKNOWN", label: "Unknown — needs review" },
  { value: "NOT_APPLICABLE", label: "Reviewed not applicable" },
  { value: "CONFIGURED", label: "Configured" },
] as const;

function RuleFields({
  rule,
  title,
  setting,
}: {
  rule: (typeof rules)[number][0];
  title: string;
  setting: RuleSetting<unknown>;
}) {
  const [status, setStatus] = useState(setting.status);
  const value = (setting.status === "CONFIGURED"
    ? setting.value
    : {}) as Record<string, string | number | boolean>;

  const numeric = (name: string, label: string) => (
    <label>
      {label}
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
    <div className="operational-rule-row">
      <h3>{title}</h3>
      <SelectField
        name={`${rule}.status`}
        label="Review status"
        value={status}
        onChange={(event) =>
          setStatus(event.target.value as typeof status)
        }
        options={reviewStatusOptions}
      />
      {status === "CONFIGURED" ? (
        <div className="operational-rule-values">
          {rule === "breaks" ? (
            <>
              {numeric("afterMinutes", "Break required after (minutes)")}
              {numeric("minimumMinutes", "Minimum break (minutes)")}
              <SelectField
                name={`${rule}.paid`}
                label="Break payment"
                required
                defaultValue={
                  typeof value.paid === "boolean" ? String(value.paid) : ""
                }
                options={[
                  { value: "", label: "Choose explicitly" },
                  { value: "true", label: "Paid" },
                  { value: "false", label: "Unpaid" },
                ]}
              />
            </>
          ) : rule === "projectedOvertime" ? (
            <>
              {numeric("weeklyMinutes", "Weekly threshold (minutes)")}
              <SelectField
                name={`${rule}.routing`}
                label="Routing"
                required
                defaultValue={(value.routing as string) ?? ""}
                options={[
                  { value: "", label: "Choose routing" },
                  { value: "MANAGER_REVIEW", label: "Manager review" },
                  { value: "ALLOW", label: "Allow when otherwise valid" },
                ]}
              />
            </>
          ) : (
            numeric("minutes", "Duration (minutes)")
          )}
          <SelectField
            name={`${rule}.timeBasis`}
            label="Time basis"
            required
            defaultValue={(value.timeBasis as string) ?? ""}
            options={[
              { value: "", label: "Choose time basis" },
              { value: "ELAPSED", label: "Elapsed time" },
              { value: "WALL_CLOCK", label: "Wall clock time" },
            ]}
          />
          {rule === "maximumDaily" ? (
            <SelectField
              name={`${rule}.window`}
              label="Daily window"
              required
              defaultValue={(value.window as string) ?? ""}
              options={[
                { value: "", label: "Choose window" },
                { value: "BUSINESS_CALENDAR_DAY", label: "Business calendar day" },
                { value: "ROLLING_24_HOURS", label: "Rolling 24 hours" },
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
  return (
    <details className="shift-policy-disclosure">
      <summary>Owner-reviewed operational rules</summary>
      <p>
        Scheduled projections are not worked time, proof of breaks taken, final
        overtime pay or legal certification. Review applicability explicitly;
        no values are inferred from the employee’s role.
      </p>
      {canEdit ? (
        <PolicySaveForm
          revision={profile.revision}
          action={saveOperationalRulesAction}
        >
          <input type="hidden" name="employeeId" value={employeeId} />
          {rules.map(([rule, title]) => (
            <RuleFields
              key={rule}
              rule={rule}
              title={title}
              setting={profile[rule]}
            />
          ))}
          <button className="button primary" type="submit">
            Save operational review
          </button>
        </PolicySaveForm>
      ) : (
        <dl>
          {rules.map(([rule, title]) => (
            <div key={rule}>
              <dt>{title}</dt>
              <dd>
                {profile[rule].status === "UNKNOWN"
                  ? "Unknown"
                  : profile[rule].status === "NOT_APPLICABLE"
                    ? "Reviewed not applicable"
                    : Object.entries(profile[rule].value)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(" · ")}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {profile.reviewedAt ? <p>Last Owner review: {profile.reviewedAt}</p> : null}
    </details>
  );
}
