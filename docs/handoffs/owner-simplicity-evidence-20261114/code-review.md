# Whole-candidate review

Reviewed base `af62e26bc886a6c77a7039c0313fb8243e51b40f` through `8601864642b35aae389ea4646d59cfa00ed89c26`, including the untracked Owner simplicity handoff. Source/index/HEAD were not changed. Artifacts are outside the checkout at the parent's explicit request.

## Strengths
- Root onboarding receipt, setup version, all canonical employee/qualification/scope writes, and deterministic company/actor/import/index child receipts compose into one transaction. Request-local preparation preserves workspace-version, live session, role/scope and active catalogue guards; no new service/schema or invitation side effect.
- HTTP input is bounded and same-origin; catalogue IDs are explicit. Atomic capacity enforcement remains in the existing database trigger.
- The two clarity corrections preserve layout and counting policy while withholding failed position data and calling a calendar payday Scheduled.
- Handoff honestly distinguishes backend acceptance from Claude/browser/hosted/provider work, with retry and unknown-outcome guidance.

## Findings

### Critical
None found.

### Important — case-insensitive email conflicts pass preview
`src/lib/onboarding/roster.ts:61`, `src/lib/onboarding/roster.server.ts:25`, `:40`, `:42` compare email strings exactly. Canonical uniqueness at `db/migrations/0001_initial.sql:31` is `lower(email)`.

Reproduction: two new IDs using `Ana@example.invalid` and `ana@example.invalid` return `valid:true`, with no row errors. The same comparison defect misses an existing employee email with different casing. The database still protects integrity, but confirmation rejects the entire reviewed roster with a generic batch error rather than identifying the row before confirmation.

Smallest fix: compare normalized email keys consistently in in-file duplicate detection, command duplicate detection and existing-company preview checks, preserving submitted email spelling if desired. Add regressions for both case-variant duplicate rows and a case-variant existing email; keep the canonical unique constraint.

Evidence: `parser-reproduction.jsonl` first record; `schema-and-lines.txt`.

### Minor — inherited alias key bypasses ignored-column disclosure
`src/lib/onboarding/roster.ts:46` reads an ordinary object's inherited properties. An unknown `constructor` header resolves to `Object`, becomes a function-named entry in `values`, and is omitted from `ignoredColumns` at line 74.

Reproduction: CSV with valid required fields plus `constructor` returns `ignoredColumns:[]` and `values["function Object() { [native code] }"]`. No code execution was observed or is claimed; the consequence is incorrect review output for an unsupported column.

Smallest fix: use an own-property check or Map/null-prototype lookup for aliases, and test that `constructor` is disclosed as ignored.

Evidence: `parser-reproduction.jsonl` second record; `schema-and-lines.txt`.

## Verification and coverage
- Reviewed entire diff and relevant canonical parser/creation, scope/session/workspace guards, onboarding receipt/version wrapper, HTTP admission, setup data, capacity trigger and email schema; also spec, plan, Rulings, and handoff. Captured diff: `candidate.diff`.
- Invocation from candidate: `node --import tsx /tmp/nevora-owner-simplicity-final-review-8601864/reproduce.mjs`. Binary observables: both records show `valid:true`; case variants have no duplicate error; constructor has empty ignored list. Artifact: `parser-reproduction.jsonl`.
- Invocation from candidate: `node node_modules/vitest/vitest.mjs run src/lib/onboarding/roster.test.ts src/app/app/employees/page.test.tsx src/app/app/my-time/page.test.tsx --maxWorkers=2`. Exit 0; 3 files, 20 tests passed. Artifact: `focused-tests.log`.
- Parent-reported integration, lint, typecheck, build and full-suite results were not independently rerun or used as passing certification. Integration test source was inspected. No live mail, paid model call or customer data used by reviewer.

## Declined to judge
- Actual browser/mobile/keyboard/EN-ES import UX: Claude integration is explicitly deferred; no finished importer UI is in this candidate.
- Hosted deployment, actual inbox delivery and live Rondo model quality: explicitly outside this local backend review and not exercised.
- Full repository/manual-publication gate: running under the parent; this review does not substitute for that evidence.

## Verdict
**Ready to merge: No, pending the Important email-comparison fix and relevant regression rerun.** No independent transaction or authority regression was found in the reviewed paths. The minor alias fix is small and should be included while touching parser validation. No production/hosted certification is asserted.
