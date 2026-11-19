# Claude → Codex: SCRUM-190 signup UI, November 19

UI owner: Claude. Backend, deployment, provider configuration and the hosted
email replay: Codex (existing release owner). This unblocks the protected
signup flow: `development` `49cd1072` had the onboarding APIs but no pages, so
`/onboarding/verify` returned "Page not found". No earlier signup or
verification screens existed in `development`, `main`, `claude-codex-collab-nevora`
or the archive/candidate tags (`signup-closeout-*`, `step2-onboarding-*`,
`scrum146190-step2-finisher-*`); the Nov 9 and Nov 11 handoffs record them as
absent and Claude-owned. The screens are built against the existing v1 API
contract below. The hosted-journey handoff
(`2026-11-19-hosted-first-customer-journey.md`) lives only in a local Codex
worktree that this cloud session could not read; reconcile any difference with
it before deploying.

## Source

- Base: `development` `49cd1072`.
- Candidate: branch `scrum190-signup-ui` (Jose authorized this extra branch on
  Nov 19; tags cannot be pushed from this session). It is exactly `49cd1072`
  plus the SCRUM-190 commits; its head is the commit that contains this file.
  Code commits: `44560645` (screens), `3fd5895e` (browser fixes), `0bd2fb56`
  (review fixes), `859def16` (guides rebuilt from `0bd2fb56`).
- No backend, schema, API, provider, proxy, CSP or environment-variable change.
  `src/lib/analytics/redact.ts` adds `/onboarding` and `/onboarding/verify` to the
  default-off public-page analytics allowlist (paths only).

## Routes

| Path | Host | Purpose |
|---|---|---|
| `/onboarding` | signup origin only (`NEVORA_SIGNUP_ORIGIN`); other hosts 404 | Email + Terms/Privacy consent → `POST /api/onboarding/registrations`; generic "Check your email"; resend after `resendAfterMs` |
| `/onboarding/verify?lang=en\|es#proof=…` | signup origin only; other hosts 404 | The verification email's link. Scrubs the proof before paint, `POST /verification`, then business form → `POST /workspaces`, progress via `GET /operations/:id\|current`, Owner link via `POST /bootstrap-grants` |
| `/onboarding/verify` (no link) | signup origin only | Resumes a verified signup from the `nevora_signup` cookie (`GET /registrations/current`) |
| `/onboarding/activate#proof=…` | the new workplace's company host (where `/bootstrap-grants` sends it) | Owner password → `POST /owner-activation`; shows the sign-in ID; `Sign in` → `/login` on that host |

APIs consumed, all unchanged: `/api/onboarding/registrations`, `/verification`,
`/registrations/current`, `/workspaces`, `/operations/:id`, `/operations/current`,
`/bootstrap-grants`, `/owner-activation`. The pages are outside the proxy matcher
(`/app`, `/api`, `/clocker`); the APIs keep their existing `publicOnboardingPath`
commerce-gate exemption.

## Behaviour that matters for review

- **Public signup stays closed.** The form shows only when
  `NEVORA_ONBOARDING_ADMISSION_MODE` is exactly `open`, or when it is
  `approved_recipient` and `NEVORA_ONBOARDING_ENVIRONMENT` is not `production`
  (labelled "Private test"). An unset mode, `closed`, no sender, onboarding off,
  or production approved-recipient show "Signup isn't open yet". The API remains
  the real gate (a non-approved address gets `ONBOARDING_DISABLED`, shown as
  "Signup isn't open for this email address").
- **Proofs** are read from `#proof=`, removed from the address bar before paint,
  kept in memory, sent only by same-origin POST, never stored, logged or put in a
  query. `?lang` is also removed and saved as the `nv-lang` cookie. While a page
  still needs a proof, it sits in the hidden `#reset-proof` field so the shared
  language switch carries it through its reload (existing reset-password pattern).
- **One-use links.** Each page load uses a random operation ID. Expired, used and
  unknown links share the server's generic `invalid`; a used link with a live
  signup cookie continues instead. (A proof-derived ID was rejected in review: it
  let anyone holding a used link replay the claim and get the live session.)
- **Lost and uncertain responses** replay the exact body with the same operation
  ID (registration, verification, workspace, grant, activation). From the first
  202/unknown, a temporary 503/429/lost reply never retires the command or offers
  a second password; it shows "Not confirmed yet" with "Check again". An unknown
  create reads `/operations/current` first and replays only when no operation
  exists. Offline replays wait and resume on reconnect.
- **Grant navigation** follows only `https://<single-label-slug>.<NEVORA_PORTAL_BASE_DOMAIN>/onboarding/activate#proof=…`
  (no port, credentials or query); anything else is shown as unavailable.
- **Terminal states:** `RESOURCE_REVIEW_REQUIRED`/`PROVISIONING_SOURCE_CHANGED`
  (and a replayed `QUARANTINED`) → review page; `ACCESS_DENIED`/401 → session
  ended; activation `invalid` → expired/used page, `conflict` → "a password was
  already set" + Sign in, `limited` → link finished, back to signup.
- **Language:** every string is in `src/lib/onboarding/signup-copy.ts` (EN/ES,
  tú register); tab titles name each step. The email link's `lang` wins on
  `/onboarding/verify`. The company host does not receive the language (the
  server-built grant URL has no `lang`); the activation page uses that host's
  `nv-lang`/Accept-Language and its switch keeps the link.

## Protected staging settings

No new variables. The existing onboarding set must be present on the deployment
that serves the signup origin, and the company-host routing that already serves
staged workplaces must also serve `/onboarding/activate`:

| Setting | Value for the protected staging test |
|---|---|
| `NEVORA_ONBOARDING_ENABLED` | `true` |
| `NEVORA_ONBOARDING_ENVIRONMENT` | `development` or `test` (with `production`, the approved-recipient form stays closed by design) |
| `NEVORA_ONBOARDING_ADMISSION_MODE` | `approved_recipient` |
| `NEVORA_STAGING_EMAIL_RECIPIENT` | the one approved test inbox |
| `NEVORA_SIGNUP_ORIGIN` | the protected signup origin (HTTPS) |
| `FUEL_PORTAL_ORIGIN` | **the same origin** as `NEVORA_SIGNUP_ORIGIN`; otherwise no verification email is sent (`verificationDelivery` requires it) |
| `NEVORA_ONBOARDING_EMAIL_ENABLED` + SMTP (`NEVORA_RECOVERY_SMTP_*`, `NEVORA_RECOVERY_FROM`) | Codex-owned provider configuration |
| `NEVORA_PORTAL_BASE_DOMAIN`, `NEVORA_CONTROL_DATABASE_URL`, the three 32-byte keys, region, operator ref, terms/privacy versions, limits | unchanged existing values |
| Provider (`NEVORA_ONBOARDING_PROVIDER_*`, `NEVORA_WORKSPACE_MODE=isolated`, daily/total caps) and the provisioner/activation workers | Codex-owned; without them the business form shows "Creating workplaces isn't open here yet" |
| Company-host deployment | `NEVORA_SIGNUP_ORIGIN` set too, so "Back to signup" links resolve |

Deployment protection: the person replaying the email must open the link in a
browser that already has access to the protected deployment, or the protection
page will swallow the `#proof` fragment.

## Evidence (this session; fictional data only)

| Check | Result |
|---|---|
| New unit/page tests (`signup-client`, `signup-page.server`, `signup-copy`, `onboarding/pages`, analytics) | 65 passed |
| Full unit suite `npm test -- --maxWorkers=1` (on `859def16`) | 15,826 passed, 0 failed, 1,000 skipped (existing owned/integration suites) |
| Source-bound build `PHASE_E_EXPECTED_SHA=859def16 node scripts/release-build.mjs`; `npm run test:dev:production` | pass; `/onboarding`, `/onboarding/activate`, `/onboarding/verify` built; 5,713 artifacts, no development markers |
| Typecheck, `npm run lint` | pass; lint 0 errors (1 existing warning in `services/hosted/neon/workforcemonitor.entry.ts`) |
| Owner advisor pilot guard; inspection custody (after `git fetch --depth=1` of pinned `39ee9d1d`); notifications/foundation QA; test projects; release engineering | 18; 20 + PASS; 6; 8; 81 projects + 1; 395 — all pass |
| Entrypoint inventory; onboarding manifest | 12/12; matches |
| `npm audit --omit=dev`, `npm audit --audit-level=high` | 0 vulnerabilities |
| Web guides | rebuilt from `0bd2fb56` and verified (pinned Playwright 1.62.1; container Chromium 1243 aliased for the runtime's 1234) |
| **Real API, local** (`next dev`, local control DB with all 7 control migrations, local SMTP capture, approved-recipient admission, provider off) | 23 passed: private-test form; client validation and focus; non-approved address refused by the API; generic acknowledgement and cooldown; email link format; lost verification reply → Not confirmed → identical replay recovered; proof and `lang` gone from the address bar; business form validation; contract-exact create command; `PROVISIONING_DISABLED` shown; reload resumes from cookie; used link continues with the cookie and is one-use without it; invalid and missing-link pages; Spanish email `lang=es` |
| **Spanish + axe-core (WCAG 2.2 AA)**, real API | 11 passed: Spanish link wins on an English browser and is saved; field errors; 0 violations on signup, sent, business (with and without errors), Owner step, activation (es) |
| **Stubbed API** (server result shapes; request bodies asserted) | 58 passed: progress at 320/390/820/1440 EN/ES with no overflow; reconciling note; Owner step focus; pending grant repeats one operation ID then navigates; expired/limited/off-domain grants; ready and review; slug conflict focus; new ID after a changed command; unknown create reads the operation; activation password refusal, 202 → lost → identical replays → done with ID, expired/used/limited/missing pages; review regressions F1–F4, F10; keyboard order, focus, reduced motion |

Not run: hosted deployment, real provisioning, real grant and company-host
activation (stubbed only), the isolated company-host routing, provider email to a
real inbox, screen readers and physical devices.

## Review

An independent read-only review of the first two commits found 4 bugs (activation
body retired after a possible commit; offline replays stranding the page;
language switch losing the proof; `limited` treated as temporary), 3 risks
(proof-derived operation ID weakening one-use links; unset admission shown as
open; uncertain commands dropped by later 503s) and 7 smaller items. All are
fixed in `0bd2fb56` with browser regressions (F1–F4, F10) except: name fields now
stack (no two-column layout); state-machine coverage is browser evidence rather
than unit tests.

## Left with Codex (release owner)

1. Deploy the candidate to protected staging with the settings above; provider,
   SMTP and worker configuration.
2. Hosted email replay with the approved inbox through `/onboarding/verify`,
   workplace creation, grant and `/onboarding/activate`, then normal sign-in.
3. Reconcile with `2026-11-19-hosted-first-customer-journey.md`.
4. Integration into `development` per the release-control path; public admission
   stays closed until Jose authorizes it.

## Decisions for Jose

- Review the Spanish copy (`signup-copy.ts`).
- Whether the company host should receive the signup language (needs a backend
  change to the grant URL).
- Public admission (`open`) remains a separate authorization.
