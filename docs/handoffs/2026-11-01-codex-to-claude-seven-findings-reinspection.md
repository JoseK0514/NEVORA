# Codex — seven-finding closure on 83397510, release hold preserved

Date: November 1, 2026. This is a bounded independent re-review of A1, B-01, B-02, B-03, B-04, A2 and A3, following Jose's correction that the previous inspections used an older SHA.

**Disposition: all seven earlier findings are VERIFIED / CLOSED on `83397510a83d82420a3b6526c787f43a3092a839`, within the evidence limits below. Overall production remains on hold. Do not deploy this candidate.**

## Source and fetch correction

- Freshly advertised release head: `b53851e44a558a4b5fe4117ffefd3e8f60cca2d7`.
- Exact browser/unit inspection candidate: `83397510a83d82420a3b6526c787f43a3092a839`, in a new detached worktree.
- Confirmed `git diff --quiet 83397510a83d82420a3b6526c787f43a3092a839 b53851e44a558a4b5fe4117ffefd3e8f60cca2d7 -- . ':(exclude)docs'` exits zero. Only four handoff/gate-summary documents differ.
- Development: `f4739751ec1ff5ce566b271df951470c078e1130`; the release head is its ancestor.
- Read Claude's `2026-11-01-claude-to-codex-inspection-response.md` and release handoff §1c/§4 from the fetched release head. The older release-ready document physically stored at candidate 83397510 predates those documentation corrections; it was not substituted for the head's handoff.

The cause of the stale tracking refs is established: the shared local Git configuration fetched only `AI-owner`. A plain `git fetch origin` therefore did not update `origin/claude-codex-collab-nevora` or `origin/development`. Earlier inspection claims that those tracking refs established the current release head were insufficient. Their evidence remains valid only for the recorded old SHA, `2c4431386308b58b2684fa21492ea0a57e9d0a68`.

Codex explicitly fetched the two named heads and added their fetch mappings to local Git configuration, preserving the AI-owner mapping. A subsequent normal fetch resolved to the current heads above. No remote repository configuration, branch contents or push ownership changed. Future inspection must compare `git ls-remote origin refs/heads/claude-codex-collab-nevora` with the fetched tracking ref and explicit review pin before running.

## Closure evidence

Fresh isolated local PostgreSQL/Next fixtures, source-verified against 83397510; Chromium and WebKit. Owner widths: 320, 390 and 1440. A1 additionally used 320×640 and coarse-pointer 844×390 landscape. No hosted or production data was used.

| Finding | Re-review and result |
|---|---|
| **A1 — request date range** | Requests hub and time-off list both show November 11–12 and two days at all four sizes in both engines: 16 cases. The hub's accessible label includes Waiting; the detailed list exposes the dates, duration and status through its text. Rows fit without clipping or document overflow. The fixture's stored start/end dates remained November 11/12. Parser/label tests passed, including malformed data and the shared range label cases. **Closed.** |
| **B-01 — passkeys list semantics** | With passkeys enabled, every rendered passkeys section is directly inside an LI, including responsive DOM variants. Six corrected browser cases passed; all six axe scans reported zero violations under the selected WCAG rules. **Closed.** |
| **B-02 — timezone help list semantics** | Locked timezone state reproduced. `#timezone-help` is outside UL/OL and `#workspace-timezone` still references it via `aria-describedby`. Six browser cases and six axe scans passed. **Closed.** |
| **B-03 — feature radio group** | Group is a DIV around a plain list; five native radios, exactly one checked, and the checked input accepts focus. Six browser cases and six axe scans passed. No feature switch was changed. **Closed.** |
| **B-04 — Copy Clocker link hit region** | Visual button remains 32px. `elementFromPoint` hits the button 5.5px above and below its box and misses at 7px, verifying the approximately 44px pseudo-element hit area. Passed at all three widths in both engines. **Closed.** |
| **A2 — photo-review organization** | One inset company-photo card, text Refresh in its header, empty state inside the card, proper back link and no duplicate settings/assistance button. Six rendered cases passed. Phone/desktop WebKit captures were visually inspected. Populated rows and Load more were verified by the existing render test; the browser fixture contains no collected photos. **Closed for the original layout finding.** |
| **A3 — tablet/setup gutters** | Tablet cards and setup note share the 16px phone gutter; desktop padding remains unchanged. Six browser cases passed and phone/desktop WebKit captures were visually inspected. No real tablet was enrolled. **Closed.** |

Accepted case inventory: **52 rendered checks**: 30 B-02/B-03/B-04/A2/A3 cases from the first pass, plus 22 corrected A1/B-01 cases. **18 accepted axe scans** (B-01/B-02/B-03), zero violations. The three targeted unit files passed **6/6 tests**. No full release gate was re-executed by this re-review.

Four WebKit page-error records were retained in accepted cases, involving push-status, authority and Employee-home reads around navigation. The original date/list/geometry assertions still completed. No exact-request cancellation trace was collected for these four events, so they are not declared harmless or a new production CORS defect. The seven specific closures do not constitute a zero-runtime-error or whole-release certification.

The first observer assumed one passkeys section in the DOM and exact ASCII spacing in all date labels. Responsive duplicated markup and intentional nonbreaking spaces made those assumptions fail. The time-off list also uses a different full-date presentation from the hub. These were harness errors, not regressions. The corrected observer checks every section's list parent and semantic dates/duration/status; original attempts and corrected results are both retained. No application assertion, source or existing test was changed.

## Gate and CI provenance

- The fetched committed gate summary names exact SHA 83397510; all **70 recorded steps have exit 0**. This is verified recorded evidence from Claude, not a fresh Codex run of those 70 steps.
- GitHub Actions run [41303596912](https://github.com/JoseK0514/NEVORA/actions/runs/41303596912), attempt 3, is completed/success and names exact head SHA 83397510. Its selected run has 16 successful jobs.
- GitHub's commit check-runs endpoint returned **18 completed/success check-run records** on 83397510, including two `mobile-access` records. Preserve that distinction from the 16 jobs in the selected workflow run.
- [PR #37](https://github.com/JoseK0514/NEVORA/pull/37) is open, draft and unmerged; the fetched head is b53851e. No PR state was changed.

## Work still open and ownership

Jose's latest instructions govern the next batch:

| Work | Disposition |
|---|---|
| **R-01** desktop Employee shift panel | Still the release blocker. Claude owns the repair. |
| **R-02, R-03, R-04, R-05, N1** | Open; Claude owns the next repair batch. These were not reclassified as fixed by this seven-item review. |
| **“Approve 8 ready” wording** | Included in Claude's next batch. |
| **R-06, Brand Save pending feedback, WebKit Add-position focus question** | Planned for Release 1.1, per Jose. Preserve their records until implemented/re-reviewed; do not fold them into the seven closures above. |

Claude will provide a **new frozen SHA with a new gate and CI run** after the repairs. Re-inspect that exact candidate, especially R-01 at 768px and wider, before the next release decision. **Do not deploy 83397510 or b53851e to production; wait for that replacement and Jose's explicit go.** Device testing and the existing production schema/environment/deployment controls remain applicable.

Only Claude commits/pushes `claude-codex-collab-nevora`. This work changed no application code, existing tests, migration, production environment, branch contents or remote settings. No commit, push, merge, message to Claude, deployment or move of main occurred.

## Artifacts and practical limits

Evidence root: [seven-findings-83397510-20261101](../../../../outputs/seven-findings-83397510-20261101/).

- [First browser results](../../../../outputs/seven-findings-83397510-20261101/browser/results.json), [corrected A1/B-01 results](../../../../outputs/seven-findings-83397510-20261101/browser-corrected/results.json), [unit log](../../../../outputs/seven-findings-83397510-20261101/unit.log).
- [GitHub check records](../../../../outputs/seven-findings-83397510-20261101/github-check-runs.json), [recorded gate summary](../../../../outputs/seven-findings-83397510-20261101/claude-gate-summary.txt), [local fetch correction](../../../../outputs/seven-findings-83397510-20261101/fetch-correction.json).
- [Final inventory, custody and hashes](../../../../outputs/seven-findings-83397510-20261101/summary.json).

Both owned runtimes closed with source/mirror verification; application processes were checked absent and their disposable clusters stopped. Browser captures were inspected and accepted by finding, without relabeling the older failed observers as passes. These checks do not certify hosted behavior, physical devices, camera/provider collection, every populated photo state or overall release readiness. Older audit artifacts remain unchanged as historical evidence on 2c443138; the seven finding statuses above supersede their open status only on the reviewed candidate.
