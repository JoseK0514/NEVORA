"use client";

import { useState, type ReactNode, type FormEvent } from "react";
export type ConfigurationResult = { error?: string; success?: string };
/** Keep entered values on validation/network failure; each form owns its feedback. */
export function ConfigurationForm({
  action,
  children,
  className = "employee-form",
}: {
  action: (data: FormData) => Promise<ConfigurationResult>;
  children: ReactNode;
  className?: string;
}) {
  const [result, setResult] = useState<ConfigurationResult>({});
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setResult({});
    try {
      setResult(await action(data));
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
