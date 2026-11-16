"use client";
import { BRouteError } from "@/components/owner-b/b-route-error";

/** Phase 2 (package D): the one Direction B route error screen. The words are the ones this page had; the alert now says
 * all of them once (it was the card's two lines only). */
export default function EmployeesError({ retry }: { retry: () => void }) {
  return <BRouteError title="Team" sub="Team didn’t load. Check your connection, then try again."
    spoken="Team didn’t load. Check your connection, then try again. Directory unavailable. Try again to load your employees."
    cardTitle="Directory unavailable" line="Try again to load your employees." onRetry={retry} />;
}
