"use client";
import { ArrowClockwise } from "@phosphor-icons/react";
import styles from "@/components/employee-directory.module.css";
export default function EmployeesError({ retry }: { retry: () => void }) {
  return <div className={styles.directory}>
    <header className={styles.header}><div><h1>Team</h1><p>Team didn’t load. Check your connection, then try again.</p></div></header>
    <section className={styles.panel} aria-label="Employee directory"><div className={styles.empty} role="alert">
      <h2>Directory unavailable</h2><p>Try again to load your employees.</p>
      <button className={styles.retryAction} type="button" onClick={retry}><ArrowClockwise size={18} aria-hidden="true" /> Try again</button>
    </div></section>
  </div>;
}
