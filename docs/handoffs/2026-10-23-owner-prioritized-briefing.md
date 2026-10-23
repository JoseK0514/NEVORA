# Owner prioritized briefing: implemented first increment

Jose approved starting the enhancement roadmap on October 23, 2026. This increment implements the prioritized Owner briefing and private follow-through. Implementation/evidence owner: Codex. Branch: `codex/owner-prioritized-briefing-20261023`. Fresh development input: `739165b2`; existing Owner advisor dependency: `2530a701` from draft PR25. Local dependency merge: `055a383d`. Initial implementation: `c81f46a5`. Tested application checkpoint after review fixes: `8cbb3ab3`. Subsequent documentation commits do not change the executed application.

## Result and boundaries

Opening AI manager now shows up to three deterministic priority items, grouped by issue kind, location and business date. Current missing clock-ins rank before current/upcoming planning gaps, finished shifts without punches and incomplete coverage setup. The screen names each location/date, explains the concern, shows the observation timestamp and links to its existing source screen. Published shifts/punches and the current planning ledger including drafts are explicitly separate. Missing punches are not an absence finding.

Owners can track, defer for one hour, mark irrelevant today, restore and recheck. These are private briefing choices, isolated by workspace and Owner, with exact issue/evidence hashes, expected revisions and request replay. Changed evidence invalidates suppression. The follow-through list derives resolution only from current positive punches or complete coverage evidence bound to the same staffing/window requirements. Removed rules, changed subjects and expired dates do not become resolved merely because they disappeared. A failed or capped source leaves an explicit partial/unavailable result.

The briefing does not invoke the language model on open, refresh or review. It works when no provider is configured. The original feature flag, Owner/Company Access rechecks, same-origin boundary, private no-store transport, finite display lease and lifecycle retirement remain active. No schedule, time, payroll, message, access or production data mutation was added. No background monitoring or standing permission was added. The approved roadmap's coverage action proposals and attendance/payroll exception tooling remain subsequent increments.

## Files and storage

- `src/lib/owner-advisor/briefing.ts`: pure projection, ordering, evidence identity and resolution.
- `src/lib/owner-advisor/briefing.server.ts`: existing guarded Today and canonical scheduling-source adapters.
- `src/lib/owner-advisor/briefing-contracts.ts`, `contracts.ts`, `service.server.ts`, `store.server.ts`: bounded public contracts, authorized reads/commands, revision checks and replay.
- `src/components/owner-advisor/attention.tsx`: priority/follow-through screen; existing controller, parser and styles extended.
- `db/migrations/0037_owner_briefing_reviews.sql`: additive private review table, review command function and expanded request-kind constraint. Canonical order, disposable chain and full manual-upgrade parity chain include it.

The latest 50 review records are retained per workspace/Owner. Writes remove reviews older than 14 business-date days and old review receipts after 14 days; there is no scheduled deletion guarantee for inactive Owners. Stored selectors/hashes contain no copied employee names or free-form notes. Attendance evidence caps at 1,000 shifts; coverage caps at 3,000 rows per generation-source collection, 100 active locations and fewer than 10,000 resulting blocks. Reviews accept up to 10,000 proofs within 100,000 bytes; canonical single-day minute segmentation fits this boundary. No resolution proof is silently truncated.

## Verification actually executed

Evidence root: `/Users/josek0514/.codex/owner-prioritized-briefing-evidence-20261023/`. Original and final logs are under `final/`; actual browser evidence is in `browser-final/`. Earlier failing browser evidence remains in `browser-red-keyboard/`.

| Check | Actual result |
| --- | --- |
| Full default suite after fixes | 9,456 passed; 801 existing skips, 561 passing files |
| Advisor PostgreSQL integrations | 31 passed, including eight concurrent competing choices, replay, stale evidence and Owner isolation |
| Full foundation PostgreSQL integrations after migration correction | 281 passed; full columns/constraints/index parity unchanged |
| Focused model/UI regression set after fixes | 13 passed; three review findings reproduced before correction |
| Typecheck, full lint, production build | Exit 0 |
| Release-engineering contracts | 110 passed |
| Actual Next/PostgreSQL browser | Chromium and WebKit, 320/390/1440; 22 scenario groups, complete true, errors=[], external=[] |
| Browser source custody | All 1,858 recorded application source hashes match the checkout at `8cbb3ab3` |

The actual browser scenarios exercise track/defer/reload/restore, changed-evidence reappearance, canonical setup resolution, keyboard navigation, responsive overflow, private-state retirement, real priority persistence/conflicts and Manager/Employee discovery/page/API denial. Answer/error/cancel cases remain explicitly intercepted UI fixtures; no live provider is configured. Visual inspection covered final Chromium 390 and WebKit 1440 captures. Disposable PostgreSQL and owned browser runtimes stopped normally.

The initial WebKit run failed the new adjacent-button Tab assertion. An isolated native-button probe reproduced the same behavior: Tab skipped native buttons, Option-Tab reached the next button. The actual application rerun uses Option-Tab only for WebKit on macOS; Chromium and hosted Linux retain Tab. The exact next-control assertion remains unchanged. Apple's [Safari keyboard reference](https://support.apple.com/en-gb/guide/safari/cpsh003/mac) documents the platform navigation behavior. The final actual application run passed; the original failure was retained.

## Fresh-context review and remediation

The raw [code review](../reviews/2026-10-23-owner-prioritized-briefing.md) preserves REQUEST_CHANGES against `c81f46a5`. It found one HIGH and two MEDIUM issues. The implementation owner reproduced each with a discriminating failing regression and corrected them at `8cbb3ab3`:

1. Removed weekday coverage requirements could falsely resolve an earlier shortage. Resolution now checks retained canonical rule provenance; missing day rules with existing planning blocks leave the briefing partial.
2. Different invalid position requirements with the same error code retained an earlier dismissal. Setup identity now includes affected subjects and current rule evidence.
3. A 1,001-period proof could be displayed but rejected by storage's old 1,000 limit. Projection/write/schema limits now agree, without truncating proof; PostgreSQL verifies the larger accepted proof.

During the fix pass, a positive-resolution regression also caught sorted proof metadata preceding the wrong interval; evidence ordering was corrected before the final passing run. The author then reran the full default suite, PostgreSQL suites, build/lint/typecheck and actual browser acceptance. No second review or independent QA/UI certification is inferred. The raw BLOCK verdict is historical evidence, not rewritten into reviewer approval.

## Known limitations and release state

The on-open path reuses the full canonical generation-source extraction before its application-level row cap. Historical growth can make coverage unavailable/partial, and SQL extraction itself is not bounded by that post-read cap. A purpose-built bounded canonical reader is a follow-up, not implemented here. Expired deferrals correctly reappear, but the follow-through label retains their past timestamp rather than a dedicated expired label. These review concerns remain recorded; no strict retention compliance is claimed without an approved policy.

The source inventory still reports the separately owned development assembly drift and the existing remote branch ceiling (55 against five). No gate was weakened and no other branch was retired. This follow-up is committed locally and has not been pushed, merged, hosted-tested or deployed. The default-off advisor and additive migration require the normal integration/recovery gates and Jose's explicit production authorization. The earlier paid inference allowance remains exhausted and untouched; no additional live inference or production data approval was used.

Product position: deliver this first recurring Owner workflow. Engineering position: reuse canonical rules with conservative resolution evidence. Security position: private personal triage only, current original authority and no new model tools. Governance recommendation: development review ready with release conditions; no production authorization or independent finding closure. Next implementation increment: reviewed coverage-repair proposals under the separately approved roadmap. Next release gate: integrate/reconcile the existing advisor PR and assembly sources, then run hosted acceptance for the selected candidate.
