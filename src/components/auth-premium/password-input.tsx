"use client";

import { useState, type InputHTMLAttributes } from "react";
import { EyeIcon } from "@phosphor-icons/react/dist/ssr/Eye";
import { EyeSlashIcon } from "@phosphor-icons/react/dist/ssr/EyeSlash";

const Eye = ({ open }: { open: boolean }) => open
  ? <EyeIcon size={22} weight="regular" aria-hidden="true" focusable="false" />
  : <EyeSlashIcon size={22} weight="regular" aria-hidden="true" focusable="false" />;

/** A password field with a show/hide button inside it. The input keeps every attribute it had; `controls` lists the
 * ids the button reveals together (a password and its confirmation). */
export function PasswordInput({ showLabel, hideLabel, controls, ...input }: InputHTMLAttributes<HTMLInputElement> & {
  id: string; showLabel: string; hideLabel: string; controls?: string[];
}) {
  const [visible, setVisible] = useState(false);
  const ids = controls ?? [input.id];
  return (
    <div className="ap-box ap-box--toggle">
      <input {...input} type={visible ? "text" : "password"} className="ap-input" />
      <button type="button" className="ap-eye" aria-pressed={visible} aria-controls={ids.join(" ")} aria-label={visible ? hideLabel : showLabel}
        onClick={() => {
          setVisible(!visible);
          for (const id of ids.slice(1)) { const other = document.getElementById(id); if (other instanceof HTMLInputElement) other.type = visible ? "password" : "text"; }
        }}>
        <Eye open={!visible} />
      </button>
    </div>
  );
}
