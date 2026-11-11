# Remaining non-native backend delivery — Nov10

Codex owns this backend/test delivery; Claude owns UI integration. Jose selected Employee ID + PIN and authorized the prepared exact copy/PDF changes. No new decision is required for this bounded implementation.

Qualified code checkpoint: `06c608ba6c324655700ae5b23c0fd6ad84c1bbf9`, descended from development `b2c24cbe92f08c54c9e6e7ea2810f141c7e4947d`. The closing documentation commit adds this record and updates the contract only. Latest inspected collaboration source `ff5a267f9fff147942273f3df362458ee04c1573` remains HELD under Claude ownership, without wholesale import or UI acceptance. Exact final development/CI state is maintained in [SCRUM-175](https://thevelani-team.atlassian.net/browse/SCRUM-175).

## Implemented

- NV052: canonical Employee ID + matching PIN, PERSON5/5min across tablets, identified DEVICE20/5min, retained legacy DEVICE5/5min, unchanged WORKSPACE20/5min and rate backstops. Legacy verification cannot bypass PERSON limits.429 includes actual maximum remaining delay, matching Retry-After and limitScope. Forward0056 and regenerated bootstrap manifest support new company creation/restore; current tenancy ancestry is retained. No UI field/countdown change is claimed.
- NV186/NV188/NV308: exact Spanish slogan export, Forgot password? recovery-navigation label, new-request policy2026-11-10, and future-statement PDFV3 using Monto/Montos. Older accepted deletion requests continue their original receipt/version. All eight old V1/V2 employee/company EN/ES PDF variants retain exact bytes/hashes. Financial values and payment disclaimer remain.
- NV033: located the producer/consumers in the held compressed scan archive. The [member patch](2026-11-10-nv033-fixture-uuids.patch) consistently replaces three fictional IDs with UUIDv4s; [provenance](2026-11-10-nv033-fixture-map.json) includes an actual apply check against the latest archive. Canonical withdrawal authorization/UUID guards remain. No real legacy non-UUID customer data was established.
- Closed deferred coverage: actual mounted A → unverified → B → A pending/history privacy transitions, and real scanner/manual availability reminder concurrency sharing one recipient/source/day queue budget. Existing protected read/reminder contracts remain in the [UI contract](2026-11-10-ui-review-backend-contract.md) and [reminder API guide](../../src/lib/manager-reminders/README.md).

## Evidence and source attribution

Evidence root: `/Users/josek0514/.codex/ui-review-final-closeout-20261110`. Cohort results overlap default/combined results; never add them as unique test counts.

| Check | Observed result / checkpoint |
|---|---|
| Default suite |11,941 passed,857 skipped; final2-worker run on4119 application bytes,245.98s. Later06 changes only the separately executed SQL fixture. Dedicated DB/browser suites below are separate from default skips. |
| TypeScript / full lint | PASS; latest test-delta typecheck on06 PASS. Full lint0errors/one existing warning. |
| Production build / development-marker scan |4119 clean build PASS;4,495 artifacts scanned, development markers absent. No application/build/config source changes afterward. |
| Source inventory / manifest |73 classified sources/3 active branches; canonical0056 manifest matches. Fresh inventory is checked again before delivery. |
| PIN actual SQL |87/87, including restricted APP, physical A/B isolation, legacy bypass/reset/race fences, exact delays and lock ordering. Reviewer compared every retained source hash with the integrated candidate. |
| Copy/PDF cohort |160/160 focused; eight historical PDF bytes equal baseline; new V3 normal and five-page statements rendered and inspected. |
| Owned onboarding acceptance |All7 stages PASS on9ec9: inventory, manifest,209 core onboarding tests,514 Company foundation tests, Company exchanges, actual provisioner packaging and managed-workforce HTTP/package checks. Real matchingPG17.10 dump/restore preserved the new PERSON row before restore retirement. Later code delta affects only the scanner SQL test. |
| Current scoped actual SQL |06: reminders42/42; deletion-history15/15 (including old-policy lifecycle); withdrawal14/14,12 of those actual SQL. |
| Mounted journal privacy |4119:30 storage checks plus2 actual mounted transitions, Chromium/WebKit. Source unchanged afterward. Generated-only unscoped mutation fails at employee B; no production-file mutation retained. |
| Complete browser remediation |06:14 account +6 missing-time +28 Reports checks PASS; zero runtime errors in all three reports; both engines/all7 Reports widths retained. All owned mirrors closed with sourceVerified/mirrorVerified. |
| Fresh combined review |APPROVE/no blockers through06, with follow-up UTC diagnosis reviewed. No independent certification implied. |
| Final exact-source cloud CI |Track current final development SHA and results in SCRUM-175; pending at documentation freeze. Local results do not substitute for CI. |

The two initial Reports failures were traced to navigating away from Home before six actual client reads completed. The driver now waits for ready responses and mounted Home; all browser pageerrors/console errors are fatal. The original premature-navigation control still fails, as does a real thrown-error control. Nonfatal owned-development HTTP reset diagnostics are retained; no attributed application defect was established from them.

Failed histories remain available: missing matching backup clients; stale generated nv174 test-route validators (generated directory preserved outside the repo before clean build); one interrupted repeated default run under competing build/test load (exit130), followed by115/115 affected-file checks and the complete passing2-worker suite with unchanged deadlines; scanner fixture unbound policy and mislabeled database-local timestamp. The final scanner test uses canonical workspace policy, UTC serialization, an actual stored-instant equality check, real discovery/recipient/planning preconditions and the original bounded two-writer barrier. No assertions, engines, privacy checks or timeouts were weakened.

## Claude integration and remaining product gates

1. Reconcile development with Claude's UI source, using the [complete callable contract](2026-11-10-ui-review-backend-contract.md). Add Employee ID to kiosk verification, bind it to PIN, consume stable codes/limitScope/actual wait, and update the older device-only/fixed-five-minute text and DESIGN notes. Use verified status from verify to avoid the extra status request.
2. Wire the remaining read/reminder consumers, approved slogan/legal labels and future-PDF version support. Queue commitment is not delivery; keep original operation IDs for recovery and all existing activation holds.
3. Apply the NV033 member patch to an isolated extracted scan source and repack via the harness's documented procedure. Recheck affected Employee/Lead detail on the combined UI; the held archive was not imported into development.
4. Triage [SCRUM-176](https://thevelani-team.atlassian.net/browse/SCRUM-176): the existing PIN UI probe still retains six desktop Search geometry failures (30px rectangle versus unchanged43.5px threshold). Its40 other checks passed. This delivery does not change that UI or self-close the finding.
5. Qualify the combined web UI/staging source. Hosted functional acceptance, worker activation, future f10 catalog adoption, native app/provider changes and production authorization remain distinct. Future physical employee purge must remove its PERSON limiter row before deleting the employee; no such purge workflow was introduced.

CTO/CISO: bounded source-owned contracts, current authority and least-privilege controls retained; no new definer surface. Governance: development qualification with explicit UI/CI/hosted boundaries, no exception or independent finding closure. No main/production deployment, real email/SMS, paid service/model use, native app/provider change or cloud credential/grant mutation occurred.
