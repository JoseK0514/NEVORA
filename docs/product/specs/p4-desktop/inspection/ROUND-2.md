# Phase 4 desktop, round 2: what changed since round 1

October 19, 2026. Build: branch `claude/p4-desktop-240fe0` at `c666ffd`, synced to the same preview (URL in `access.json`, see `BRIEF.md`). Re-check every one of your own round-1 findings by ID (Fixed, Not fixed, Partly fixed, Regressed, with the new measurement), then look again at everything the fixes touched. Append a `## Round 2` section to your own report with the status table, any new findings, and one line: "Open: N P0, N P1, N P2".

## Fixed in code

| IDs | Change |
|---|---|
| ST-P4-01, IS-P4-02, TCD-01, AL4-03 | The pane sticks below the 65px header (`top: 81px`). All requests left the side column; the pane alone sticks. |
| ST-P4-02 | Desktop route placeholders carry the band at each route's desktop height (`--route-band-desktop`). |
| ST-P4-03, IS-P4-07 | Both Inbox columns stay in every state but "all caught up"; the list column keeps its last height while paused, offline, failed or refreshing. |
| IS-P4-01 | The action-center read keeps the confirmed snapshot during a re-read (poll or Refresh); the controller still clears it on expiry, failure, offline and in the background (`manager-action-center.tsx`). Refresh no longer disables itself during a poll. |
| ST-P4-04 | Team: status chips, "Updating employees…" and "Clear filters" share one row from 1024. |
| ST-P4-05 | Home's loading rows are 104px on desktop (one meta line). |
| ST-P4-07, WR4-10, TCD-07 | The request pages card is a compact row at the top of the Inbox list ("Request pages": Time off, Shift requests, Availability), at every desktop width. |
| IS-P4-03 | The account menu and device settings close when focus leaves them. |
| IS-P4-04 | A selected row inside a closed group opens its group. |
| IS-P4-06 | Up/Down move between Inbox rows and group headings; Shift+Tab from the pane's heading returns to the selected row. |
| IS-P4-08 | A holder entry (Inbox on Time off) has `aria-current="true"`, not `"page"`. |
| IS-P4-09, TCD-06 | Home's views end the trail with their name ("Plan › Home › Team overview"). |
| WR4-07 | Payroll settings ends the trail with its name. |
| IS-P4-10 | A waiting avatar keeps a white disc on the selected row. |
| IS-P4-12 | Desktop `scroll-padding-top: 81px`. |
| IS-P4-13 | Account menu name: "<name>, account menu". |
| IS-P4-14 | Skip link to the page, the first Tab stop on desktop. |
| IS-P4-15 | Team row labels include the phone number. |
| WR4-01 | Band titles keep their width (`max-content`); filters and view chips take what's left and scroll sideways. |
| WR4-04 | Sidebar 14px rule restored, now in rem (TCD-10). |
| WR4-06 (WR-25) | Section tabs sit inside the top of the band on desktop (Timecards, Payroll runs, Time exports, Payroll settings). |
| WR4-08 | Updates follows the Phase 4 band rules. |
| TCD-02 | The pane's note is written per item type. |
| TCD-03 | The 14px floor no longer touches the Timecards overview figures. |
| TCD-04 | Timekeeping items show periods as dates ("Oct 19 – Oct 25"), not ISO. |
| TCD-05 | Schedule week-grid heading is on the 14px floor. |
| TCD-08 | The shift pane says each thing once (no meta line; facts are Shift and Location; a short note). |
| TCD-11, TCD-12 | Bell count 12px (badge role); "Workforce" 13px in rem. |
| TCD-13 | Account menu: "My pay"; items in the kit label role. |
| TCD-14 | Time exports names in the row role. |
| TCD-15, AL4-11 | Team columns 2 / .8 / 1.2 / 1, cells on the first baseline. |
| AL4-01 | Timecards "Details" follows the name in flow. |
| AL4-02 | 36px band inset at 761–1023 again (band text over card text). |
| AL4-04, AL4-05, AL4-12 | Time exports: hours right-aligned under headers; totals inset 12/16; cards 20, gaps 16. |
| AL4-06 | Schedule location chips stay one row and scroll; words don't wrap. |
| AL4-07 | Schedule week toolbar is a white card with a 12/16 inset. |
| AL4-08 | No empty setup row for the Manager. |
| AL4-13, AL4-14 | "Powered by" on the 12px column; account menu heading and divider on the item edges. |
| AL4-15 | Desktop header is solid (no backdrop filter). |
| AL4-16 | Avatars sized in rem on Team, Inbox and Home (desktop). |
| AL4-17 | One-row cards on Home are balanced 4/4. |
| AL4-18 | Timecards period status centred on the buttons. |

## Waiting on another owner (not a finding in this round)

| IDs | Why |
|---|---|
| IS-P4-05, WR4-02 | `/app/profile` for Owners and Managers lands with the Profile session's merge (`claude/p35-profile-6cdee8`), which removes the redirect. The coordinator asked for the links in this branch so the merge brings both together. |
| WR4-09 | The phone More sheet is the coordinator's; sent to them. |
| WR4-03, AL4-10 | Kit pages centre a 1120 column (`portal-premium.css:56`, coordinator's). One global rule decides it; sent to the coordinator. |
| IS-P4-11 | The review's "‹ Inbox" link is Wave A's (`manager-time-off.tsx`); sent with the exact change. |
| TCD-09 | `timecards.tsx` is the coordinator's; sent. |
| ST-P4-08 | Font swap in the shared typeface setup; sent to the coordinator. |

## Judgment calls kept, with the reason

| IDs | Decision |
|---|---|
| ST-P4-06 | The Inbox summary keeps two lines reserved (196px band), so the band never grows when a longer summary arrives (Phase 2 ST-02). It's under the 200px cap. |
| WR4-05, AL4-09 | Home's column ends depend on data. The DOM order phones need (today, now, setup, week, Plan ahead, tools) can't be rebalanced per role with CSS grid without masonry; the Owner fixture ends within 9px at 1180. Kept as is. |
