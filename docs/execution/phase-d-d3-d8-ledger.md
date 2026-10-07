# Phase D D3–D8 execution ledger

Controlling authorization: Jose's **NEVORA PHASE D — D3–D8 MASTER EXECUTION AUTHORIZATION**, received October 7, 2026 (America/Puerto_Rico). It supersedes the earlier per-section executive/independent gates in `phase-d-d2-d7-controlled-execution.md` and `phase-d-gates.json`. Embedded QA and D8 internal integrated validation govern this execution. No independent reviewer is dispatched.

## Custody and controls

- Repository: `JoseK0514/Fuel-Scheduler-`.
- Execution branch: `codex/phase-d-d3-d8-execution-20261007`.
- Immutable starting SHA: `7485463dedb6b93e8b6ec4ebf3a86172fb9be5b5`.
- Starting tree: `99c8a5fb923c88bf8a520592e425be66f7902bfd`.
- Git verifies parent `9caafedf1b37d794f359ca47309bffa31ecddd21`. The pasted parent contains a transcription discrepancy; the controlling SHA and tree match exactly. No source substitution.
- Frozen D2 branches, shared development and existing worktrees remain preserved.
- Production NO-GO and FR-AUTH-001 OPEN remain in force. No production migrations, data changes, messages, purchases or release authorization.
- Owner/Manager management authority and Employee/Lead self-service authority retain existing current-session checks and lock order. No self-review.
- Database/browser tests use newly owned loopback PostgreSQL and fictional accounts only. Build/start scripts contain no migration operation.

## Requirements and bounded implementation

Requirements source: original Lettered Executive Program pasted document, Phase D D3–D8, and inherited remaining-section guardrails. Relevant executive skills loaded; assessments are perspectives of this single implementation session, not independent people.

1. **D3 Timecards:** employee period/details/breaks/corrections/totals; manager exception-first review, approve, finalize, audited reopen and retained historical revisions. Consume D2 canonical effective views. Exact elapsed time, inclusive first/exclusive following local day, no pay deductions/rounding. Approval binds source fingerprint; finalization requires a completed past period with no pending corrections/open/inconsistent time. An additive finalization interlock prevents D2 changes until explicit reopen. Idempotent commands and source/revision conflicts are visible.
2. **D4 Reports:** period summaries, approval, hours by employee/location/historically captured position, Schedule vs Actual and attendance plus existing request/scheduling records. Authoritative numerator/denominator and provenance; missing policy/evidence produces unavailable metrics. Bounded complete reads fail closed instead of truncating.
3. **D5 Exports:** authorized report dataset in safe CSV and useful accessible printable/PDF output. Formula-injection protection, UTF-8 escaping, scoped downloads, no destructive file/source retention.
4. **D6 Payroll-ready export:** eligible finalized immutable revisions; normalized exact recorded time and separate breaks; explicit employee/provider identifier mappings for ADP/QuickBooks/future providers. No earnings/tax/payroll processing or unsupported vendor certification.
5. **D7 Action Center:** real deduplicated scheduling/request/timekeeping actions, counts and contextual links; no notifications or invented urgency.
6. **D8 Internal validation:** current full suite, owned PostgreSQL/migration/race tests, employee/manager/role/browser Chromium/WebKit/responsive/keyboard/privacy/error/retry checks, typecheck/lint/build/dependency audit and exact identity/custody. Hosted/CI requirements evaluated against isolated environment availability; evidence gaps remain explicit.

## Execution status

| Workstream | Implementation | Verification | Checkpoint |
| --- | --- | --- | --- |
| D3 | COMPLETE | PASS | Embedded checkpoint below |
| D4 | COMPLETE | PASS | Embedded checkpoint below |
| D5 | COMPLETE | PASS | Embedded checkpoint below |
| D6 | COMPLETE | PASS | Embedded checkpoint below |
| D7 | COMPLETE | EMBEDDED PASS | Current-authorized Action Center integration |
| D8 | IN PROGRESS | PREFLIGHT PASS; EXACT CANDIDATE PENDING | Final integrated candidate |

## Rulings and limitations

- Jose's latest instruction controls independent-review timing; no skill or stale register creates a new D3–D8 approval gate.
- Operational recorded elapsed time includes breaks. Break elapsed time is separate. Payroll eligibility does not invent compensation policy.
- Source custody is established by exact commit/tree and Git ancestry; the pasted parent typo does not change the starting candidate.
- Physical-device/screen-reader, hosted authorization/rollback/recovery and inherited release controls retain their documented status. Local automation does not close them.

## Evidence and defects

Evidence commands, counts, finding severity, remediation and checkpoint commits are appended as execution proceeds. No completion or independent closure is claimed from this preparation record.

### D3 embedded checkpoint

Implemented additive migration `0018_timecards.sql`, canonical effective-source timecards, immutable approval/finalization/reopen revisions, idempotent receipts, stale-source/revision checks, finalized-period correction and raw-history interlocks, private scoped read/write APIs, employee/Lead period view, exception-first Owner/Manager review and mobile navigation.

- `npm test`: **188 files / 1,987 tests PASS** after the approved timecards destination was added to the existing exact mobile-navigation expectation.
- Owned Clocker/current-runtime PostgreSQL: **26 files / 457 tests PASS**. This includes **11 D3 protocol tests**, not 11 additional unique tests.
- Focused projection/API/navigation run: **3 files / 41 tests PASS**, overlapping the application suite.
- Owned Chromium/WebKit browser harness: **40 checks PASS**, widths 320/375/390/430/768/1024/1440, actual Manager approve/finalize/reopen, Employee/Lead scope, keyboard and offline/error private-state clearing. Implementation-stage source manifest retained; final exact-SHA D8 rerun remains required.
- Typecheck, ESLint and production build: **PASS**. Next generated its normal type references and development-type include; no migration is executed by build/start.
- P1 `D3-EXEC-001`: stale management proof could survive a current role downgrade in the read guard. Reproduced in owned PostgreSQL; restricted current read roles; **CLOSED by embedded regression**.
- P2 `D3-EXEC-002`: historical raw writes could affect finalized sources. Reproduced; additive finalization interlocks protect raw entry/break and correction writes; **CLOSED by embedded regression**.
- One earlier broad database run was invalidated while the new migration was renamed to preserve numeric order after existing `0017_missing_time_supersession.sql`; that failed run is not passing evidence. The stable ordered-chain 26/457 rerun above replaces it.
- Management perspectives in this session: Product scope satisfied; Engineering transaction/provenance controls verified; Security role-loss finding corrected; Delivery checkpoint reconciled; UX browser geometry/flows verified; Governance permits continued isolated development. These are embedded assessments, not independent audit closure.
- Remaining D3 limitations: exact-SHA whole-phase/browser/CI custody is D8 work; physical devices, screen readers and inherited production holds remain open.

### D6 mapping direction — Jose

Jose selected provider-neutral/configurable mappings on October 7. Preserve one canonical NEVORA normalized time/export model; provider profiles/adapters layer above it. Do not hard-code one ADP/QuickBooks edition or invent an import format. SMB presets require verified vendor fields/formats before availability. No vendor activation or payroll processing.

### Mandatory Phase D scope amendment — Jose

Execution continues on the current D3–D8 lineage without restarting D2 or adding approval gates. Four user-designated **P1 requirements** are mandatory implementation and D8 acceptance items:

- **UX-01 IMPLEMENTED / EMBEDDED PASS:** complete customer Forgot access/password recovery; secure expiring/single-use proof, enumeration resistance, expired/reused proof handling, assisted recovery when the registered channel is inaccessible, tested session invalidation, unrelated account/operational data preserved. Existing credentials/session architecture reused; fictional delivery only during tests. Final D8 regression remains required.
- **UX-03 IMPLEMENTED / EMBEDDED PASS:** distinguish unpublished, published no-assignment/off and unavailable/error employee schedule states; never disclose drafts or present an unpublished schedule as confirmed time off.
- **UX-04 IMPLEMENTED / EMBEDDED PASS:** correction queue distinguishes loading, verified-empty, pending, offline/unavailable, reconnecting and authority loss. Unknown data cannot say no correction requests; privacy clearing/current authority remain required. Final D8 regression remains required.
- **UX-05 IMPLEMENTED / EMBEDDED PASS:** shared Clocker permits the next employee to record their own work while preserving a prior unresolved intent/receipt; never cross-identity replay/discard uncertainty; manager-assisted resolution where needed. Verify network loss/retry/refresh/duplicates/identity switches/concurrency with immutable history, idempotency and device/location binding.
- **UX-02 OPEN / DEFERRED:** stronger first-activation identity proof is explicitly **not authorized** by this amendment.

These P1 requirements are added to the D8 matrix. None is claimed implemented or closed at receipt. The final Phase D disposition must remain incomplete until all four have implementation and embedded regression evidence. Product/Engineering/Security/Governance scope is reconciled against current code before each change; routine safe remediation remains authorized.

### D4 embedded checkpoint

Implemented the bounded period reporting projection, one-statement canonical source adapter, current management/session guards before/after the protected batch and a final authority/lifetime observation, private report API and responsive manager report view. Reports cover the required categories, with explicit unavailability for unapproved overtime/scoring policies. Missing publication coverage produces unavailable Schedule vs Actual totals rather than an invented zero-hour plan.

- Affected projection/attendance/API/navigation suite: **4 files / 79 tests PASS**.
- Owned database report suite: **1 file / 6 tests PASS**, including finalized label/snapshot retention, current role loss, revocation and logout after projection. A fixture initially assumed direct raw inserts could supply schedule context; the existing capture trigger correctly rejected that assumption. The corrected fixture verifies the preserved missing-context limitation without weakening the capture control.
- Owned Chromium/WebKit: **64 checks PASS**, including the 40 D3 checks and 24 D4 checks; this is an overlapping execution count, not 64 independent unit tests. Responsive widths 320/375/390/430/768/1024/1440, keyboard, offline and authorization-loss clearing, Lead denial.
- Typecheck, ESLint and production build: **PASS**. Report button styling was corrected to the existing primary/secondary classes after screenshot inspection; subsequent browser checkpoints will exercise it.
- P2 `D4-EXEC-001`: unpublished planning could be interpreted as zero scheduled time. Explicit publication coverage added and pure projection regression passes. **CLOSED by embedded regression**.
- No executive stop condition triggered. D5 starts automatically. Final exact-candidate D8 runs remain required.

### D5 embedded checkpoint

Added a server-authorized CSV export using a fresh D4 source read, safe UTF-8/quoted fields and spreadsheet formula protection. One versioned rectangular dataset carries scope, exact durations, source hashes, effective entries/breaks, operational summaries, limitations and definitions; absence/correction private reasons are excluded. Added browser-native Print / Save PDF with report-specific print layout, all report sections/definitions and hidden application navigation. No rendering vendor or new paid service is used.

- Affected CSV/projection/read/export API suite: **4 files / 42 tests PASS**.
- Owned Chromium/WebKit browser run: **69 checks PASS**, overlapping D3/D4 checks plus protected downloads and print layout. Chromium generated `period-report.pdf`; local PDF text inspection confirmed all 12 required sections and recorded/break definitions. WebKit print styles verified; browser-native save remains the actual PDF workflow.
- Typecheck and ESLint: **PASS**. D4 database source validation remains unchanged and its 6 owned tests passed.
- No new blocking finding. CSV formula cells remain text; exact source values remain represented. PDF generation is performed through the user's browser print dialog, with no server-side file retention.
- Final exact-candidate D8 regression remains required. D6 continues automatically under Jose's configurable mapping direction.

### D6 embedded checkpoint

Implemented additive migration `0019_payroll_export_mappings.sql`, one canonical NEVORA export model, configurable versioned mapping profiles, exact durations and separate breaks, immutable source/provenance references, finalized-only reviewed employee selection, idempotent immutable export receipts, deterministic canonical/CSV SHA-256 verification, private mapping/export APIs and manager configuration/download UI. The neutral CSV is available; the documented ADP RUN generic v1 preset requires current account-template verification and explicit identifiers/codes. QuickBooks preset columns remain unavailable pending authoritative template verification. Details and official sources: `phase-d-export-mappings.md`.

- Affected model/client/API/navigation/correction-client/timecard-API regression: **6 files / 62 tests PASS**.
- Owned PostgreSQL export protocol: **1 file / 8 tests PASS**, including concurrent duplicate generation, immutable receipts/profile history, original receipt replay after reopen, reopen between projection and receipt generation, stale-source refusal, current-role loss and mapping scope rejection.
- Chromium/WebKit browser: **89 checks PASS**, overlapping D3/D4/D5 plus finalized generation, verified canonical/mapped downloads, actual manager profile save and 7-width mapping layout per engine.
- Typecheck, ESLint and production build: **PASS**. Configurable commands use an explicit bounded 64 KiB body; existing correction bodies retain their 8 KiB default limit.
- P2 `D6-EXEC-001`: WebKit native select content overflowed at 320 px. Diagnosed with DOM geometry/screenshot; corrected select clipping and bounded grid tracks; **CLOSED by Chromium/WebKit rerun**.
- No default compensation policy, earnings code, provider credentials, provider import, payment, paid service or production change was introduced. External import acceptance/account activation is not claimed.
- No executive stop condition triggered. D7 and the four mandatory amended UX acceptance items continue automatically. Final exact-candidate D8 regression remains required.

### UX-04 embedded checkpoint

The existing correction queue now uses explicit connection states and the shared private snapshot controller. Names/counts clear on loading, offline, reconnecting, pause and authority loss. Only a current verified empty snapshot can say “No correction requests.” Reads have a maximum 45-second lifetime bounded by the current session deadline, with a final authority check after projection. Actor-bound requests reject an identity change; uncertain decision retries retain their original operation ID.

- Affected queue/read-model/client/API/shared snapshot tests: **5 files / 61 tests PASS**.
- Owned PostgreSQL correction regression: **1 file / 36 tests PASS**, including session-deadline lifetime and logout after the protected source batch.
- Chromium/WebKit browser run: **101 checks PASS**, overlapping D3–D6 plus actual empty/pending queues, held loading/reconnecting reads, offline privacy clearing and access loss.
- Typecheck and ESLint: **PASS**. Source logs: `/tmp/nevora-ux04-{unit,pg,browser,typecheck,lint}.log`.
- UX-04 has implementation and embedded evidence; it remains a mandatory final D8 acceptance item. Other amended items and D7/D8 remain incomplete. No executive stop condition triggered.

### UX-03 embedded checkpoint

Employee Home and My Schedule use a protected read of the existing published schedule source. The own assignments and eligible-location publication coverage share one SQL observation, guarded by current Employee/Lead authority. Only complete published coverage confirms an empty day as “Off — no assignment.” Partial/missing publication shows “Schedule not published yet”; a failed read clears rows and shows unavailable. Published partial hours are labeled as such. Draft rows/notes and coworker assignments are excluded at the query boundary.

- Affected Home/helper/Schedule page suite: **3 files / 26 tests PASS**.
- Owned PostgreSQL: **1 file / 6 tests PASS**, covering draft privacy, partial publication, verified published emptiness, revoked location/current role, infrastructure failure and logout after observation. Initial fixture failed the existing required schedule creator constraint; corrected fixture rerun passes without control changes.
- Chromium/WebKit: **115 checks PASS**, overlapping prior work plus real unpublished/published-empty schedule and Home states and responsive schedule widths.
- Typecheck and ESLint: **PASS**. Logs `/tmp/nevora-ux03-{unit,pg,browser,typecheck,lint}.log`.
- Mandatory final D8 regression remains required. UX-01, UX-05 and D7/D8 remain in progress; UX-02 remains deferred.

### UX-05 embedded checkpoint

Shared Clocker recovery uses independent employee/device-generation subject keys. The original pending command/verification stays intact; another verified employee can record their own work. Legacy data is retained in place and cleared only after exact receipt resolution. Corrupt legacy data remains available for assistance; corrupt/conflicting current-subject data fails closed. No shared index can overwrite another intent. Existing server identity, device/location, monotonic state and ledger idempotency controls remain unchanged.

A current Owner/Manager can inspect a saved reference through Clocker Recovery. The read-only view identifies an existing immutable receipt, or explicitly leaves an absent receipt unconfirmed. It directs the employee through fresh PIN/receipt verification and the existing timecard/correction workflow; it never cancels, replays or deletes an uncertain action. Private manager results have bounded lifetimes and clear offline/on authority loss.

- Recovery client suite: **1 file / 22 tests PASS**.
- Owned PostgreSQL recovery plus canonical punch regression: **2 files / 48 tests PASS**. The first new fixture incorrectly reused revoked PIN authority after an identity switch; corrected sequence verifies fresh authority without weakening that control.
- Chromium/WebKit: **127 checks PASS**, overlapping prior work plus actual lost committed response, refresh, legacy/current storage, identity switching, next employee double input recording exactly once, original receipt recovery and manager assistance/unconfirmed/offline states.
- Typecheck and ESLint: **PASS** at implementation checkpoint. Logs `/tmp/nevora-ux05-{unit,pg,browser,typecheck,lint}.log`.
- Browser fixture corrections preserve workspace-wide PIN uniqueness and wait for an actual held request rather than assuming the loading label means dispatch has already occurred. The earlier failed harness runs are not passing evidence.
- Final D8 will rerun the complete immutable Clocker lifecycle, races and these recovery journeys. UX-01 and D7/D8 remain incomplete; UX-02 remains deferred.

### UX-01 embedded checkpoint

Implemented additive `0020_account_recovery.sql`, customer Forgot access and Reset access, uniform post-response registered-channel delivery, configurable SMTP, secure hashed expiring/single-use proof, assisted current-authorized identity-verification/proof transfer, atomic password replacement/session and push invalidation, honest invalid/unknown outcomes and preserved unrelated records. Details, deployment configuration and Owner assistance boundary are in `phase-d-account-recovery.md`.

- Recovery transport/delivery/existing login suite: **3 files / 25 tests PASS**.
- Owned PostgreSQL: **1 file / 10 tests PASS**, covering registered-channel matching, hashes/limits, reuse/expiry/retirement, concurrent redemption, current authority/hierarchy, profile changes, unrelated data/PIN preservation, stale reviewed login and push detachment/tombstones.
- Chromium/WebKit: **147 checks PASS**, overlapping prior work plus fictional loopback SMTP delivery, identical unknown/known responses, fragment handling, normal reset/session revocation, reused proof, actual manager-assisted reset, new-password login and responsive recovery layouts.
- Typecheck and ESLint: **PASS**. Production build passed during implementation; final exact-candidate build remains D8 work. Production dependency audit: **zero advisories**. Newly added runtime SMTP and type packages are pinned; installation scripts were disabled.
- A fixture used an incorrect PIN table name; corrected rerun passes. The navigation timing failure filled the old Sign-In field before Forgot access loaded; harness now waits for the target heading. Same-page fragment reopening initially retained the completed form; hash-change recovery was corrected and both browsers pass reuse handling.
- Production SMTP is neither configured nor externally verified. Assisted recovery is available without SMTP. No real message or production change occurred. UX-02 remains OPEN / DEFERRED.
- All four amended P1 items now have implementation and embedded evidence. D7 and mandatory whole-phase D8 remain incomplete; no development-complete claim is made here.

### D7 embedded checkpoint and D8 preparation

Integrated scheduling/request actions from the existing manager builder with D1 attendance observations, D2 correction requests and D3 timecard review/finalization tasks. All sources must succeed under current authority; counts are deduplicated review tasks with no invented policy severity. Contextual links preserve request/employee/period and focus a protected row after its asynchronous read. Private names/counts clear on loading, pause, offline, reconnect and access loss. The full list is accessible beyond the preview.

- Combined D7/affected timecard transport/client suite: **7 files / 53 tests PASS**; D7-only initial suite **4 files / 33 tests PASS**. These overlap, not additional unique totals.
- Owned D7 PostgreSQL: **5 tests PASS**, also included in the whole Clocker/Phase D preflight (**32 files / 501 tests PASS**).
- Chromium/WebKit integrated browser: **187 checks PASS**, overlapping all D3–D6 and UX acceptance journeys; a focused WebKit pointer replay also passed **93 checks**. Responsive widths 320/375/390/430/768/1024/1440, keyboard context links, held loading/reconnect, actual source counts, offline and authorization loss.
- P2 `D7-EXEC-001`: background refresh collapsed the expanded action list. Expanded state now survives a current-scope refresh; role/week scope remount remains separate. Embedded browser rerun passes.
- P2 `D7-EXEC-002`: WebKit delivered a duplicate WINDOW focus between pointer-down on Review and pointer-up. Refresh removed the link during that gesture. Active focus handling is idempotent; actual blur still clears private data before returning, and storage/visibility/offline/explicit refresh still require new protected reads. Native pointer and keyboard contextual navigation now pass. Inherited focus-return harnesses simulate actual blur followed by focus.
- D8 P1 `D8-EXEC-001`: a historical reassignment could bypass the finalization interlock by targeting an unfinalized employee/parent. Reproduced (**11 passed / 1 failed**), fixed by additive `0021_timecard_reassignment_interlock.sql` with ordered locks and both old/new subjects. **12/12 affected PostgreSQL tests PASS**; later full preflight also passes.
- D8 hardening: timecard read lifetimes bounded by current session deadline, actor-bound reads/writes, exact command/action/revision receipt validation, and final current-authority checks. Password reset preservation now includes an actual four-transition punch/break ledger and approved correction history.
- Frozen-D2-schema upgrade preservation test: **1/1 PASS** with actual punches, break snapshots, receipts, PINs, credentials, sessions and approved corrections unchanged; new review/export/proof tables remain empty. The general upgrade-parity fixture initially omitted 0018–0021; its ordered migration list now includes them while retaining exact catalog equality. Full release PostgreSQL rerun remains required.
- Full unit preflight: **200 files / 2,109 tests PASS** before the final 5 manager-write transport regressions. Exact-candidate unit run remains required. Typecheck/lint/build are rerun on the frozen candidate.
- Production audit: **0 advisories**. Full audit retains one unpatched braces advisory reported across five development-only lint packages. See [GitHub advisory GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). This is the inherited lint-tooling follow-up; public application input does not reach lint glob patterns. No lint control is removed, no breaking downgrade is forced, and no runtime-clean claim is extended to developer tooling. P3 `D8-DEV-TOOLING` remains OPEN pending an upstream compatible patch.
- Exact-SHA CI now checks the real head for all jobs and runs the whole Phase D browser journey plus inherited D1/D2/Clocker regressions. Evidence upload selects reports/manifests/screenshots only, excluding scratch source/dependency copies. Artifact upload remains observable and quota failure remains a custody limitation, not a hidden success.
- Existing development/main are still unprotected; no administrative or production policy changed. Production NO-GO, FR-AUTH-001 OPEN, hosted/rollback/physical/screen-reader holds and UX-02 OPEN/DEFERRED remain carried.

D8 is still in progress. Final disposition requires the clean exact candidate, whole-phase regression and actual exact-head CI evidence. No independent reviewer is dispatched and no production readiness is claimed.

### D8 integrated remediation

- Candidate `085da924f519b2e25d59619e4d346f4caed6b111`: local **201 files / 2,114 unit tests**, **33 files / 502 Clocker/Phase D PostgreSQL tests**, **31 executed files / 737 release PostgreSQL tests**, **187 whole-phase browser checks**, **46 D1 browser checks**, **70 Clocker browser checks**, typecheck/lint/build and production audit **PASS**. Its exact-head CI validation and both PostgreSQL jobs also passed. Its browser job failed Linux WebKit manager geometry at 320 px; the inherited correction harness found a receipt-feedback failure. This candidate is not a completed D8 gate.
- P2 `D8-EXEC-002`: removing a focused retry control could trigger a privacy pause that cleared generic confirmed receipt feedback. Only fixed, non-identifying approved/rejected/unknown-operation feedback now survives a pause. Names/counts remain cleared and authority loss clears feedback/retry. Scope changes remount correction/Action Center state. **19 affected unit tests PASS**; final Chromium/WebKit receipt-loss regression remains required.
- The inherited correction harness now waits for an enabled retry under a fresh authorized browser snapshot, then still verifies exact command equality and exactly one decision/adjustment. A separate API request is not proof that the tab has received its protected snapshot. Offline and authority-loss expectations use the distinct UX-04 labels; private clearing and absence of false all-clear assertions remain unchanged.
- P2 `D8-EXEC-003`: Linux WebKit manager timecards overflowed at 320 px although the local WebKit run passed. Grid tracks, nested labels and controls are bounded; the same overflow assertion remains, with DOM geometry diagnostics on failure. Exact Linux CI retest remains required.
- P2 `D8-EXEC-004`: actual PDF text extraction reproduced omitted collapsed report definitions/source observation. Print lifecycle/media events now expand report disclosures and restore the customer's previous open/closed choices afterwards. Chromium/WebKit print assertions now require the actual definition and source-observation contents, in addition to the existing output and hidden-navigation checks. PDF text extraction and final browser retest remain required.
- Candidate `0f24af87da2f1cd2b4551de035773d7be4aaa1d2`: local **201 files / 2,115 unit tests**, **187 whole-phase browser checks**, typecheck/lint/build and production audit **PASS**. Its correction retry cases progressed through every approve/reject delivery-loss mode after the readiness assertion; the old generic offline expectation then failed. These are remediation-stage observations, not a final whole-phase PASS.
- GitHub artifact upload still reports storage quota failure even for the restricted evidence files. No purchase or deletion is performed. Git source/tree custody and retrieved exact-job logs remain available; remote artifact retrieval is still an explicit release evidence limitation.
- Linux diagnostic retest localized `D8-EXEC-003` to the shared mobile header, not the timecard body: at 320 px, the Manager badge/Menu group extended to 331.56 px. The responsive header now permits wrapping with bounded actions, preserving all labels and 44 px interactive controls. Final Linux Chromium/WebKit retest remains required.
- Candidate `bb59c8f1d18c018e865c271aa77b833dfd810f3d`: local **201 files / 2,115 unit tests**, **189 whole-phase browser checks**, **282 inherited correction checks**, typecheck/lint/build and production audit **PASS**. Exact PDF text extraction confirms all **12 sections**, definitions and source observation in **3 pages**. Correction delivery-loss/retry and lifecycle checks pass in Chromium/WebKit; Linux header retest and final exact-head CI remain outstanding.
- Candidate `d0b149ec49efc27a2f55965028506651771567f2`: local **191 integrated + 282 correction + 46 attendance + 70 Clocker browser checks PASS** (589 overlapping check executions). Exact-head CI validation (**201/2,115**), Clocker/Phase D PostgreSQL (**33/502**) and release PostgreSQL (**31 executed files/737 tests**) PASS. Linux WebKit manager geometry now passes all seven widths, closing `D8-EXEC-003`. The subsequent mapping geometry exposed P2 `D8-EXEC-005`: anonymous grid label text/flex captions overflow at 320 px. Captions now have explicit bounded wrapping spans and a bounded root grid; no input labels, provider fields or mapping behavior changed. Final Linux browser regression remains required.
