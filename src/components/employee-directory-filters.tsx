"use client";
import { useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import styles from "./employee-directory.module.css";

export function EmployeeDirectoryFilters({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const submitter = event.nativeEvent instanceof SubmitEvent ? event.nativeEvent.submitter : null;
    const data = new FormData(event.currentTarget, submitter);
    const params = new URLSearchParams();
    for (const [key, value] of data) if (typeof value === "string" && value) params.set(key, value);
    startTransition(() => router.push(`/app/employees?${params.toString()}`, { scroll: false }));
  }
  return <form action="/app/employees" method="get" className={styles.toolbar} onSubmit={submit} aria-busy={pending}>
    {children}
    {pending ? <p className={styles.pending} role="status">Updating employees...</p> : null}
  </form>;
}
