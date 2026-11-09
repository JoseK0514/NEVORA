# Independent QA — Employee mobile Phase 1

**QA recommendation: GO WITH CONDITIONS for bounded local Phase1 acceptance.** No unresolved blocking QA defect remains in the tested scope. This is not hosted, physical-device or production certification. Independent UI/code reviewers retain authority over their findings; final handoff must include their separate decisions.

Tested candidate: `74979bbb6e2694eb54a57191f0a8f1267f56d7b8` on `codex/employee-mobile-phase1-20261026`; base `46e202786863279302026ee03a0e225c359fa55c`. Final independent replay:55 named checks, Chromium/WebKit/Firefox,81.83s, exit0. Both source and mirror verified; owned Next/loopback PostgreSQL closed and derived runtime artifacts released. No QA product changes, commits, push, merge or deployment. Only report/evidence files were written by this reviewer.

## Findings and limits

- **VERIFIED:** Real fictional-account Home/Schedule, native week/date destinations, past overnight/source-shift scope, canonical confirmation/reload, lost-response recovery, publication changes/removal, loading/error/partial/no-upcoming states, module-off direct route, workspace deactivation, session revocation/Lead expiry and role/style isolation executed. Exact actions are in B/J and the matrix.55 named checks are not55 independent top-level tests: one orchestrated Vitest scenario contains them.
- **VERIFIED:** All three engines exercised320/390/430px Light/Dark,200% root-font layout, week-picker keyboard Escape, content clearance and1440px Employee desktop preservation. Chromium additionally exercised expanded state/role cases and Calendar125/150/200% root-font checks. Owner/Manager evidence verifies navigation and Employee-style opt-out only; Manager body capture remains loading and does not certify its complete workflows.
- **VERIFIED:** Enabled Refresh measured5.43:1 Light and9.56:1 Dark across all engines/widths. Settled Home retry measured6.09:1 Light and12.58:1 Dark, with>=48px height and successful actual retry.20 measurements are recorded in J; fresh Light/Dark screenshots inspected directly.
- **VERIFIED:** Independently ran63/63 PostgreSQL data/service checks,178/178 selected component/server checks, and an earlier5/5 acknowledgment command check. The178 run was at07538eec; comparison of owned manifests shows only four CSS files and the browser test changed afterward, so those tested TypeScript service/component bytes are unchanged. Root's separate283-unit and63-SQL final logs were directly inspected, not substituted for the independent browser run.
- **VERIFIED / closed:** Original duplicate-tree selector failure and missing browser surfaces are resolved in the final executed suite. The directly observed Calendar hydration mismatch is absent from the final Next log and console ledger; Calendar opens and settles. Original wordmark/200%/dark findings have fresh rendered evidence. The final contrast check explicitly waits for the enabled control, preventing an empty-selector pass. Earlier failure/diagnostic artifacts remain preserved (H/HY and interim report).
- **VERIFIED:** Eight actual server refusal metadata records show unavailable/unauthorized state and `privateDataPresent=false`. Three deliberate ERR_FAILED console entries map to two Home network aborts and one lost-confirmation response.503 follows deliberate workspace deactivation and200 follows restoration;401 follows session deletion and307/login. No unmatched console error, browser page error or hydration warning remained. This is browser-network evidence; no separate curl HTTP case is claimed.
- **RISK / release conditions:** Baseline source inventory drift is still unresolved before assembly/release. No hosted/staging parity, production migration/rollback, physical iPhone/Android, OS-native text scaling/date-picker behavior, VoiceOver/TalkBack or representative-device performance certification was attempted. Those later-phase gates remain open. Root-font and emulated viewports must not be described as physical-device accessibility certification. Service workers were blocked; external origins refused. Real operational workflows/providers/customer data were not used.

Environment: Next development with substituted owned PostgreSQL transport, sanitized env, fictional accounts, invocation-owned loopback runtime. No ULW plan existed; caller evidence directory is the fallback attempt directory: `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-phase1/independent-qa`. All PASS rows point to nonempty artifacts.

## Exact invocations

All commands ran in `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-app-phase1`. I contains the exact environment paths and file list. Browser command used `env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" NEVORA_TEST_PG_BIN=<I.postgresBin> NEVORA_EMPLOYEE_MOBILE_EVIDENCE=/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-phase1/independent-qa/final-74979bbb NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE=<I.playwrightPackage> node scripts/payroll-postgres.mjs vitest.employee-mobile-phase1.config.mts`. SQL used the same sanitized environment and owned PG runner with `vitest.employee-mobile-phase1-sql.config.mts`. Component invocation is recorded in I; it lists all13 files explicitly. Criteria P1-2/3/4/5 refer to implementation/acceptance items in docs/execution/employee-mobile-phase1/plan.md; inherited exit means the approved three-phase plan's Phase1 exit gate.

## manualQa.surfaceEvidence

| scenario id | criterion reference | surface | exact invocation/action | verdict | artifactRefs |
|---|---|---|---|---|---|
| QA-01 | P1-2,3,4 | Chromium/WebKit/Firefox browser | I.browser: Sign in; Home→own shift dialog; recorded OFF_CLOCK remains independent | PASS | B,J,P1 |
| QA-02 | P1-2,3 | Three browser engines; Chromium adds past case | I.browser: Previous/next week; native date form→source Monday; past overnight dialog; foreign shift deep link refusal | PASS | B,J |
| QA-03 | P1-3 | Three browser engines plus canonical SQL | I.browser: Click Confirm; reload receipt; SELECT acknowledgement; Chromium lost committed response→same-operation retry→one receipt | PASS | B,J,P9 |
| QA-04 | P1-2 | Three browser engines | I.browser: 320/390/430 Light/Dark;44px targets;320/root200%; Escape restores picker focus; content clearance | PASS | B,J,P2,P3 |
| QA-05 | P1-2 | Three browser engines and Chromium retry | I.browser: Wait visible enabled Refresh then measure; Light/Dark failed Home→visible enabled48px retry→click→actual data | PASS | B,J,P5,P6,P7,P8 |
| QA-06 | P1-3, inherited exit | Chromium browser | I.browser: Delay real Home; abort transport; real source cap; no upcoming shift; retain independently authorized facts | PASS | B,J,P7,P8 |
| QA-07 | P1-3, inherited exit | Chromium browser + persisted policy | I.browser: Owner SQL module setting→Schedule hides Open shifts→direct exchange module refusal without management control | PASS | B,J,P10 |
| QA-08 | P1-3 | Chromium browser + persisted publication | I.browser: Change and republish own shift; remove all own assignments; old receipt invalidated; confirm exact empty week | PASS | B,J |
| QA-09 | P1-2 | Chromium browser | I.browser: Profile#employee-calendar-title opens disclosure; settle status;125/150/200% root text; no hydration diagnostic | PASS | B,J,N,P4 |
| QA-10 | P1-3, inherited exit | Three browser engines; Chromium workspace/Lead additions | I.browser: Offline event clears facts/resume reacquires; workspace inactive clears/restoration reacquires; delete session→Home redaction/Schedule login; expire Lead→login | PASS | B,J,N,A |
| QA-11 | P1-2 | Three browser engines; Chromium roles | I.browser: 1440px Home greeting and Schedule bar order/mobile-control hiding; Lead own scope; Owner/Manager non-Employee nav/style isolation | PASS | B,J,P11 |
| QA-12 | P1-3,4 | PostgreSQL service/data tests | I.sql: node scripts/payroll-postgres.mjs vitest.employee-mobile-phase1-sql.config.mts | PASS63/63; service scope only | S |
| QA-13 | P1-3 | Component/server tests with mocked dependencies | I.components:13 explicitly listed files, --reporter verbose | PASS178/178 at07538eec; tested TS bytes unchanged | U,A |
| QA-14 | P1-4,5 | Owned runtime/source artifacts | Read M/O/N/J; compare manifest to07538eec; inspect final screenshot files | PASS exact SHA/cleanup/console inspection | M,O,N,A |

## manualQa.adversarialCases

| scenario id | criterion reference | adversarial class | expected behavior | verdict | artifactRefs |
|---|---|---|---|---|---|
| ADV-01 | P1-2/3 and inherited Phase1 exit | Identity/foreign resource | Own actor/proof filters and foreign shift cannot expose another employee | PASS within listed surface | B,J |
| ADV-02 | P1-2/3 and inherited Phase1 exit | Session expiry/revocation | Clear previously visible facts; direct protected entry redirects to login | PASS within listed surface | B,J,N |
| ADV-03 | P1-2/3 and inherited Phase1 exit | Current workspace deactivation | Clear private Home/time; fresh authorized read required after restoration | PASS within listed surface | B,J,N,A |
| ADV-04 | P1-2/3 and inherited Phase1 exit | Disabled module | Hide applicable Schedule option and refuse protected module deep link | PASS within listed surface | B,J,P10 |
| ADV-05 | P1-2/3 and inherited Phase1 exit | Lost committed response/duplicate retry | Retain original operation, recover one persisted receipt | PASS within listed surface | B,J,P9 |
| ADV-06 | P1-2/3 and inherited Phase1 exit | Source publication/reassignment | Old confirmation invalidated; exact current empty-week review preserved | PASS within listed surface | B,J,S |
| ADV-07 | P1-2/3 and inherited Phase1 exit | Partial/error/loading/empty | Do not fabricate complete/empty status; retain independent facts; deliberate retry recovers | PASS within listed surface | B,J,S,P7,P8 |
| ADV-08 | P1-2/3 and inherited Phase1 exit | Enlarged text/dark/keyboard | No overlapping nav labels; content can clear fixed nav; focus restored; exact control contrast>=4.5 | PASS within listed surface | B,J,P3,P5,P6 |
| ADV-09 | P1-2/3 and inherited Phase1 exit | Calendar fragment hydration | Settled disclosure opens without SSR/client mismatch | PASS within listed surface | B,J,N,P4 |
| ADV-10 | P1-2/3 and inherited Phase1 exit | Role/style leakage | Employee styling absent for Owner/Manager; Lead remains own scope | PASS within listed surface | B,J,P11 |
| ADV-11 | Phase1 scope | Payment/webhook/provider side effects | No such modified behavior to execute | not_applicable: Phase1 changes no payment/webhook/provider-send behavior; no real messages or customer writes performed. | M |

## manualQa.artifactRefs

| id | kind | description | path |
|---|---|---|---|
| B | browser action log | Final independent browser run, exit0;55 named checks | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-phase1/independent-qa/final-74979bbb/browser-replay.log |
| J | JSON action ledger | Checks, console events, refusals,20 contrast measurements | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-phase1/independent-qa/final-74979bbb/results.json |
| M | source manifest | Exact committed candidate and1905 input hashes | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-phase1/independent-qa/final-74979bbb/owned-next-NCJYI3/source-manifest.json |
| O | ownership metadata | Owned runtime closed; source/mirror verified | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-phase1/independent-qa/final-74979bbb/owned-next-NCJYI3/ownership.json |
| N | Next runtime log | Real request statuses and no hydration warning | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-phase1/independent-qa/final-74979bbb/owned-next-NCJYI3/next.log |
| A | independent audit | Manual console/manifest/source-delta inspection | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-phase1/independent-qa/final-74979bbb/independent-audit.json |
| I | invocations | Exact commands/environment values and cwd | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-phase1/independent-qa/final-74979bbb/invocations.json |
| S | SQL test log | Independent63/63 data/service checks | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-phase1/independent-qa/sql-replay.log |
| U | component test log | Independent178/178 at07538eec; only CSS/browser-test files changed since | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-phase1/independent-qa/final-07538eec/component-replay.log |
| H | historical failed run | Original64c29a4e duplicate-tree selector failure | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-phase1/independent-qa/browser-replay.log |
| HY | historical diagnostic | Observed Calendar hydration issue at461276bd | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-phase1/independent-qa/calendar-hydration-v11.txt |
| W | source audit | 34 mapped workflow source files/markers resolved | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-phase1/independent-qa/workflow-source-audit.json |
| P1 | browser screenshot | Home and official wordmark | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-phase1/independent-qa/final-74979bbb/chromium-home-390-light.png |
| P2 | browser screenshot | Schedule dark | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-phase1/independent-qa/final-74979bbb/chromium-schedule-430-dark.png |
| P3 | browser screenshot | Enlarged navigation | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-phase1/independent-qa/final-74979bbb/chromium-schedule-320-dark-text200.png |
| P4 | browser screenshot | Settled Calendar direct entry | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-phase1/independent-qa/final-74979bbb/chromium-calendar-320-text200.png |
| P5 | browser screenshot | Enabled dark Refresh | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-phase1/independent-qa/final-74979bbb/chromium-clock-controls-390-dark.png |
| P6 | browser screenshot | Enabled light Refresh | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-phase1/independent-qa/final-74979bbb/chromium-clock-controls-390-light.png |
| P7 | browser screenshot | Settled light error/retry | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-phase1/independent-qa/final-74979bbb/chromium-home-network-error-light.png |
| P8 | browser screenshot | Settled dark error/retry | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-phase1/independent-qa/final-74979bbb/chromium-home-network-error-dark.png |
| P9 | browser screenshot | Unknown committed-response recovery | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-phase1/independent-qa/final-74979bbb/chromium-schedule-unknown-confirmation.png |
| P10 | browser screenshot | Persisted module refusal | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-phase1/independent-qa/final-74979bbb/chromium-module-off.png |
| P11 | browser screenshot | Manager navigation opt-out; body loading | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-phase1/independent-qa/final-74979bbb/chromium-manager-scope.png |

Machine-readable matrix: /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-phase1/independent-qa/final-74979bbb/manual-qa.json. Prior NO-GO chronology is retained in /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-phase1/independent-qa/interim-64c29a4e-manual-qa.md.

Next gate: combine this bounded QA decision with independent UI/code decisions and preserve the later release conditions. No new Jose permission is required to read these artifacts; production remains separately unauthorized.
