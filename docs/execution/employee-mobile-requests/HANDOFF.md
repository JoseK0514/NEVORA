# Employee mobile — Requests and eligible open shifts

Implemented in the real Next application, continuing the approved Phase 1 teal system. This batch covers the Employee/Lead mobile Requests hub and eligible coverage pickup. Deeper time-off, incoming swap response, cancellation and history views remain reachable through their existing routes and retain their own later mobile batches.

Application candidate: `7abcd315ae0f978b74d4a06c2cc1525cc67f362b`.
Branch: `codex/employee-mobile-requests-20261027`.
Worktree: `work/employee-app-phase1` in Jose's Nevora design task.
Base: accepted Phase 1 `ae6767980ec21c5a0751eced6e0e60a23ea75cdf`.
No push, merge, PR or deployment. Subsequent report/design-record commits preserve all 1,916 tested application-input files byte for byte, checked against the owned source manifest.

## Implemented behavior

- Requests separates open shifts, changing one of your own shifts, time off and availability. Recent own time-off/shift/Unable-to-work status links lead to existing authorized detail/history. Incoming swaps distinguish a verified zero, positive count and unavailable read; failure provides a retry and a direct destination.
- Open coverage uses the existing published-location reader and shift-change command planner. Only positively checked eligibility enables pickup. Safe rule refusals are separated from unconfirmed checks; failed reads never become verified empty results. Native disclosure preserves date, location, role and overnight ending.
- The consequence matches the planner: automatic pickup may assign immediately; manual-review pickup remains a request. The interface does not fabricate an assignment. Canonical database readback verifies both outcomes.
- Pickup delegates to the existing immutable operation/payload owner. A lost committed response reconciles the original operation before resending. Pending/uncertain operations survive temporary private-view release in memory; no persistent private cache is added. Current finite-lifetime admission fences captured submit/recovery callbacks.
- A minimal private transport reuses Employee SQL/session/workspace guards around existing read owners and checks the current module revision again. It accepts no employee selector and requires the actual session plus view binding. Raw source rows, peer identities, absence reasons, scheduling profiles and policy records are not the client DTO.
- Mobile facts/actions clear through the shared private controller on pause, expiry or authority loss. Connectivity-event release/resume has browser evidence. Visibility/blur wiring is present and the controller is tested, but this does not certify actual OS background behavior.
- Phase 1 typography, spacing, colors, Phosphor icons, original wordmark, 44px targets/48px primary actions and measured navigation clearance are reused. Dark frame/canvas ownership is explicit. Desktop keeps the existing direct-child tree; management returns its existing branch. The incumbent desktop pickup consequence copy was corrected to reflect actual rules.

Main files: `src/components/employee-mobile/{requests.tsx,requests.css,pickup-operation.ts}`, `src/lib/{employee-requests.ts,data/employee-requests.server.ts}`, private GET route, responsive route adapters and scoped shell/header ownership. Existing list helpers gained optional executor injection without changing their default callers. Planner metadata adds an outcome only for Employee/Lead ACCEPT; management projection and all business decisions remain unchanged. No dependency, schema, provider, migration or new eligibility engine.

## Verification and independent findings

| Check | Actual scope/result |
| --- | --- |
| Unit/component/server | 17 files, 164 passed; 12 existing database-dependent tests skipped in the unit-only invocation. They are not counted as passes. |
| PostgreSQL regression | 38 tests passed in the final invocation, including management safe projections, current role/location discovery, command concurrency/idempotency/decision metadata and read-history boundaries. |
| Root authenticated browser | One orchestrated test passes 28 named journey checks across Chromium/WebKit/Firefox, plus the 38 PG tests: 39/39 in 60.61 seconds on the final candidate. Named checks are not independent top-level tests or a completion percentage. |
| Rendered contrast/layout | 18 primary-control samples across Light/Dark 320/390/430px, minimum 6.089:1. Frame/canvas backgrounds match in every sample. Targets, no horizontal overflow, root text at 200%, navigation clearance, keyboard disclosure, visible focus captures and desktop rendering have bounded local evidence. |
| State/recovery | Actual SQL proves own projection, current role and module gates, automatic vs manual decisions; real HTTP rejects arbitrary selectors and current authority loss. Automatic and manual pickups each lose the committed response, resume and reconcile one receipt; manual mode retains the original assignment. |
| Controlled presentation fixture | Only `incoming:null` is substituted into an actual own response to verify notice, retry and destination; retry restores the actual checked zero. This is a presentation-only partial-source fixture, not a claim of an actual incoming-query outage. SSR assertions separately cover null/zero/one/many. |
| Diagnostics | Four deliberately induced transport/401 console errors are correlated with their scenarios in the final root run; no unmatched console error, page error or hydration failure. Next's development indicator is hidden only during screenshots. |
| TypeScript / targeted ESLint | Pass on affected sources. |
| Code review | Fresh whole-change review of d70487c6: APPROVE / WATCH, no blockers; own report retained. Subsequent bounded UI fixes have RED→GREEN evidence. |
| Independent UI | APPROVE / GO WITH CONDITIONS, no blockers. Author personally verified final fix bytes/source/mirror/captures and reran 3/3 focused tests; own findings are closed in the authored report. |
| Independent QA | GO for bounded local QA. Fresh final-candidate affected browser replay passes 1/1 with 28 named checks/18 contrasts, plus 3/3 component tests. Independently rehashed all 1,916 source/mirror inputs. Prior 38 PG results carried with an explicit unchanged 1,283-file server/domain/helper/config byte audit; root reran those 38 on the final candidate. QA retains four deliberate transport/401 errors and three WebKit development CSS-preload warnings, zero page errors; no console-clean certification. |

The initial test modules, direct desktop structure, stale/retired handler admission, null inbox and actual frame/canvas defects were observed RED and then GREEN. Management exact-projection regressions caught and corrected a metadata expansion. Test navigation was made explicit; an additional diagnostic `response.json()` wait stalled in run 4. Only that invocation's browser was stopped, the failure was preserved, and existing helpers subsequently verified Next/database cleanup. Final tests capture refusal JSON before unchanged delivery and have bounded waits. No assertion was weakened, failure suppressed or snapshot auto-updated.

Reviewers own their findings and their closure:

- [Code review](code-review.md)
- [UI review](ui-review.md), retaining original UI-REQ-1/2 history and its independent correction verification; actual Firefox Tab evidence closed UI-REQ-3.
- [QA review](qa-review.md), with exact independently executed scope and limitations.

Root final evidence: `outputs/employee-mobile-requests/final` outside the checkout. Independent evidence: `outputs/employee-mobile-requests/independent-qa`. Prior failed runs and RED logs remain under `.omo/evidence/employee-mobile-requests`; final source/ownership manifests verify both mirror and original application inputs. Review gallery: `http://127.0.0.1:18763/employee-mobile-requests/`, showing actual application captures with fictional data.

## Limits and next work

Product/experience: preserve the chosen restrained teal world and clear own-employee tasks. Engineering/security: existing service owners, actual current server authority and operation recovery remain decisive. Assurance/delivery: independent findings and exact local artifacts control acceptance; no production or assembly exception was accepted.

1. Development source inventory still fails: missing `Claude-UI-Fix`, `codex/owner-ai-release-testing-20261023`; unclassified `claude/home-clock-row`, `claude/quiet-everywhere`, `codex/mobile-access-onboarding-20261026`; newer `origin/development` changes absent from this checkout. Fresh development head was `dfdcefa0edc9d02bad5edf79b2b5a9587b194eb2`. Its access/onboarding work changes no Requests/exchange service owner; reconcile accepted Phase 1/2 with the current development line before assembly. No waiver or unrelated merge.
2. Physical iPhone/Android, actual OS text scaling/background lifecycle/native pickers, VoiceOver/TalkBack and hosted/staging parity remain later gates. Root text enlargement and headless browser engines do not certify them. This batch does not certify complete management workflows or the entire Employee profile.
3. Deferred minor from code review: a named check says “Offline/background” while dispatching offline/online events only. Claims here are deliberately scoped to the actual connectivity-event evidence. Real background acceptance remains Phase 3.
4. Free 21st metadata search informed reuse; its CLI is not installed (attempted invocation retained). No paid registry retrieval, generation or new package. The scoped decision is appended to `.21st/design.json`.
5. Next bounded mobile batches: incoming swap/cover responses and own request detail/history, then time-off and availability workflows. Later Phase 2 areas retain the existing three-phase plan. Do not count reachable legacy destinations as completed mobile ports.

No test used production credentials/customer data, real messages, push prompts, provider calls or analytics collection. Root and independent owned environments are closed, source/mirror verification succeeded and derived runtime artifacts were released. No additional Jose decision is required for this bounded implementation; assembly and production authorization remain separate.
