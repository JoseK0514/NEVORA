import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";

export type RuleState = "idle" | "ok" | "bad";
export type Rule = { state: RuleState; text: string; id?: string; alert?: boolean };

/** A password's live check mark. Phase 5 (PB-016): "not yet" is a 6px grey dot (it no longer reads as "remove" or
 * "blocked"), done is a green bold check. A mismatch has no mark of its own: it is said in red text, in the one field
 * error style, under the field it belongs to. The checks only describe; the form still checks the length and compares
 * the two passwords on submit, exactly as before. */
export function RuleIcon({ state }: { state: RuleState }) {
  return <span className="ar-rule__mark" aria-hidden="true">{state === "ok" ? <CheckIcon size={16} weight="bold" /> : <span className="ar-rule__dot" />}</span>;
}

/** One rule as the helper line of the field it describes (the length under "New password", the match under "Confirm").
 * The line is not a live region: its words change only when the rule becomes true (Phase 8: the match rule reads "Same as
 * the new password" until it does). The pair announces a rule once, when it becomes true, through its own polite status. */
export function RuleLine({ id, state, text }: { id: string; state: RuleState; text: string }) {
  return <span className="ar-rule" id={id} data-state={state}><RuleIcon state={state} /><span>{text}</span></span>;
}

export function PasswordRules({ id, rules, className = "q-auth__rules" }: { id: string; rules: Rule[]; className?: string }) {
  return <ul className={className} id={id}>
    {rules.map((rule, index) => <li key={index} data-state={rule.state} data-met={rule.state === "ok"}>
      <RuleIcon state={rule.state} /><span id={rule.id} role={rule.alert ? "alert" : undefined}>{rule.text}</span>
    </li>)}
  </ul>;
}
