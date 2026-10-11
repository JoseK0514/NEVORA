"use client";

import { useState } from "react";
import { EyeIcon } from "@phosphor-icons/react/dist/ssr/Eye";
import { EyeSlashIcon } from "@phosphor-icons/react/dist/ssr/EyeSlash";

export function ActivationPasswords({ errorId }: { errorId?: string }) {
  const [visible, setVisible] = useState(false);
  const type = visible ? "text" : "password";
  return (
    <>
      <div className="activation-password-field">
        <label htmlFor="activation-password">Create password</label>
        <div className="activation-password-input">
          <input id="activation-password" name="password" type={type} minLength={8}
            placeholder="Choose your password" autoComplete="new-password" required
            aria-describedby={["activation-password-hint", errorId].filter(Boolean).join(" ")} />
          <button type="button" className="activation-password-toggle" aria-pressed={visible}
            aria-controls="activation-password activation-confirm-password"
            aria-label={visible ? "Hide passwords" : "Show passwords"}
            onClick={() => setVisible(!visible)}>
            {visible ? <EyeSlashIcon size={20} weight="regular" aria-hidden="true" focusable="false" />
              : <EyeIcon size={20} weight="regular" aria-hidden="true" focusable="false" />}
          </button>
        </div>
        <p className="activation-hint" id="activation-password-hint">At least 8 characters.</p>
      </div>
      <label htmlFor="activation-confirm-password">Confirm password
        <input id="activation-confirm-password" name="confirmPassword" type={type} minLength={8}
          placeholder="Re-enter your password" autoComplete="new-password" required aria-describedby={errorId} />
      </label>
    </>
  );
}
