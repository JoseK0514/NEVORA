# 49 QA Tester: Employee and Lead regression after the Owner/Manager rebuild

**Verdict.** The v3 rebuild did not break the Employee app, and the manager styles stay out of it. On all 15 Employee routes at 390 and 1440, the shell has no `data-nv-clean` attribute, nothing scrolls sideways, and the only `cm-*` class in the Employee DOM is the deliberately shared `cm-hold`. A pixel and height comparison with the Oct 19 22:41 baseline (before v3) shows no visual regression. Every height change traces to fictional data or to the intentional "Employee QA fixes" commits. What remains are weak spots in the Employee app itself. Under database load, one page returns a blank white page. Some entrance animations point at markup that no longer exists. Title and band placement now differs between Employee pages more than it differs on the cleaned-up Manager side.

## How I tested
- A Playwright crawl as `AUDIT-E` (Employee, Alexandra Rivera) at 390×844 (mobile, touch) and 1440×900. It covered `/app`, `/app/schedule`, `/app/my-time`, `/app/my-pay`, `/app/updates`, an update detail page, `/app/notifications`, `/app/profile`, `/app/requests/hub`, `/app/requests`, `/app/exchange`, `/app/exchange/swap`, `/app/exchange/callout`, `/app/availability` and `/app/timecards`. It also tried the manager-only routes `/app/inbox`, `/app/employees` and `/app/payroll`; all three redirect correctly to the hub or to Home.
- For each page I recorded: the shell attributes, the h1 (text, font, size, y position), sideways overflow, elements past the right edge, any `cm-*` classes, phone touch targets under 40px, `aria-current`, console errors, warnings and HTTP status of 400 or higher.
- I compared screenshot dimensions with the earlier baseline `qa-out/emp-a|emp-b/*-AUDIT-E-chromium-{390,1440}-100.png` and checked suspect pages by eye.
- Extra probes: Tab order and focus rings on desktop Home, the phone More sheet, the Requests tab strip, reduced motion on Home, Updates and Exchange, and a read-only view of the Employee compose page.
- Nothing was submitted, acknowledged, confirmed, requested or cancelled. Data from the crawl and probes: `scratchpad/review50/qa49/crawl.json`.

## Recommendations

1. **Show the app's error screen, not a blank white page, when a request page fails on the server.**
   - Steps: under database load (other reviewers active), open `/app/requests/hub` at 390. The server answered HTTP 500 after 28.4 s. The page was empty white: no shell, no h1, no "Try again". On the same run, `/app/requests` logged `canceling statement due to statement timeout`.
   - A retest a few minutes later loaded normally (5.1 s), so the cause is a timeout. The missing error UI is the bug. `src/app/app/error.tsx` and `src/app/global-error.tsx` exist, but neither rendered.
   - Evidence: `qa49-requests-hub-390.png` (blank), `crawl.json` entry `390 /app/requests/hub`.
   - Impact High (an employee on bad venue Wi-Fi or a slow database sees a dead app). Effort M. Owner: UI (error boundary and loading for `requests/hub`); Backend (Codex) for query time limits.

2. **Make Update detail and My pay fail softly and visibly, and confirm they recover.**
   - Under the same load, `/api/employee/communications/<id>` returned 503 at both widths. The page showed "Couldn't load this update" as its h1 with a Try again button, which is good.
   - `/api/notifications` also returned 503 on My pay with no visible sign. The bell kept its old count of 3 with no stale marker.
   - Retest: both loaded fine (`qa49-update-detail-retest-{390,1440}.png`).
   - Recommendation: give the bell badge a "may be out of date" state when its poll fails, as Updates already does with Paused or Not available.
   - Impact Medium. Effort S. Owner: UI.

3. **Remove or re-point the GSAP entrance animations whose targets no longer exist.**
   - The console warns "GSAP target … not found" on every visit to Updates, Profile and Shift requests at both widths.
   - The dead selectors:
     - `profile-frame.tsx:12` uses `.profile-heading-copy`
     - `update-visual.tsx:33` uses `[data-update-heading]`
     - `exchange-review-shell.tsx:15` uses `.exchange-page-heading h1, .exchange-section-heading`
   - None of these selectors appears in rendered markup any more, because the PageBand replaced those headings. The animations do nothing, and they add console noise that hides real errors.
   - Impact Low. Effort S. Owner: UI.

4. **Give Employee pages one rule for title position, as Manager pages already have ("title at y84").**
   - Measured h1 top at 390: Schedule, Updates, Notifications and Profile at 80. Home, My pay, Requests, Shift requests and Availability at 124. My time, Timecards and Update detail at 168.
   - At 1440: 113, 133, 181 and 193.
   - The cause: pages with section tabs put the tabs *above* the title, inside the band (My pay / My time / Timecards; Overview / Time off / Shift requests / Availability). My schedule puts its tabs *below* the title as white pills (My shifts / Open shifts). Moving between tabs makes the title jump about 88px.
   - Evidence: `qa49-my-time-390.png` vs `qa49-schedule-390.png`; `qa49-my-time-1440.png` vs `qa49-profile-1440.png`.
   - Impact Medium (the Employee side now feels less consistent than the Manager side). Effort M. Owner: Product (Jose) decides whether Employee gets a v3 pass; UI builds it.

5. **Match the Update detail band width to the other Employee pages at 1440.**
   - Measured: the band and cards are 840px wide (x 276–1116). Notifications, Profile, My pay and the rest use 1120px (276–1396).
   - The detail page is the only one whose band stops short and leaves an empty right side, and the back link sits tight to the band's top edge.
   - Evidence: `qa49-update-detail-retest-1440.png` vs `qa49-notifications-1440.png`.
   - If a narrow reading column is the goal, keep the band full width and narrow only the text.
   - Impact Low–Medium. Effort S. Owner: UI.

6. **"What changed in your schedule" needs a visible way to open it.**
   - It is a closed `<details>` (`DETAILS.schedule-publication-change > SUMMARY`) drawn as a plain one-line card, with no chevron or "Show" text, at both widths.
   - Next to the Confirm schedule card, it looks like a dead label. The other expandable rows in the Employee app ("Add shifts to your calendar", "Review timecard", "Record details") all show a chevron.
   - Evidence: `qa49-schedule-1440.png` (right column) and `qa49-schedule-390.png`.
   - Impact Medium (employees miss what their manager changed). Effort S. Owner: UI.

7. **Right-align the notification times in one column (1440).**
   - The time's left edge moves with the width of the action label: "7:00 AM" at x 1166 next to "Read update", and at x 1138 next to "Review schedule".
   - Evidence: `qa49-notifications-1440.png`.
   - Impact Low. Effort S. Owner: UI.

8. **Fix the misaligned columns on Profile at 1440.**
   - "App settings" has a heading outside its card, so the right column starts 25px higher than the Work details card (heading at y 238, cards at y 263). The left card has no outside heading.
   - Either give both columns an outside heading or move "App settings" into its card.
   - Evidence: `qa49-profile-1440.png`.
   - Impact Low. Effort S. Owner: UI.

9. **Make Pay navigation the same on phone and desktop.**
   - Phone has one "Pay" tab that holds My pay / My time / Timecards. The desktop sidebar lists "My time" and "My pay" as separate items, and has no Timecards item.
   - On `/app/timecards` the sidebar marks "My time" as current with `aria-current="true"`. On `/app/my-pay`, the tabs inside the band repeat the sidebar.
   - Pick one model, either one "Pay" group or three sidebar items.
   - At 1440, "Message today's team" is also a 1088px full-width outline button above the Updates list (`qa49-updates-1440.png`). That is very heavy for a secondary action, so size it to its content.
   - Impact Low–Medium. Effort S. Owner: Product decides; UI builds.

10. **Make the cut-off Requests tab strip on phone easier to read, and keep a Lead regression account.**
    - At 390 the strip (`.section-tabs-track`) is 409px of content in 366px. "Availability" is cut to "Availa", and on Availability "Overview" shows as "iew". There is a 40px fade, but nothing marks the start edge.
    - Evidence: `qa49-requests-390.png`, `qa49-availability-390.png`. Consider shorter labels ("Swaps") or scrolling the active tab to the middle.
    - Separately: the preview has storage states only for QAOWNER, AUDIT-M and AUDIT-E, so I could not check the Lead role. The Lead differences (team Updates wording, the shared `app-shell` branches) are the most likely place for a shared-file regression to hide.
    - Impact Low (tabs) / Medium (test gap). Effort S. Owner: UI (tabs); Product/UI (re-create the `AUDIT-LEAD` state).

## What's good
- **The manager styles stay out.** All 759 v3 rules in `premium-clean-manager.css` and the `clean-manager/*.css` files are gated on `[data-nv-clean]`, and `app-shell.tsx:210` never sets that attribute for Employees or Leads. The only ungated rules are the intentional 44px touch hit area (`premium-clean-manager.css:534`) and `.cm-hold` (`clean-manager/timecards.css:245`).
- **No visual regression against the pre-v3 baseline.** Home, My schedule, Updates, Profile, Requests overview, Shift requests and Availability have the same 1440 dimensions as on Oct 19, and Schedule and Updates match by eye. Nothing scrolls sideways at either width, and no phone touch target in `main` is under 40px.
- **Keyboard and motion basics hold.** The skip link comes first and every sidebar link shows the 2px teal focus ring (`qa49-home-focus-1440.png`). With reduced motion on, Home, Updates and Exchange run no CSS animations. Employees who try manager URLs land on Home or the Requests hub, not on an error.

## Not checked / limits
- **Lead role:** no `AUDIT-LEAD` storage state is available.
- **Not exercised:** confirming the schedule, acknowledging an update, clock in/out, submitting or cancelling time off and swaps, or saving availability (the read-only rule). Only the screens before those actions were checked.
- **Preview is not exactly HEAD.** 8 files differ, including the latest `premium-clean-manager.css` and `clean-manager/schedule.css` commits from 08:36–08:52 on Oct 20, `wave-b-forms.tsx` and `db.ts`. The preview also lacks `public/fonts/typeface/inter/variable.woff2` (404 on every page, falling back to the TTF). Both are preview-sync artefacts, not product bugs, but the last few manager-only commits were not tested live.
- The 500 and 503 failures were caused by shared database load from other reviewers and were not reproducible on demand. Only the missing error UI is claimed as a bug.
- **Not covered:** WebKit/Firefox, the 768–1299 widths, 200% text, Spanish, and dark mode. Opening the Shift options menu failed in my probe (the locator never matched), so that menu was not inspected.
- **Dev-only noise was ignored:** `Performance.measure` negative timestamp, the Next dev indicator over "Powered by VELANI LLC", and a React "script tag" warning seen once on `/app/requests`, traced to `src/app/layout.tsx`.
