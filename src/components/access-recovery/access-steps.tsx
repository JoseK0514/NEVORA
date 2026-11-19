import type { AuthLang } from "@/lib/auth-copy";
import { ACCESS_COPY, fill } from "./copy";

/** Where the person is in a short journey and what comes next: "Step 2 of 3", the step's name, and one bar per step
 * (done, current, to come). The bars are drawn; the words carry the meaning, so nothing is said by colour alone.
 * Server-renderable: it has no state of its own.
 * Phase 8 (Nov 17, 2026): `named={false}` where the page title already is the step's name ("Check your email", "Choose a
 * new password"), so the line reads "Step 2 of 3" and the title is not said twice; the bars still name every step. */
export function AccessSteps({ journey, current, lang = "en", named = true }: { journey: "activation" | "recovery"; /** 1-based. */ current: number; lang?: AuthLang; named?: boolean }) {
  const t = ACCESS_COPY[lang].steps, labels = t[journey], total = labels.length;
  const at = Math.min(Math.max(current, 1), total);
  return <div className="ar-steps" role="group" aria-label={t.label}>
    <p className="ar-steps__now"><span>{fill(t.of, { n: at, total })}</span>{named ? <b>{labels[at - 1]}</b> : null}</p>
    <ol className="ar-steps__bars">
      {labels.map((label, index) => <li key={label} data-state={index + 1 < at ? "done" : index + 1 === at ? "current" : "next"} aria-current={index + 1 === at ? "step" : undefined}>
        <span className="ar-sr">{fill(t.of, { n: index + 1, total })}: {label}</span>
      </li>)}
    </ol>
  </div>;
}
