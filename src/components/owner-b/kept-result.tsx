"use client";
import { useState, type ReactNode } from "react";

/* Final polish (Nov 21, 2026; confirmations A #8): a decision's result arrives with the page (the review action's own
 * redirect flags). The shell removes those flags from the address at once, so the next quiet re-read of the page (a
 * refresh after a notification, a staffing check) came back without the result and it vanished a second after it was
 * drawn. The list keeps the last result it was given for as long as the person stays on the page; leaving the page
 * drops it. Nothing is read or sent. */
export function useKeptResult(result: ReactNode): ReactNode {
  const [kept, setKept] = useState(result);
  if (result && result !== kept) setKept(result);
  return result || kept;
}

/** The kept result as a list's first row. */
export function KeptResultRow({ result, lang }: { result: ReactNode; lang?: string }) {
  const kept = useKeptResult(result);
  return kept ? <li className="q-result" lang={lang}>{kept}</li> : null;
}
