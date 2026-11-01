"use client";
import { useEffect, useRef, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import styles from "./employee-directory.module.css";

const TYPE_DELAY = 300;

/** Filters apply as you type (after a short pause) and as soon as a select
 * changes. The Apply button stays for keyboard users and no-JS forms. Typed
 * queries replace the history entry, so Back doesn't replay every keystroke. */
export function EmployeeDirectoryFilters({ children, className }: { children: ReactNode; className?: string }) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const timer = useRef<number | null>(null);
  const [pending, startTransition] = useTransition();

  function navigate(data: FormData, replace: boolean) {
    const params = new URLSearchParams();
    for (const [key, value] of data) if (typeof value === "string" && value) params.set(key, value);
    const href = `/app/employees?${params.toString()}`;
    startTransition(() => (replace ? router.replace(href, { scroll: false }) : router.push(href, { scroll: false })));
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const submitter = event.nativeEvent instanceof SubmitEvent ? event.nativeEvent.submitter : null;
    navigate(new FormData(event.currentTarget, submitter), false);
  }
  function typed(event: FormEvent<HTMLFormElement>) {
    const field = event.target;
    if (field instanceof HTMLSelectElement) { if (timer.current) window.clearTimeout(timer.current); navigate(new FormData(event.currentTarget, applyButton()), false); return; }
    if (!(field instanceof HTMLInputElement) || field.type !== "search") return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (form.current) navigate(new FormData(form.current, applyButton()), true);
    }, TYPE_DELAY);
  }
  // The Apply button carries the current status; status segments are submit buttons too.
  function applyButton() { return form.current?.querySelector<HTMLButtonElement>('button[data-apply]') ?? form.current?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? null; }

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  // Filters apply as you type once scripts run, so the Apply button stops being a tab stop (IS-35).
  useEffect(() => {
    const apply = form.current?.querySelector<HTMLButtonElement>("button[data-apply]");
    if (apply) { apply.tabIndex = -1; apply.setAttribute("aria-hidden", "true"); }
  }, []);

  return <form ref={form} action="/app/employees" method="get" className={className ?? styles.toolbar} onSubmit={submit} onChange={typed} aria-busy={pending}>
    {children}
    {pending ? <p className={className ? "premium-note" : styles.pending} role="status">Updating employees…</p> : null}
  </form>;
}

/** Reliability R-03: the search field keeps what the person is typing. A results page that arrives for an earlier
 * query never replaces the draft (or moves the caret) while the field has focus; a query that changes from elsewhere
 * (Clear search, Back) fills it in once the field isn't being typed in. */
export function EmployeeSearchInput({ query, placeholder }: { query: string; placeholder: string }) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const field = input.current;
    if (field && document.activeElement !== field && field.value !== query) field.value = query;
  }, [query]);
  return <input ref={input} name="q" type="search" defaultValue={query} placeholder={placeholder} maxLength={128} />;
}
