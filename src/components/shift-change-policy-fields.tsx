"use client";

import { SelectField } from "./select-field";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { shiftCopy } from "./shift-copy";
import type { ShiftChangePolicy } from "../lib/shift-changes/types";
import { PolicyForm, PolicyOrderError } from "./wave-b-forms";
import { saveShiftChangePolicyAction } from "../app/app/schedule/settings/actions";

export function ShiftChangePolicyFields({
  policy,
  canEdit,
}: {
  policy: ShiftChangePolicy | null;
  canEdit: boolean;
}) {
  const t = shiftCopy(usePortalLang()).policy;
  return (
    // Phase 2 (C9, Nov 23, 2026): Trades and Coverage straight under the rule's row (the rule's row already names it), with
    // one line that matters: who sets them for a Manager, what happens before they are set for the Owner.
    <div className="c-rf-policy">
      <p className="c-rf-help">{canEdit ? t.ownerHelp : t.managerHelp}</p>
      {(["swap", "coverage"] as const).map((scope) => {
        const current = policy?.[scope];
        const content = (
          <>
            <input type="hidden" name="scope" value={scope} />
            <SelectField
              name="mode"
              label={t.approved}
              className="c-field c-rf-selectfield"
              defaultValue={current?.mode ?? ""}
              options={[
                { value: "", label: t.notSet },
                { value: "AUTOMATIC_WHEN_VALID", label: t.automatic },
                { value: "MANAGER_REVIEW", label: t.managerReviews },
              ]}
            />
            <label className="c-field">
              <span className="c-field__label">{t.askLabel}</span>
              <input
                className="c-in"
                name="submissionAdvanceMinutes"
                type="number"
                min="0"
                max="525600"
                step="1"
                defaultValue={current?.submissionAdvanceMinutes ?? ""}
              />
              <span className="c-field__help">{t.askHelp}</span>
            </label>
            <label className="c-field">
              <span className="c-field__label">{t.finishLabel}</span>
              <input
                className="c-in"
                name="completionAdvanceMinutes"
                type="number"
                min="0"
                max="525600"
                step="1"
                defaultValue={current?.completionAdvanceMinutes ?? ""}
              />
              {canEdit ? <PolicyOrderError /> : null}
              <span className="c-field__help">{t.finishHelp}</span>
            </label>
          </>
        );
        return (
          <section key={scope} className="c-rf-scope">
            <h2 className="c-rf-scope__t">{scope === "swap" ? t.trades : t.coverage}</h2>
            {canEdit ? (
              <PolicyForm
                revision={current?.revision ?? 0}
                action={saveShiftChangePolicyAction}
                saveLabel={t.save(scope)}
              >
                {content}
              </PolicyForm>
            ) : (
              <dl className="c-rf-facts">
                <div><dt>{t.approved}</dt>
                <dd>
                  {current?.mode === "AUTOMATIC_WHEN_VALID"
                    ? t.automatic
                    : current?.mode === "MANAGER_REVIEW"
                      ? t.managerReviews
                      : t.unknown}
                </dd></div>
                <div><dt>{t.askAtLeast}</dt>
                <dd>
                  {current?.submissionAdvanceMinutes == null
                    ? t.unknown
                    : t.minutesBefore(current.submissionAdvanceMinutes)}
                </dd></div>
                <div><dt>{t.finishAtLeast}</dt>
                <dd>
                  {current?.completionAdvanceMinutes == null
                    ? t.unknown
                    : t.minutesBefore(current.completionAdvanceMinutes)}
                </dd></div>
              </dl>
            )}
          </section>
        );
      })}
    </div>
  );
}
