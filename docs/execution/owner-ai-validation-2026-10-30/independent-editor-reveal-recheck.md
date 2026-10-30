# Independent editor reveal recheck

Date: 2026-10-30. Independent reviewer; no implementation changes.
Frozen candidate: `c11757f6f7112f5a8a7f2c2ed73021a205bd609a`.
Correction comparison: `f446b8c896725212aafccf462236b4b5bcf0c096..c11757f6f7112f5a8a7f2c2ed73021a205bd609a`.
Evidence root: `/workspace/nevora-evidence/owner-ai-validation-20261030/independent-c11757f6`.

## Finding custody and source assessment

Original UI-R1 at ecc24706 and the failed f446b8c8 recheck remain unchanged in the original reports and `independent-focus-recheck.md`. The original editor opened several screens away with focus BODY. The first correction moved focus, but WebKit desktop scrolled only enough to reveal the caret: field y812–898 in844px viewport. Both prior independent failures and their partial successes remain retained.

The second source correction in `src/components/owner-advisor/notebook-panel.tsx:32` explicitly calls `scrollIntoView({block:'center',inline:'nearest'})` on the first textarea, then `focus({preventScroll:true})`. It uses the existing project reveal/focus pattern. The effect remains keyed only to entering/leaving edit mode, with original connected/enabled/rendered-trigger fallback on exit and no private unmount refocus. It does not alter notebook revision, draft conflict, authority, persistence, model context or business mutation paths. No new source defect identified in this bounded delta.

Author terminal evidence inspected at `c11757f6/browser-serial-01`: exit0, two suites passed; legacy130.72s and notebook59.5s, with the unchanged 240000ms deadline. The previous timed-out execution remains historical evidence. A serial pass supports resource contention as an explanation, but does not prove its sole cause or establish a universal reliability claim. Both author owned-runtime records report closed/sourceVerified/mirrorVerified. Four author focus entry JSONs record focused=true and visible=true.

Independent expanded browser probe started serially with new owned Next/login/scoped API/PostgreSQL and no provider. It checks all four goal/task Add/Edit entry points by ordinary click and keyboard Enter, Save/Discard return, focus retention during real automatic polling, stale-draft blocking, removed-trigger fallback and explicit simulated-signout privacy. A second, serial independent exact notebook suite will verify the same-page390→1440 sequence. Results and recommendations are appended only after terminal evidence.

## Independent expanded matrix — completed

`independent-c11757f6/focus-01/vitest.json`: success=true, one passed/zero failed; actual runner exited0, duration 138.85s. `report.json` is complete=true with 42 successful checks:

- 32 entry/return cases: all four Add/Edit goal/task entry points, both ordinary click/Discard and keyboard Enter/Save, at390×844 and1440×844 in Chromium151.0.7922.34 and WebKit26.5. Each first field was focused and fully within the viewport before any fill/focus helper could conceal an offscreen field. Tab reached Save for goals or Notes for tasks; Save/Discard restored the invoking control with visible bounds.
- Four real automatic-polling cases retained the unsaved draft and its field focus while a concurrent API write changed the saved notebook. Stale Save remained disabled.
- Four removed-trigger cases deleted the goal while its editor remained open, then confirmed Discard focused a live visible same-panel summary.
- Both explicit simulated-signout cases removed the entire private panel/editor and left no focus in retired private content.

Independent WebKit1440 ordinary Edit goal is now top549,bottom635 in844px viewport, focused=true/visible=true; the returning trigger is top436,bottom488, focused=true/visible=true. Actual independent mobile/desktop viewport screenshots were viewed, including WebKit goal edit and task add. No external requests or page errors; no provider configured and zero ask receipts. Source and mirror verification succeeded and the owned Next/PostgreSQL runtime closed. This matrix is completed evidence; exact same-page viewport-sequence confirmation is a separate following invocation.

## Independent same-page sequence — completed

The serial exact notebook invocation at `independent-c11757f6/notebook-01` completed exit0, one passed/zero failed in 60.13s. It uses the real app/login/API/owned PostgreSQL and the existing test's same-page390→1440 sequence in both engines. All four first-field entry JSONs are focused=true/visible=true: mobile top539.42,bottom625.42; desktop top549,bottom635, within844px viewport. The previously failing WebKit desktop sequence is independently reproduced as corrected.

The same suite independently reverified escaped saved text, persistence, selected-task/manual question behavior, Owner closure/reopen, real concurrent-edit conflict review and simulated explicit-signout retirement. All six 320/390/1440 audits report zero overflow, zero notebook targets under 44px and zero axe violations. Report complete=true; external requests=[] and errors=[]; providerConfigured=false. Owned Next record `owned-next-O0kXNe` and the expanded-probe owned record both report closed=true,sourceVerified=true,mirrorVerified=true; both PostgreSQL runners logged shutdown. No implementation/index/ref/HEAD changes were made by this reviewer; HEAD remained c11757f6 throughout.

## Finding closure and bounded decisions

**UI-R1: CLOSED by independent reproduction at c11757f6.** The whole first field is reliably revealed and focused across the reproduced ordinary-click/keyboard entry matrix and same-page resize case. Save/Discard returns, removed-trigger fallback, polling/conflict preservation and private retirement also passed. Earlier findings/failures remain valid historical records at their named candidates and are not rewritten.

**Code recommendation: GO for the bounded correction. UI recommendation: GO for the local bounded notebook increment.** No additional demonstrated defect was found in this recheck. The existing labels still distinguish saved intent/Owner closure from verified staffing or payroll outcomes.

**QA recommendation at this evidence cutoff: NO-GO for final aggregate candidate acceptance solely pending the planned c117 full-project/static/SQL terminal results.** This is an evidence-completion gate, not an open UI-R1 defect. The source/functional/browser correction itself passed independent reproduction, and the exact-candidate author legacy browser run passed serially at unchanged deadline. The parent may now run the final heavy regression checks because all independent runtimes are closed. A separate appended QA decision can follow actual terminal evidence; prior f446/ecc full-unit and SQL results are historical evidence and are not silently relabeled c117 executions.

Remaining limitations are not claims of defects: no physical-device/virtual-keyboard or actual screen-reader certification, no proof covering every zoom/max-text combination, no CI/hosted parity or production rollout approval, and no paid-model reasoning-quality evaluation. Local WebKit's documented host-cache preflight exception remains disclosed, while actual runtime and rendering executed. The prior overloaded legacy timeout remains preserved; the serial rerun supports but does not prove the resource-contention hypothesis. Future joint-plan/action/monitoring capabilities remain outside this completed bounded scope.

## Aggregate final local QA decision — completed evidence inspected

**Final QA recommendation: GO for the bounded LOCAL Owner notebook/task increment at c11757f6f7112f5a8a7f2c2ed73021a205bd609a. Code and UI recommendations remain GO. UI-R1 remains independently CLOSED at this candidate.** This appended decision supersedes only the earlier temporary aggregate evidence-completion hold; it does not rewrite historical failed candidates or assert release/production approval.

The reviewer independently opened the actual final execution records, JSON results and terminal logs under `/workspace/nevora-evidence/owner-ai-validation-20261030/c11757f6`:

| Classification | Final evidence |
| --- | --- |
| VERIFIED | `all-unit-final-01/execution.json`: candidate c11757f6, actual npm test command, exit0. Terminal summary 666 executed test files passed, 27 skipped (693 files), duration 435.48s. Enumerating assertion statuses in `vitest.json` gives 10,297 passed, 801 skipped, 55 pending, 0 failed. The 55 pending assertions are not called todo; aggregate numTodoTests is 0. Vitest file-status JSON labels all 693 entries passed, so executed/skipped file counts are taken from the terminal summary. |
| VERIFIED | `sql-final-01`: seven files, 44/44 tests, success=true, exit0; run log records owned PostgreSQL shutdown. |
| VERIFIED | `typescript-final-01`: whole nonincremental tsc exit0. `lint-final-01`: whole npm run lint/eslint exit0. `whitespace-final-01`: base-to-candidate git diff --check exit0. All execution records identify the same c117 candidate. |
| VERIFIED | Exact-candidate author serial browser suites both passed at unchanged 240000ms deadline; independently reproduced correction via the 42-check matrix and exact notebook suite, with actual source/mirror verification and owned runtime closure, as recorded above. |
| VERIFIED | Original whole-change source review, scoped SQL/replay/recovery evidence and subsequent focused correction reviews retain their original candidate identities. The only later app changes were the reviewed editor focus/reveal correction; no backend authority/persistence mutation is hidden in this closure. |
| VERIFIED | Independently parsed raw `chromium-trace.zip` and `webkit-trace.zip` console events and compared them with `console-audit/notebook-console.json`: Chromium 5 warnings, WebKit 6 warnings, 0 console errors in both; every warning names an unused preloaded CSS chunk. Independent counts/trace hashes are saved in `independent-c11757f6/console-review.json`. |
| RISK — non-blocking for local scope | Development CSS preload warnings are real retained warnings, not an error-free-console claim. They concern chunks not used shortly after navigation, including not-found/Signature/shared styles, in owned Next development runtime. Passed visuals/behavior and no console exceptions provide no evidence of a bounded notebook defect from them. Production asset efficiency/parity remains unmeasured; no global layout/prefetch change is warranted merely to silence these development messages. |
| RISK — non-blocking for local scope | Full-unit logs include React nonboolean prefetch/scroll attribute warnings. Specifically inspected `src/components/app-shell.test.tsx:8`: its mocked next/link forwards remaining props directly onto a DOM anchor. That test file is unchanged from 1121f24e through c117. The reported AppShell prefetch warning is explained by the test mock, not evidence that production next/link needs a global behavior change. Existing schedule/employee-schedule mocks similarly forward props. Do not describe the unit run as warning-free. |

The final static/unit/SQL evidence-completion gate is now satisfied, and no demonstrated Critical/Important/Minor finding remains open for this bounded local increment. Skipped/pending tests remain disclosed and are not counted as passes. The prior f446 browser timeout and WebKit clipping failures, all partial independent probe records, and the original R1/UI-R1 findings remain preserved. No additional application/browser/model execution was performed to inspect these completed final records; only evidence reads and this appended report were needed.

This GO does not cover paid-model reasoning competence, blind injection behavior under live inference, statistical production reliability, future whole-plan/action/monitoring capabilities, physical-device/assistive-technology certification, exact-SHA CI/hosted parity, provider activation, shared integration, production migrations/rollback or deployment. Those remain separate scope and authorization gates; none is silently approved by local success.
