# Upscale review: what to upscale in the Owner and Manager app

October 20, 2026. Four read-only design reviewers walked every Owner and Manager page of the clean v3 release candidate at 390 and 1440, as Owner, Manager and an Owner with payroll data. Their full reports are in this folder: `ui-designer.md` (UI-1–15), `ux-designer.md` (UX1–12), `product-designer.md` (PD1–10) and `market-strategist.md` (MK1–12). This file merges them.

**Overall:** all four agree the v3 app now matches Gusto for calm and craft. Home, Inbox, Settings and the phone lists read premium. The upscale isn't more polish. It's three things:
1. **Tell the Owner about money and time,** not only hours.
2. **Let people finish a job where they find it.**
3. **Bring the last older-looking pages up to v3.**

**Status: Jose approved the ranked list below as direction on October 20, 2026** ("approved"). The items marked "Jose" still need his specific call (see "Decisions for Jose"). The quick wins are being built in their own session.

## Ranked opportunities

Ranked by how many reviewers raised it and by client value. "Codex" means it needs server or data work; "Jose" means it needs your approval or decision.

| # | Upscale | Raised by | Needs |
|---|---|---|---|
| 1 | **Pay and deadlines on Owner Home.** A "Coming up" panel: next payday, payroll periods with no run, timecard approvals, availability deadline. Overdue first, no amounts. Today the payroll Owner's payday is today with no run, a September run still waits for approval, and Home says nothing. | PD1, MK1, UX (via Inbox), UI | Codex (payroll facts on the Home read), Jose (payroll wording). "Next payday" alone is UI only. |
| 2 | **One truth about who is working, and planned against actual time.** At 11:18 PM Home listed two people as working now, while its own timeline drew all six shifts as "No clock-in", stopped at 5 PM, and drew no now line. Timecards and Attendance disagreed too. Fix: the axis always includes now, recorded time is drawn on the bars, late starts are marked, and Home and Attendance share one definition. | UI-1, PD2, UX6, MK9 | Mostly UI (clock-in time is already in the data). Codex for clock-out, breaks and the shared definition. |
| 3 | **Finish the job where you find it.** Inbox items and phone sheets each end in a button that leaves the page, so approving time off takes 4 taps and 2 page loads. Decide in the pane: Approve or Decline, the shift facts, Call or Text, then the next item. Also: "Review timecard" opens that person's card, and time off shows "If you approve…" consequences. | UX1, PD5 | Mostly UI (the approve action exists). |
| 4 | **The person page answers, not a form.** A team member opens on an edit form. Add an Overview first: today's status, this week's shifts, hours against target, open requests, latest timecard, Call or Text. | UX5, PD6, MK7, UI | UI, with some reads. |
| 5 | **Overtime that explains itself, then labour cost.** Replace "56h · over limit" with "16h over 40h", add a week total, and show it again before Publish. Later: estimated labour cost per person, per day and per week (Square, Homebase, 7shifts, Deputy). The labour-budget model already exists but is switched off. | PD3, MK3, MK2 | Labels are UI only. Costs: Codex (real pay rates) and Jose (who sees money). Puerto Rico daily and seventh-day overtime: counsel. |
| 6 | **Insights answers "how did last week go".** It opens on four zeros and a flat chart. Open on "This week so far", compare scheduled with recorded hours, add a watch list (over 40h, under target, repeated no clock-in), and name unfinished timecards when a period shows 0h. | PD4, MK5, UI-7 | The default period and the empty explanation are UI. The comparison needs Codex. |
| 7 | **Schedule: Publish as the main button, add from the grid.** Publish is buried under More. None of the 99 grid cells can be clicked, and Add shift is a 7-field page dated Monday whose conflicts appear only after Save. Add a toolbar Publish with a change count, click-a-cell to add, availability hints, and calmer open shifts (21 red dashed boxes today). | UX3, UI-6, UI-15 | UI. |
| 8 | **Bring the older pages up to v3.** Payroll (net pay, the number you approve, is the fourth small tile), Time exports (a 7,000px form), My pay (employee styling leaks in, including a 60px ultra-light date) and the three Team tools views. | UI-2, UI-3, UI-4, UI-8, UX8 | UI. Payroll and Time exports layout: Jose. |
| 9 | **Fix a timecard where the problem shows.** The drawer lists "No clock-out yet / Open break" with no control to fix them. Add "Add clock-out" and "End break" there, and swap the all-dash Role column for Scheduled and Difference. | UX4, UI-9 | Codex (no punch-edit exists), Jose for wording near Approve. |
| 10 | **Don't end "cover a shift" at "No one can work it".** Show the closest people with the reason each was left out, allow an override with a confirm, and add "Offer to the team" (the 7shifts Shift Pool model). | UX2 | Codex; Jose on manager overrides. |
| 11 | **Puerto Rico, where NEVORA can lead.** Christmas bonus (Bono de Navidad) readiness: hours against the Ley 148 thresholds. No competitor checked handles it, and the payment window opens November 15. Plus Puerto Rico rules as a one-step setup choice. | MK4, MK6 | Codex, Jose and Puerto Rico counsel. |

Smaller, worth doing:
- **Managers who open an Owner-only page** get a calm explanation, not a silent redirect to Home (PD9, UX10).
- **Updates:** show "0 of 5 acknowledged" (PD10, MK8).
- **Search:** finds actions ("add shift", "publish", "pin") and the Settings subpages (UX7).
- **Status colours:** one ladder at both widths (UI-5). Today "review" shows coral on desktop, and on phones a 2.2:1 icon fails the 3:1 minimum.
- **Empty states:** one look, using the existing illustrations (UI-11).
- **Desktop type:** a five-size scale (UI-12). Home uses 9 sizes and Timecards 12.
- **Team tools:** fold into a collapsible sidebar group (UX9).
- **Phone Schedule:** move "‹ Oct 12" out of the Back slot (UX11).
- **Phone header:** show the company name and logo (PD8).
- **Clocker recovery:** stop asking for a typed 36-character reference (UX12).

## Quick wins (small, UI only)

Do these first:
1. Status colour ladder (UI-5).
2. My pay in the v3 frame (UI-4).
3. Home timeline: the axis includes now, Working now people stop showing as "No clock-in", recorded time is drawn from the clock-in (UI-1, PD2, UX6, first part).
4. Overtime labels "16h over 40h" from data the grid already has (MK3, PD3 labels).
5. Insights opens on "This week so far" and explains an empty period (MK5, PD4 part).
6. Timecards: hide the empty Role column and fold zero-hour rows; `#timecard-ID` opens the drawer (UI-9, UX4 part).
7. "Review timecard" opens that person's card; Call and Text on a no-clock-in (PD5 part).
8. Add shift dates to today, or to the day you came from (UX3 part).
9. Owner-only pages explain themselves to Managers (PD9, UX10).
10. Search synonyms and Settings subpages (UX7).
11. "Next payday" row on Home from the date My pay already has (MK1 part).

## Decisions for Jose

1. **Font.** The v3 stylesheet uses each device's system font (Segoe UI on Windows, Roboto on Android), while TEAM-RULES lists Inter as fixed. Record the change, or choose before more pages are tuned (UI report).
2. **Payroll wording** on Home's "Coming up" and the Payroll layout.
3. **Labour cost:** the calculation method, and whether Managers see money.
4. **Cover overrides:** may a Manager assign someone the rules excluded?
5. **Puerto Rico rules:** daily and seventh-day overtime, and Bono de Navidad wording. These need counsel first.
6. **Team chat:** build it, or answer with update receipts plus SMS and WhatsApp links (MK10).
7. **Company name and logo in the phone header**, which changes the approved v3 header (PD8).

## Leave as is

All four agree these already read premium:
- The Inbox's calm grouping
- The payroll stepper
- The phone Schedule
- Settings and Features & words
- The recovery pages' structure
- The overall v3 shell

## Limits of this review

- **Build:** the integration build as it stood before its merge with development (the coordinator's preview was down, so it ran on a read-only copy).
- **Coverage:** Chromium only, 390 and 1440, plus the payroll Owner. The preview's clock read about 11:20 PM, so no daytime states (a shift under way, late, starting soon) were seen.
- **Competitors and law:** comparisons rest on vendor pages, help centres and Mobbin, not trials. The Puerto Rico rules come from unofficial Labour Department compilations, and counsel must confirm them.
