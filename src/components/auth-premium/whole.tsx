import type { ReactNode } from "react";

/** Premium pass FD (Nov 18, 2026): a name that moves to the next line whole instead of splitting ("join Northside /
 * QA Workforce."). auth-b.css draws it as an inline block, so a name longer than the line still wraps inside itself. */
export function Whole({ children }: { children: ReactNode }) {
  return <span className="q-whole">{children}</span>;
}
