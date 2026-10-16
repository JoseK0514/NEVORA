"use client";
import { useEffect, useRef, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import styles from "./employee-directory.module.css";

const TYPE_DELAY = 300;

/** Filters apply as you type (after a short pause) and as soon as a select
 * changes. The Apply button stays for keyboard users and no-JS forms. Typed
 * queries replace the history entry, so Back doesn't replay every keystroke. */
export function EmployeeDirectoryFilters({ children }: { children: ReactNode }) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const timer = useRef<number | null>(null);
  const restore = useRef<{ start: number; end: number } | null>(null);
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
      // The search field remounts with the new query; keep the caret where the person left it.
      restore.current = { start: field.selectionStart ?? field.value.length, end: field.selectionEnd ?? field.value.length };
      if (form.current) navigate(new FormData(form.current, applyButton()), true);
    }, TYPE_DELAY);
  }
  function applyButton() { return form.current?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? null; }

  useEffect(() => {
    if (pending || !restore.current) return;
    const input = form.current?.querySelector<HTMLInputElement>('input[type="search"]');
    if (input) { input.focus({ preventScroll: true }); input.setSelectionRange(restore.current.start, restore.current.end); }
    restore.current = null;
  }, [pending]);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  return <form ref={form} action="/app/employees" method="get" className={styles.toolbar} onSubmit={submit} onChange={typed} aria-busy={pending}>
    {children}
    {pending ? <p className={styles.pending} role="status">Updating employees...</p> : null}
  </form>;
}
