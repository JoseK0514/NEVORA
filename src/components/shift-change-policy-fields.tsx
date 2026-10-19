import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { SelectField } from "./select-field";
import type { ShiftChangePolicy } from "../lib/shift-changes/types";
import { PolicySaveForm } from "./policy-save-form";
import { saveShiftChangePolicyAction } from "../app/app/schedule/settings/actions";

export function ShiftChangePolicyFields({
  policy,
  canEdit,
}: {
  policy: ShiftChangePolicy | null;
  canEdit: boolean;
}) {
  return (
    <details className="wb-disclosure wb-disclosure--ruled wb-policy">
      <summary><span>Shift trade &amp; coverage policy</span><CaretDownIcon size={20} aria-hidden="true" /></summary>
      <p className="wb-note wb-card-lead">
        {canEdit ? "Owners can edit these settings; managers can view them." : "Owners edit these settings; you can view them."} Unknown values keep automatic
        completion unavailable. Each workflow saves on its own.
      </p>
      {(["swap", "coverage"] as const).map((scope) => {
        const current = policy?.[scope];
        const content = (
          <>
            <input type="hidden" name="scope" value={scope} />
            <SelectField
              name="mode"
              label="Approval mode"
              defaultValue={current?.mode ?? ""}
              options={[
                { value: "", label: "Unknown, needs review" },
                { value: "AUTOMATIC_WHEN_VALID", label: "Automatic when valid" },
                { value: "MANAGER_REVIEW", label: "Manager review" },
              ]}
            />
            <label className="wb-field">
              <span>Submission advance (minutes before start)</span>
              <input
                name="submissionAdvanceMinutes"
                type="number"
                min="0"
                max="525600"
                step="1"
                defaultValue={current?.submissionAdvanceMinutes ?? ""}
              />
              <span className="wb-help">Blank means unknown; zero is an explicit setting.</span>
            </label>
            <label className="wb-field">
              <span>Completion advance (minutes before start)</span>
              <input
                name="completionAdvanceMinutes"
                type="number"
                min="0"
                max="525600"
                step="1"
                defaultValue={current?.completionAdvanceMinutes ?? ""}
              />
              <span className="wb-help">
                Must not exceed submission advance. Existing requests keep
                their earlier deadline.
              </span>
            </label>
            <div className="wb-actions">
              <button type="submit" className="nv-btn" data-kind="primary">
                Save {scope === "swap" ? "trade" : "coverage"} policy
              </button>
            </div>
          </>
        );
        return (
          <section key={scope} className="wb-policy-scope">
            <h3 className="wb-strong">{scope === "swap" ? "Trades" : "Coverage"}</h3>
            {canEdit ? (
              <PolicySaveForm
                revision={current?.revision ?? 0}
                action={saveShiftChangePolicyAction}
              >
                {content}
              </PolicySaveForm>
            ) : (
              <dl className="wb-facts">
                <div><dt>Approval</dt>
                <dd>
                  {current?.mode === "AUTOMATIC_WHEN_VALID"
                    ? "Automatic when valid"
                    : current?.mode === "MANAGER_REVIEW"
                      ? "Manager review"
                      : "Unknown"}
                </dd></div>
                <div><dt>Submission advance</dt>
                <dd>
                  {current?.submissionAdvanceMinutes == null
                    ? "Unknown"
                    : `${current.submissionAdvanceMinutes} minutes`}
                </dd></div>
                <div><dt>Completion advance</dt>
                <dd>
                  {current?.completionAdvanceMinutes == null
                    ? "Unknown"
                    : `${current.completionAdvanceMinutes} minutes`}
                </dd></div>
              </dl>
            )}
          </section>
        );
      })}
    </details>
  );
}
