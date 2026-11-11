# Combined web readiness contract for Claude and the coordinator

Prepared against backend development `baf26fc4` plus monitor fix `9bd76d86`; no UI files changed. Read the existing [backend repairs contract](business-backend-repairs-20261109/CLAUDE-CONTRACT.md) alongside this packet. Claude owns UI implementation/visual acceptance. The coordinator owns source reconciliation, exact-head CI, credential custody and publication. Native remains separate.

## Current readiness boundary

The latest inspected collaboration review is `00560614f6fac61eae4d616fba1d5dad03dfcf4f`, read directly with Git rather than integrated. Its `docs/product/review-2026-11-10/findings.json` has 329 findings. Findings are reported observations, not all verified backend defects or accepted scope. This track does not rebuild those screens or close independent findings.

The protected dedicated onboarding staging project exists with SSO ALL/Node24. Its listed READY deployment does not establish this backend source or the integrated Owner journey; current source-qualified runtime acceptance is still required. VELANI `velani-ai` Preview remains unsafe for mutation because its single database entry targets Production too; use the separate [isolation proposal](2026-11-10-velani-staging-isolation-proposal.md). No mutating hosted checks were run here.

## Verified review items and required UI behavior

| Item | Development source inspection | Integration/acceptance requirement |
|---|---|---|
| NV-038, generic request push says “pending task” after a decision | Confirmed in `src/lib/notifications/payloads.ts`: all request kinds share that body, including approved/denied outcomes | Claude/product selects concise truthful generic copy (suggestion: “Open NEVORA to review an update.”). Backend owner then updates payload/test parity in a separately reviewed bounded change. Preserve generic lock-screen privacy, source-kind acceptance, stable tag and current generation; native copy is its own owner |
| NV-121, confirmation promises notification delivery | Confirmed `src/components/toaster.tsx` approved/declined text and `src/app/app/schedule/page.tsx` changes-published notice | Describe the recorded action and where the person can view it. Do not infer provider acceptance, display or read from a business commit/outbox row. Proposed wording belongs to Claude; delivery states remain separate |
| Existing staffing/coverage contract | Existing development backend provides current staffing read authority and canonical `coverageMinutes`; review docs do not prove this integrated source ran | Owner/Company Manager current scope; approval consequence before leave decision; stable assigned repair after approved leave; draft edits cannot clear published obligations; Employee/Lead own privacy; not-configured is distinct from 0% |
| Device alerts | Current `/app/api/push/status`, `/subscribe`, `/unsubscribe`, `/test` use server session/origin and current device custody, not arbitrary employee IDs | Availability, permission, enrollment, queued test, accepted transport and displayed notification are distinct. Preserve current generation, five-minute test cooldown, lost-response reconciliation, explicit consent and sign-out/account-switch cleanup |
| Account deletion | Current request action records request + session/feed revocation atomically; manual fulfillment remains separate | Received/duplicate/unknown must remain distinct. Do not promise completed erasure or offer unverified withdrawal. Link the actual retention disclosure and preserve password/session/current-own-account checks |

The push-copy finding is actionable but deliberately unmodified in this operations patch: it requires the product/UI wording owner and native parity coordination. It is not a security or transport repair silently folded into the monitor change.

## Source-matched isolated acceptance matrix

Run existing owned local harnesses first; they create and destroy new loopback clusters and keep provider delivery off. After the coordinator's environment/CI gates and any required authorization, Claude supplies an exact candidate deployed to the verified isolated staging target. Record commit/tree/deployment and the private fixture manifest before the journey.

| Journey | Positive evidence | Required recovery/denial |
|---|---|---|
| Signup/activation/setup/invitation | Two fictional companies reach correct canonical origins and current Owner/Employee access | Foreign company/origin, expired claim, refresh/lost response and current actor revocation; no credentials in captures |
| Owner/Manager Home/Things to do | Counts tie to current authorized source, staffing/coverage meaning and scope | Failed/expired source is unavailable, never zero; stale snapshot/permission loss clears protected content |
| Scheduling -> time -> payroll document | Published assignment, actual correction approval retaining original punches, finalized time and exact scoped PDF | Immutable operation retry; stale revision; wrong role/company/document; incomplete/unsupported payroll inputs block |
| Alerts/reminders | Current-device consent/registration and correct in-app destination; local simulator/canonical SQL | Denied/install-required/unavailable; detached/stale generation; logout/account switch; quiet hours, expiry, dedupe/retry; real delivery separate |
| Deletion/retention | Own request/reference, all sessions/feed access retired and manual case packet | Wrong password, lost committed reply, concurrent confirmation, processing-vs-withdrawal and retained-record restrictions |
| Billing return and provider recovery | Existing exact-source sandbox/provider receipts reconcile correctly | Unknown/failed return never duplicates a charge or changes coverage from client query parameters; no new payments authorized here |
| Rondo context and forgetting | Current Owner/context/source/revision and reviewed safe proposal/apply/recovery | Manager/Employee denial; scope revocation; stale answer; forgetting/retention controls. No fresh metered model calls; previous budgets are closed |

At 320/390/768/1440, verify current approved Direction B views, keyboard/focus, 200% text, loading/error/empty/success, inaccessible/expired private data and English/Spanish copy. Browser doubles can qualify UI recovery and real local server/SQL, but cannot establish physical installation, permission behavior, provider delivery, assistive-technology acceptance or hosted tenancy isolation. Existing review findings remain open until their owning review process accepts closure.

Release status is **CONDITION / Production HOLD**. A green local suite, READY deployment, domain verification or colleague report does not close combined hosted acceptance. The coordinator must reconcile collaboration source inventory before any assembly; this document neither merges that branch nor changes the frozen CI source.
