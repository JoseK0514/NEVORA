# Phase 5: signed-out pages and account-access screens (Nov 17, 2026)

Phase 5 of the Nov 11 plan. Commit `7cc7547ac918ee808b590a3c1d8f6706c16c17a3` on `claude-codex-collab-nevora`, built on `ad814bad` (the branch as pushed on Nov 17, which holds Development `22107a24`). Development had not moved when this was built. English and Spanish throughout.

Markup, copy and styles only. No authentication, session, activation, recovery, reset, passkey, rate-limit, token or redirect logic changed.

## What changed

74 files (2,602 lines added, 747 removed), in three packages.

| Area | Report | Main changes |
|---|---|---|
| Sign-in and the shared shell | [a-sign-in-and-shell.md](a-sign-in-and-shell.md) | The bare domain goes to sign-in. Three proof points on the panel. "Forgot password?" and "New here? Set up your account". The session-ended note, the too-many-attempts sentence and the passkey pill restyled. The title no longer swaps on first paint. For all six pages: one filled button in the card, alternatives as links 24px under it, a two-row phone band, 48px hit areas, a footer that stacks under 420px. |
| Forgot password, reset, activation, assisted recovery, mobile access | [b-recovery-reset-activation.md](b-recovery-reset-activation.md) | One word, "reset". Imperative titles. "Reset link accepted" in place of the code field when the link supplied it. One shared password pair with each rule under its field. A "Password updated" finish. The helper's receipt with a QR code, Copy link, time left and who does what. The mobile access pages brought to the same standard. |
| Privacy, Terms, Support, account deletion, 404, errors, billing | [c-policy-pages-deletion-errors.md](c-policy-pages-deletion-errors.md) | The language pill on Privacy and Terms. In Spanish: Spanish page chrome and one note that the document is in English. The deletion button inside the card. The first section open on phones with "Open all". The 560px 404. The digest passed on the global error screen. One filled button per state on the billing pages. |

## The tracker

Signed-out findings: 32 fixed, 2 partly, 3 open. Whole tracker: 133 fixed, 25 partly, 12 open.

| Finding | State | What remains |
|---|---|---|
| PB-013 | partly | Checking the code with the server when the page loads needs a server read. |
| PB-014 | partly | Two sentences in the signed-in app still use another word (`src/app/app/help/page.tsx:132`, `src/components/mobile-home-overview.tsx:57`). Email wording is the server's. |
| PB-022 | open | Email templates are the server's. Delivered as [a design request](evidence-policy-pages/email-design-request.md) with a static reference in both languages. Nothing is wired. |
| PB-023 | open | A first-sign-in welcome card needs a "first sign-in" fact. None exists in the session, the Home read or the database. |
| PB-026 | open | A password rule (common passwords, the Employee ID) is a server decision. |

## How it was checked

| Check | Result |
|---|---|
| Type check, lint on the changed files | Clean |
| Unit tests (`vitest run --dir src`, 1,025 files) | 14,925 pass. 1 fails by design: the manuals guard. One timing test (`phase-e-process`) failed in the full run and passes alone (13 of 13). |
| Browser, combined build, owned local server | 16 signed-out pages in English and Spanish at 320, 390, 900 and 1440: 128 checks, no horizontal overflow, no page errors |
| Per package | Every state, keyboard focus, reduced motion and 200% text on Sign in; details in each report |
| Pages that reuse the shell | Billing recovery, Clocker paused and the 404 are pixel-identical in English; Spanish differs only in the footer text |

**Real against forced.** Real local server: wrong credentials with the kept ID, the assisted flow end to end (issue a link, open it on a phone-sized page, a real reset), refused codes, "we asked for an email", the public pages. Opened by address rather than tripped for real: too many attempts, session ended, after activation. Forced in the page: 500, 503, lost replies, activation success, every passkey state, billing states other than "not reachable" and "no handoff".

**Not run:** the browser integration suites (three had selectors updated blind: `operator-password-browser`, `step4-lifecycle-browser`, `mobile-access-browser`), the QA scripts, a production build, a real phone camera on the QR code, Safari and Firefox, a screen reader, any email client.

Evidence: [evidence-sign-in/](evidence-sign-in/), [evidence-recovery/](evidence-recovery/), [evidence-policy-pages/](evidence-policy-pages/).

## The reset link on the helper's receipt

PB-008 asked for a QR code and a copy link, and both carry a recovery proof, so here is exactly where it lives:

- The code stays in component state and is cleared as before: on leaving the page, window blur, a hidden tab, going offline, expiry, or "Make another link".
- The link is built in the browser only when the QR is drawn or "Copy link" is pressed. It uses a URL fragment. It is never logged, stored, or put in a query string, an `href` or an image `src`.
- The QR is inline SVG drawn by a local encoder (`src/components/access-recovery/qr.ts`, no dependency, no network). It leaves the page when the receipt closes.
- After "Copy link" the device clipboard holds the link until something overwrites it. The page cannot clear that.
- One line next to the logic changed: the proof is now kept for the receipt at every width, not only with mobile access on. How it is read is unchanged.

Codex should review this part.

## For Codex

1. **The reset link on the receipt** (above), and the one changed line in `src/components/account-recovery.tsx`.
2. **Bare domain.** `src/app/page.tsx` redirects to `/login` or `/app` by the presence of the session cookie, and hard-codes the cookie name `fuel_session` because `session.ts` does not export it.
3. **Server sentence lookup.** The server still answers "we'll email recovery steps"; the page shows "a reset link" through an exact-match lookup. If the server sentence changes, the lookup key must change with it.
4. **One test in a server folder edited:** `src/app/api/auth/recovery/route.test.ts`, the expected Spanish display sentence only. Its security assertions are unchanged.
5. **Confirm** a password reset is allowed during the 15-minute sign-in pause (the new sentence says so).
6. **Wanted from the server:** a read that checks a reset code on page load (PB-013); the Employee ID carried from an emailed link to the finish (PB-017); a first-sign-in fact (PB-023); the password rule decision (PB-026); the emails (PB-022).
7. **Support reference:** still off. The public error screens now mount the same block through the same seam.
8. **Labels tests may match on:** "Reset your password", "Choose a new password", "Set up your account", "Email me a reset link", "I have a reset code" as a link, field messages, the footer without "(en inglés)", the deletion button's class.

## For you to decide

1. **Two proof sentences on sign-in** make claims: "Encrypted sign-in. Your employer controls your records." and "We aim to reply within two business days."
2. **Privacy and Terms in Spanish** need counsel. Until then they show English with a Spanish note.
3. **Activation:** the title is "Set up your account" and the button still says "Activate account".
4. **The reset finish** shows "Sign in" twice (the back pill and the button).
5. **The proof points also show on phones**, under the links. The finding asked for desktop only.
6. **Every email sentence** in the design request, in both languages.
7. **All Spanish** is a draft for your review. The round 1 flag for counsel on the Spanish retention wording stands.

## Left for a later pass

| Item | Why |
|---|---|
| The Clocker's own 404 (three VELANI lines, 18px links) | Phase 6, Clocker. |
| `/app/billing` for someone who is not an Owner still draws "My pay statements" as a pill; its links sit inside the card | Signed-in page outside these packages. |
| The public error screen's language pill is cramped at 390 | Same as before this phase. |
| Phases 6 to 8 | Clocker, motion and finishing moments, final verification. |

## Release sequence

Unchanged. Codex integrates and verifies with the backend on development. The exact verified release is promoted to main only after Jose approves.
