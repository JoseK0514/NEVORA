# Owner and Employee premium refinement review — 2026-10-31

## Outcome and scope

Jose requested three reviewers of the hosted collab Preview: a business/product analyst, an Owner UI analyst and an Employee UI analyst. All three completed their reviews and updated their reports after fresh hosted evidence was available. This is an advisory backlog, not implementation or release certification.

Keep the approved corporate direction: light surfaces, restrained teal, quiet separators, readable typography and familiar navigation. The main improvement is a clearer hierarchy of identity, state and next action. Additional cards, decorative charts and stronger color are not needed to make these flows feel more premium.

Claude owns all UI implementation. This document does not authorize changes to payroll policy, API contracts, production data, environments, migrations or deployment. No application code, business records, remote branches or deployments changed during this review. Only fictional Preview accounts were used for read-only inspection, with normal sign-in/sign-out. No payroll approval, request submission, PDF publication or notification was performed. The browser was returned to the fictional Owner session and the requested Payroll history URL.

## Evidence and confidence

Requested URL: <https://nevora-git-claude-codex-collab-nevora-josekarlo-5933s-projects.vercel.app/app/payroll/history>.

Source inspected: isolated detached checkout `work/release1-preflight-20261031` at `f486a96fed567c760a81a29934b7b1129301562d`. Origin was fetched before review. The then-observed collab ref was `7b14776aa5631fafac8da06c40f8fe1d9aeecfc2`; the differences under `src` from the inspected checkout were tests. This does not prove the hosted deployment matches that source. The hosted alias moved during inspection; its toolbar subsequently reported deployment `dpl_5L9ihxw7MFQC5uWrS6fjiBzsTd6P`, whose metadata lookup returned 404. Do not assign an exact source SHA to these live screenshots.

The reviewers inspected existing rendered fictional-data captures from `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/` and corresponding source. These captures cover Owner Home, Inbox, Payroll, Schedule, Team and Settings, plus Employee Home, Schedule, Requests, Time, Pay, More and Profile. Their capture-time source identity is not established. Exact artifacts are recorded in each reviewer report. Approved corporate board images were used as references, not passed off as app captures.

Fresh hosted observations by the coordinating reviewer:

- Owner authenticated successfully. The shell rendered, but Payroll history remained at “Loading payroll…” after reload and repeated observations. Home showed paused/fresh-check states. No populated Owner history was inspected live. This is a verification limit, not a diagnosed application defect.
- Employee Pay and history rendered substantive data on desktop and in Safari responsive mode at 390px. Dates and Correction/Replaced labels were readable; corrected statements already sort first. Replaced detail already explains the replacement and prominently links to the corrected statement.
- Employee More at 320px displayed the full fictional employee name and workplace/location text wrapped across two lines. The older clipping concern is not confirmed for this fixture.
- Employee Requests and Profile showed paused states, limiting substantive live review. Responsive mode is not a physical-device test. No fresh keyboard, 200% text, contrast, touch-target measurement or state-mutation suite was run.

No automated tests were run for this advisory review. The earlier preflight's test results do not certify these visual recommendations.

## Prioritized implementation backlog

Effort is relative: S = a bounded copy/layout change; M = multiple components or a scoped data-read adjustment. Reproduce each local-capture observation on the implementation candidate before editing.

| Priority | Area | Proposed refinement | Why / acceptance | Evidence status | Effort |
| --- | --- | --- | --- | --- | --- |
| 1 | Owner Payroll history | Put authorized employee identity before document metadata; show period, payday and original/correction relationship. Keep filename quiet and document actions aligned. | A user can select the correct employee and revision without decoding a filename or opening several PDFs. Keep immutable records reachable. Stack actions cleanly on narrow screens. | Strong local-render/source recommendation; populated hosted Owner history unverified. | M |
| 2 | Owner Payroll review | Make the available next step the strongest action: Prepare before a draft exists; Review once it exists; Review issue when blocked. Recalculation remains secondary. | The screen explains what the Owner can do now. A disabled Approve control does not dominate the actionable blocker. Preserve approval rules and stale-source checks. | Local renders/source; recheck current candidate. | S |
| 3 | Owner Home / Things to do | Visibly distinguish today's operational/request count from other review work. Use short labels with matching count scopes. | Users can explain the two counts from the page itself. This is not evidence that the counts are numerically wrong. Do not silently change their calculation. | Local renders/source; hosted substantive content unverified. | S |
| 4 | Employee corrections / Requests | Identify the selected date, location and correction type before showing fields. Use Recorded / Proposed context. Where state supports it, replace vague Waiting copy with who acts next. | Missing-shift, existing-entry and overnight requests are understandable. Manager vs teammate action stays distinct. Summaries say which request categories they cover. | Local renders/source; Requests live view paused. | S–M |
| 5 | Owner Schedule publication | Use state-specific action labels: Publication details when fully published; Review changes when edits are pending; Build draft for generation. | A published schedule does not lead users into an apparently unfinished publishing action. Employee visibility and acknowledgement semantics remain unchanged. | Local renders/source; requires current-state confirmation. | S |
| 6 | Employee Pay / history | Optionally use Corrected statement wording in the list and subordinate replaced history. Shorten the desktop date-to-status reading distance with an appropriate content width. | Preserve corrected-first order, both documents and the existing corrected-statement guidance. Keep date, period and state easy to scan together. | Fresh hosted desktop/390 observation; low-priority opportunity, not a defect. | S |
| 7 | Owner Team / Employee Schedule | Quiet repetitive Off pills and known-empty opportunity actions. Keep exceptional states and actionable items prominent. | Reduce visual repetition while preserving explicit status and access to eligible offers or pending requests. Unavailable data must not become Day off or No requests. | Local renders/source; current state needs verification. | S |
| 8 | Shared corporate kit | Consolidate the approved type, spacing, radius and surface values into semantic tokens; reuse the same status, row and action patterns across roles. | Prevent future drift without changing the accepted geometry or shrinking text. This is maintenance work, not a reason to redesign the product or a newly established release blocker. | Source inspection. | M |

Payroll trust rules apply across these changes: Approved must not imply Paid; missing saved amounts must not appear as zero; never add invented earnings, forecasts or payment confirmation. If authorized employee identity is not available in the current read, investigate that read separately rather than parsing filenames or widening access. Use only authoritative correction relationships.

## Suggested bounded batches

1. **Payroll clarity:** Owner history identity/revisions, review actions and truthful amount/status copy. First reproduce current candidate, including two employees and a correction. Verify document destinations and unchanged approval guards.
2. **Operational clarity:** Owner Home/Inbox count explanations and Schedule publication verbs. Verify unchanged counts and return destinations across published/draft/pending/unavailable states.
3. **Employee task clarity:** correction context, next-actor request wording and optional Pay reading-width/list polish. Preserve manager review, original punches, uncertain-submission handling and corrected-document links.
4. **Consistency pass:** quiet repetitive states, shared semantic tokens and responsive/interaction checks. Preserve corporate references and role-appropriate information density.

For every batch, capture the exact source SHA and fixture. Verify 320px, 390px and desktop; long names/locations; cross-month dates; keyboard/focus; 200% text; loading/error/empty/paused states; and the routes affected by the change. Use fictional isolated data. A proposed acceptance check here is not a claim it already passed.

## Already addressed or unconfirmed — do not reopen blindly

- Current Time source already addresses the older 320px week-range issue (`employee-mobile/hours.css:80`). Recheck it; do not treat the historical capture as a current bug.
- Current Employee Home source already puts next shift before the Quick guide (`employee-home-corp.tsx:113–124`). Preserve it.
- Current Payroll CSS already wraps document actions (`payroll-corp.css:206–207`); old narrow screenshots may predate it.
- Fresh Employee More 320px content wraps correctly. Longer names, three long locations and 200% text remain verification work, not established defects.
- Replaced-statement detail already has precise guidance and a corrected-statement link. No need to add duplicate guidance.
- Some desktop screenshots show Home background emphasis alongside Pay emphasis. Pointer/focus and current-route behavior were not isolated; do not report an incorrect-navigation defect from these screenshots alone.
- Strict UI-review artifacts discuss incomplete token coverage. Those artifacts are narrower engineering assessments, not a determination that the existing product is fake, broken or unfit for release.

## Reports and fresh artifacts

Local evidence root: `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/premium-review-20261031/`.

- `business-review.md` — business analyst: workflow meaning, next steps, identity and status semantics.
- `owner-ui-review.md` — Owner UI analyst: hierarchy, action weight, corporate consistency and narrow layouts.
- `employee-ui-review.md` — Employee UI analyst: Pay, correction/request context, long content and reading density.
- `live-owner-payroll-history.png` and `.ax.txt` — Owner shell and loading state only.
- `live-employee-pay-desktop.png` and `.ax.txt` — settled Employee Pay.
- `live-employee-history-desktop.png` — settled Employee history on desktop.
- `live-employee-history-390.png` and `.ax.txt` — settled Employee history at 390px.
- `live-employee-replaced-390.png` — existing replacement guidance.
- `live-employee-more-320.png` — wrapping name/workplace at 320px.

The screenshots and their originals were preserved. No capture was edited to simulate a proposed design. This handoff remains local/uncommitted in the isolated review checkout; no push was requested. The best next UI batch for Claude is Payroll clarity, after checking the current frozen/review candidate. All production and branch-ownership agreements continue to apply.
