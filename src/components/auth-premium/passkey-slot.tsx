import type { AuthCopy } from "@/lib/auth-copy";

/** Passkey / Face ID sign-in needs WebAuthn from Codex. The slot is built and stays off until then. */
export const PASSKEY_SIGN_IN_ENABLED = false;

export function PasskeySlot({ t }: { t: AuthCopy }) {
  if (!PASSKEY_SIGN_IN_ENABLED) return null;
  return (
    <>
      <div className="ap-or">{t.or}</div>
      <button type="button" className="ap-secondary" disabled>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          <path d="M3 8V5.5A2.5 2.5 0 0 1 5.5 3H8M16 3h2.5A2.5 2.5 0 0 1 21 5.5V8M21 16v2.5a2.5 2.5 0 0 1-2.5 2.5H16M8 21H5.5A2.5 2.5 0 0 1 3 18.5V16" />
          <path d="M9 9v1.5M15 9v1.5M12 9v4.2c0 .5-.4.8-.8.8H11M9.2 16.2a4.2 4.2 0 0 0 5.6 0" />
        </svg>
        <span className="ap-wide">{t.passkeyDesktop}</span><span className="ap-narrow">{t.passkeyPhone}</span>
      </button>
    </>
  );
}
