# Access v1 refinements — October 27, 2026

Jose approved every proposal in the Claude inspection of `d0caca2`, including changes to the frozen October 26 mobile Access files, and asked that the build match the approved mockups exactly. Mockups: https://claude.ai/artifact/6E7efgrqfZhDi2etxPE4kC (current vs proposed, rendered from the live app with the proposal applied at render time).

The 33 frozen runtime hashes in `docs/evidence/mobile-access-onboarding-20261026/verification.json` no longer describe this source. That file stays as historical evidence for the original candidate; this handoff records the approved change. No automated check enforces those hashes.

## What changed

Broken states:

- **Dark preference on Access screens.** Explicit Dark mixed Quiet's dark tokens into the light-only Access sheet: headings, labels and the wordmark measured about 1.2:1, and Forgot/Reset stayed white inside a black body. Access screens now keep the light Quiet tokens and a white page under Dark (`quiet.css`, end of file). Measured 15.7:1 (390px) and 18.5:1 (1440px) on every route.
- **Secondary button hover.** It inherited the primary hover fill (teal on dark teal, about 1.4:1). It now uses the wash with a teal border.
- **Desktop column.** `.q-page` is capped at 720px without auto margins, so Access sat on the left third at 1440px. The Access column is centred, and Help content gets desktop spacing, teal links and aligned blocks. Desktop rules use `:where(#mobile-access-page)`, so they apply only with the mobile flag on and keep the mock's specificity.
- **Review step.** "Edit details" and "Clear contact details" ran together; they now have a 24px gap.

Refinements: invalid fields get a red border; the alert heading drops to 15px with ink body text; hints align with their fields; Help section headings are ink at 17px/650 with a 15px body; the sign-in links wrap cleanly at 200% text; the review summary sits in an inset panel; the message box fits its text; small text has no negative tracking; the footer uses one grey; the 404 footer has separators.

Copy, English and Spanish: "Forgot password?" (also on legacy sign-in, through `AUTH_COPY.forgotAccess`); the forgot screen title is "Forgot password." / "¿Olvidaste tu contraseña?"; "I’m the only Owner" / "Soy el único dueño"; the owner form error names what to enter and highlights and focuses the failing field; a shorter review subtitle.

Icons: Owner and Invitation choice lists use Phosphor regular icons like Account help (EnvelopeSimple, UsersThree, Lifebuoy; EnvelopeSimple, LinkBreak, At, CheckCircle).

Business:

- **Invitations last 7 days** (a fixed 168 hours, so a daylight-saving change can't shorten it), not 15 minutes. Single use, retire-on-reissue, the issue limits and digest custody are unchanged. Migration `0042_company_invitation_lifetime.sql` widens 0032's check; the email, Help copy and tests are updated.
- **Sole Owner path is always offered.** `/access-help/owner-contact` no longer depends on `NEVORA_MOBILE_ACCESS_SUPPORT_ENABLED`, and the Owner help list always shows "I’m the only Owner". The general `/access-help/support` page stays behind that flag. The row says "We aim to reply within 2 business days", matching `SUPPORT_RESPONSE_TIME` in the published Support policy.
- **Privacy line on the Owner support form,** linking to the Privacy Policy.
- **New Help topic "I no longer work here"** (`/access-help/left`): where pay records live, that leaving a job doesn't delete the account, and a link to account deletion.

## Deliberate differences from the mockups

- "I’m" uses the typographic apostrophe used throughout the copy file; the mock injected a straight one.
- Spanish sign-in reads "¿Olvidaste tu contraseña?" for parity with "Forgot password?"; the Spanish mock still showed the old link.
- "We aim to reply within 2 business days" instead of the mock's "We reply…": the published policy promises a target, not a guarantee.

## Verification

- Pixel comparison of the real build (nothing injected) against each approved mock, Chromium: 12 of 19 screens identical. The rest differ only by the three wording items above, or because two approved changes now share a screen (the new Account help row; the privacy line under the form).
- Overflow: 104 checks (13 routes × EN/ES × 320/390px × 100%/200% text), none. Keyboard order and 3px focus rings unchanged on Owner help; the owner form focuses and highlights the failing field and clears it on edit.
- Flags: Support off still offers the sole-Owner path and 404s `/access-help/support`; mobile flag off still 404s `/welcome` and `/access-help`, and legacy screens carry none of the Access styling.
- Owned PostgreSQL 16 (non-root, local): company-access invitations 9/9, invitation races 9/9, claim races 13/13, digest maintenance 1/1, scope 10/10, invitation route 3/3, claim admission 6/6, claim 12/13. The one claim failure ("5000 unknown actual loopback HTTP claims") times out at 120s here before any change too.
- Typecheck, full lint, `git diff --check`, rehearsal migration-plan check (10/10) and the affected unit suites pass. Full default suite (Node 22 here; the repo pins 24): 9,736 passed, 98 failed in 12 files. The same 12 files fail on the unmodified `d0caca2` (93 failures there; the difference is timeout variance in `typed-guarded-backfill.server.test.ts`, which fails 3 tests alone on both trees). They read commits missing from this shallow clone, measure timing, or check next-env and workflow bytes. None touch the changed code.

Not run here: WebKit, Firefox, `test:mobile-access:owned` (needs all three engines), real iOS/Android devices, screen readers, and hosted CI.

## Deploy order

Apply `0042_company_invitation_lifetime.sql` (after 0032) before deploying this code. Without it, every invitation fails the old 15-minute check. Older code keeps working on a database that has 0042. See `DEPLOY-RUNBOOK.md` step 4. Production, migrations on any shared database and deployment remain subject to Jose's separate authorization.

Before announcing the sole-Owner path, Support ops still needs an identity-verification runbook and the reply-time target staffed. The mailbox is support@thevelani.com (confirmed by Jose on November 2, 2026); it's already `SUPPORT_EMAIL` in `src/lib/legal/policies.ts`, so no code change was needed.

## Follow-up: mobile Access form card (closer to Gusto)

Jose compared the four mobile Access forms with Gusto Mobile's sign-in and approved moving closer to it. Mockup and build comparison: https://claude.ai/artifact/QK93PaFrKPPP5m7TtbetSQ. Decision record: "Mobile Access form card — approved 2026-10-27" in `DESIGN.MD`.

- **Scope:** phones only (under 768px) with mobile Access on; Sign in, Forgot password, New password and Set up your account. Welcome, Help, Support, desktop and tablet are untouched.
- **Markup:** `AccessCard` and `AccessOutside` (`chrome.tsx`) wrap the existing elements; they render nothing extra when mobile Access is off, so legacy markup is unchanged. On Sign in, "Forgot password?" renders inside the card for phones and on the link line for desktop, with the other copy hidden at each width.
- **Verified:**
  - Pixel comparison with the approved mocks: 15 of 15 identical (four forms in English and Spanish at 390px and at 320px, plus empty, focused, filled and error field states).
  - Desktop (1440px), tablet (768px), and phone Welcome and Help pages: identical before and after.
  - States the mocks didn't cover render correctly: sign-in error and "account activated" notices sit inside the card, as do the recovery receipt, invitation form and reset-link states.
  - No overflow in 104 checks (13 routes, EN/ES, 320/390px, 100%/200% text). Keyboard order follows the screen. Headings measure 14.5–18.5:1 with a Dark preference.
  - Typecheck, lint, and 70 unit tests in the affected suites pass.
- **Known limits:** at 200% text on a 320px phone, the longest labels end in "…" (the full label stays available to screen readers), and long single words still break mid-word in titles and buttons, as they did before the card. Chromium only; WebKit, Firefox, real devices and screen readers are untested.
