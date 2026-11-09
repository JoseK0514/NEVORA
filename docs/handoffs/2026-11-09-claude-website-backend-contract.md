# NEVORA website/backend reconciliation — November 9, 2026

For Jose and Claude. Backend/contracts: Codex. Screens, Shopify pages, copy and browser acceptance: Claude. This document answers Claude's six-item November 9 request and supersedes conflicting launch claims, not the underlying security or release gates.

## Status and source custody

Inspection used live DNS/HTTP, Vercel project/deployment/domain metadata, Neon function metadata, current development code, the November 8 onboarding acceptance packet, and Claude's November 8 follow-up. Isolated detached worktree: `work/nevora-website-contract-20261109` in the shared Velani task workspace. Base: freshly fetched `origin/development` at `4ee21b69ecf5585018e4005379c627b201b876b2`. No shared checkout was edited. No push, development/main merge, DNS cutover, production deployment, cloud flag/credential change, real email, Stripe request or metered AI call was performed by this task.

These findings distinguish live infrastructure, development implementation, older isolated candidates and approved future policy. A local check or READY Preview is not public release acceptance.

## 1. Public application address

**There is no verified usable production sign-in URL today.**

| Live check | November 9 observation |
|---|---|
| `nevora.team` | GoDaddy parking; A `3.33.130.190`, `15.197.148.33`; NS `ns01.domaincontrol.com`, `ns02.domaincontrol.com`. |
| Vercel project | `nevora`, `prj_gGWZI2AJQoCXuvxCZhU67JHeToCK`, team `team_Lzbw410WwXGWHTuUXuamRI1N`. |
| Attached domain | Only `nevora-alpha.vercel.app`; no `nevora.team` project binding. |
| Public alias `/` and `/login` | HTTP404, `DEPLOYMENT_NOT_FOUND`. |
| Latest Production target | `dpl_CGHzxYV8rYtJZZs6hhw53aDvdTfi`, ERROR, `missing_lock_file`; `npm ci --ignore-scripts` failed. Source `46d6dc76922bb273379baccd329e0af636d1dcb6`, ref `main`, message `Update README.md`. This is not an accepted application candidate. |
| Latest app Preview | `dpl_2TxfPhD2Ed1er5ctQFaf7vzDC9hH`, READY. This does not establish customer or production readiness. |

**Decision already recorded:** `nevora.team` is Jose's purchased NEVORA domain. Its apex should become the platform entry point, with the approved per-workplace hostname scheme behind it. Production portal base-domain choice, wildcard/exact-host DNS and routing must be finalized with the release candidate. Staging hostnames must not be relabeled as production.

**Claude now:** remove/disable the parked Open NEVORA link. Do not substitute a preview or the broken alpha alias. Avoid promising an automatic “workplace ready” email: the implemented self-service flow emails verification, then returns the Owner activation URL through authenticated provisioning/bootstrap APIs; a later ready-notification email was not established. Manual setup details can be emailed by Velani as an operating process, but that is separate from an implemented automated mail event.

**Codex/release next:** source reconciliation and exact candidate CI, migrations/environment custody, UI/role acceptance and recovery/restore evidence, then Jose's explicit production approval. Deploy that accepted source to the actual `nevora` project; verify its platform and company hosts; attach apex/portal domain and change only the required GoDaddy web records, preserving email records; check TLS/login/recovery and rollback. Pointing DNS at the failed build cannot resolve this issue. The earlier account-level domain addition and verified Resend sending records do not constitute project attachment, website deployment or sign-in acceptance.

## 2. Sign-in contract

| Actor | Initial access | Normal portal sign-in |
|---|---|---|
| Initial Owner | Verify registration email; provision workplace; obtain one-use Owner bootstrap URL; choose password on that workplace; activation issues no login session. | Workplace-local ID chosen during setup + password, at that workplace's `/login`. |
| Manager | Owner creates person and explicitly invites them through their registered email; invitation activation chooses password. | Workplace-local employee ID + password. |
| Employee / Lead | Person is created and explicitly invited; activation chooses password. A saved person without configured credentials is not automatically an active portal login. | Workplace-local employee ID + password. |
| Shared tablet | Owner authorizes a location tablet/device; Owner assigns a four-digit Clocker PIN. | PIN identifies the employee for tablet clocking. It is separate from the portal password and is not a portal login. |

Email is the invitation/verification/recovery channel; **email + password is not the normal portal credential pair in this source**. Normal login normalizes the ID and verifies the password server-side. Passkeys are an optional separately configured existing path; do not promise universal device support.

The isolated onboarding architecture uses **one registered host per workplace**, not one shared company login accepting arbitrary tenant selectors. Example pattern is `<slug>.<approved portal base domain>`. `company-a.portal-staging.nevora.team` and acceptance aliases are staging examples only. Cookies and opaque proofs are host/company/environment/incarnation bound.

Recovery:

- Password: `/forgot-access` on the correct workplace, employee ID + registered email. A matching active account with configured delivery gets a single-use 15-minute reset proof; the public acknowledgement does not reveal whether an account exists. Successful reset signs existing devices out. Managers can assist Employee/Lead accounts through current permission checks; Owners can assist additional roles. Sole-Owner lockout without the registered channel needs a verified support/operator process; no new public override is authorized.
- PIN: ask the Owner to set a replacement through the existing protected Clocker PIN action. The old PIN is not recovered or revealed. Managers do not receive a new PIN-reset permission.
- Workplace address or ID: consult the original activation/invitation details or the employer; Velani support must verify the requester before disclosing private membership details. There is no email-to-workplace-list contract. A limited native/company-slug discovery API exists; it resolves a known slug only and is not a website workplace finder. Claude should not add one as part of this handoff.

Code: `src/app/login/actions.ts`, `src/lib/onboarding/owner-activation.server.ts`, `src/lib/auth/recovery.server.ts`, `src/lib/auth/recovery-delivery.server.ts`, `src/lib/clocker/pins.server.ts`, `src/lib/workspace-routing/discovery.server.ts`.

## 3. Billing API and CORS

**No currently enabled website billing API can be assigned to `commerce_api_url`. Keep the setting unset/disabled and retain the existing billing-support fallback.** Existing customers should not be redirected to trial signup.

- `https://signup-staging.nevora.team` is an older protected onboarding UI alias. `/v1/plans` and `/v1/status` currently return302 to Vercel Authentication. The dedicated `nevora-onboarding-staging` project retains SSO for ALL deployments. Do not disable it or create a share/bypass URL as a billing workaround.
- The actual native API is `https://br-hidden-mud-bbnc2fxk-commerceapi.compute.c-15.us-east-1.aws.neon.tech`. Live `/health`, `/v1/plans`, `/v1/status` checks return503 `{error:{code:"not_ready"}}`, without a Vercel login. Neon reports current/active deployment11 completed. “Completed” does not mean operationally enabled.
- The native staging profile intentionally admits the exact `https://signup-staging.nevora.team` UI. It **does not currently allow** `https://www.thevelani.com`. The application CORS handler supports exact allowlisted origins and `Authorization, Content-Type, Idempotency-Key`; unsupported origins are403. Shopify theme preview query parameters do not change the origin. A separate preview host must be specifically approved and listed; no wildcard.
- November8 hosted acceptance used Stripe sandbox, fictional companies and the sole approved inbox `support@thevelani.com`. Final processing, schedules and Stripe endpoint were closed. That historical bounded approval is not unlimited permission to create companies, send further mail or charge cards. This task made no real mail/payment calls.
- Current dedicated staging Preview `dpl_3Gr1U4c697xkFLDAh4iyuJSoun2x` is READY and source-pinned to `3446982085c32b238b4d329c98639f3978c6e8b2`; it has no aliases. The signup alias continues to identify an older source. Do not combine these as if they were one accepted deployed journey.

**Integration sequence:** source-match Claude's UI and these backend changes on isolated staging; define the explicit website-preview staging ingress/origin profile while retaining company and Owner authorization; re-enable only the bounded sandbox components needed; verify CORS preflight from the actual Shopify origin, signed webhook/worker lifecycle, approved-inbox mail, Owner sign-in/handoff/Checkout/Portal/return in EN/ES; close test processing afterward. Public Production billing is a separate launch gate. This handoff does not authorize widening existing staging controls without that reviewed integration.

Canonical integrated path: onboarding registration/verification/provisioning → Owner activation → ordinary company login → authenticated Owner `POST /api/commerce/handoff` → one-time `/v1/handoff/exchange` → in-memory billing bearer → `/v1/status`, `/v1/checkout`, `/v1/portal`, `/v1/logout`. Employees/Managers do not gain Owner billing rights. Never put private installation/service keys or bypass tokens in the theme.

## 4. Unpaid trial and deletion — actual code vs approved policy

**Today in this development/commerce source:** enrollment stores an immutable 30-day trial from the original `provisionedAt`. At expiry without qualifying payment, `accessAt()` returns `restricted`, `operational:false`, `billing:true`, `export:true`. Failed renewals can receive the existing seven-day payment grace only when prior paid coverage exists. That renewal grace is not a workplace-deletion timer.

**No automatic trial-workplace deletion job or three-day deletion deadline was found in the inspected commerce/onboarding code.** The onboarding cleanup retires expired verification/grant ciphertext and admission counters; it does not delete workplace resources. Commerce workers process mail/provisioning/Stripe jobs, not a timed workplace eraser. This is code evidence, not an assertion that an unlaunched production system is serving those workflows.

The Nov5 daily retention registration belongs to **Rondo website chat sessions** in the separate `velani-ai` service. Vercel live readback confirms `/api/cron/retention` at `0 15 * * *` (11:00 Puerto Rico), and client-hub maintenance separately at `0 16 * * *`. `runConversationRetention` deletes `sessions` that expired or are more than30 days old. It has no NEVORA workplace-deletion authority. This task read registration/code and did not trigger either job; it does not prove a particular scheduled invocation ran.

**Export caveat:** older detached commerce candidate `04fe4616` fixed recovery to `/app/my-pay`, its statement/document reads, and a shell-free export/billing layout. Fresh development still has an obsolete `/app/pay` gate exemption and lacks that complete recovery assembly. Thus `export:true` is policy intent, not proof that the combined current UI can perform every restricted-account export. Claude/Codex must integrate the earlier recovery work and test it before advertising that journey as live. Payroll export is not a complete workplace-data export.

**Jose already selected the future policy:** keep an unpaid workplace for30 days after trial end, permit Owner export, remind at trial end and seven/one days before deletion. The Release1.1 candidate at `831d33dac00f63622f538e77fc598857f3b9b8d9` is an unshipped pure policy, not a live scheduler, outbox, export or deletion implementation. Reuse that decision; do not request it again or revert to three days. Integration still needs conversion/deletion serialization, durable reminders, complete export, scoped resumable deletion, legal holds/backup restoration controls and hosted acceptance.

**Claude now:** neither “deleted within3 days” nor “automatically deleted30 days later” is supported as current live behavior. Reconcile all EN/ES privacy, trial, deletion, help and Rondo knowledge text with the actual shipped milestone. Do not promise indefinite retention from the absence of an automatic eraser. Publish the final deletion timeline only when its implementation and release are verified. Manual account-deletion/legal-retention processes are separate.

## 5. More than30 employees — policy approved by Jose in this task

- Velani reviews eligibility and the setup/quote first.
- Approved assisted teams receive the same **30-day, no-card trial**, starting when the workplace is originally provisioned. Request submission, sales contact, password activation or a retry does not start or reset the clock.
- `support@thevelani.com` owns contact, with a response within **two business days**.

**Implementation state:** this is approved policy, not an enabled assisted-capacity product. `planFor()` and ordinary checkout still reject counts over30 with `assisted_quote_required`; operational capacity remains capped at the selected standard band. There is no approved custom-price/over30 enrollment or quote automation in this task. Do not bypass that guard or promise immediate self-service provisioning. Assisted approval/capacity, pricing and the actual intake/fulfilment owner need implementation and acceptance before enrolling such a workplace.

Claude can align calculator/forms/help in EN/ES around “Contact Velani for assisted setup and eligibility; we respond within two business days.” Only confirmed eligible teams should be promised the trial. Existing $19/$29 values are sandbox/proposed fixtures, not newly approved commercial prices.

## 6. Filed follow-ups — additive backend contract in this candidate

### Clocker pause return path

A denied valid tablet page GET redirects303 to `/clocker/paused?reason=subscription_required&from=%2Fclocker%2F<key>`, or `reason=billing_status_unavailable` when authority cannot be checked. `from` is generated from the exact original path, matched against `^/clocker/[A-Za-z0-9_-]{8,128}$`. No query, external URL or caller destination is carried. Explicit JSON requests, API calls and writes retain402/503 JSON. GET `/clocker/paused` is a bounded recovery exemption, including before isolated routing; writes are not exempt. No billing or employee data is exposed.

**Claude integration dependency:** the reserved paused page from the separate commerce UI candidate must be included before release; it is absent from this development checkout. Keep its existing validation and full-page “Try again” behavior. This backend task does not create that UI. The prior app-billing/export recovery candidate also remains an explicit integration dependency.

### Workplace time zone

`GET /v1/status` now includes `timeZone: string | null`, from the **current authenticated company facts** (`workspaces.time_zone`), not a stale registration profile or visitor locale. `/internal/access` receives the same additive value. Missing support in an older company returns null; malformed/foreign company facts fail closed. Do not invent a business zone when null: show explicit UTC dates or an unavailable-zone message. Existing UTC ISO timestamps remain unchanged. Deploy the additive company facts endpoint before or with the catalog/API change; no database migration is needed.

### Spanish journey

The November8 request for `lang` on `/v1/signup` and `/v1/login-link` referred to a **superseded standalone flow**. In integrated onboarding those endpoints, plus legacy setup/verify, intentionally remain409 `use_onboarding`. Do not re-enable mailbox-only billing authority or wire the theme to these old endpoints.

Use `locale:"es"` in canonical `/api/onboarding/registrations`. The existing Spanish verification copy now links to the configured signup origin at `/onboarding/verify?lang=es#proof=…` (English uses `lang=en`). Claude's verification screen reads the language, scrubs the proof immediately and follows the existing POST/cookie contract. It must not submit that proof to the old Shopify `nevora-verify` token endpoint.

Authenticated `POST /v1/checkout` and `/v1/portal` accept optional `{lang:"en"|"es"}`; omission defaults to English. Invalid/null values return400 `invalid_language`. Normal Owner/bearer/installation/Origin/Idempotency-Key checks are preserved.

| Action | English | Spanish |
|---|---|---|
| Checkout success | `/pages/nevora-billing-return#handoff=…` | `/pages/es-pago#handoff=…` |
| Checkout cancel / Portal return | `/pages/nevora-billing#handoff=…` | `/pages/es-facturacion#handoff=…` |
| Stripe page locale | `en` | `es` |

These paths are attached only to the configured approved UI origin, never a submitted return URL. Replaying/recovering an existing open Checkout reuses its original stored locale and destinations, even after a language switch; it cannot create a second checkout or reset trial/payment state. Preserve one operation ID and identical Portal payload on a lost-response retry; a newly selected language is a new user action with a new ID. Stripe's normal idempotency checks remain in force. UI must not infer payment from any return URL.

### Checks and release boundary

Verification results and review dispositions are appended below after completion. Evidence: `.omo/evidence/website-contract-20261109/`. Tests use an allowlisted environment, existing lockfile-matched dependencies, fictional fixtures and an owned disposable loopback PostgreSQL cluster. No production credential or database is used. Local fake SMTP/Stripe SDK transport acceptance is distinct from real provider/browser acceptance.

Engineering: additive contracts and bounded tablet routing. Security: current Owner/company bindings, exact origins, service keys and gate expiry remain. Product: approved assisted policy recorded; no new prices or instant-over30 signup. Delivery: Claude owns UI assembly; Codex owns backend integration and hosted proof. Governance: **NO-GO for public Production** until exact source, recovery/UI, environment/restore, hosted billing and Jose release gates are evidenced. No independent certification or gate waiver is claimed.

References: existing onboarding/UI contract and private staging acceptance in `docs/handoffs/2026-11-07-onboarding-backend-ui-contract.md` and `2026-11-08-private-onboarding-staging-acceptance.md`; source-specific commerce recovery packet in the separate subscriptions backend worktree; Stripe official [Checkout parameters](https://docs.stripe.com/api/checkout/sessions/create) and [Portal parameters](https://docs.stripe.com/api/customer_portal/sessions/create).
