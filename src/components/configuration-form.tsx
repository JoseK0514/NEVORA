"use client";

import { useState, type ReactNode, type FormEvent } from "react";
export type ConfigurationResult = { error?: string; success?: string; updatedAt?: string };
/** Keep entered values on validation/network failure; each form owns its feedback. */
export function ConfigurationForm({
  action,
  children,
  className = "employee-form",
  reviewedUpdatedAt,
}: {
  action: (data: FormData) => Promise<ConfigurationResult>;
  children: ReactNode;
  className?: string;
  reviewedUpdatedAt?: string;
}) {
  const [result, setResult] = useState<ConfigurationResult>({});
  const [pending, setPending] = useState(false);
  // This version belongs to the mounted editable draft. An unrelated RSC refresh
  // can update server props without replacing dirty native/controlled inputs.
  const [draftUpdatedAt, setDraftUpdatedAt] = useState(reviewedUpdatedAt);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (draftUpdatedAt !== undefined) data.set('expectedUpdatedAt', draftUpdatedAt);
    setPending(true);
    setResult({});
    try {
      const saved = await action(data);
      setResult(saved);
      if (saved.success && !saved.error && saved.updatedAt && draftUpdatedAt !== undefined) setDraftUpdatedAt(saved.updatedAt);
    } catch {
      setResult({
        error:
          "Changes could not be saved. Your entries are preserved; try again.",
      });
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className={className} aria-busy={pending}>
      <fieldset disabled={pending} className="configuration-fields">
        {draftUpdatedAt !== undefined ? <input type="hidden" name="expectedUpdatedAt" value={draftUpdatedAt} /> : null}
        {children}
      </fieldset>
      {pending ? <p role="status">Saving…</p> : null}
      {result.error ? (
        <p role="alert" className="form-error">
          {result.error}
        </p>
      ) : null}
      {result.success ? (
        <p role="status" className="form-success">
          {result.success}
        </p>
      ) : null}
    </form>
  );
}
