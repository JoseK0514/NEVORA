# Step 3 — Cloud billing backend transfer, November 12, 2026 (Puerto Rico; execution logs use November 13 UTC)

This is a bounded backend patch for local integration review, linked to
[the billing contract](2026-11-11-codex-to-claude-payments-billing.md),
[implemented recovery UI](2026-11-12-commerce-recovery-ui.md),
[Step 2](2026-11-12-step2-nevora-onboarding-backend.md) and the existing
[release index](2026-11-11-release-completion-index.md) / SCRUM-190.
No UI, onboarding contract, schema, dependency or provider configuration changes.
No external provider calls, customer data, deployment, push, CI dispatch, new
branch, activation or Step 4 execution. Local Codex receives this artifact; no
message or instruction was sent to another agent.

## Source and Step 2 reconciliation

The work-order reference was 242a993897aee4a213a1a9aefdecee2e86394b1f,
tree 206679f8b0598a99d36fc6789b17fcd4f0173eb4. Initial experiments used it.
The checkout's remote fetch mapping tracks only main: `git fetch origin
development` updates FETCH_HEAD but leaves origin/development stale. The source
inventory exposed this; remote advertisement and FETCH_HEAD identify actual
development f6baaaa6d988f34fb1c3388d0e1fe4c410bcbfd5,
tree 5e1f99fd72b29b430c7e8f23e933830b72cc6d65. Final patch base is f6baaaa6.
No shared branch was moved. Final worktree is /workspace/nevora-step3-final, detached; earlier runs remain in /workspace/nevora-step3.

Read the actual Step 2 handoff and review follow-up at that base. Preserved its
exact operations/current recovery exemption, fixtures, trial/optional-module
regressions and newer integration tests. The Step 3 diff touches none of them.
The handoff freezes Step 2 as BLOCKED pending a completion receipt at
`/Users/josek0514/.codex/nevora-step2-20261112/delivery.json`. That Mac-only receipt
is absent in Cloud; neither branch ancestry nor the review's APPROVE substitutes
for it. Step 2 source dependencies are reconciled; final protected delivery and
hosted acceptance receipts are not reconciled/accepted. Local Codex must read the
actual receipt and preserve its earlier failure evidence.

Code commit: `f640d7e3f90cb9f53c8a0e59dd52a0c112205125`; code tree:
`8c0ffa665b01137c5730b683ec470c76710c8172`. Final artifact commit/tree, patch SHA-256 and changed-file
hashes are in SOURCE-IDENTITIES.json and SHA256SUMS in the transfer archive.
Documentation/evidence commits do not change tested runtime bytes. A Cloud-only
commit is not the deliverable: use the included git-format patch against the
stated base. The manifest excludes itself from hashing.

## Coordination and overlaps

Jose's explicit coordination message names **Finish NEVORA SCRUM-190 handoff**
(`01a1d175-7de0-7a80-b607-5418fde6ed50`) as sole combined integration,
shared-development publication, full-release CI and hosting owner. Cloud is only
the Step 3 patch/evidence supplier. No second end-to-end integration effort or
new chat was created. This artifact returns in the current chat; the finisher
owns any subsequent combination and release qualification.

No literal changed-path overlap with Step 2. Semantic seams are current Owner
verification, commerce recovery admission and the provisioning trial receipt.
Step 2's `src/lib/commerce/access.ts`,
`src/lib/commerce/onboarding-recovery.test.ts` and
`src/test/integration/onboarding-commerce.integration.ts` are unchanged. Recovery
screens, layouts, proxy and UI consumers are unchanged. Applying the bounded diff
to f6baaaa6 was clean; that is not a forecast about later finisher changes.

Changed source/test paths:
- services/commerce/service.ts
- services/commerce/stripe.ts
- services/commerce/plan-change-api.test.ts
- services/commerce/provision.integration.test.ts
- services/commerce/status.test.ts
- services/commerce/stripe.integration.test.ts

Additional files are this handoff and the adjacent fictional contract fixtures,
qualification receipt and selected sanitized test evidence. See the full path
list in SOURCE-IDENTITIES.json; no dependencies/environment/raw private logs are
in the patch or archive.

## Changes and evidence

1. FIXED AND RETESTED: private service results could escape after Owner/session
   revocation or installation replacement during awaited work. `/v1/status` now
   rechecks session/Owner and business binding after facts. Checkout, Portal and
   plan change recheck after headcount/rate admission and again before returning
   the private provider result. Plan change keeps its existing customer and
   subscription checks; Portal receives them too. Checkout permits its legitimate
   initial customer binding creation; company/installation/origin must still
   match. This cannot undo provider work already started before revocation.
2. FIXED AND RETESTED: a correctly signed foreign-account webhook was admitted.
   Explicit event.account must match the configured merchant, or admission fails
   with 503 stripe_account_mismatch before receipt/job creation. Unscoped direct
   merchant events remain supported by the endpoint-specific secret; live mode,
   raw-body/timestamp verification and worker account verification remain intact.
3. COMPATIBLE ADDITION TESTED: real-SQL durable admission rollback/redelivery,
   modified-body/stale-signature rejection, two-company status/handoff/coverage
   isolation, wrong-purpose/expired/reused links, plus 0/15/16/30/31 headcount
   projection. Existing checkout/trial/payment/plan/risk behavior is reused.

Authority tests inject a fictional BillingPort and isolate the HTTP/service
boundary; they do not claim database concurrency. Durable event tests use actual
PostgreSQL transactions, a temporary failing INSERT trigger and concurrent
redelivery. Dropping the first successful HTTP reply simulates a lost
acknowledgment; it is not a real process-kill experiment. The existing owned SQL
suite tests provider-created checkout recovery and durable jobs. Actual
onboarding–commerce integration uses real company/control/catalog databases,
restricted roles and Owner revocation checks with synthetic transport.

## Behavior-to-test matrix

| Requirement | Class | Test/evidence and limits |
| --- | --- | --- |
| Current Owner around awaited service results | FIXED AND RETESTED | plan-change-api.test.ts: four routes, revocation/replacement, pre-provider headcount revocation, valid success controls; SQL onboarding-commerce tests retain real Owner/installation denial. |
| Company browser authority/privacy | VERIFIED UNCHANGED | src/app/api/commerce/status/route.test.ts; routes.test.ts: current Owner, origin/Host/fetch-site, no selectors, exact trusted handoff and safe projection. |
| Original 30-day trial | VERIFIED UNCHANGED | provision.integration.test.ts concurrent retries; Step 2 onboarding-commerce original provisioning/activation/setup/skips receipt; stripe.integration.test.ts early setup and plan change do not reset deadline. |
| 0/15/16/30/31 active non-Owners | COMPATIBLE ADDITION TESTED | status.test.ts tests both capacity projections for every count; real SQL provisioning capacity test covers Owner exclusion and retained people. Above 30 projects restricted; checkout uses assisted_quote_required. |
| Payment-qualified upgrade | VERIFIED UNCHANGED | stripe.integration.test.ts retains old capacity for pending/unpaid/zero/credit lines and Small trial; positive paid matching-price invoice grants Team. |
| Renewal downgrade / headcount changed | VERIFIED UNCHANGED | Stripe configuration guards require period-end decreases; existing Small-flow count and actual paid-plan/headcount restriction tests. No genuine provider schedule/time-travel acceptance claimed. |
| Cancellation, failed renewal, grace | VERIFIED UNCHANGED | model.test.ts exact trial/paid-through/seven-day grace boundaries; stripe.integration.test.ts repeated renewal failure does not restart grace. No new policy. |
| Billing/export/own-pay recovery | VERIFIED UNCHANGED | src/lib/commerce/{access,recovery-access,clocker-recovery}.test.ts and recovery UI tests; exact reads and approved export commands retain normal authorization, arbitrary descendants/writes denied. |
| Handoff validity/purpose/expiry/reuse | COMPATIBLE ADDITION TESTED | stripe.integration.test.ts SQL links, existing onboarding-commerce Owner revocation/installation replay tests; app trusted destinations tested unchanged. |
| Forged Origin, no private projection | VERIFIED UNCHANGED | company status/routes and service status tests; existing memory-only/scrubbed-fragment consumer contract unchanged. Shopify consumer not executed here. |
| Signature, timestamp/raw body, mode/account | FIXED AND RETESTED | real Stripe SDK local synthetic signatures; foreign account rejection added; stale/modified payloads rejected before durable admission. Not genuine Stripe delivery. |
| Duplicate events, admission failure, reply loss | COMPATIBLE ADDITION TESTED | stripe.integration.test.ts real DB trigger rolls back receipt+job; successful commit then lost reply and concurrent redelivery leave one receipt/job. |
| Out-of-order / bounded retry / partial failure | VERIFIED UNCHANGED | existing stripe/account integration current-state reconciliation, failed mail/job retry, non-starving reconcile tick, restricted-principal durable cursor. No guessed arrival-order rule. |
| Risk/refund/dispute review | VERIFIED UNCHANGED | stripe-risk.integration.test.ts review receipt/audit rollback, contradictory customer blocked, unresolved risk retained; no automatic financial/suspension/deletion action. |
| Two-company status, handoff, coverage/event identity | COMPATIBLE ADDITION TESTED | added real catalog A/B test plus existing onboarding-commerce separate company routing and risk identity tests. Broad document authorization is outside the changed boundary and is not newly certified. |
| Identical operation / lost checkout reply | VERIFIED UNCHANGED | real SDK fixture and SQL tests preserve one checkout/customer and exact saved provider parameters; plan-change replay/conflict tests retained. |
| Universal changed-body/actor idempotency | BLOCKED | See code gaps below. Do not claim the current implementation satisfies this stronger work-order requirement for every action. |
| Existing recovery screens | VERIFIED UNCHANGED | /app/billing and /clocker/access/paused remain implemented, source untouched. No new browser/visual/hosted acceptance. |

## Claude contract — existing routes and exact shapes

`GET /api/commerce/status` (current company Owner, same origin, no query) returns
only CommerceStatus from src/lib/commerce/status.ts, with no-store. Sanitized
examples are in step3-billing-evidence-20261112/contract-fixtures.json. That file
contains valid trial, paid, grace, restricted, employee-limit and pending-payment
presentations; pending reconciliation is the existing status, not a new enum.
`GET /v1/status` adds businessId, businessName, setup, applicationUrl,
ownerEmployeeId and timeZone. The hosted adapter is `/api/billing/v1/status`;
next.config.ts rewrites `/v1/:path*`, `/internal/:path*` and `/webhooks/stripe`.

`POST /api/commerce/handoff` returns `{url}` only, an exact trusted
`/pages/plans#handoff=<43-character-proof>`. Exchange that proof once through
`POST /v1/handoff/exchange`, body `{token}`, exact allowed Origin and JSON, to get
`{accessToken,expiresIn:28800}`. Keep tokens in memory and scrub fragments; never
log, persist or send to analytics. Expired, reused, wrong-purpose or revoked
links return 400 `{error:{code:"invalid_or_expired_link"}}`. Recover with a new
signed-in Owner handoff; a browser-supplied company/customer never establishes
rights. Handoff purpose is separate from Stripe test/live event mode.

Billing POSTs require Bearer, exact Origin, JSON and UUID Idempotency-Key:
- `/v1/checkout`, `{lang?:"en"|"es"}` -> `{url}`.
- `/v1/portal`, same body -> `{url}`.
- `/v1/plan-change`, `{plan:"small"|"team",lang?:"en"|"es"}` ->
  `{url,plan,effective:"after_payment"|"period_end"}`.
Team is after_payment; Small is period_end. URL creation/return proves neither
payment nor confirmation/scheduling. Keep current status until reconciliation.
Retain the same key/actor/body/language for retries. Do not generate another key
just because a reply is missing.

| HTTP/result | Safe recovery |
| --- | --- |
| 401 unauthorized | Clear prior private data, sign in again and obtain a fresh Owner handoff. Do not automatically replay a financial action under a different actor/key. |
| 403 origin_denied / owner_required | Stop; correct trusted origin/current Owner authority. Do not bypass with caller company selectors. |
| 409 billing_binding_changed | Withhold old result; reread current authority/status and review the original operation before retry. |
| 409 idempotency_conflict | Preserve original key/input for recovery; a changed reviewed action needs a new key only after resolving any uncertain original outcome. |
| 409 subscription_sync_pending / subscription_change_pending | Keep original operation and authoritative capacity. Bounded status refresh/support; no optimistic entitlement. |
| 409 checkout_expired | Resolve uncertain provider outcome first; the documented checkout contract requires a new reviewed operation after expiry, never mutation of the old intent. |
| 429 rate_limited | Pause and use bounded backoff; no guaranteed Retry-After is emitted by this service. Never rotate keys to evade limits. |
| 503 billing_unavailable / billing_status_unavailable / temporarily_unavailable | Clear stale private presentation where required; allow explicit retry using the same operation/body. Preserve uncertainty. |
| Outcome unknown (timeout/reply loss) | No success or new charge claim. Retry/reconcile the original saved operation; escalate unresolved provider outcomes before new resource creation. |

Company disabled configuration returns 404 not_enabled. Company status 503 uses
billing_status_unavailable; handoff uses billing_unavailable. The service's
unknown errors use temporarily_unavailable. Provider SDK conflicts are not
uniformly normalized by every legacy endpoint: do not infer all 409s today.

## Remaining gates, separated by owner

- **Code — BLOCKED:** checkout intentionally reuses the original saved open
  intent even if language/body changes (existing Spanish checkout test explicitly
  asserts Spanish then English replays the same URL). Portal relies on provider
  idempotency rather than a durable local full request/actor fingerprint; its
  legacy changed-parameter error is not uniformly mapped to409. Plan-change
  enforces changed provider parameters via Stripe idempotency, but has no local
  durable full actor/body receipt. Retention past provider idempotency windows,
  changed actor and plan-change lost-response after intervening subscription
  state changes are not qualified. Closing these requires a bounded persistent
  operation design and legacy-contract review (schema needs require assessment), not changing existing
  successful assertions or silently generating replacement operations here.
- **Step 2 — BLOCKED:** source reconciled, but referenced Mac delivery.json and
  final protected-check/deployment readback are unavailable in Cloud. Local Codex
  must obtain and reconcile them before combined acceptance.
- **UI — CLAUDE UI REQUIRED:** preserve existing recovery screens and current
  error/token boundaries; later EN/ES/keyboard/mobile refinements and combined
  rendered website/provider flows remain Claude-owned. No UI edit was needed.
- **Hosted — HOSTED ACCEPTANCE REQUIRED:** genuine Stripe signatures/delivery,
  target-only Portal configuration and real renewal scheduling, restricted-key
  capabilities, transport ingress, current-source CI, restore/principal/worker
  gates and normal human sign-in. No previous finite allowance is renewed.
- **Business — JOSE DECISION:** Tax remains disabled until existing merchant,
  registration/jurisdiction/classification/address/commercial decisions are
  approved; refund/dispute outcomes and any grace/proration policy changes stay
  explicit Owner decisions. This patch invents none and needs no new policy.
- **SQL:** executed owned commerce and onboarding-commerce suites qualify only
  their listed cases; no LOCAL SQL REQUIRED claim substitutes for any unrun
  broader release suite. Local Codex must rerun affected checks on its combined
  source; Cloud did not run the full release/Company Access matrix or Step 4.

## Integration and rollback

Local Codex should verify SHA256SUMS, inspect SOURCE-IDENTITIES.json, confirm the
base is an ancestor of current development and review the exact changed paths.
Apply the included format-patch in an allowed detached integration checkout,
preserving Step 2/Claude work. If development advanced, reconcile only relevant
changes and rerun affected checks on that combined source. Clean application is
not acceptance. No shared-branch push, CI dispatch or deployment is requested
by this Cloud artifact.

Rollback is a source revert of the two runtime files plus their regression tests,
followed by affected qualification. No schema/data rollback, staff change or
provider cancellation is involved. The reverted version reintroduces the proven
race/account-admission defects. Keep the webhook/job recovery processes and
normal billing/export/own-pay recovery available; never remove gates to recover.

Director positions: CTO favors the two bounded existing-service corrections;
CISO retains current authority/authenticity and no private projection; technical
assurance limits concurrency claims to real SQL; Program requires the actual
Step 2 receipt; Governance/Policy is CONDITIONALLY COMPLIANT for artifact review,
NO-GO for release while acceptance gates remain. No exception or independent
finding closure is asserted. Implementation owner: Cloud; next gate/owner: local
Codex transfer/scope/combined-source review, then existing release owners.

## Executed qualification and retained failures

Runtime: Linux x64, Node24.22.1, npm11.9.0, PostgreSQL16.10,
Stripe SDK23.1.0, pg8.23.1, Next16.4.2, Vitest5.0.5. Existing locked
node_modules were reused without dependency installation or lockfile edits.
Cloud reports enforced networking and no configured secrets. Application,
commerce and control database variables were unset for owned runs; each runner
allocated its own fresh loopback PostgreSQL, then removed it. No existing or
hosted database was selected. The local engineering toolkit is absent.

Commands below ran in the final detached worktree with runtime/test bytes at
f640d7e3; raw execution started before the commit was assigned, and file hashes
confirm identical bytes afterward. Final documentation is the only subsequent
change. Current evidence is under `step3-billing-evidence-20261112/current/`.

| Command | Result |
| --- | --- |
| `env -u DATABASE_URL -u NEVORA_COMMERCE_DATABASE_URL npm run test:commerce:owned` | 15 files /183 passed /0 failed /0 skipped; PostgreSQL16.10, real Stripe SDK with fictional fetch. |
| `env -u DATABASE_URL -u NEVORA_COMMERCE_DATABASE_URL -u NEVORA_CONTROL_DATABASE_URL -u FUEL_TEST_DATABASE_URL node scripts/onboarding-owned.mjs --suite commerce` | 1 file /18 passed /0 failed /0 skipped; real owned PostgreSQL, synthetic external transports, cleanup confirmed. |
| `npm test -- src/lib/commerce src/app/api/commerce` | 7 files /67 passed /0 failed /0 skipped; service/route/gate fixtures, no rendered browser claim. |
| `npm run typecheck` | PASS, exit0. |
| `npm run lint` | PASS, exit0;0 errors,1 existing warning in services/hosted/neon/workforcemonitor.entry.ts:17 (anonymous default export). |
| `npm run build` via repository releaseBuildEnvironment sanitizer | PASS, exit0; compiled, typed and generated routes, including existing billing and paused Clocker. Build environment contains no app/provider credentials. |
| `npm run check:development-sources` | PASS,73 classified sources,3 active branches. |
| `node --test scripts/onboarding-inventory.check.mjs` | PASS,8/8; no boundary disposition changes. |
| `npm run check:onboarding-manifest` | PASS, canonical checksum829458918b72793e321c71d1afca7079922da08e85de95a4abe9cd2c3950bcfb; existing Node module-type warning retained. |
| Current strict parser over fictional contract-fixtures.json | PASS,9 CommerceStatus examples. |
| `git diff --check` | PASS. |
| Full `env -u DATABASE_URL -u NEVORA_COMMERCE_DATABASE_URL npm test` | FAIL, exit1:12,779passed /5failed /901skipped;853passed /3failed /33skipped files (889total),352.36s. See exact failures below. |

RED/GREEN and superseded evidence is retained separately, never relabelled as
final-source qualification:
- At reference242a9938, the untouched owned commerce suite passed159/159.
- Authority RED:9failed/13passed. First GREEN attempt:1failed/27passed because
  the existing mock revoked at the newly added pre-provider guard instead of
  after provider work. Its sequence was corrected to preserve the original
  post-provider denial assertion; then28/28 passed.
- Event RED:1failed/176passed, the signed foreign account was accepted. With
  account checking,177/177 passed at the earlier source.
- At actual basef6baaaa6 with both runtime fixes removed and new tests present:
  12failed/170passed. Ten are the new behavioral regressions; two are existing
  plan-change fixture expectations adapted for the additional pre-provider
  guard (call count and revocation sequence). This is not12 distinct defects.
  Restoring fixed bytes plus the later SQL count test gives183/183.
- Earlier-reference onboarding-commerce17/17 passed, but final qualification
  uses the actual Step2-enhanced18/18, not that earlier result.
- Earlier typecheck failed because the new synthetic Business fixture omitted
  four required binding fields. The fixture now provides those fields; no cast
  bypass or production type change was used. The original failure is retained.
- The first source inventory failed due to stale origin/development; the fetch
  mapping explanation above is confirmed by FETCH_HEAD/remote advertisement.
- A first current-base RED invocation could not open its not-yet-created log
  directory, so no test ran; fixed runtime files were restored, then the real
  RED run executed after directory creation. A Stripe version metadata probe
  used a non-exported package.json subpath; direct local package metadata read
  corrected the probe. Neither is represented as a product/test pass.
- Earlier-reference full unit run:12,743passed/5failed/900skipped,
  852passed/3failed/33skipped files (888 total),352.13s. Four failures are in
  unchanged operations/process modules; the fifth is the publication hash gate
  rejecting changed application bytes. See earlier-reference/unit.log.

Full unit failures are not waived by the passing commerce/build checks. No
snapshot, publication manifest, assertion, timeout or permission was loosened.
The Cloud shell has umask0077; the unmodified public-directory test requests0755,
which can be masked to0700. This explains that fixture's mode observation, not
all process failures. Timing/process-group failures remain unresolved and are
reported by name. There was no separate root-cause assignment for those modules.
Changed runtime bytes also invalidate the checked-in source-bound manual hash;
finisher must refresh/qualify the manuals against the final combined source,
rather than Cloud generating a competing release publication.

No browser/hosted/provider acceptance or complete release PostgreSQL matrix ran.
The finisher's next exact-source gates include the commands above, all required
release contexts and source-bound manual publication after its combined source
is frozen. Existing Step2 company-access pressure-test CI failure and missing
Mac delivery receipt retain their original disposition; do not self-close them.

### Exact final full-unit failures

1. `src/test/manual-publication.test.ts`: qualifies the actual checked-in web
   manuals and PDFs against current application and source bytes — stale or
   foreign application content hash. This is a real release gate for the new
   application/test inventory, not an inherited pass.
2. `src/lib/operations/managed-runtime.test.ts`: releases only confirmed own
   custody and rejects symlinked or public state directories — expected rejection
   resolved; requested0755 is masked by this shell's0077.
3. Same file: runs the actual canonical CLI with a closed payroll gate and
   retains its structured failure receipt without database access —5000ms timeout.
4. Same file: drains the actual failed CLI receipt before removing shutdown
   handlers after a control database rejection —5000ms timeout.
5. `src/lib/operations/supervisor.test.ts`: stops an owned descendant before
   releasing process-group overlap protection — expected interrupted, got failed.

No failures are in commerce or the changed tests. All five remain open; the
passing focused/SQL/build checks do not substitute for a passing full unit gate.
FileHandle/garbage-collection warnings and synthetic migration-fault diagnostics
remain in the logs. No statement claims source-only results prove hosted,
commercially approved, secure or production-ready operation.

Transfer artifact: the downloadable archive contains `step3.patch`, this durable
handoff/evidence packet, `SOURCE-IDENTITIES.json` and `SHA256SUMS`. There is no PR,
remote feature ref or publication. The first full patch whitespace check rejected runner-log trailing whitespace;
only whitespace/blank EOF lines in the evidence copies were normalized. A final
isolated-index application check
compares the reconstructed tree with the recorded artifact tree; its receipt is
included outside the commit to avoid a self-referential hash.

**STEP 3 CODEX CLOUD: BLOCKED** — complete acceptance is blocked by the five named
full-unit failures and universal durable actor/body idempotency gap. Step 2
source dependencies are reconciled, but its final Mac delivery receipt remains
unavailable. The bounded fixed/tested patch is ready for the sole local SCRUM-190
finisher's integration review; hosted/provider/UI and final protected-release
acceptance remain separate gates. Stop here: no Step4, shared push or deployment.
