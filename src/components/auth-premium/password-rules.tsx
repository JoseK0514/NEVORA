import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { MinusCircleIcon } from "@phosphor-icons/react/dist/ssr/MinusCircle";
import { XCircleIcon } from "@phosphor-icons/react/dist/ssr/XCircle";

export type RuleState = "idle" | "ok" | "bad";
export type Rule = { state: RuleState; text: string; id?: string; alert?: boolean };

/** Review B4 (Nov 10, 2026, NV-195, NV-312): a password's live checks. "Not yet" is a grey minus (it no longer reads
 * as a radio button), done is a green check (green = done), a mismatch is a red cross. The checks only describe; the form
 * still checks the length and compares the two passwords on submit, exactly as before. */
export function RuleIcon({ state }: { state: RuleState }) {
  return state === "ok" ? <CheckCircleIcon size={18} weight="bold" aria-hidden="true" />
    : state === "bad" ? <XCircleIcon size={18} weight="bold" aria-hidden="true" />
    : <MinusCircleIcon size={18} weight="bold" aria-hidden="true" />;
}

export function PasswordRules({ id, rules, className = "q-auth__rules" }: { id: string; rules: Rule[]; className?: string }) {
  return <ul className={className} id={id} aria-live="polite">
    {rules.map((rule, index) => <li key={index} data-state={rule.state} data-met={rule.state === "ok"}>
      <RuleIcon state={rule.state} /><span id={rule.id} role={rule.alert ? "alert" : undefined}>{rule.text}</span>
    </li>)}
  </ul>;
}
