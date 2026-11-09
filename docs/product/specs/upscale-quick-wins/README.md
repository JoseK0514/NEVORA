# Upscale quick wins: the 11 UI-only items

October 21, 2026. Branch `claude/upscale-quick-wins`, cut from `claude/p35-profile-6cdee8` at 3d17453a (the commit with the upscale review), so the clean v3 layer (`premium-clean-manager.css`) is included. The source list is "Quick wins (small, UI only)" in `docs/product/reviews/upscale-2026-10-20/SUMMARY.md`.

Each item has its own commit, plus small follow-up commits from the browser pass with the same item ID, so the coordinator can take or drop any item. No server code, SQL, `src/lib/data/*`, auth or payroll calculation changed. No payroll or legal wording changed.

## What changed

| # | Item | What you see now | Files (owner) |
|---|---|---|---|
| 1 | Status colour ladder (UI-5) | Phone tiles: coral #D70015, amber #A05A00, green #1E7B34, grey #6C6C70, each 4.5:1 or better with a white glyph (the 2.2:1 orange is gone). Desktop "Open shifts today" is amber, not coral. Teal only on Finish setting up; the time-off row is grey at both widths. | `premium-clean-manager.css`, `owner-setup-card.tsx`, `premium-home.tsx` (Desktop's) |
| 2 | My pay in the v3 frame (UI-4) | Owners and Managers: a standard "My pay" title on the white canvas ("‹ More" and the large title on phones), the dark-teal payday card with its mark, the date at 40px weight 600 tabular (was 60px weight 200), grouped statement cards, and the privacy line and Refresh in the page foot. Employees and Leads keep the Signature My pay. Same read, states and words. | new `payroll/manager-my-pay.tsx` and `.css`; `my-pay/page.tsx` role switch (coordinator's) |
| 3 | Home timeline (UI-1, PD2, UX6 first part) | The axis always includes now (earliest start, clock-in or now, to the latest end or the hour after now). Anyone the clock-in read lists as working is never drawn as "No clock-in"; their recorded time runs from the clock-in to now in solid teal over a light planned outline. People on the clock with no shift today get a row. Screen readers hear the clock-in time. | `premium-home.tsx` (Desktop's), `premium-clean-manager.css` |
| 4 | Overtime labels (MK3, PD3) | "56h · over limit" became "56h · 16h over 40h", from the person's own weekly limit; screen readers hear "16h over the 40h limit". | `manager-weekly-roster.tsx` |
| 5 | Insights period (MK5, PD4 part) | Opens on This week (Monday to today). Last week, Month and Custom sit beside it and fit one line at 320px. A period with no recorded time says "No recorded time in this period" in the chart, links "13 timecards aren't finished yet" when there are any, and offers "See this week so far". | `reports.tsx`, `reports/page.tsx` (Wave B's), `clean-manager/insights.css` |
| 6 | Timecards (UI-9, UX4 part) | Role column only when a punch names a role. Two or more people with no time fold into "11 people with no time yet", which opens in place (desktop) or as a disclosure (phones); nothing folds while one of them is selected or open, or when nobody has time. `#timecard-ID` opens that person's drawer. Monogram text is 11px (was 9px). | `timecards.tsx` (coordinator's; the employee view is untouched), `clean-manager/timecards.css` |
| 7 | Review timecard and Call/Text (PD5 part) | "Review timecard" opens that person's card (item 6). The no-clock-in detail, in the desktop pane and the phone sheet, shows the phone number and Call and Text (`tel:` and `sms:`). | `manager-inbox.tsx` (Desktop's), `inbox/page.tsx` |
| 8 | Add shift date (UX3 part) | Schedule already passed the day chosen in the week strip. Every other way in (Search, a link) used to land on Monday and now opens on today when today is in that week. | `schedule/new/page.tsx` (Wave A's) |
| 9 | Owner-only pages (PD9, UX10) | Anyone but an Owner who opens a Settings page sees "Only Owners can open Settings. Ask an Owner if you need a change here." and Back to Home, in place of a silent move to Home. Payroll without payroll access shows the same pattern. | new `settings/layout.tsx` (Wave C's area), new `owner-only-notice.tsx` and `.css`, `payroll/page.tsx` (Wave B's) |
| 10 | Search (UX7) | Typed words match word starts across a result's name and keywords, so "add shift", "new shift", "approve time off" and "copy week" find their action. New search-only actions: Publish the schedule, Copy previous week, Review time-off requests, Approve timecards, Set a Clocker PIN. Owners find each Settings page by name ("policies", "logo"). Team tools are indexed. The opening list is unchanged. | `lib/finder.ts` |
| 11 | Next payday on Home (MK1 part) | One "Coming up" row under Needs you: "Next payday · Tue, Oct 27 · in 6 days", linking to My pay. The date comes from the pay schedule My pay already reads; the row shows only when pay statements are on and a payday is ahead. No amounts. | `my-pay/next-pay.ts` (new, shared), `app/page.tsx`, `manager-dashboard.tsx`, `premium-home.tsx` |

## For the coordinator and Codex

- **One new read on the Inbox page (item 7).** `inbox/page.tsx` now calls the existing `readOperationalDirectory` so Call and Text have phone numbers. It passes numbers only for the company-wide directory, the one the Team page already shows this viewer. A location-scoped Manager, or a failed read, gets no Call or Text. That adds one directory query per Inbox load. If Codex prefers a per-person contact read, the UI needs only `phones` replaced.
- **New Settings layout (item 9).** `src/app/app/settings/layout.tsx` checks the role once and renders the notice without the page for anyone but an Owner. Every Settings page still runs its own `requireRoles`, so permissions are unchanged. This is in Wave C's folder, and it is new, so no Wave C file changed.
- **Wording to confirm with Jose:** the Payroll notice ("Payroll is open to Owners and the people they give payroll access. Ask an Owner if you need it.") and the "Coming up" heading. "Next payday" reuses My pay's approved words.
- **Local preview workaround, not committed:** this branch includes development, so the preview needs the `0032` company-access migration (Wave C's `preview-runtime-ca.local.mjs`) and an empty local `node_modules/server-only` stub (the known missing dependency, `pr17-ci-2026-10-21.md`).

## Checks run

- Unit tests: new or updated in `premium-home.test.tsx` (timeline lanes, Next payday), `finder.test.ts`, `manager-weekly-roster.test.tsx`, `timecards.batch.test.tsx`, `manager-inbox.test.tsx`, `reports-periods.test.ts`, `reports/page.test.tsx` and `settings/layout.test.tsx`. Full-suite results are in the commit message for the push.
- Browser, one local preview with fictional data (port 53822), Chromium, signed in as QAOWNER, AUDIT-M, AUDIT-E and payroll-qa-owner:
  - Home at 390, 1024 and 1440: the ladder, Coming up, and the timeline at 12:05 AM with the Now line on the chart and Casey and Jordan drawn from their clock-ins.
  - Timecards at 390 and 1440: Role hidden, the fold, expanding moves focus to the first revealed row, and `#timecard-AUDIT-ON` and `#timecard-AUDIT-E` (a folded person) open the right drawer.
  - Insights: opens on This week; Last week shows the empty-period line at 320 and 1440; the four periods fit one line at 320.
  - Schedule at 1440: "16h over 40h".
  - Add shift with no date: the form's date is today (Oct 21).
  - AUDIT-M on `/app/settings`, `/app/settings/branding`, `/app/settings/positions` and `/app/payroll`: the notice and no redirect. QAOWNER still gets Settings.
  - Search at 390 and 1440: add shift, publish, policies, approve time off, pin and attendance each find the right first result.
  - Keyboard focus: the fold button, My pay's Back, Download and Refresh, the Coming up row and Back to Home all show the 2px teal ring.
- `checks.mjs` (overflow, text floor, targets, layout shift, errors, axe), Chromium and WebKit: see "Sweep" below.

## Sweep

Results are in `checks-owner.txt` and `checks-mgr.txt` in the session scratchpad and summarised in the hand-over note. The flags on pages I changed are the v3 conventions already on every clean page: 13px segmented controls, footnotes and section captions, 32px segments with a 44px hit area, Export at 44×30, and the Inbox filters. The layout shift of 0.024 on Home at 320px is there with or without the new Coming up row (measured both ways), so it was there before this work.

## Not covered, and why

- **Daytime states in a browser:** the preview's clock was after midnight, so no shift was under way or late, and the Inbox had no no-clock-in item. The timeline lanes and the Inbox Call, Text and timecard link are covered by unit tests at those states instead.
- **Width and text matrix:** reduced to 320, 390, 844×390, 768 and 1440 at 100% and 200%, because the full 8 × 4 sweep ran at about 15 minutes per width on this Mac. 360, 430 and 1024, and 125% and 150%, were spot-checked by screenshot only.
- **On-screen keyboards (iOS Simulator, Android emulator):** not run. No form fields changed.
- **Reduced motion:** nothing new animates.
- **Spanish:** comes later, in the one pass over every page.
- **Not part of these quick wins:** the late-start notch, the phone timeline, "4 of 6 clocked in", naming the Owner in the notice (needs a read), phone-number copy on desktop, payroll rows on Coming up, and planned against recorded hours on Insights and Timecards. All need Codex or Jose.

## Screens

`screens/`: Home (390, 1024, 1440), Timecards (390, 1440, the drawer opened by link at 390), Insights (1440; Last week empty at 320 and 1440), Schedule (1440), My pay (390, 768, 1440), Settings and Payroll as a Manager (390, 1440), and Search (390).
