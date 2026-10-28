# Employee/Lead mobile passkeys — independent code review

Reviewed base `592d421225e8266a5079f2a1381dc3b4175b9635` through candidate `d36ea8b04fcc455bd0cac3eaff23fa76847592cf` (three commits, all 16 changed files). Review is read-only for product/test/config files. Initial `git status --short --untracked-files=all` was empty. Exact branch, identity, full diff and numbered source captures: `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-mobile-local-resume/.omo/evidence/passkeys-code-review-d36ea8b0`. No ULW attempt exists (`ULW_LOOP_PLAN_MISSING`); evidence therefore uses `.omo/evidence/`.

**Disposition: changes requested.** Three P2 findings below prevent claiming full agreement with the approved plan. No critical or high-severity cross-account write or credential-disclosure defect was identified in the inspected changed paths; that is a bounded source-review conclusion, not security or production certification.

## Findings

### CR-PK-1 — P2: malformed successful deletion responses can claim confirmed success

- **Location:** `src/lib/passkeys/management.ts:44-47`, `:108-109`.
- **Scenario:** DELETE returns HTTP 200 with `{error:"unavailable"}` (or another invalid successful JSON body); a subsequent current list does not contain the ID, for example because a different session removed it.
- **Observed:** `request` accepts arbitrary JSON from any successful status; `remove` discards that body, then claims `Passkey removed.` from absence alone. The endpoint's actual receipt is 204. The list proves present absence, not that this malformed original response confirmed this operation. This contradicts the plan's strict receipt parsing and honest uncertain-outcome requirement.
- **Direct reproduction:** `node --import tsx .omo/evidence/passkeys-code-review-d36ea8b0/delete-receipt-probe.mjs` exited 0, printing `OBSERVED_MALFORMED_RECEIPT_ACCEPTED=true`, one DELETE, two reads, and state `notice:"Passkey removed.", needsRefresh:false`. This is a controller probe with fictional fetch results; it does not claim the canonical server currently returns that invalid response.
- **Artifact:** `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-mobile-local-resume/.omo/evidence/passkeys-code-review-d36ea8b0/delete-receipt-probe.log`; runnable input `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-mobile-local-resume/.omo/evidence/passkeys-code-review-d36ea8b0/delete-receipt-probe.mjs`.
- **Fix/regression:** For DELETE, accept only the contracted 204 receipt. Route any other successful response to uncertainty; a fresh current list may reveal absence but must not relabel the original result as confirmed. Add regressions for 200 `{}`, 200 error-shaped JSON, and malformed JSON; retain the existing 204-success and lost-response scenarios.

### CR-PK-2 — P2: setup cancellation does not return focus to its initiator

- **Location:** `src/components/employee-mobile/passkeys.tsx:69`, `:72`; `src/lib/passkeys/management.ts:100-101`, `:119`.
- **Scenario:** A user activates Add a passkey and cancels through the provided Cancel setup control, or dismisses the controlled native prompt.
- **Source-established behavior:** Every busy-to-idle transition with a notice schedules focus on the feedback paragraph. The explicit cancellation path sets its cancellation notice before refresh completes; there is no later focus return to Add. Native dismissal also routes the busy transition to feedback or leaves the eventual replaced control without an Add restoration. The Add ref is only used by Keep's fallback, not setup cancellation. The plan explicitly asks for exact cancellation return. The new browser scenario at `employee-mobile-passkeys.integration.ts:47` checks zero credentials and cancellation copy, but never asserts the focused element.
- **Evidence:** `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-mobile-local-resume/.omo/evidence/passkeys-code-review-d36ea8b0/src__components__employee-mobile__passkeys.tsx.txt`; `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-mobile-local-resume/.omo/evidence/passkeys-code-review-d36ea8b0/src__lib__passkeys__management.ts.txt`; `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-mobile-local-resume/.omo/evidence/passkeys-code-review-d36ea8b0/src__test__integration__employee-mobile-passkeys.integration.ts.txt`. This finding is a control-flow review, not a claim that a physical OS prompt was exercised.
- **Fix/regression:** Distinguish cancellation from success/error feedback and restore focus to the current Add initiator after the canonical refresh has rendered it; avoid restoring focus after denial, signout or unmount. Add keyboard tests for explicit Cancel and native NotAllowedError, including expected blur/focus and resize ordering. Assert `document.activeElement` equals the Add control after the settled cancellation.

### CR-PK-3 — P2: Employee/Lead desktop presentation changes outside the stated presentation boundary

- **Location:** `src/app/app/profile/page.tsx:30`; `src/components/employee-mobile/passkeys.tsx:20-45`.
- **Scenario:** Employee or Lead opens Profile at desktop width, including resizing from mobile after a completed ceremony.
- **Source-established behavior:** The route always replaces the original PasskeySection with EmployeePasskeySection. `mobile` only changes its outer class and heading; new key icons, separate metadata lines, introductory/help sections and inline removal review render on desktop too. The original desktop removal confirmation is a native dialog (`src/components/passkeys/passkey-section.tsx:91`); the new one is an inline group at all widths. Task 2 expressly requires incumbent desktop/management appearance. Keeping the old CSS classes does not preserve that appearance or interaction structure.
- **Evidence:** `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-mobile-local-resume/.omo/evidence/passkeys-code-review-d36ea8b0/src__app__app__profile__page.tsx.txt`; `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-mobile-local-resume/.omo/evidence/passkeys-code-review-d36ea8b0/src__components__employee-mobile__passkeys.tsx.txt`; `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-mobile-local-resume/.omo/evidence/passkeys-code-review-d36ea8b0/src__components__passkeys__passkey-section.tsx.txt`; `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-mobile-local-resume/.omo/evidence/passkeys-code-review-d36ea8b0/docs__execution__employee-mobile-passkeys__passkeys-plan.md.txt`.
- **Fix/regression:** Keep one controller lifetime while selecting the existing desktop presentation at desktop widths; do not remount the controller on resize. Preserve improved truthful security language where necessary. Verify desktop ready/empty/removal states against the prior branch and assert one native ceremony survives crossing the breakpoint. If desktop redesign is intended, an explicit scope decision and reference are needed before calling this plan requirement met.

## Checked controls and scope

| Review scenario | Invocation / source trace | Binary observable and artifact |
| --- | --- | --- |
| Candidate and full branch | `git rev-parse HEAD`; `git status --short --untracked-files=all`; `git diff 592d421225e8266a5079f2a1381dc3b4175b9635...HEAD` | Exact SHA matches and initial status empty: `head.txt`, `identity.txt`; all changed hunks captured in `whole-branch.diff` under evidence directory. |
| Opt-in own binding / stale session | Read `http.server.ts:48-59` and `store.server.ts` guards, snapshot, removal; authority hash source | Actual session proof remains required; wrong opt-in role/binding returns 401 before service dispatch; no new employee selector. Numbered HTTP/store/authority source captures. |
| Lease and timer-stall admission | Read `management.ts:31-35,51-59,74-75,87-90`; store snapshot SQL | Lease <=45000 ms bounded by DB session expiry; elapsed transport subtracted; add/remove synchronously reject expired admission. Numbered manager/store captures. |
| Native expected blur / duplicate admission | Read `management.ts:71-103,113-120`; component events `:60-66` | Expected blur clears facts but retains busy device owner; resume/add cannot launch a new prompt while busy; native result rechecks server authority before verify. Source captures only. |
| Page hide / offline / account loss | Read same event mapping and version fencing | pagehide/offline/hidden visibility cancel/fence; signout/account storage permanently end mounted owner. Source captures only; physical native visibility sequences remain unexecuted. |
| Unknown registration / removal | Read manager catch/afterMutation; narrow malformed DELETE probe | Unknown verify is never replayed automatically; fresh reads do not invent original success. DELETE's malformed successful-response exception is CR-PK-1. Manager capture and probe log. |
| Metadata / successful registration receipt | Read parser `:10-17`, registration receipt `:93-94` | Exact fields, authority, UUID/metadata and duplicate IDs validated; exact registration receipt required. Numbered manager capture. |
| Private credentials / logging | Read full changed manager/view and shared client serializer | No local/session storage or console logging added for credential payloads; native response stays in call-local memory. Diff and source captures; no global repository/security certification. |
| Last key / unsupported browser | Read view `:32-40`; canonical removal SQL | Last key retains password fallback and explicit consequence review; unsupported creation leaves list/removal reachable. Source captures; no new last-key prohibition or assigned-location/module prerequisite. |
| Stable owner / legacy roles | Read profile integration and component effect dependencies; manager profile import | Resize is not an owner-effect dependency; manager/owner still import legacy PasskeySection. Employee desktop presentation discrepancy is CR-PK-3. Numbered route/view and whole-branch captures. |

The authored review covered changed config/runner plumbing, CSS, unit/HTTP/browser tests and approved plan/visual reference/ledger. Existing reports/logs were not treated as proof. The root's reported unit/SQL/browser results are not independently claimed here. No broad test suite, app server, database runtime, external service mutation, push, merge or deployment was performed. The only executable behavioral check was the narrow controller probe described above.

## Director positions and remaining gates

Engineering: canonical service/store reuse and stable owner are appropriate; require the three bounded fixes above. Security: preserve current session proof, source ownership, exact receipt validation and fail-closed lifetime fencing; no permission expansion is recommended. Technical assurance: browser/native OS evidence must be distinguished; source review cannot establish platform-specific visibility/focus order. Governance: **NO-GO for claiming this plan complete**, pending finding disposition and affected checks; no exception or production authorization is implied. Root remains implementation owner; this reviewer owns closure of these code findings after a new candidate and exact regression artifacts.

## Declined to judge / separate evidence limits

- Physical iOS/Android OS credential sheets, hardware authenticators, device credential stores and actual sync behavior: no physical devices/native OS execution in this review. Hidden visibility currently aborts a ceremony by source; that is not evidence of a physical-device bug or compatibility pass.
- Visual fidelity, contrast, screen-reader interaction and complete browser focus behavior: independent UI/QA seats own their runtime evidence; this report identifies code-level focus/desktop discrepancies without claiming their certification.
- Hosted/CI/release performance, migration deployment and production: no execution or authorization; no release certification.
- Historical Calendar QA-CAL-1 remains **OPEN RISK, cause unresolved**. It is outside this review's closure authority.
- Unrelated default-suite failures reported by root remain pending independent investigation; no passkey finding is waived by reported passing tests.

No product/test/config edits, commits or deployment were made. Next step: root resolves the findings and supplies the new frozen candidate plus targeted regression artifacts for author-owned rereview.

Final custody check observed shared HEAD advance to `356bca2382a34bfda8db11e8f9d4dae404e67004`. This report remains explicitly scoped to frozen `d36ea8b0`; subsequent edits are not silently included or approved. See `final-custody.txt`.
