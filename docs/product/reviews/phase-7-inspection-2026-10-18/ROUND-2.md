# Phase 7, round 2: re-inspection

October 18, 2026. All five round-1 reports were worked through. The fixes are live on the same preview, `http://127.0.0.1:51346`. The brief, accounts, rules and password file are the same as `BRIEF.md`; read only, and change no data.

## What each inspector does

1. Re-check **every one of your own round-1 findings** on the current build, by ID. Mark each one:
   - **Fixed**, with the new measurement
   - **Not fixed**, with the measurement and the cause at `file:line`
   - **Partly fixed**
   - **Regressed**
2. Then inspect your area again from scratch, one thing at a time, on every screen, role and width in the brief, for **new** defects. The new and rebuilt parts deserve the most attention:
   - Team, rebuilt
   - Schedule's Next up card, summary card, location chips, search field and day strip
   - Timecards and Payroll, restyled
   - Home's other views (Attendance, Team overview, Schedule activity), now on a band with Back to Home
   - The "Already decided" review page: open `/app/requests?tab=pending&requestId=does-not-exist`
   - Loading placeholders with a band
   - The docked decision bar
   - The grouped More sheet, now the same bottom sheet on Home
   - The toast style
3. Append a section headed `## Round 2` to the end of your own report file. It has:
   - the status table
   - new findings in the same format and severities as round 1
   - one line saying whether your area now has zero open defects

## Deliberately not changed

Don't refile these. Do say if you disagree.

| Item | Why it isn't changed |
|---|---|
| Payroll "Missing pay periods" (WR-15) and all other payroll wording | Payroll copy needs Jose's approval. Suggested: "Pay periods with no payroll run". |
| Toast doesn't name the employee (IS-27) | A name would have to travel in the URL, which the privacy rules forbid. |
| Spanish templates and locales (TC-31) | Planned for Phase 6 (F9). |
| Desktop layout: two-column balance, band height of 200px or less (WR-34, WR-35) | Planned for Phase 4. |
| Inbox and Home pause and clear private data when the window loses focus (IS-17) | A privacy rule: no stale private data on screen. The wording was changed instead. |
| Section tabs above the band title instead of under the summary (WR-25 placement) | A fade was added. Moving them needs a shell change; it's planned with Phase 4. |
| Dividers: rows inset, sections full width (AL-28) | Kept as the rule. |

## Not testable here

These need a real device: WebKit and iOS behaviour, notch insets and VoiceOver.

## Additions from later rounds (also not refiled)

| Item | Why it isn't changed |
|---|---|
| WR-33: 8px corners on items nested inside a 12px track (selected location chip, "Full week", day buttons, shift blocks) | That's the token sheet's "inner" radius (`--nv-r-inner: 8px`). It is correct for an element inside a control or card. |
| ST-19: tab labels narrow by 0.25–0.89px for one frame when Team opens | Below a pixel, cause unknown, icons don't move. Recorded, not chased further. |
| ST-11: the landscape More sheet has no Close button | Tapping outside, swiping down and Escape all close it. Accepted as a judgment call. |
| Time exports copy: "Rev. 0" and "beyond the 100-card selection limit" | Export and payroll wording needs Jose's approval, so it stays until he decides. |
| TC-45 on the employee app: the bell's "—" while the count is unavailable | Hidden for Manager and Owner. The bell is shared, and the employee shell is Phase 3's scope. |
| Widths below 320px (Home stats overflow at 300px) | Below the brief's 320px minimum. Revisit if 300px devices matter. |

## Outcome: Phase 2 surfaces at zero open defects (October 19, 2026)

All five areas report zero open P0, P1 and P2 defects on the current worktree build (`claude/premium-phase-1`, uncommitted):

| Area | Final round | Report |
|---|---|---|
| Alignment and geometry | 20 | `alignment.md` |
| Widths, roles and consistency | 19 | `widths-roles-consistency.md` |
| Type, colour and copy | 15 | `type-colour-copy.md` |
| Interaction and states | 16 | `interaction-states.md` |
| Bars and stability | 15 (Home hold verified in 100 of 100 runs) | `stability.md` |

Final checks on that build: 247 of 247 browser checks; type check and lint clean on every changed file; 7,277 unit tests passing; worst layout shift 0 across Home, Inbox, Schedule, Team and Timecards for both roles at 320, 390 and 1440.

Still outside this zero, by agreement: the items in the two tables above, TC-14 (accepted deviation) and the Time exports wording ("Rev. 0", "100-card selection limit"), which waits for Jose. Not testable here: WebKit and iOS rendering, notch insets and VoiceOver.
