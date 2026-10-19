# Wave A inspection brief (Phase 3.5)

## Cuts from round 2 on (Jose, October 19; PARALLEL.md "Cuts")

- Don't inspect the shared shell (phone header, tab bar, More sheet, section tabs, desktop sidebar and header). Ignore shell flags.
- `checks.mjs` does the width, text-size and browser sweep (Chromium and WebKit). Inspectors use its results and spend their time on judgment (alignment, wording, states, focus, behaviour, consistency) at 320, 390, 844×390 and 1440 in Chromium, with WebKit spot checks.
- Rounds 2 and later re-check open findings by ID plus whatever the fixes touched. The last round is one full pass by all five inspectors.
- Findings stay complete; "checked and found correct" is a short bullet list.
- No Firefox, and no Firefox-only findings.
- Fields stay 48px (the coordinator's decision; PARALLEL is corrected).

October 19, 2026. Read `docs/product/reviews/phase-7-inspection-2026-10-18/PARALLEL.md` (main checkout) for the matrix and the design rules, and `BRIEF.md` there for the report format and severities (P0, P1, P2). This file says what is different for Wave A.

## What you inspect

Fourteen pages rebuilt on the kit (`.nv-page.wa-page`, styles in `src/app/app/premium-wave-a.css`):

| Key | Path | Roles that can open it |
|---|---|---|
| add-shift | `/app/schedule/new` (also `?week=…&date=…&employeeId=…&locationId=…&start=…&end=…` from a coverage choice) | Owner `QAOWNER`, Manager `AUDIT-M` |
| edit-shift | `/app/schedule/edit?shiftId=audit-shift-0-1` (also `&error=SHIFT_OVERLAP`) | Owner, Manager |
| coverage | the first `coverage?` link on `/app/inbox` (copy it from the page) | Owner, Manager |
| copy-receipt | `/app/schedule/copy-receipt?operation=11111111-1111-4111-8111-111111111111` (not confirmed) and `?operation=bad` (not found) | Owner, Manager |
| timeoff | `/app/requests?tab=pending`, `?tab=approved`, `?tab=declined`. The single-request review (`?tab=pending&requestId=…`) is already at zero: check only that it still works | Owner, Manager |
| shift-requests | `/app/exchange?tab=pending`, `?tab=coverage`, `?tab=activity` | Owner, Manager |
| availability | `/app/availability`, `?week=2026-10-26`, `?week=2026-99-99` (invalid) | Owner, Manager |
| member | `/app/employees/AUDIT-E` (Details and Scheduling tabs), also `/app/employees/QAOWNER` as Manager (Owner-only notice) | Owner, Manager |
| new-employee | `/app/employees/new`, also `?error=save` | Owner, Manager (Owner sees the Owner role) |
| clocker-pin | `/app/employees/AUDIT-E/clocker-pin` (the preview has no PIN key, so it shows "PIN setup is unavailable"), `/app/employees/QAOWNER/clocker-pin` as Manager | Owner, Manager |
| swap | `/app/exchange/swap?sourceShiftId=audit-shift-0-1` (Employee `AUDIT-E`), `?sourceShiftId=x-audit-next-AUDIT-LEAD-2` (Lead `AUDIT-LEAD`) | Employee, Lead |
| unable-to-work | `/app/exchange/callout?shiftId=audit-shift-1-1` (AUDIT-E), `?shiftId=x-audit-next-AUDIT-LEAD-3` (AUDIT-LEAD), also `&error=details` | Employee, Lead |

Also check that Employee and Lead get no access to the manager pages (they redirect or show their own view), and that Owner and Manager opening the swap or callout URL go back to Shift requests.

## How to reach it

- Preview: the `url` in `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS--claude-worktrees-p35-wave-a-1283c8/8826aaed-d30f-485c-8afb-4ef7d6834f83/scratchpad/preview/evidence-2026-10-19T13-10-08-831Z/access.json`. The password is in the same file. **Read it from the file. Never print it, write it into a report or put it in a URL.**
- Signed-in browser states: `…/scratchpad/preview/state/<account>.json` for QAOWNER, AUDIT-M, AUDIT-LEAD, AUDIT-E, AUDIT-LONG, AUDIT-ON, payroll-qa-b.
- Playwright (Chromium, Firefox, WebKit): `/Users/josek0514/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs`. axe: `/Users/josek0514/Desktop/NEVORA-UI-READINESS/node_modules/axe-core/axe.min.js`.
- Ready scripts you can copy: `/Users/josek0514/Library/Application Support/Claude/side-session-notes/local_f4a312b1-4def-4174-afcc-370813400b38/wave-a-tools/` (`common.mjs` opens a signed-in page; `shoot.mjs`, `probe.mjs`, `submit.mjs`, `crop.mjs`).
- Source: `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/worktrees/p35-wave-a-1283c8`. Give `file:line` for each finding.
- Put your own scripts and screenshots under `…/scratchpad/inspect/<area>/`.

## Rules

- **Read only.** Don't edit code, CSS, tests or data, don't commit.
- **Never let a submission reach the server.** You may press Save, Approve, Decline, Send, Delete, Add and the rest only with every POST held and then aborted in the browser (`page.route` → `abort`), as `submit.mjs` does. That is how you check pending, failure, double tap (count the POSTs: exactly one) and slow network. Don't press Sign out.
- Fictional data only. Nothing leaves this machine.
- Full-page captures draw the tab bar mid-image; that is a capture artifact. Check sticky bars with viewport captures.
- **Don't run more than one heavy browser sweep at a time**; the dev server stalls under parallel load. Keep to one browser instance at a time in your own scripts.

## Already known, outside Wave A (don't refile; say if you disagree)

| Item | Owner |
|---|---|
| "Search" in the phone header measures 14px | shell (coordinator) |
| Desktop sidebar group labels 12px, "Powered by VELANI LLC" 10px | shell (Desktop session) |
| At 844×390 the kit's tablet type tokens (14px label and callout) apply, because the kit switches at 768px wide | kit (coordinator) |
| The compact brand link in landscape is 38px tall | shell |
| Section tabs above the band fade in on load | shell |
| The tab bar shows Inbox as current on Time off and Shift requests | shell |
| Everything in `docs/product/specs/p35-wave-a/CODEX.md` (server reads, the swap choose state, the PIN form, a real copy receipt, legal wording) | Codex or Jose |
| Field height 48px | decided by the coordinator |

## Report

Write `docs/product/specs/p35-wave-a/inspection/<area>.md` in the worktree (areas: `alignment`, `stability`, `type-colour-copy`, `interaction-states`, `widths-roles`). Format as in `BRIEF.md`: verdict paragraph, findings table worst first (ID with your prefix, page/role/width/browser/text size, element, measured problem, crop path, cause `file:line`, specific fix, severity), then what you checked and found correct with the measurement. End with one line: does your area have zero open P0, P1 and P2 on the Wave A pages?
