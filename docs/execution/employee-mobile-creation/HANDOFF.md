# Employee mobile — swap/cover creation and Unable-to-work submission

Implemented in the real Next application, continuing the approved teal Employee/Lead system. This third bounded Phase2 batch covers creation of a swap, an own cover offer and an own Unable-to-work report. Phase2 remains active; Phase3 has not started.

Final application/test candidate: `351e33a1a7ecb04dfb6de01a9674953ea7eff903`.
Branch: `codex/employee-mobile-creation-20261027`.
Base: accepted responses/documentation `f3a72860d9737fa7e4d9b3b86415bb0a99d69d91`.
Worktree: `work/employee-app-phase1` in Jose's Nevora design task.
Local branch/worktree preserved. No push, PR, merge or deployment. Subsequent documentation commits preserve tested application inputs; see `candidate-verification.json`.

## Behavior

- **Swap a shift:** start with an own published shift, review its original terms and choose one positively checked same-week target. The form explains teammate consent and possible manager review. A changed selected target requires another choice; stale original fields cannot be submitted. A rapid double-click produces one request awaiting teammate consent, with both assignments unchanged.
- **Offer for cover:** review the own shift and current checked action. The offer stays separate from swap creation, including a permitted fallback when swap discovery is unavailable or empty. It becomes an OPEN request, with no automatic release or invented assignment.
- **Unable to work:** own reviewed shift, six existing reason choices, optional note bounded to the existing UI's300characters, and actual Other-detail validation. The employee is told that the manager reviews the report and that it does not itself release the assignment. Invalid entries create no report.
- **Draft and changed terms:** unsent selection/reason/note survives refresh and temporary pause in mounted memory only. A changed source requires explicit review of the new details; selected target fingerprints must still match. New account/source/mode lifetimes do not inherit old entries. No automatic submission or persistent private cache was added. Full reload/unmount is not a durable draft-recovery guarantee.
- **Submission/recovery:** reuse the established immutable command owner. Pending, uncertain or recorded results prevent conflicting submissions. A lost response checks the original operation before resending its exact original payload. Current lifetime admission fences captured handlers. A known server receipt receives focus and links to the exact protected own-request detail; it does not imply completed coverage or manager approval.
- **Authority/privacy:** minimal transport binds actual Employee/Lead session, role, workspace, module, source/mode and exact permitted location scope. Existing terms, candidate and command planners remain authoritative; source terms are rechecked before final admission. Revoked/mixed terms release the view. Candidate failure is distinct from verified empty, with separately permitted coverage retained. Peer absence reasons, employee IDs, private policy/profile rows and management controls are absent from the new DTO. Every mutation still validates current server authority and reviewed terms.
- **Navigation/presentation:** shared RequestShiftSlot, original wordmark, regular Phosphor and semantic teal controls. Native fieldsets/radios/textarea use48px submissions and44px-or-larger label/control targets. Existing intercepted native task has a scoped full-height mobile treatment; direct routes use the same form. Escape and My schedule return focus to the visible originating shift row. Desktop/management retain their existing rendering and permissions.

Main owners: `src/components/employee-mobile/{creation.tsx,creation-view.tsx,creation.css,creation-operation.ts}`, `src/lib/{employee-creation.ts,data/employee-creation.server.ts}`, protected `/api/employee/creation/[mode]/[sourceId]`, responsive existing swap/callout route adapters and scoped shell marker. `getPublishedShift` and `listSwapTargets` gained optional executor injection with unchanged default callers. Shared RouteSheet adds optional Employee-mobile origin-focus restoration only for the creation route. No dependency, schema, migration, new business policy or eligibility engine.

## Actual verification

| Check | Evidence and result |
| --- | --- |
| Initial unit/route work |28files212pass; subsequent partial/empty behavior cases and cleanup produce the current214-test scope. Exact invocations/logs retained. |
| Root affected browser | Candidate2db6f316:1/1pass115.96s,40 named checks,192 captures and54 contrast samples across Chromium/WebKit/Firefox. Final351e changes only one already-green unit-test file, removing a copy-only assertion and renaming the empty-state case; all product/browser/config bytes match the passing root run. |
| Earlier full root invocation |47/48pass at8125d881; the expanded native keyboard oracle failed. It remains a failed run and is not reported as final acceptance. All45SQL and earlier response/pickup orchestrations passed there. |
| Independent final unit/combined suite | GO for the bounded local QA gate. Independently passed214/214units, zero skipped, with original5s timeouts; full48/48integration tests,7files,zero skipped,212.49s on exact351e. All3runtimes×1943source/mirror inputs and runner/config hashes match, closed/released with no custody error. |
| Rendered forms | All3forms Light/Dark320/390/430px, primary controls≥48px and contrast minimum6.089:1. Root text at200%, including Other validation, has no horizontal overflow and measured nav clearance. Native radio focus, intercepted/direct routes, exact receipt links, origin focus, desktop1440px and current authority loss have actual browser evidence. |
| SQL authority/terms |3new real PostgreSQL tests verify own Employee/Lead versus foreign, mid-read location revocation, unavailable swap discovery with separately valid cover action, and source changes before publication of mixed display/command fields. Incumbent45-total SQL scope includes prior privacy/history and scheduling/idempotency regressions. |
| State/recovery | Actual server actions create all3request types. Canonical SQL confirms one swap, OPEN cover with unchanged assignment, and one report with the reviewed changed source and original note after deliberate lost response. Refresh/offline retains mounted entries while private UI clears; current authority loss removes controls. |
| TypeScript/targeted ESLint | Pass on affected inputs. No production build, hosted/staging or physical-device certification. |
| Code review | CLEAR/APPROVE on351e. Author independently closed H1 and M1;22/22reviewer tests pass. |
| UI review | APPROVE/GO WITH CONDITIONS. Author independently closed UI01/02/03, inspected fresh screenshots/focus traces and1943source hashes, and verified all13reviewed product files unchanged through final test cleanup. |

Independent authors own their findings and closure: [code review](code-review.md), [UI review](ui-review.md), [QA review](qa-review.md). Management/root cannot self-close them.

## Native focus diagnosis and preserved failures

The initial Escape path returned to Schedule but attempted to restore an action link inside the shift dialog that had closed. The scoped fix restores its visible originating schedule row; the same real browser assertion then passes.

The expanded test initially required eight Tab presses to stay inside the document. Diagnostic traces showed Chromium's first five stops inside the task, followed by native browser-chrome departure: `document.hasFocus=false`, BODY active and private UI paused. The UI reviewer independently confirmed this did not prove focus escape into the interactive background page. No custom trap or weakened privacy control was added. The corrected test requires strict modal containment whenever the document has focus; chrome departure must release facts; an actual pointer return must trigger a fresh private GET and a subsequent actual native Tab must be contained. Escape/Back assertions remain. Chromium/WebKit exercise that departure/return; Firefox stays in-document for all eight stops.

Review also caught duplicate verified-empty copy and pause wording that incorrectly assumed offline; both were corrected with saved RED→GREEN evidence. A later green exact-sentence-only test was removed at the code reviewer's request; the behavior-based empty/private-render cases and actual browser lifecycle checks remain. This removal did not suppress a failure. One independent parallel unit invocation hit the unchanged5s timeout in an existing Home test; the final28-file suite passed214/214 with file startup serialized, preserving the Home test and its original timeout/assertions. Original failed logs/captures remain.

Console/pageerror diagnostics remain recorded for all browser suites. Raw requestfailed events are retained for creation/responses; the prior pickup harness does not capture every requestfailed event, so its network-error inventory is explicitly limited. Deliberate transport/401 failures and development CSS-preload warnings are separated from unmatched errors; no console-clean, network-clean or production-runtime claim is made. The strict error/pageerror assertion was not weakened. Screenshots hide only Next's development indicator and retain caret behavior (`caret:initial`) to avoid capture-time style mutation during hydration.

## Evidence, supply and next gate

Root evidence: `outputs/employee-mobile-creation/accepted/creation`; failed/diagnostic history: `run-1`, `run-2`, `final` and `focus-diagnostic`. Independent exact-final evidence: `outputs/employee-mobile-creation/independent-qa/replay/{creation,responses,pickup}`. The owned runner uses scrubbed environment variables, fresh loopback PostgreSQL and fictional accounts. It pins source/mirror bytes, declares only local DB/generated-type substitutions and releases only owned derived artifacts on verified closure.

Review gallery: `http://127.0.0.1:18763/employee-mobile-creation/`. It contains actual captured application states with fictional accounts; it is not a persistently running authenticated app or deployment. Previous galleries remain intact.

The approved Owner-derived teal system and existing competitor research remain the visual authority.21st free metadata757/34672/17925 informed accessible native radio grouping; existing project/native components fit. No paid retrieval/generation/package. CLI review is unavailable (`21st` not found, exit127); no CLI review certification. Impeccable Operate/craft guidance, the scoped spec and `.21st/design.json` record continuity, not an exact ADP/Gusto/Homebase clone claim.

Development inventory remains a release condition: missing `Claude-UI-Fix` and `codex/owner-ai-release-testing-20261023`; unclassified `claude-codex-collab-nevora`, `claude/home-clock-row`, `claude/quiet-everywhere`, `codex/light-default-20261027`; remote development changes absent and remote branch ceiling7>6. Last fetched developmentdfdcefa0edc9d02bad5edf79b2b5a9587b194eb2 changed no relevant creation/service owner in the comparison. Reconcile before assembly; no waiver, unrelated merge or branch cleanup.

Physical iPhone/Android, actual OS scaling/background, VoiceOver/TalkBack, hosted parity and release/CI custody remain later gates. Source/SSR checks of additional absent/partial/error/module-off cases are not browser captures of every state or localized string. No real messages, customer data, native prompts, production credentials or analytics were used.

Product/experience: bounded own-employee creation with clear consequences. Engineering/security: original terms, current authority and established operation owners. Assurance/governance: exact evidence and author-owned closure, no policy exception or production authorization. Implementation ownerroot; evidence owners are named reviewers.

Next bounded Phase2 batch: full/partial-day time off, own history and permitted withdrawal, then availability/deadlines/drafts. The other mapped Phase2 groups remain in `../employee-mobile-phase2/STATUS.md`. Reachable legacy routes and this batch do not complete the entire Employee profile. No further user action is needed to preserve this local candidate; assembly/release requires its separate gates.
