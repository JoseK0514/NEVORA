"use client";

import Link from "next/link";
import { WarningCircle } from "@phosphor-icons/react";
import "./locations.css";

export default function LocationsError({ retry }: { retry: () => void }) {
  return <section className="configuration-page locations-page locations-feedback">
    <WarningCircle size={32} aria-hidden="true" />
    <h1>Locations unavailable</h1>
    <p role="alert">We couldn&apos;t load your locations. Try again to get the latest setup and Clocker links.</p>
    <div className="locations-feedback-actions"><button type="button" className="button primary" onClick={retry}>Try again</button><Link href="/app/settings" className="button secondary">Back to Settings</Link></div>
  </section>;
}
