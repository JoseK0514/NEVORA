# Self-service onboarding implementation decisions

2026-11-08. Ordered record of decisions made during the approved implementation. Historical choices are preserved; the final-review corrections below supersede SQL-spelling detection and reservation-only daily budgeting. Claude owns rendering; this is a backend record.

## Rulings

1. Ruling: execute inline with one fresh whole-branch reviewer at the end — no per-task delegation selected; preserve user allocation of UI to Claude.

2. Ruling: normalize Task0–Task9 headings to Task 0–Task 9 for the existing brief extractor — numbering and scope unchanged.

3. Task 0: RED observed missing contract/config modules; GREEN68 tests passed. Ruling: phone expectation corrected before implementation to preserve current normalizePhoneNumber formatting (787-555-0101).

4. Baseline npm test: 10977passed,801skipped,1failure (no-page-entrance-motion.test.ts ENOENT on URL-encoded space). Ruling: repair file URL conversion in the existing harness without weakening its assertion; this is an environment-path regression, not a UI implementation change.

5. Ruling: one unfinished registration per normalized verified-email/environment prevents accidental duplicate setup; after initial Owner activation the flow can create another business. Consent versions also persist per request receipt. Quiet accepted requests persist their original result and consume IP/platform admission so they cannot be used as an unauthenticated durable-write flood. The admission bucket is captured once after its serialization lock.

6. Ruling: require server-configured reviewed terms/privacy versions and publish only safe version+URL metadata through GET /api/onboarding/config. Newly submitted mismatched policy versions reject; an identical already-committed request recovers its historical receipt before current-policy validation, without new consent/send. Actual legal text/version approval remains a hosted-enablement obligation.

7. Task 2 Ruling: use the existing SqlExecutor interface and a small applicationSql raw-query adapter, rather than making getDb async. Installed Neon1.1.0 only accepts a string connection URL, and preserving genuine unawaited SDK query promises inside scoped executor transactions avoids an unsafe driver imitation. Convert direct business getDb callers to applicationSql; the shared executor chooses legacy or privately bound isolated execution. getDb/getTenantRuntimeDb deny isolated/unknown modes before cached legacy handles.

8. Task 2 Ruling: no workspace proof is authorization. Resolver privately issues routing bindings from actual control registry rows. The scoped executor rechecks registry revision/lifecycle and encrypted secret ownership, then performs anchor lock/role+workspace guard -> business statements -> final guard in ONE genuine Neon ReadCommitted batch. Node request/worker context may carry only this immutable routing binding; existing actor/lease/role guards remain required.

9. Task 2 Ruling: allocate0047_isolated_workspace_runtime.sql for the real anchor/role metadata now so A/B tests use actual schema. Move the Task4 onboarding-bootstrap/progress/batch migration to0048_self_service_onboarding.sql; do not modify a committed historical migration. Neither applies to existing companies here.

10. Task 2 Ruling: the initial337-entry inventory includes auth/worker/native work explicitly owned by Task3. Classify converted data/control paths and retain BLOCKED_IN_ISOLATED_MODE for those pending Task3. The full inventory gate applies before Task3/public enablement, not a false all-converted claim at Task2.

11. Task 2: Ruling: applicationSql exposes only raw query Promise compatibility; the sole tagged-query business writer (availability deadline) now constructs SqlStatement values and uses the real shared transaction executor. Original domain serialization, cancellation and operational guards remain. React caches remain request-render scoped and isolated database reads require headers or a private explicit callback binding.

12. Task 3: Ruling: preserve all synchronous inner credential/session/token issuance and domain SQL guards. Wrap/unwrap at actual public transports and the Next cookie boundary with authenticated company/environment/incarnation/purpose envelopes. Inner proofs remain private server values and existing hashes/revisions remain unchanged. This avoids broad rewriting of mature domain capability and claim paths; the cost if a public boundary is missed is covered by inventory and cross-business transport tests.

13. Task 3: Ruling: keep native v1 registration cryptographic material origin-bound through its existing protocol, selecting the exact canonical company origin from the registry per invocation. Native discovery is cookie-free, returns only schema/status/origin, and uses a durable conservative platform budget (120/minute), independent of signup enablement. Native UI selection, entitlements and installed-binary validation remain Claude/release integration work; no native UI is changed. Restore must retire native challenges/material/jobs before reactivation (Task9 operator gate).

14. Task 3: Ruling: preserve Claude visual ownership. Existing activation/recovery/Clocker components receive only transport syntax admission and Clocker input maxLength changes for opaque envelopes; no markup, copy, styling or layout redesign. The new shared helper admits syntax only; the server authenticates context/proof. Leaving old43/72-character admission would block valid new envelopes.

15. Task 3: Ruling: held PhaseF selected-locator auth and the provider-specific legacy photo-cleanup function explicitly deny isolated mode. Supported workers resolve their explicit registered origin with a WORKER principal after existing worker authentication, retaining feature/budget/lease checks. These explicit closures are converted boundaries, not claims that held protocols are implemented for isolated companies.

16. Task 3: Ruling: preserve existing anonymous public-branding permissions. Logo identifiers remain ordinary public lookups scoped to the registered host, not authentication capabilities; two owned databases with the same asset UUID return only their own bytes, with isolated private/no-store responses. Private photo retrieval still requires a genuine current bound Owner session; copied-cookie HTTP test returns401 AUTH_REQUIRED.

17. Task 4: Ruling: official v2 create has no documented idempotency-key/annotations parameter. Use a precommitted authenticated generated resource name (no customer SQL/provider identifiers), exact approved organization/region and creation-window checks, then exact project/branch/endpoint/credential identity validation. A durable CREATE attempt is never POSTed again after ambiguous outcome; only an explicit known rejection can allow bounded retry. Reconcile unknown resources by exact ownership, otherwise keep pending/quarantined. Cost if wrong: duplicate spend or foreign bootstrap; tests must reproduce both.

18. Task 4: Ruling: pending Owner is an inactive OWNER profile with verified email and no employee_credentials row. All canonical base/final migrations run atomically in a proven empty schema; onboarding receipt, identity anchor and restricted APP/WORKER roles commit together. Desired runtime passwords are encrypted durably before bootstrap so a lost commit can recover by exact matching receipt, never ALTER/reset credentials. Legacy setupCompany keeps active/password behavior and second-run refusal through shared fresh-schema primitives.

19. Task 4: Ruling: generate each application database name from the control-issued workspace UUID (nv_app_<uuidhex>), matching generated login roles and resource name; no customer text becomes an SQL identifier. This enables exact current_database/principal checks and actual separate A/B owned tests on one local cluster, while production still uses a separate project per business. The initial test's UTC value violated current named-IANA validation; fixture corrected to America/Chicago, no validator loosened.

20. Task 4: Ruling:0048 establishes empty custody/progress/batch tables. The tested initial-Owner activation function will be a new additive0049 in Task5, rather than editing0048 after its Task4 commit or guessing the final security protocol now. Shared pending-company bootstrap remains a narrow Node primitive with an explicit privileged client and proven empty-schema/identity checks. Existing CLI loader and interface remain supported.

21. Task 5: Ruling: use a separate encrypted control grant request and private provisioner worker to create company grant custody; web deployment never receives provisioner credentials.15minute one-use grant plus exact initial Owner email fingerprint/revision, lease and receipt checks. New control0004 and company0049 are additive; no legacy Owner adoption.

22. Task 5: Ruling: successful activation directs to existing normal sign-in rather than minting a session in the activation response. This avoids assuming cookie delivery and lets lost response/cookie recover through the same known credential, never a reset. HTTP test asserts no Set-Cookie/no session row; existing guarded session regressions run separately.

23. Task 6: Ruling: common mutation executor augments ONLY the identified canonical write transaction, preserving its result indices/guards; authorization-only preflight reads cannot mark a step saved. Version/progress/immutable receipt commit atomically with canonical DML. An injected receipt failure proves catalog write rollback.

24. Task 6: Ruling: optional payroll/Clocker/company-policy configuration uses existing settings APIs/destinations, with explicit audited SKIP only. Onboarding never activates flags, invents labor/legal defaults or claims broad module readiness from one configured row. Core readiness is business+active location+existing evaluateLocationReadiness scheduling; Owner-only business and absent optional positions/team are allowed. Optional modules remain OPTIONAL with current configuration/review reasons. This avoids wrapping multi-transaction finance commands and accidentally recording a preflight read as a save.

25. Task 7: Ruling: use the standard versioned envelope with existing canonical employee payload; expose/reuse the current parser rather than duplicating normalization. Canonical employee/profile/eligibility/qualification/Manager scope receipt and onboarding receipt share one write transaction. Replay verifies readEmployeeCoreAccessOperation. Creating a profile never calls invitation delivery.

26. Task 8: Ruling: prepare up to50 explicitly reviewed targets, process at most5 PREPARED per invocation. Persist UNKNOWN intent BEFORE canonical issue; unknown items never retry automatically, even if a crash occurred before the actual call. GET reconciles only existing canonical receipts and delivery events. Explicit new reviewed resend uses current invitation revision and existing168h/limit rules. No bearer queue.

27. Task 9: Ruling: split the existing Company Access shift-change suite into its own exchange-prefixed owned configuration, retaining its36 actual tests and the fixture wrong-target refusal. Foundation config excludes only that file; owned runner recognizes the new config as exchange. CI/acceptance must run BOTH configurations. No assertions/migrations/business rules are relaxed.

28. Task 9: Ruling: finish all independent backend logic/acceptance/operator work and obtain the required fresh whole-branch review, but do not fabricate browser evidence or self-close UI/hosted gates. Task9 remains open for Claude rendering, real browser/native/hosted/source integration and release authority; local backend acceptance is explicitly scoped and source-pinned.

29. Task 9: Ruling: additive0051 immutable restore receipt and private operator retirement leave SUSPENDED, rotate restored passwords to unknown, retire sessions/recovery/passkeys/native/Clocker/push/old jobs and old runtime roles/secrets. Replay never rotates again. No automatic reactivation or hosted/customer action. Preserve PIN history and require Owner-audited reissue/re-enrollment under the explicit operator reactivation review.

30. Task 9: Ruling: control0005 allows only mature terminal one-way grant ciphertext erasure, retaining operation tombstones. Bounded maintenance never deletes business/provider resources, reissues proofs or retries unknown delivery. Retention days specify signup expiry, not a false business-data erasure promise; long-lived business/security/provenance retention needs the documented pre-enablement review. Restricted-role cleanup initially reproduced missing registration_requests SELECT; template now grants only that required read plus narrowly scoped maintenance privileges.

31. Final: Ruling: review declined integrated browser/mobile/locale and installed native behavior — these remain unverified open gates because no integrated UI/installed artifact is present — cost if wrong is unusable client behavior despite backend tests.

32. Final: Ruling: review declined hosted Neon/mail/DNS/TLS/account/cost/backup operations — retain default-off and require separately authorized environment evidence — cost if wrong is hosted provisioning/delivery/security failure and unapproved spend.

33. Final: Ruling: review declined remote CI/branch protection/independent certification/production authority — local artifacts establish none of those; keep release blocked — cost if wrong is releasing an unchecked artifact.

34. Final: Ruling: review declined live restored-company reactivation — retirement remains suspended and fresh authorization/roles/contact review precede reactivation — cost if wrong is stale access returning.

35. Final: Ruling: reviewer declined in-flight final acceptance — executor owns its actual result. Candidate2e7937a45 backend acceptance passed manifest,112 onboarding,foundation andexchange; it is historical after this fix pass, not final current-source proof — cost if wrong is attributing old evidence to changed code.

36. Final: Ruling: canonical source revisions coalesce once per real transaction through0052 triggers and a transaction ID, including established writers; pending bootstrap activation does not advance setup revision — prevents stale cross-entrypoint overwrites while preserving receipt semantics — cost if wrong is excessive conflicts or lost current edits.

37. Final: Ruling: company WORKER uses enumerated reads/inserts/column updates. Immutable checked lock-only columns and a no-write fixed-allowlist definer retain PostgreSQL16/17 source-lock protocols without credential/session/role writes — cost if wrong is denied jobs or excess job authority; actual restricted-login payroll/notification and negative SQL regressions cover the boundary, hosted grants remain a separate gate.

38. Final: Ruling: inherited dependency audits have0 high/critical,1 production moderate (Nodemailer) and9 total moderates; no force upgrade or certification inferred. Retain findings as a pre-enablement dependency review alongside default-off mail — cost if wrong is known dependency exposure when enabled.

39. Final: Ruling: preserve this plan's ignored workspace/ledger and review artifacts because Task9 UI/hosted/source integration gates remain open. Do not delete incomplete-task evidence for finish cleanup — cost if wrong is local disk retention, preferable to losing resumable verification custody.

## Deferred minor findings

- Final: minor (deferred): missing UI result-union fixture examples; actual backend responses/tests and contract exist, but Claude integration should add versioned examples for every rendered state.

- Final: minor (deferred): redundant same-input child-ID pure assertion; behavioral integration replay evidence remains substantive.

- Final: minor (deferred): UI contract opening still calls implemented APIs planned; dated readiness document is the current status source.

## Cost and remaining evidence

For historical rulings without an explicit cost in their original line: breaking existing CLI/domain semantics can block established companies; missed routing/token boundaries can expose cross-company data; failed durable recovery can duplicate resource cost or lose acknowledged work; mistaken retention or readiness can overstate what an Owner configured. These risks are the reasons for the actual PostgreSQL, driver, transport and interruption tests, default-off enablement, preserved legacy mode and separate hosted/UI/release gates. The reviewed deployment must still prove the same controls; local evidence is not certification.
