# Sign-in limits and Spanish account emails (November 2, 2026)

Jose approved the open engineering items from the Access review. Everything here was tested with fictional data on local databases and a local mail server.

## Sign-in limits

- **One store network can no longer lock out a shift.** Each sign-in still counts against the client address before the password is checked, so parallel guesses can't slip through. Once the password is proven, `releaseLoginAddress` gives that slot back, so the address budget (60 per 15 minutes) counts only failures. The per-Employee-ID budget (10 per 15 minutes) still counts every attempt. A failed refund leaves the attempt counted. Account deletion's password check is unchanged.
- **One person can no longer block passkey sign-in for everyone.** The platform-wide cap in `consumeAuthLimit` was 300 attempts per 15 minutes across all companies. It is now `AUTH_GLOBAL_CAP` = 20,000, which still bounds how many rows one bucket can create.
- Tests:
  - `phase-e-home.integration.ts`: 80 successful sign-ins from one address, then failures stop at 60, and refunds never go below zero (44 of 44 passed).
  - `passkeys.integration.ts`: 320 different people in one window, while the per-person limit still applies (37 of 37 passed).
  - `login/actions.test.ts`: a proven password releases the slot, a wrong one doesn't, and a failed release still signs in.

## Spanish account emails

- The invitation, password reset and password-changed emails now read in English, then Spanish, with the link in each half. Subjects carry both, for example "Activate your NEVORA account / Activa tu cuenta de NEVORA". The recipient's language isn't stored when an Owner invites them or a reset is requested, so both languages are sent.
- One copy module, `src/lib/auth/account-email-copy.ts`, feeds SMTP delivery and local capture. Links, lifetimes, recipients and transport rules are unchanged.
- Tests: the new `account-email-copy.test.ts`, plus the invitation SMTP tests, which check the exact link line through a local SMTP server (32 of 32 passed).
- **Needs review:** a native Spanish speaker should read the wording. The policy pages (`src/lib/legal/policies.ts`) are still English only; translating legal text needs Legal.

## Also

- The old pay statement tests decode WinAnsi explicitly, so they pass on Node builds with small ICU: 55 of 55 here, where 11 failed before.

Not run here: hosted CI, WebKit and Firefox, and real mail providers. Deployment remains subject to Jose's authorization. No migration is needed for this round.
