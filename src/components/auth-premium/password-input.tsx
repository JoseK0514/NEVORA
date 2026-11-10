"use client";

import { useState, type InputHTMLAttributes } from "react";
import { EyeIcon } from "@phosphor-icons/react/dist/ssr/Eye";
import { EyeSlashIcon } from "@phosphor-icons/react/dist/ssr/EyeSlash";

/* Review B4 (Nov 10, 2026): Phosphor bold at 20px, as everywhere in Direction B. */
const Eye = ({ open }: { open: boolean }) => open
  ? <EyeIcon size={20} weight="bold" aria-hidden="true" focusable="false" />
  : <EyeSlashIcon size={20} weight="bold" aria-hidden="true" focusable="false" />;

/** A password field with a show/hide button inside it. The input keeps every attribute it had; `controls` lists the
 * ids the button reveals together (a password and its confirmation). The button's name stays "Show password(s)" and
 * `aria-pressed` carries the state, so it is announced once ("Show password, toggle button, pressed"). */
export function PasswordInput({ showLabel, hideLabel: _hideLabel, controls, quiet = false, ...input }: InputHTMLAttributes<HTMLInputElement> & {
  id: string; showLabel: string;
  /** Kept for callers; the state is exposed through aria-pressed, not by renaming the button. */
  hideLabel?: string; controls?: string[];
  /** Quiet (v4): the grey field with the eye inside it. */
  quiet?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const ids = controls ?? [input.id];
  return (
    <div className={quiet ? "q-in__wrap" : "ap-box ap-box--toggle"}>
      <input {...input} type={visible ? "text" : "password"} className={quiet ? "q-in" : "ap-input"} />
      <button type="button" className={quiet ? "q-in__eye" : "ap-eye"} aria-pressed={visible} aria-controls={ids.join(" ")} aria-label={showLabel}
        onClick={() => {
          setVisible(!visible);
          for (const id of ids.slice(1)) { const other = document.getElementById(id); if (other instanceof HTMLInputElement) other.type = visible ? "password" : "text"; }
        }}>
        <Eye open={!visible} />
      </button>
    </div>
  );
}
