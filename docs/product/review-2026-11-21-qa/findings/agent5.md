# Agent 5: product research and ease of use. Review tip 6601ee82a (Nov 21, 2026)

Saved by the lead from Agent 5's hand-back. The subagent could not write `.md` report files.

**Where the evidence is:**
- Research, from the companies' own sites, with URLs and the date read: `research-A-owner-attention-and-timesheets.md` and `research-B-coverage-and-employee.md`.
- Screenshots: `shots/`. The marked-up ones are A5-01, 02, 04, 05, 07 and 09. Each shot has a `.txt` file with the page text and element positions.
- Scripts: `scripts/peek.js` and `scripts/markup.js`.

Read-only throughout. Agent 3 was changing data at the same time, so the counts move between shots.

## Caveat
The live app was overloaded. Load average was 9–22, page loads took 2.6–124 s, and one sign-in took 159 s. Owner sign-ins also hit the limit of 10 attempts per Employee ID per 15 minutes (`src/lib/auth/login-limits.server.ts:10`).

Step counts were measured in the app. Time-to-answer is an estimate built from typical times per click, decision, scroll and screen read, not measured.

Devices: Chromium desktop at 1440x900 and touch emulation at 390x844.

## Per-job verdict
| Job | NEVORA (measured steps) | Competitor benchmark | Verdict |
|---|---|---|---|
| 1. Owner: what needs me today | **1440:** no clicks after sign-in. One screen shows the count, the live strip, 6 to-do rows, the missed-payroll card and the payday card; about 6 s for the headline and 12 s for everything. **390:** only 3 rows, and the red "Nov 2–8 has no payroll" card is about 1.3 screens down. | When I Work: Attendance Notices and Pay Period cards. 7shifts: Overview with request blocks. Gusto mobile: a "Run payroll" task. | Strong on desktop, weaker on the phone. Call-outs are hidden at both widths. |
| 2. Manager: repair a coverage gap | **Planned gap:** 2 clicks to the review, 4 to commit, the same at 390. **Call-out:** about 8 actions over 5 screens. **No-show:** only "Contact" is offered. | When I Work: 3–5 steps, with an overtime badge. Deputy: recommended people are pre-selected. 7shifts: people at risk of overtime are listed last. | Fastest of the set for a planned gap. Weak for real absences. No hours or overtime effect is shown. |
| 3a. Employee: next shift | Off shift, the Next shift card is first (seen in the code only). On shift, the next shift is about 1.6 screens down at 390; at 1440 it is visible without scrolling. | When I Work: Next Shift first, plus an iOS widget. Deputy: upcoming shift on Home. | Good, with one gap while on shift. |
| 3b. Employee: pay statement | 1 tap (the Pay tab), or the payday figure on Home. The empty state is honest. | Gusto about 2 taps, 7shifts 3 or more, Connecteam 2. When I Work and Sling have no pay statement view. | As good as or better than every competitor that has one. |
| 4. Owner: approve timecards | About 10 actions on the clean path. "Approve N ready" leaves out cards with issues. Finalizing sits behind Select and an action menu. | Homebase "Approve All" and lock: 3 steps. Connecteam bulk approve: 3. 7shifts: "Approve [#] without conflicts". | Safer than every competitor, slower than most. |

## Findings
| ID | Sev | Finding and recommendation | Evidence | Verified |
|---|---|---|---|---|
| A5-01 | P2 | **Owner Home, 390:** the missed-payroll card is about 1.3 screens down. Make an overdue payroll, or a payday within 2 days, the first to-do row. | shots/A5-01 | touch emulation |
| A5-02 | P2 | **Home:** "Can't work" call-outs that leave a shift uncovered are not among the 6 rows, because rows keep the server's order (`home-b.tsx:244-252`). The no-show row has no action in the row itself. Sort rows by the date they affect, group uncovered call-outs with coverage, and give no-shows Call and Find cover. | shots/A5-02 | desktop |
| A5-03 | P2 | **Approving a call-out** says cover is needed but gives no way to find it. Add "Approve and find cover", like the time-off "Fill shift" repair (DESIGN.MD 2150–2170). | shots/j2-mgr-callout-1440 | desktop; Approve was not clicked |
| A5-04 | P2 | **Find cover rows** show only "35 h of 30 h this week". "Best fit" went to someone 5 h over target, and people at 40 of 40 h get no overtime cue. Show hours after the change, a cue for over target or overtime, why the person is Best fit, and who is left out and why. | shots/A5-04; `coverage-assistant.tsx:46-50` | desktop + code |
| A5-05 | P3 | **The review step** does not show the person's week after the change. Add a "Week after this" row. | shots/A5-05 | desktop |
| A5-06 | P3 | **"Open shifts 2"** in the live strip are 30-minute staffing-rule gaps, not open shifts. Label them "Staffing gaps". Inferred to be partly the seed data. | shots/j2-mgr-findcover-1440 | desktop |
| A5-07 | P2 | **Employee Home on shift, 390:** the next shift is about 1.6 screens down. Add a line "Next: Mon, Nov 23 · 6:00 AM" to the On shift card. | shots/A5-07 | touch emulation |
| A5-08 | P3 | **Pay with no statement yet:** say when one is expected. This is payroll wording, so Jose signs off. | shots/j3-emp-pay-390 | touch emulation |
| A5-09 | P2 | **Timecards Total:** 490 h 11 includes Valeria's open punch of 113 h 19, with no note. Say that the total includes an open punch. The overtime cue is the known gap E25. | shots/A5-09 | desktop |
| A5-10 | P3 | **Timecards:** once nothing is left to approve, the summary button should read "Finalize N approved timecards". | `timecards.tsx:665-666` | code only |
| A5-11 | P3 | **A missed clock-out** shows only as a status in the Today list. Make it a to-do row, like "Missed clock-in". | shots/j1-owner-home-1440 | desktop + code |
| A5-12 | P3 | **Home says "11 timecards to review"** while Timecards says "5 to approve · 6 to finalize". Use the same words. | shots/j1, j4 | desktop |

## Top recommendations (score out of 16 on the TEAM-RULES scorecard)
1. **"Approve and find cover"** on call-outs, with uncovered call-outs listed among the coverage rows (A5-03, A5-02). Effort M. Score 15.
2. **Find cover shows what each choice does:** hours after, an over-target or overtime cue, why Best fit, and who was left out (A5-04, A5-05). Effort S–M. Score 15.
3. **No-show rows get actions:** Call, Text, and Find cover for the rest of the shift. Effort M. Score 14.
4. **Phone Owner Home:** an overdue payroll or a near payday becomes the first row (A5-01). Effort S. Score 16.
5. **Employee on-shift card** gets the "Next: …" line (A5-07). Effort S. Score 16.

## Strengths to keep
- **Desktop Home** answers attendance, coverage, requests and payroll on one screen, and every figure links to its list.
- **Find cover** is 2 clicks from Home, with an eligible person already chosen. The list is filtered by the rule engine, and the review says plainly that saving does not guarantee the notification arrives.
- **Approvals state their consequences.**
- **Timecards:**
  - "Approve N ready" leaves out cards with issues.
  - A progress line shows how far along the week is.
  - "Approval opens" tells you when an open week can be approved.
  - Self-approval is blocked.
  - Approved timecards are locked when finalized.
- **Employee Pay** is one tap away, and Home shows the payday with a countdown.

## Research gaps
- **Help centers that refused access:** 7shifts, Deputy, Homebase `/hc/` and Gusto returned 401 or 403. Claims from them rely on the companies' own search-result snippets.
- **Not found:**
  - A first-party description of the Homebase dashboard.
  - A daily digest for When I Work or Deputy.
  - The Gusto and ADP coverage flows.
  - ADP evidence is old Workforce Now help, not the current product.
- **Not checked in NEVORA:**
  - Push alerts for late arrivals and no-shows.
  - Find cover at 390 (it failed under load).
  - The off-shift Next shift card, which was read in the code only.
  - Spanish, WebKit, keyboard and screen reader on these jobs.

The full list of sources with URLs is in the two research files.
