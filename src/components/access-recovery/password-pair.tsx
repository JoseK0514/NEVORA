"use client";

import { useEffect, useRef, useState } from "react";
import { EyeIcon } from "@phosphor-icons/react/dist/ssr/Eye";
import { EyeSlashIcon } from "@phosphor-icons/react/dist/ssr/EyeSlash";
import { MIN_PASSWORD_CHARACTERS, passwordLength } from "@/lib/auth/password-requirements";
import { AUTH_COPY, type AuthLang } from "@/lib/auth-copy";
import { FieldError, FieldInvalid } from "@/components/auth-premium/auth-validation";
import { RuleLine } from "@/components/auth-premium/password-rules";
import { ACCESS_COPY } from "./copy";
import "./access-recovery.css";

/** The password pair of "Choose a new password" and "Set up your account", at every width (Phase 5, PB-016, PB-037).
 * Empty placeholders. The length rule is the helper of the first field and the match is the helper of the second, so a
 * rule sits under the field it describes. Each helper has a grey dot until it is true and a green check after. Two
 * passwords that differ are said in red, in the one field error style, only after the person leaves the second field or
 * the form refuses the pair. A rule is announced once, when it becomes true, never on every key.
 * Both fields have the eye, and either one shows or hides both.
 * Presentation only: the form still checks the length and compares the two values on submit, exactly as before. */
export function PasswordPair({ prefix, lang, mismatch = false, newLabel, confirmLabel, errorId, advice, className }: {
  prefix: "activation" | "reset";
  lang: AuthLang;
  /** The form compared the two passwords on submit and they differ. */
  mismatch?: boolean;
  newLabel: string;
  confirmLabel: string;
  /** The id the form's own error uses, so the fields can point at it. */
  errorId?: string;
  /** One line of advice under the first field's rule (never a rule the server does not enforce). */
  advice?: string;
  /** An extra class on the group (the phone presentation keeps its own marker). */
  className?: string;
}) {
  const t = AUTH_COPY[lang], group = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false), [password, setPassword] = useState(""), [confirm, setConfirm] = useState("");
  const [left, setLeft] = useState(false), [said, setSaid] = useState("");
  const first = `${prefix}-password`, second = `${prefix}-confirm-password`, mismatchId = errorId ?? `${second}-error`;
  useEffect(() => {
    const form = group.current?.closest("form");
    const clear = () => { setPassword(""); setConfirm(""); setVisible(false); setLeft(false); setSaid(""); };
    form?.addEventListener("reset", clear);
    return () => form?.removeEventListener("reset", clear);
  }, []);
  const longEnough = passwordLength(password) >= MIN_PASSWORD_CHARACTERS, same = Boolean(confirm) && confirm === password;
  // Said in red once the two values differ and either the form refused the pair or the person left the second field.
  // Until something is typed nothing differs, so a refused form that was cleared shows no stale error.
  const differs = Boolean(confirm) && confirm !== password && (mismatch || left);
  function typed(nextPassword: string, nextConfirm: string) {
    const nowLong = passwordLength(nextPassword) >= MIN_PASSWORD_CHARACTERS, nowSame = Boolean(nextConfirm) && nextConfirm === nextPassword;
    if (nowSame && !same) setSaid(t.activation.passwordsMatch);
    else if (nowLong && !longEnough) setSaid(t.reset.lengthMet);
    else if (!nowLong && !nowSame) setSaid("");
    setPassword(nextPassword); setConfirm(nextConfirm);
  }
  const eye = <button type="button" className="q-in__eye" aria-pressed={visible} aria-controls={`${first} ${second}`} aria-label={t.showPasswords} onClick={() => setVisible(!visible)}>
    {visible ? <EyeIcon size={20} weight="bold" aria-hidden="true" focusable="false" /> : <EyeSlashIcon size={20} weight="bold" aria-hidden="true" focusable="false" />}
  </button>;
  return <div ref={group} className={className ? `ar-pair ${className}` : "ar-pair"}>
    <div className="q-fl">
      <label htmlFor={first}>{newLabel}</label>
      <div className="q-in__wrap">
        <input id={first} className="q-in" name="password" type={visible ? "text" : "password"} required minLength={MIN_PASSWORD_CHARACTERS}
          autoComplete="new-password" autoCorrect="off" autoCapitalize="none" spellCheck={false} enterKeyHint="next"
          aria-describedby={`${first}-hint ${advice ? `${first}-advice ` : ""}${first}-invalid`}
          data-msg-required={t.invalid.newPassword} data-msg-invalid={t.invalid.newPassword}
          onInput={event => typed(event.currentTarget.value, confirm)} />
        {eye}
      </div>
      <RuleLine id={`${first}-hint`} state={longEnough ? "ok" : "idle"} text={t.atLeast15} />
      {advice ? <span className="ar-rule ar-rule--plain" id={`${first}-advice`}>{advice}</span> : null}
      <FieldInvalid id={first} />
    </div>
    <div className="q-fl" data-invalid={differs ? "" : undefined}>
      <label htmlFor={second}>{confirmLabel}</label>
      <div className="q-in__wrap">
        <input id={second} className="q-in" name="confirmPassword" type={visible ? "text" : "password"} required minLength={MIN_PASSWORD_CHARACTERS}
          autoComplete="new-password" autoCorrect="off" autoCapitalize="none" spellCheck={false} enterKeyHint="go"
          aria-invalid={differs || (mismatch && !same) || undefined} aria-describedby={`${differs ? mismatchId : `${second}-hint`} ${second}-invalid`}
          data-msg-required={t.invalid.confirm} data-msg-invalid={t.invalid.confirm}
          onInput={event => { setLeft(false); typed(password, event.currentTarget.value); }} onBlur={() => setLeft(true)} />
        {eye}
      </div>
      {differs ? <FieldError id={mismatchId}>{ACCESS_COPY[lang].activation.mismatch}</FieldError>
        : <RuleLine id={`${second}-hint`} state={same ? "ok" : "idle"} text={t.activation.passwordsMatch} />}
      <FieldInvalid id={second} />
    </div>
    <span className="ar-sr" role="status" aria-live="polite">{said}</span>
  </div>;
}
