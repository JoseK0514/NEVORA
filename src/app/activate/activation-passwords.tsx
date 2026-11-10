"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import { PasswordInput } from "@/components/auth-premium/password-input";
import { FieldInvalid } from "@/components/auth-premium/auth-validation";
import { PasswordRules } from "@/components/auth-premium/password-rules";
import { AUTH_COPY, type AuthLang } from "@/lib/auth-copy";

type Rule = "idle" | "ok" | "bad";

/** Both passwords in one group, then two checks that follow what is typed. They only describe; the form still checks
 * the minimum length and compares the two values on submit, exactly as before. */
export function ActivationPasswords({ mismatch = false, errorId, quiet = false, lang = "en" }: { mismatch?: boolean; errorId?: string; /** Quiet (v4): Quiet fields; the checks read as one grey line each. */ quiet?: boolean; lang?: AuthLang }) {
  const t = AUTH_COPY[lang];
  const group = useRef<HTMLDivElement>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  useEffect(() => {
    const form = group.current?.closest("form");
    const clear = () => { setPassword(""); setConfirm(""); };
    form?.addEventListener("reset", clear);
    return () => form?.removeEventListener("reset", clear);
  }, []);
  const length: Rule = password.length >= 8 ? "ok" : "idle";
  const differs = mismatch && confirm !== password;
  const match: Rule = differs ? "bad" : confirm && confirm === password ? "ok" : "idle";
  const describedBy = ["activation-rules", differs || !mismatch ? errorId : undefined].filter(Boolean).join(" ");
  const dot = (rule: Rule) => <span className="act-rule__dot" aria-hidden="true">{rule === "ok" ? <CheckIcon size={11} weight="bold" /> : rule === "bad" ? <XIcon size={10} weight="bold" /> : null}</span>;
  // Review B4 (Nov 10, 2026): the words come from AUTH_COPY (NV-055), the checks use the Direction B marks (NV-312) and
  // each field names what is missing under itself (NV-190).
  if (quiet) return (
    <>
      <div ref={group}>
        <div className="q-fl">
          <label htmlFor="activation-password">{t.createPassword}</label>
          <PasswordInput quiet id="activation-password" name="password" minLength={8} placeholder={t.quiet.newPasswordPlaceholder} autoComplete="new-password" required
            aria-describedby={`${describedBy} activation-password-invalid`} controls={["activation-password", "activation-confirm-password"]}
            showLabel={t.showPasswords} data-msg-required={t.invalid.newPassword} data-msg-invalid={t.invalid.newPassword}
            onInput={event => setPassword(event.currentTarget.value)} />
          <FieldInvalid id="activation-password" />
        </div>
        <div className="q-fl" data-invalid={differs ? "" : undefined}>
          <label htmlFor="activation-confirm-password">{t.quiet.confirmPassword}</label>
          <input id="activation-confirm-password" className="q-in" name="confirmPassword" type="password" minLength={8}
            placeholder={t.quiet.typeAgain} autoComplete="new-password" required aria-invalid={differs || undefined}
            aria-describedby={`${describedBy} activation-confirm-password-invalid`} data-msg-required={t.invalid.confirm} data-msg-invalid={t.invalid.confirm}
            onInput={event => setConfirm(event.currentTarget.value)} />
          <FieldInvalid id="activation-confirm-password" />
        </div>
      </div>
      <PasswordRules id="activation-rules" rules={[
        { state: length, text: t.atLeast8, id: "activation-password-hint" },
        differs ? { state: "bad", text: t.activation.sameInBoth, id: errorId, alert: true } : { state: match, text: t.activation.passwordsMatch },
      ]} />
    </>
  );
  return (
    <>
      <div className="act-card" ref={group}>
        <div className="ap-field">
          <label className="ap-label" htmlFor="activation-password">Create password</label>
          <PasswordInput id="activation-password" name="password" minLength={8} placeholder="Choose your password" autoComplete="new-password" required
            aria-describedby={describedBy} controls={["activation-password", "activation-confirm-password"]}
            showLabel="Show passwords" hideLabel="Hide passwords" onInput={event => setPassword(event.currentTarget.value)} />
        </div>
        <div className="ap-field" data-invalid={differs ? "" : undefined}>
          <label className="ap-label" htmlFor="activation-confirm-password">Confirm password</label>
          <div className="ap-box">
            <input id="activation-confirm-password" className="ap-input" name="confirmPassword" type="password" minLength={8}
              placeholder="Re-enter your password" autoComplete="new-password" required aria-invalid={differs || undefined}
              aria-describedby={describedBy} onInput={event => setConfirm(event.currentTarget.value)} />
          </div>
        </div>
      </div>
      <ul className="act-rules" id="activation-rules">
        <li data-state={length}>{dot(length)}<span id="activation-password-hint">At least 8 characters.</span></li>
        <li data-state={match}>{dot(match)}{differs
          ? <span id={errorId} role="alert">Enter the same password in both fields.</span>
          : <span>Passwords match</span>}</li>
      </ul>
    </>
  );
}
