# Phase 7 inspection: interaction and states

Inspector: UX Designer (interaction and states). Date: October 18, 2026, 21:40–22:35 AST. Preview: `http://127.0.0.1:51346`, fictional data, Manager `AUDIT-M` and Owner `QAOWNER`. Chromium (Playwright) at 390×844 phone (`isMobile`, `hasTouch`), with repeats at 320 and 1440. Nothing was approved, declined, published, saved, submitted, sent or signed out. Scripts, JSON and crops are in `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS/8c7acfe8-4195-49cb-a26a-ba2ac9ec5c59/scratchpad/phase7/interaction-states/` (crops under `shots/`, accessibility trees under `aria/`, re-check output under `recheck/`). Below, `SP` stands for that folder.

**The source changed while I was inspecting.** The main session edited `manager-inbox.tsx`, `premium-home.tsx`, `kit.css`, `kit.tsx` and `portal-premium.css` between 22:16 and 22:23. At 22:30 I re-checked every finding below against the live server. The `file:line` references are from the files as they stood at 22:30. One earlier observation did not reproduce at the re-check, and I moved it to "Checked and correct".

## Verdict

The happy paths work.
- The Inbox filters are real `aria-pressed` buttons that rewrite the URL without adding history.
- Browser Back restores the filter.
- Escape closes the More sheet and returns focus to More.
- Every kit tap target is at least 44 px.
- All 200 links I followed resolve, with no 404.

The work is not defect-free. **12 findings are P1.** Five of them are keyboard problems:
- the focus ring on every teal-band control is teal on teal (1.79:1);
- the pill ring is clipped;
- three side-scrolling rows don't follow focus;
- the review's last link hides behind the sticky decision bar;
- focus leaves the open More sheet for the page behind it.

Four are state problems that present wrong or dead information:
- the Inbox silently drops the shifts with no clock-in when the Today read fails, yet still shows "Updated";
- Home's "Try again" does nothing in that case;
- Home says "Loading…" forever while offline;
- an already-decided review link drops the manager on the old Time off list without saying why.

The other three:
- the Team tools rows open the old "Welcome back" dashboard;
- 13 Inbox links share one accessible name;
- the Timecards checkboxes are 18×18.

There are also 16 P2 precision issues.

## Findings, worst first

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| IS-1 | Inbox, Review, Schedule, Team · both · 390 and 1440 | Band controls: `Refresh` (`.nv-band-control`), filter pills (`.nv-filter`), review `‹ Inbox` / `‹ Home` (`.nv-masthead__back`), `Add shift`, `Add employee` | The focus ring is `2px solid rgb(7,117,114)` on band `rgb(28,74,71)`. Contrast is **1.79:1**; non-text contrast needs 3:1, and white would give 9.91:1. Header icons (white) and section tabs on the band (white) are correct, so the band is inconsistent. | `SP/shots/is-band-refresh-focus.png`, `is-band-filter-focus.png`, `is-review-back-focus.png`, `is-schedule-addshift-focus.png`, `is-team-add-focus.png`, `is-band-refresh-focus-1440.png` | `src/app/app/portal-design-system.css:53`: `.app-shell.nevora-portal :is(button,a,…):focus-visible` (specificity 0,3,1) beats `src/components/kit/kit.css:122` `.nv-masthead :focus-visible` (0,2,0). `portal-premium.css:15` and `:26` fix only the header and the section tabs. | In `portal-premium.css`, outside the phone media query: `html body .app-shell.nevora-portal .nv-masthead :is(a,button,summary):focus-visible { outline: 2px solid #FFFFFF; outline-offset: 2px; }` | P1 |
| IS-2 | Review · both · 390 and 320 | `All pending time-off requests` (`.premium-review-more a`) | When focused by Tab, the link box is y 698–742. The sticky decision bar is y 702–778, so the ring and label sit behind Decline/Approve (elementFromPoint returns the bar). | `SP/shots/is-review-allpending-focus.png` | `src/app/app/portal-gusto.css:362` sets `scroll-padding-block` bottom to `80px`. The review needs the bar (76 px, offset by 66 px) plus the tab bar. The bar is placed by `portal-premium.css:170`. | `html:has(.premium-review) { scroll-padding-bottom: calc(150px + env(safe-area-inset-bottom)); }`, or move the link above the "Before you decide" card. | P1 |
| IS-3 | Timecards (Owner) · 390; Inbox · 320; Schedule · 390 | Section tab `Payroll settings`; filter pill `Plan ahead`; location chip `Main Office Published` | A keyboard-focused item stays clipped and the row doesn't scroll:<br>• `Payroll settings` is at x 362–485 while its track ends at 374; `scrollLeft` stays 0 after 800 ms.<br>• `Plan ahead` is at x 267–374 on a 320 viewport.<br>• The chip is at x 272–480 on a 390 viewport.<br>`element.scrollIntoView({inline:'nearest'})` on the same tab does scroll (`scrollLeft` 0 → 127). A plain test page in the same Chromium does scroll on focus, so something in the app stops it. I did not isolate the cause (snap, mask and focus patching all ruled out). Chromium evidence only. | `SP/shots/is-timecards-sectiontab-focus-band.png`, `is-band-filter-focus-320.png`, `is-schedule-location-focus.png` | `src/components/section-tabs.tsx:12-26` sets `scrollLeft` only for the current tab on load. `.nv-filters` (`kit.css:170`) and the location chip row have no focus handling. | Add a `focusin` listener on `.section-tabs-track`, `.nv-filters` and the location chip row that calls `event.target.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: reduced ? 'auto' : 'smooth' })`. | P1 |
| IS-4 | Inbox · both · 390, 320 | Filter pills | The focus ring is clipped at top and bottom: only the left and right arcs show. The pill is 44 px tall in a 44 px row with `overflow-x:auto` (which forces `overflow-y:auto`). The ring needs 3 + 2 = 5 px outside the pill. | `SP/shots/is-band-filter-focus.png`, `is-band-filter-focus-320.png` | `src/components/kit/kit.css:170` (`.nv-filters` overflow) and the global 3px offset (see IS-1) | `.nv-filters { padding-block: 6px; margin-block: -6px; }`, or `.nv-filter:focus-visible { outline-offset: -4px; }` | P1 |
| IS-5 | Any screen, More sheet open · both · 390 | `#manager-more-navigation` | The sheet dims the page like a modal, but Tab after `Close actions` goes back into the page while the sheet stays open. Focus lands on `Review timecard for Morgan Rivera` at y 356–460, which lies under the sheet (y 86–828); elementFromPoint returns the sheet. | `SP/shots/is-more-focus-behind-sheet.png` | `src/components/action-menu.tsx:157-163` uses `popover="auto"`, which isn't modal and doesn't close on focus out. | Close on `focusout` when `!menu.contains(event.relatedTarget)`, returning focus to the trigger. Or render the phone sheet as a modal `<dialog>`. | P1 |
| IS-6 | Inbox · Manager · 390 | Act now section and band summary | With `/api/manager/today` returning 500 and the Inbox read fine:<br>• the Inbox shows **"Act now, 3"**, but the real count is 6 (all 3 shifts with no clock-in are missing);<br>• the band says "3 coverage gaps and 1 request need you." under a green "Updated 10:32 PM";<br>• nothing says clock-ins weren't checked;<br>• pressing Refresh made **0** calls to the failing reader.<br>The numbers look current but are incomplete. Home in the same situation correctly says "Some of today's numbers aren't available." This could reasonably be argued as P0. | `SP/shots/is-state-partial-today-inbox.png` | `src/components/manager-inbox.tsx:130`: `const shifts = today?.state === "ready" ? today.missed : []`. `:106-109`: `useToday().refresh` is never passed, so Refresh is the action-center read only. | When `today` is not ready, add a row at the top of Act now: "Clock-ins couldn't be checked. Try again", plus "Some clock-ins weren't checked" in the band summary. Make Refresh call both `refresh()` functions. | P1 |
| IS-7 | Home · Manager · 390 | `Needs you` card → `Try again` | With only the Today read failing, Needs you shows "What needs you isn't available right now. Try again". Pressing it made **0** requests to `/api/manager/today`, and the card was unchanged after 3 s. Only the Today card's own Try again recovers it. | `SP/shots/is-state-partial-today-home.png` | `src/components/premium-home.tsx:97` passes `onRetry={onRetryActions}` to `PendingCard` (`:203-212`). Needs you is blocked by the Today read, which that retry doesn't touch. | `onRetry={() => { onRetryToday?.(); onRetryActions?.(); }}`, or say "Waiting for today's clock-ins" without a button when only Today failed. | P1 |
| IS-8 | Home · Manager · 390 | `Today` card | After going offline (`context.setOffline(true)`), the Today card shows meta "Loading…" with three pulsing skeletons, and stays that way. Nothing will load while offline, and the band and Needs you correctly say "You're offline…". | `SP/shots/is-state-home-offline-M-390.png` | `src/components/premium-home.tsx:110`: `if (!today) return <Card title="Today" meta="Loading…">`. `useToday` pauses offline and the card can't tell paused from loading. | Pass the connection to `TodayCard`. When offline, show "You're offline. Today's numbers return when you reconnect." with no skeleton. | P1 |
| IS-9 | Home → Team tools · both · 390 | Rows `Attendance`, `Team overview`, `Schedule activity`; stat `Clocked in now` | These open the old manager dashboard on `/app?…&view=team|activity|attendance`:<br>• white header, eyebrow "MANAGER DASHBOARD" and h1 **"Welcome back, Morgan."** (Home itself says "Good evening, Morgan");<br>• "Attendance" lands on h1 **"Time review"**;<br>• a second tab row (Overview / Attendance / Team overview / Activity), where "Activity" wraps to its own line at 390;<br>• no PageBand and no "‹ Home";<br>• the tab bar still lights Home.<br>Nothing tells the user this is an older view. | `SP/shots/is-home-view-team-390.png`, `is-home-view-attendance-390.png` | `src/components/manager-dashboard.tsx:328` (only `overview` gets the premium Home) and `:348` (old hero). Links at `src/components/premium-home.tsx:128` and `:249-251`. | Give non-overview views a `PageBand` with `back={{ href: '/app', label: 'Home' }}`, title "Attendance" / "Team overview" / "Schedule activity" (matching the row labels), and drop the "Welcome back" hero and the duplicate tab row. | P1 |
| IS-10 | Review (stale link) · Manager · 390 | `/app/requests?tab=pending&requestId=<not pending>&from=home` | A review link for a request that is no longer pending (already decided, or withdrawn):<br>• silently shows the old Time off list (h1 "Time off");<br>• gives no "This request was already decided" message and no "‹ Home";<br>• puts inline **Decline / Approve** buttons for a different request one tap away.<br>A manager tapping a Home or Inbox row that went stale gets a different screen with different rules. | `SP/shots/is-review-stale-request-390.png` | `src/components/manager-time-off.tsx:78-79`: `focused` is undefined, so it falls through to the list. | When `requestId` is set and not found, render the focused frame. Use `PageBand` with the origin's Back, the title "Request no longer waiting", the body "It was decided or withdrawn. See decided time off." and links to `?tab=approved` and `?tab=declined`. | P1 |
| IS-11 | Inbox · both · 390 (also Home) | Row links (`a.nv-row` with `aria-label`) | Different links share one accessible name, because `aria-label` replaces the visible date, time and person:<br>• "View coverage gap: Coverage gap at Main Office": 13 links, 13 targets;<br>• "…at West Office": 6;<br>• "Set weekly hour target: No weekly hour target": 9;<br>• "View availability: Availability not submitted": 4;<br>• "View schedule: Schedule not confirmed": 2;<br>• on Home, "View coverage gap: Coverage gap at Main Office": 2.<br>A screen reader user hears identical links with no date or person. | `SP/aria/MANAGER-inbox.yaml` (lines 36–71) | `src/components/manager-inbox.tsx:45` (`aria-label={label}`) with the label built at `:61`. Home row label in `premium-home.tsx` (Row `label`). | Build the label as `${action}: ${title}, ${detail}` (for example "View coverage gap: Coverage gap at Main Office, Sun Oct 18, 12:00 AM to 7:00 AM"). Or drop `aria-label` and expose the action through `aria-describedby`. | P1 |
| IS-12 | Timecards · both · 390, 320 | Row checkboxes `Select <name>` and `Select all eligible timecards` (11 per page, in the open `details`) | Each target is **18×18 px**, with no label around it. That is under the 44 px house rule and under the 24 px WCAG 2.5.8 minimum. | n/a (measured; `SP/targets-390.txt`) | `src/components/timecards.tsx:187` and `:197`: the input sits inside a `<span className={styles.rowSelect}>` with no `<label>` | Change the span to `<label className={styles.rowSelect}>` sized `display:grid; place-items:center; width:44px; height:44px; margin:-13px` so the visual size doesn't change. | P1 |
| IS-13 | Home, Inbox, Review, shell · both · 390 | Controls with no hover or press response | Computed style unchanged on `:hover` and `:active` for:<br>• Home stat tiles (`a.nv-stat`);<br>• band `Refresh`;<br>• filter pills (pressed and unpressed);<br>• review `‹ Inbox`;<br>• tab bar links;<br>• header Search;<br>• section tabs on the band.<br>`.nv-link` has hover but no `:active`. The group `summary.nv-row` has hover (#F7F9F8) but no `:active`. On touch, the user gets no feedback for a tile, pill or Back. | n/a (`SP/press.txt`, `SP/recheck/press.txt`) | `src/components/kit/kit.css`: `.nv-stat` `:267` (no states), `.nv-band-control` `:153`, `.nv-filter` `:172`, `.nv-masthead__back` `:139`, `.nv-link:hover` `:236` only; `a.nv-row:active` `:201` doesn't cover `summary`. Tab bar in `portal-premium.css:38-50`. | Add these rules:<br>• `a.nv-stat:hover{background:#F7F9F8}`, `a.nv-stat:active{background:var(--nv-inset)}`;<br>• `.nv-band-control:hover:not(:disabled), .nv-masthead__back:hover{background:rgba(255,255,255,.12)}`, with `:active` at `.18`;<br>• `.nv-filter:not([aria-pressed="true"]):hover{background:rgba(255,255,255,.16)}`, with `:active` at `.22`;<br>• `summary.nv-row:active{background:var(--nv-inset)}`;<br>• `.nv-link:active{color:var(--nv-accent-strong)}`;<br>• tab bar `.mobile-nav-link:active::before{opacity:.5;transform:none}`. | P2 |
| IS-14 | Review → Inbox · Manager · 390 | `‹ Inbox` back link and the decision redirect | Opened from Inbox **All**, the in-page Back goes to `/app/inbox?filter=requests`. The user lands on a different filter that shows only "Requests, 1". The decision redirect is also fixed to `filter=requests`. Browser Back correctly restores `?filter=requests` and `?filter=now`. | n/a (`SP/filters.txt`) | `src/components/manager-time-off.tsx:35`; `src/app/app/requests/actions.ts:86` | Carry the filter from the Inbox: `&from=inbox&filter=<all|now|requests|planning>`. Allow-list it, and use it in both the back href and the redirect. | P2 |
| IS-15 | Home · both · 390 | `Also needs you` card | The meta says **"4 items"** but the card shows 3 rows. The hidden fourth is the only time-off request, so Home never shows the one item that needs a decision. | n/a (`SP/states-M-390.txt`, loaded state) | `src/components/premium-home.tsx:187-189` (`others.slice(0, 3)` with a meta of `others.length`) | Change the meta to "3 of 4", or set the foot to "Open Inbox · 1 more". Consider ranking requests ahead of a third coverage gap. | P2 |
| IS-16 | Inbox · both · 390 | Read-failure card | The card reads "The Inbox isn't available right now. Try again." but holds no button. The only retry is the band's `Refresh`, about 300 px above. Home's equivalent card has a `Try again` button. | `SP/shots/is-state-inbox-500-M-390.png` | `src/components/manager-inbox.tsx:147-150` | Add `<button className="nv-btn" data-kind="secondary">Try again</button>` (calling `refresh`) under the status line when `connection` is `unavailable`. | P2 |
| IS-17 | Inbox, Home · Manager · 1440 | Live readers on window `blur` | A window `blur`, such as clicking another app while the tab stays visible, wipes the Inbox to "Paused while this tab is in the background. It updates when you come back." and pauses Home's Needs you. The copy is wrong because the tab is in front. Content comes back on focus. This is a judgment call (it is by design for background tabs), and it matters mostly on desktop. | `SP/shots/is-state-blur-inbox-1440.png` | `src/components/manager-action-center.tsx:115` adds `blur` to the pause events | Pause on `visibilitychange` and `pagehide` only. If blur must pause, keep the last items visible with a "Paused" freshness state instead of clearing them. | P2 |
| IS-18 | Review · both | Review URL from Inbox and Home | Links end in `#request-audit-timeoff`, but the focused review has no element with that id (dead fragment). | n/a (`SP/links.json`) | `src/components/action-center-navigation.ts:16` adds the hash meant for the old list | Skip the hash when the href has a `requestId` that the focused review renders. | P2 |
| IS-19 | All screens · both | Landmarks | The shell header (brand, Search, Notifications) and the tab bar (`nav "Mobile navigation"`) are inside `<main>`. There is no banner landmark, and "main" isn't the page content. | `SP/aria/MANAGER-home.yaml` (lines 1–8) | `src/components/app-shell.tsx:208-239`, `:352` | Close `<main>` around `.page-frame` only. Keep `.mobile-header` as a `<header>` before it and the tab bar `<nav>` after it. | P2 |
| IS-20 | Inbox · both | Section headings | The accessibility tree reads "Act now **,** 6", with a space before the comma, because the absolutely positioned `sr-only` span is treated as a block. The same applies to all four sections. | `SP/aria/MANAGER-inbox.yaml:21` | `src/components/manager-inbox.tsx:98` | Remove the sr-only span and put `aria-label={`${title}, ${count}`}` on the `h2`, keeping the visible count `aria-hidden`. | P2 |
| IS-21 | Inbox · both · 390 | Loading skeleton | The Inbox shows four old `SkeletonRows`: bordered boxes with a left stripe and a shimmer animation, inside a kit card. That is a card in a card, and it doesn't match Home's kit `premium-skeleton` pulse. | `SP/shots/is-state-inbox-loading-M-390.png` | `src/components/manager-inbox.tsx:148` | Use the kit skeleton: rows of `.premium-skeleton__line` at 64 px row height, in `.nv-rows`. | P2 |
| IS-22 | Team (Employees) · both · 390 | Headings | There is no `h2` at all; only the h1 "Employees" and region "Employee directory". Heading navigation skips the whole list. This is old content on a band. | `SP/aria/MANAGER-team.yaml` | `src/components/employee-directory.tsx` (directory section) | Give the directory section a visible or `sr-only` `h2` ("10 employees") and use it as the section's `aria-labelledby`. | P2 |
| IS-23 | More sheet · both · 390 | Close button | The button says "Close actions" on a sheet named "More navigation" that holds pages, not actions. | `SP/shots/is-more-open-OWNER-390.png` | `src/components/action-menu.tsx:164`, `:166` | Use "Close" (visible and accessible), or pass a `closeLabel` prop: "Close menu". | P2 |
| IS-24 | Home → Team tools · both | `Clocker recovery` row | The row opens h1 **"Action recovery review"**, which doesn't match its label. The meta says "Reconnect a shared clock-in device". | n/a (`SP/links.txt`) | `src/components/clocker-recovery-review.tsx:125` versus `premium-home.tsx` ToolsCard | Rename the row or the page so they match, for example h1 "Clocker recovery". | P2 |
| IS-25 | Toast (code review, not triggered) | `Dismiss notification` | The dismiss button is **32×32**, under the 44 px house rule. | n/a | `src/app/app/portal-motion.css:178` | `width:44px; height:44px; margin:-6px -6px -6px 0` | P2 |
| IS-26 | Toast (code review) | Auto-dismiss timer | Pause and resume don't track why the toast paused. Keyboard focus on Dismiss pauses it (`onFocus`). Then any `pointerleave` calls `run()` and restarts the 4.5 s timer while focus is still inside. When the toast closes, focus falls to `<body>`. | n/a | `src/components/toaster.tsx:32-44` | Keep `hovered` and `focused` flags and resume only when both are false. On close, if the toast had focus, move focus to the page `h1` (with `tabIndex=-1`). | P2 |
| IS-27 | Toast (code review) | Message and look | The message is "Time off approved. The employee will be told." It doesn't name the person, which matters after deciding several. The toast is a white card (`portal-motion.css:168-175`), not the kit's brand-ink `.nv-toast` from the token sheet (`kit.css` Toast). This is a judgment call: the white toast is the established app-wide one. | n/a | `src/components/toaster.tsx:18-21`; `portal-motion.css:168` | Carry the name: `?decided=timeoff-approved&who=<first name>` → "Approved Alexandra's time off. She'll be told.", or keep it generic but say it once in the Inbox list. Decide with the UI Designer whether kit pages use `.nv-toast`. | P2 |
| IS-28 | Schedule · both · 390 | Shift links | Two links read "Sun 8 am – 4 pm Main Office Customer Support Published" with different targets. The person is given only by the preceding `h3`. That meets 2.4.4 in context but fails 2.4.9. | `SP/aria/MANAGER-schedule.yaml:69,79` | Roster shift link name (schedule roster component) | Prefix the person's name to the link name: "Morgan Rivera, Sun 8 am – 4 pm, …". | P2 |

## Tab order recorded at 390 (Manager; the Owner differs only where noted)

Every screen starts with the same 3 header stops: `NEVORA Workforce home` → `Search` → `Notifications…`, each with a 2px white ring. Every screen ends with the 5 tab bar stops: Home → Schedule → Inbox → Team → More, each with a 2px teal inset ring, then the dev overlay, then body. There is no skip link; I'm noting it, not filing it, because the landmark issue is IS-19.

- **Home:** 3 header stops, then:
  - (Owner only) `Set weekly hour targets`;
  - `Scheduled today 3`, `Clocked in now 0`, `3 shifts with no clock-in`;
  - Next up `Review in Inbox`;
  - 3 Also needs you rows, then `Open Inbox`;
  - `Open schedule`, `Planning and setup`;
  - the 5 Team tools rows (Attendance, Team overview, Schedule activity, Clocker recovery, Account recovery);
  - then the tab bar.

  That is 25 stops for the Manager and 26 for the Owner.
- **Inbox:** 3 header stops, then:
  - `Refresh`, then All / Act now / Requests / Plan ahead (IS-1, IS-4);
  - the 3 shift rows and 3 coverage gap rows;
  - `Review time off: Alexandra Rivera`;
  - group summaries and single rows in DOM order;
  - then the tab bar.

  That is 29 stops.
- **Review:** 3 header stops, then:
  - `‹ Inbox` (IS-1);
  - `See that week's schedule`;
  - `All pending time-off requests` (IS-2);
  - `Decline`, `Approve`;
  - then the tab bar.

  That is 15 stops.
- **Schedule:** 3 header stops, then:
  - `Add shift`, `Previous week`, `Next week`, `More schedule actions`;
  - `All locations`, `Main Office` (IS-3), `West Office`;
  - `Search team`, `Full week`;
  - the 7 day buttons;
  - 3 shift links, `Show 7 not scheduled`;
  - then the tab bar.

  That is 30 stops.
- **Team:** 3 header stops, then:
  - `Add employee`;
  - search, role select, location select, `Apply filters`;
  - All / Active / Inactive;
  - 10 `View profile for …`;
  - then the tab bar.

  That is 28 stops.
- **Timecards:** 3 header stops, then:
  - section tabs: Timecards, (Owner: Payroll runs), Time exports, (Owner: Payroll settings, IS-3);
  - 2 date inputs, `View period`, `Refresh timecards`;
  - `Review selected timecards`;
  - 10 `Details for …`;
  - then the tab bar.

  That is 27 stops for the Manager and 29 for the Owner.
- **Payroll (Owner):** 3 header stops, then:
  - 4 section tabs;
  - `Refresh`, `Prepare a draft`;
  - `Review period` ×2;
  - the period card, `Source details`, a search input;
  - 10 employee summaries;
  - a file input, `Import format and contents`, a checkbox;
  - then the tab bar.

  That is 34 stops.
- **More sheet:** opens with focus on `Search`. Then:
  - Manager: Timecards, Time exports, Insights, Templates, Scheduling rules, Updates, My pay, Sign out, Close actions;
  - Owner adds Payroll and Settings;
  - then focus leaves the sheet (IS-5).

## Checked and correct

**Keyboard**
- Header icons on the band: 2px white ring, 2px offset (`portal-premium.css:15`).
- Card stops: 2px teal ring, 3px offset.
- Tab bar: 2px teal ring, −2px inset.
- Band section tabs: 2px white.
- No focus trap on any screen, and no stop under the tab bar on any screen except IS-2.
- The More sheet opens from Enter with focus on Search; every item is 326×48.
- Escape closes the sheet and returns focus to `More navigation`, with `:focus-visible` true (both roles, 390).
- Inbox filters are real `<button>`s in `group "Show"`:
  - `aria-pressed` moves on click and on Space;
  - the URL changes to `?filter=now|requests|planning` and back to bare `/app/inbox` for All;
  - `history.length` stays at 4, because it uses `replaceState`.
- Browser Back from the review restores `?filter=requests` with Requests pressed. Back from a timecard restores `?filter=now`.
- Group `details`: Enter opens it (caret `matrix(-1,0,0,-1)`, 180°) and Enter closes it.

**Touch targets**
- Kit targets under 44 px: 0 at 390 and 0 at 320, both roles, all 7 screens, with every `details` opened.
- Overlapping targets: 0. Nested interactive elements: 0.
- Only the old Timecards checkboxes fail (IS-12).

**Pressed and hover**
- `a.nv-row`: hover #F7F9F8, active #EEF1F0. This covers Home rows, Inbox rows and the review schedule row.
- Primary button: hover #055C5A, active `scale(.98)`.
- `.nv-link` and setup links: hover colour #055C5A.
- Non-link fact rows show no hover and `cursor:auto`; correct, since they aren't tappable.

**States**
- Loading:
  - Home band shows "Checking what needs you…".
  - The Today and Needs you cards show "Loading…" with kit skeletons.
  - The Inbox shows "Loading your Inbox…", with Refresh disabled.
  - Both recover within 3 s of release.
- Both reads failing (500):
  - Home shows "Some of today's numbers aren't available." and two Try again buttons.
  - Pressing them recovers fully: "7 things need you today."
- Action-center read failing alone: Try again makes 1 call and recovers.
- Offline Inbox: clears its items and shows no stale counts. Its band loses the "Updated" stamp. It recovers when back online.
- Empty states, using modified fictional responses with consistent counts:
  - Act now: "Nothing to act on now…".
  - Requests: "No requests are waiting…" plus `See decided time off` → `/app/requests?tab=approved`.
  - Planning: "No planning or setup work right now.".
  - Everything empty: Inbox shows "All caught up"; Home Needs you shows "Nothing needs you right now…".
  - No layout breaks, no horizontal overflow.
- Reduced motion: the Home pulse and the Inbox shimmer go from 1.4 s to `none`.

**Navigation**
- I followed every unique link on the 7 screens, the More sheet, the tab bar and the header: 98 for the Manager and 102 for the Owner. All returned 200, with no 404 and no runtime error overlay.
- Hash targets exist (`#timecard-*`, `#target-*`, `#employee-*`, `#schedule-deadline`, `#schedule-employee-*`, `#coverage-issue`, `#target-hours`, `#schedule-planning`), except IS-18.
- The review's Back reads "Home" (`/app`) with `from=home` and "Inbox" without it.
- All Team tools links resolve; IS-9 and IS-24 are about where they land.

**Screen reader semantics** (from the accessibility tree)
- Exactly one visible `h1` per screen.
- Home, Inbox and Review cards are `section`s named by their `h2`, and Next up is a `region "Next up"`.
- One `main` per page.
- The band summary is a single `status` ("7 things need you today."), with no duplicate.
- The decision bar's `status` is empty until submit.
- The toaster is a single polite `ol` named "Notifications".

**Toast** (code path only; not triggered)
- It appears only after a server redirect (`?decided=`), never optimistically.
- The flag is removed with `replaceState`, so a reload doesn't repeat it.
- It lasts 4.5 s and pauses on hover, on focus and while the tab is hidden.
- Under reduced motion it fades without moving.
- On phones it sits at `bottom: calc(88px + safe-area)`, clearing the 68 px tab bar by 20 px.

**Did not reproduce at the 22:30 re-check:** at the first pass (about 22:05), the Owner's More sheet scrolled (`scrollHeight` 839 vs `clientHeight` 748). The sticky `Close actions` button (y 768–816) then covered a focused `Sign out` (y 780–828) at 390 and at 320. At the re-check the sheet no longer scrolls at 390: Sign out is at y 714–758, fully visible. It looks fixed by the concurrent edits. If the sheet grows again, add `scroll-padding-bottom: 64px` to the More popover (`portal-gusto.css:357`).

## Gaps

- I used Chromium only, so there is no WebKit or iOS evidence; this matters for IS-3 and IS-5.
- I didn't trigger the toast, as the rules don't allow it.
- I didn't test `access_lost`, which needs a session change.
- "Landscape 844×390" and large text were outside my scope.

## Count by severity

- **P0:** 0. IS-6 could be argued P0, because a manager can miss shifts with no clock-in while the Inbox says "Updated".
- **P1:** 12 (IS-1 to IS-12).
- **P2:** 16 (IS-13 to IS-28).

## Round 2

Re-inspected October 18, 2026, 22:55–23:30 AST, on the same preview. Chromium (Playwright), 390×844 and 320×568 phone (`isMobile`, `hasTouch`), 844×390 landscape and 1440. Both roles. Read only.

The toast was shown by opening the redirect URL flag (`/app?decided=timeoff-approved`). No decision was made and no data changed.

Round 2 scripts, crops and trees are in `SP/r2/`, with crops under `SP/r2/shots/` and trees under `SP/r2/aria/`. Source references are to `.claude/worktrees/premium-phase-1` as it stood at 23:30.

### Status of round 1 findings

| ID | Status | Measurement now | Cause if open | 
|---|---|---|---|
| IS-1 | Fixed | Refresh, pills, `‹ Inbox`, `Add shift` and `Add employee` all have `2px solid #FFFFFF`, offset 2px, at 390 and 1440 (9.91:1 on the band). `SP/r2/shots/is1-refresh.png`, `is1-refresh-1440.png`, `is1-addshift.png`, `is1-back.png` | |
| IS-2 | Fixed | Tabbing to `All pending time-off requests` puts it at y 624–668; the docked bar is at y 700–776. `SP/r2/shots/is2-allpending.png`, `is2-allpending-320.png` | |
| IS-3 | Partly fixed | **Fixed:** the Inbox pills scroll into view (320: `Plan ahead` at x 213–320, `scrollLeft` 54).<br>**Not fixed:** Owner Timecards `Payroll settings` at 390 stops at `scrollLeft` 106 of 139. The tab is at x 256–379 against a track ending at 374, the 28 px edge fade covers "ngs", and the ring is clipped top, bottom and right. Schedule `Main Office` at 390 doesn't move (`scrollLeft` 4, chip at x 288–508 in a row 16–374). The same happens under reduced motion.<br>**Residue:** at 320 the `Plan ahead` ring's right side is cut at the screen edge because the row stops 16 px short of its end. | `app-shell.tsx:102-104` calls `scrollIntoView({ inline: "nearest" })`. Both rows snap to chip starts: `portal-premium.css:360-361` (`.segmented`, `x mandatory`) and `portal-gusto.css:305`/`:312` (`section-tabs-track`, `x proximity`, `scroll-snap-align: start`). Snapping pulls the end-aligned target back to the previous start point, which is the same mechanism that blocked native focus scrolling in round 1. Fix: in the follower use `inline: "start"` and give the rows `scroll-padding-inline: var(--nv-gutter)`. Or set `scroll-snap-align: end` on the last chip and tab, and `scroll-snap-type: none` while focus is inside. |
| IS-4 | Fixed | The `Act now` ring is complete on all four sides. `SP/r2/shots/is4-filter.png` | |
| IS-5 | Fixed | Tab past `Close` closes the sheet and focus lands on `More navigation`. This holds on Home and Inbox, for both roles. Escape still closes and returns focus to More (`:focus-visible` true). | |
| IS-6 | Fixed | With Today failing:<br>• a "Clock-ins" card says shifts with no clock-in aren't listed;<br>• the band adds "Clock-ins can't be checked right now.";<br>• Refresh makes 1 call to `/api/manager/today` and recovers to "Act now, 6". | |
| IS-7 | Fixed | Needs you no longer waits for Today. The band says "4 things need you today. Clock-ins can't be checked right now.", and the Today card has the only Try again. | |
| IS-8 | Fixed | Offline, the Today card meta shows "◦ Offline" with dashes in place of the numbers, and no skeleton. | |
| IS-9 | Fixed | Attendance, Team overview and Schedule activity each have a band, an h1 matching the row label, `‹ Home` → `/app?week=2026-10-12`, the tab bar on Home, and no overflow at 390 or 320. | |
| IS-10 | Fixed | `requestId=does-not-exist`:<br>• h1 "Already decided" on a band;<br>• Back is "Inbox" by default, "Home" with `from=home`, and `/app/inbox?filter=now` with `filter=now`;<br>• links go to approved and declined (both 200);<br>• no Approve or Decline. | |
| IS-11 | Partly fixed | **Fixed:** the Inbox has 0 duplicate link names, and each name carries its detail ("View coverage gap: Coverage gap at Main Office, Sun Oct 18…").<br>**Not fixed:** Home's Also needs you still has 2 links named "View coverage gap: Coverage gap at Main Office" with different targets. | `premium-home.tsx:206`: `label={`${shown.action}: ${shown.title}`}` has no detail. Use the Inbox label: `${shown.action}: ${shown.title}, ${shown.detail}`. |
| IS-12 | Fixed | 0 targets under 44 px on every screen at 390 and 320, for both roles, including Timecards. | |
| IS-13 | Partly fixed | **Fixed:**<br>• stat tiles (hover #F7F9F8, active #EEF1F0);<br>• band Refresh and `‹` Back (hover `rgba(255,255,255,.1)`, active `.18`);<br>• `.nv-link` (active #07605F);<br>• tab bar (active pill opacity .6).<br>**Not fixed:**<br>• an unpressed pill has hover only, with no change on press under a mouse;<br>• a **pressed** pill drops from white to `rgba(255,255,255,.24)` on press;<br>• `summary.nv-row` has no `:active`;<br>• header Search has no hover or press;<br>• section tabs on the band have no hover or press;<br>• the setup card link has no `:active`. | `portal-premium.css:399` (the hover rule, with two `:not()`, outranks `:active` at `:400`). `:400` also matches `[aria-pressed="true"]`. Fix: `.nv-filter:not([aria-pressed="true"]):not([aria-current="page"]):active { background: rgba(255,255,255,.24) }`, `.nv-filter[aria-pressed="true"]:active { background: #E7F3F2 }`, `summary.nv-row:active { background: var(--nv-inset) }`, band `.section-tab:hover { color: #FFFFFF }`, and header buttons on the band `:hover, :active { background: rgba(255,255,255,.12) }`. |
| IS-14 | Fixed | From All, the review link is `…&filter=all`, Back goes to `/app/inbox` and returns with All pressed. The redirect keeps the filter (`actions.ts:89`). | |
| IS-15 | Fixed | The meta reads "3 of 4" and the foot link reads "See all 4 in Inbox". | |
| IS-16 | Fixed | The failure card has a `Try again` button. A small copy repeat is new finding IS-37. | |
| IS-17 | Not changed (accepted) | The pause is a privacy rule. I agree with it. The wording only partly changed; see IS-33. | |
| IS-18 | Fixed | Review URLs carry no fragment (`/app/requests?tab=pending&requestId=audit-timeoff&filter=requests`). | |
| IS-19 | Fixed | The tree is `banner` → `main` → `navigation "Mobile navigation"`, with the header and tab bar outside main. | |
| IS-20 | Fixed (Inbox) | Headings read "Act now, 6", "Requests, 1" and so on. The same pattern is new on Team; see IS-34. | |
| IS-21 | Fixed | The Inbox loading state uses kit skeleton rows inside one card, with no nested bordered boxes. `SP/r2/shots/is-state-inbox-loading-M-390.png` | |
| IS-22 | Fixed | Team has h2 "Find people" and "Employees". | |
| IS-23 | Fixed | The close button reads "Close" (visible and accessible). | |
| IS-24 | Fixed | The page h1 is now "Clocker recovery". | |
| IS-25 | Fixed | The dismiss button is 44×44. | |
| IS-26 | Fixed | With focus on Dismiss and the pointer moved away, the toast is still shown after 5.5 s. Enter closes it and focus moves to `#main-content` (`tabindex="-1"`). | |
| IS-27 | Look fixed; name not changed (accepted) | The toast is brand ink `rgb(16,52,42)`, white 15 px text, icon #7FD6A8, and sits 12 px above the tab bar at 390 and 320. I agree with not putting a name in the URL. `SP/r2/shots/is-r2-toast-390.png` | |
| IS-28 | Fixed | Shift links are unique: "Edit Alexandra Rivera's shift, Sun Oct 18, 8 am to 4 pm…". | |

### New findings (round 2)

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| IS-29 | Schedule · both · 390, 320 | Location chips (`.segmented`) on load | With `location=loc-2`, which is what Next up "Plan West Office" opens, the selected chip is at x 510–742 in a row spanning 16–374, so **0% of it is visible** (also at 320). The summary below then reads "0 shifts · 0 people assigned · 0 hours assigned". Without the chip, that looks like the whole week is empty. `Main Office` selected is 40% visible. | `SP/r2/shots/is-r2-plan-landing.png` | `src/app/app/schedule/page.tsx:363` (chip row) has no scroll-to-current on mount. `portal-premium.css:360` makes the snap mandatory. | On mount, set the row's `scrollLeft` so `[aria-current="true"]` is fully in view, the way `section-tabs.tsx:16` does. Respect IS-3's snap fix. | P1 |
| IS-30 | Inbox · both · 390, 1440 | Band eyebrow | It says **"Checking…"** whenever the read isn't ready:<br>• 8 s after a 500 failure, next to "The Inbox isn't available right now";<br>• offline, next to "You're offline";<br>• when paused, next to "Paused while NEVORA isn't in front".<br>The eyebrow contradicts the card. | `SP/r2/shots/is-r2-inbox-actions-500.png` | `src/components/manager-inbox.tsx:149`: `eyebrow={updated ? … : "Checking…"}` | Choose by `connection`:<br>• loading and reconnecting: "Checking…";<br>• unavailable: "Not updated";<br>• offline: `<Freshness state="offline">Offline</Freshness>`;<br>• paused: "Paused". | P1 |
| IS-31 | Every band page · both · 390 | Notification bell when its count is unavailable (offline, read failed) | A blank **white block** (12×17 px at x 362, y 12) sits on the teal header next to the bell. Its "—" is white text on a white background. | `SP/r2/shots/is-state-home-offline-M-390.png` | `src/app/app/portal-design-system.css:43` (`.portal-notification-unavailable { background: white }`) combined with `portal-premium.css:12`, which makes the bell's text #FFFFFF on band pages. | On band pages: `.portal-notification-unavailable { background: transparent; color: var(--nv-masthead-ink); }`. Or drop the mark and keep only the bell's aria-label ("current count unavailable"). | P1 |
| IS-32 | Inbox (and review links) · both · 390 | Request row detail and link name | The row says "Time off · **sent Oct 19**" on Sunday October 18. The workspace is America/Puerto_Rico; 23:04 AST is 03:04 UTC on Oct 19. Full timestamps are formatted in UTC. This overlaps the copy inspector's area. | n/a (`SP/r2/partial.txt`, `SP/r2/tab-order-390.txt`: "Review time off: Alexandra Rivera, Time off · sent Oct 19") | `src/lib/action-center/present.ts:24`: `timeZone: 'UTC'` for timestamps as well as date-only strings | Format with the workspace time zone when `iso` has a time. Keep UTC only for 10-character dates. | P1 |
| IS-33 | Home · both · 1440 | Band summary when paused | The band says "Paused while this tab is in the background." while the card below says "Paused while NEVORA isn't in front. It updates when you come back.", so two wordings show for one state. The band sentence is also untrue when the tab is visible. | n/a (`SP/r2-blur.mjs` output) | `src/components/premium-home.tsx:95` | Use "Paused while NEVORA isn't in front." | P2 |
| IS-34 | Team · both · 390 | Status buttons | The accessible names are "All **,** 10", "Active **,** 10" and "Inactive **,** 0", with a space before the comma. This is the same pattern as IS-20. | `SP/r2/aria/MANAGER-team.yaml:33-35` | `src/components/employee-directory.tsx:58` (absolutely positioned sr-only comma) | `aria-label={`${segment.label}, ${segment.count}`}` on the button, with the visible count `aria-hidden`. | P2 |
| IS-35 | Team · both · 390 | `Apply filters` (`[data-apply]`) | Role, location, status and search already apply live. Role = Manager gives "3 of 10 employees" and `?role=MANAGER` before Apply, and pressing Apply changes nothing. The button is still a visible 86×44 tab stop. Judgment call: it is likely a no-JS fallback. | n/a (`SP/r2/team.mjs` output) | `src/components/employee-directory.tsx:62` | Hide it once JS has hydrated (for example `html.js [data-apply] { display: none }`), keeping it for no-JS. | P2 |
| IS-36 | Team · both · 390 | Status counts | With Role = Manager the list shows 3 people, but the buttons still say "All, 10 / Active, 10 / Inactive, 0". The counts ignore the other filters. Judgment call. | n/a (`SP/r2/team.mjs` output) | `src/components/employee-directory.tsx` (segment counts) | Count within the current role, location and search, or label the counts as totals ("10 in total"). | P2 |
| IS-37 | Inbox · both · 390 | Read-failure card | "The Inbox isn't available right now. **Try again.**" sits directly above a `Try again` button, so the instruction repeats. | `SP/r2/shots/is-r2-inbox-actions-500.png` | `src/components/manager-inbox.tsx:21` (`unavailable` and `ready` strings) | "The Inbox isn't available right now." plus the button. | P2 |
| IS-38 | Team → profile · both · 390 | `Back to Employees` | The page it returns to is now titled "Team", and the tab bar says Team. | n/a | `src/app/app/employees/[employeeId]/page.tsx:63`; also `assisted-recovery.tsx:29` | "Back to Team" (use `words.people`). | P2 |
| IS-39 | Schedule · both · 390 | Next up `Plan West Office` → `#schedule-planning` | The link lands with "Build and publish" still **closed** (`open=false`, y 344–398). Focus stays on the Next up link, which is now off screen (`scrollY` 422). The user must find the row and tap again. | `SP/r2/shots/is-r2-plan-landing.png` | Schedule page `#schedule-planning` details (no hash handling) | When the hash is `#schedule-planning`, open the details and move focus to its `summary`. | P2 |
| IS-40 | Home → Attendance · both · 390 | "What we compare" and the three zero stat boxes | "What we compare" is a `<details>` summary drawn as a plain card with no chevron or marker, so nothing says it opens. The "0 to review / 0 people / 0 corrections" boxes have button-like 1 px #D1D5DB borders but aren't interactive (`cursor:auto`, no link). This is old content inside the new band. | `SP/r2/shots/is-r2-view-attendance-AUDIT-M-390.png` | `src/components/configured-attendance-policies.tsx:94`; `src/components/manager-attendance-review.tsx:~110-125` | Add the kit caret (`CaretDownIcon`, rotating on `[open]`) to the summary. Make the stat boxes flat `nv-stat` cells with no border. | P2 |

Accepted and not refiled: the landscape decision bar sits in the page rather than docked (`portal-premium.css:478`, ST-08). It is reachable by scrolling, at y 226–302 with Approve fully visible, and I agree with that choice for a 390 px-tall screen.

### Also checked in round 2 and correct

**Tab order**
- Recorded at 390 for all 13 screen and role pairs (`SP/r2/tab-order-390.txt`).
- Team now runs: header → `Add employee` → search → Role → Location → All / Active / Inactive → `Apply filters` → 10 person rows → tab bar.
- Schedule adds `Plan West Office` after `Add shift`.

**Focus**
- No stop is hidden behind the decision bar or tab bar at 390, 320 or 1440. The only clipped stops are those in IS-3.

**More sheet**
- Home uses the same bottom sheet, opening with focus on Search. Items are 326×44 and `Close` is 326×48.
- Sign out (y 710–754) is clear of `Close` (y 764) for both roles.

**Team**
- Search is labelled `searchbox "Search employees"`. Role and Location are labelled comboboxes, and status uses `aria-pressed`.
- The status line updates ("3 of 10 employees", "0 of 10 employees").
- No matches shows "No matching employees…" with `Clear filters`.

**Schedule**
- The day strip exposes `aria-pressed` on the selected day; at 320 the selected day is in view on load.
- Shift links are unique, and the summary uses a `term` and `definition` list.

**Loading placeholders**
- Home has a band with "Checking what needs you…", Today shows dashes with "Loading…", and Next up and Also needs you show kit skeletons.
- Inbox has a band, disabled pills with All pressed, disabled Refresh and kit rows.
- Under reduced motion there is no animation.

**Links**
- 99 (Manager) and 103 (Owner) unique links followed; all return 200 with no 404.
- All hash targets exist, and `#schedule-planning` exists on Schedule.

**Toast**
- One polite live region. It sits 12 px above the tab bar on phones and at bottom right at 1440 (1036–1416, 920–976).

### Count and open defects

- Round 1: 23 fixed, 3 partly fixed (IS-3, IS-11, IS-13), 2 not changed by decision (IS-17, IS-27, both accepted), 0 regressed.
- Round 2 adds 4 P1 (IS-29 to IS-32) and 8 P2 (IS-33 to IS-40).
- **My area does not have zero open defects:** 15 are open. That is 4 new P1s, 8 new P2s, and the partly fixed P1 IS-3, P1 IS-11 and P2 IS-13.

## Round 3

Re-inspected October 18–19, 2026, 23:40–00:10 AST, on the same preview. Chromium (Playwright), at 390×844 and 320×568 (phone), 430, 844×390 and 1440, for both roles. Read only; nothing that changes data was pressed.

Round 3 scripts, crops and trees are in `SP/r3/`, with crops under `SP/r3/shots/` and trees under `SP/r3/aria/`. The workspace clock passed midnight during the sweep: it became Monday, October 19, with a new week and new fictional coverage gaps. That changed counts, not behaviour.

### Status of round 2 open items

| ID | Status | Measurement now | Cause if open |
|---|---|---|---|
| IS-3 | Partly fixed | **Fixed** (focus-follow, measured 700 ms after Tab):<br>• Owner Timecards `Payroll settings` reaches the end of its row (`scrollLeft` 139 of 139), at x 223–346 in a track that runs 16–374.<br>• Schedule `Main Office` is at x 125–346 (`scrollLeft` 167).<br>• At 320, `West Office` is at x 68–300.<br>• The day strip keeps the selected day in view.<br><br>**Open (P2, 320 Inbox only):** focused `Plan ahead` stops at x 217–320 (`scrollLeft` 38 of 66).<br>• The row's new 28 px edge fade covers the pill's last 28 px.<br>• The ring's right side is cut at the screen edge.<br>• Crop: `SP/r3/shots/is3-filter-320.png` | `portal-premium.css:587` adds the fade and `padding-right: 28px` to the band pill row. The follower in `app-shell.tsx:102-104` scrolls only to "nearest". Fix either way:<br>• when the focused pill is the row's last child, scroll the row to `scrollWidth`;<br>• or add `scroll-padding-inline-end: 28px` to `.nv-masthead .nv-filters`. |
| IS-11 | Fixed | 0 duplicate link names on any screen, either role (`SP/r3/semantics.txt`). Home rows now include their detail. | |
| IS-13 | Partly fixed | **Fixed:**<br>• Unpressed pill: active `.24`.<br>• Pressed pill: active #E3EFEE, no longer drops to translucent.<br>• Group `summary`: active #EEF1F0.<br>• Section tab on the band: hover turns the text white, active `rgba(255,255,255,.1)`.<br><br>**Open (P2):**<br>• Header `Search` and the bell still show no hover or pressed change.<br>• The Owner setup card link has hover but no `:active`. | `portal-premium.css:12` sets `background: transparent` on header buttons and links but gives them no state rules. `portal-premium.css:131` covers only `:hover`. Fix:<br>• `.mobile-header :is(button,a):is(:hover,:active)` with `background: rgba(255,255,255,.12)` (`.18` on `:active`);<br>• `.owner-setup-link:active { color: var(--nv-accent-strong) }`. |
| IS-29 | Fixed | On load with `location=loc-2`, the West Office chip is fully visible: x 137–370 at 390, x 67–300 at 320. `location=loc-1`: x 67–290. | |
| IS-30 | Fixed | The Inbox eyebrow now reads:<br>• "Checking…" while loading;<br>• "Not available" after a 500;<br>• "Offline" when offline;<br>• "Paused" when paused. | |
| IS-31 | Fixed | The unavailable mark is now "—" in #CFE3E1 on a transparent background next to the bell. The bell's label reads "Notifications, current count unavailable". Crop: `SP/r3/shots/is-r3-bell-offline.png` | |
| IS-32 | Fixed | The request row reads "Time off · sent Oct 18" in Puerto Rico time. | |
| IS-33 | Fixed | The Home band now says "Paused while NEVORA isn't in front.", matching the card. | |
| IS-34 | Fixed | Team status buttons are named "All, 10", "Active, 10" and "Inactive, 0", with no stray space. | |
| IS-35 | Partly fixed | `Apply filters` is now hidden until focused (`sr-only-focusable`, 1×44 at rest). It is still a no-op tab stop, the first one in the form, because filters apply live. When focused it appears as a 318×44 row and pushes the search field down: the input top moves from y ≈ 288 to y ≈ 322. Crop: `SP/r3/shots/is35-apply-focus.png` | `employee-directory.tsx:62` with `portal-premium.css:716`. Remove it from the tab order once hydrated (`tabIndex={hydrated ? -1 : 0}`, or render it only in `<noscript>`). Or move it after the status buttons and make it visually hidden without reflow. Judgment call: P2. |
| IS-36 | Fixed | Status counts follow the other filters: Role = Manager gives "All 3 / Active 3 / Inactive 0"; adding search "Morgan" gives "All 1". | |
| IS-37 | Fixed | The failure card reads "The Inbox isn't available right now." plus the `Try again` button. | |
| IS-38 | Fixed | The profile Back reads "Back to Team" and points to `/app/employees`. | |
| IS-39 | Partly fixed | `Plan West Office` now carries `&plan=1`, and "Build and publish" opens: `open=true`, y 346–740.<br>On a direct load, focus moves to the `details`.<br>**Open (P2):** after tapping the link inside the app (client navigation), focus stays on the Next up link, which has scrolled under the sticky header (y −22 to 30, `:focus-visible` false), so the next Tab starts from above the target. | `schedule/page.tsx:282` and `:392`: the focus-on-arrival logic runs only on a full load. Fix: in an effect keyed on `plan` and `publishCheck`, call `document.getElementById('schedule-planning')?.focus({ preventScroll: true })` after the client navigation. |
| IS-40 | Fixed | "What we compare" shows a teal link-style label with a caret. The three counts are flat text with no 1 px border. Crop: `SP/r3/shots/is-r3-attendance-390.png` | |

### New findings (round 3)

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| IS-41 | Inbox · both · 320 | `All` filter pill | The pill is **42.69 × 44 px**, under the 44 px minimum. This came with the round 3 tighter padding at ≤360 px. | n/a (`SP/r3/targets-320.txt`) | `portal-premium.css:588` (`padding: 0 12px` at ≤360 px) | `.nv-filter { min-width: 44px; justify-content: center; }` | P2 |
| IS-42 | Inbox · both · 390 | Band pill row at rest | The new `padding-right: 28px` makes the row overflow when it shouldn't: `scrollWidth` 402 against `clientWidth` 390. So the edge fade (starting at x 362) sits over the last 12 px of `Plan ahead` (x 267–374) even though every pill fits. | `SP/r3/shots/is-r3-pills-390.png` | `portal-premium.css:587` | Apply the fade and padding only when the row overflows. Use the `data-more-end` attribute the section tabs already use (`section-tabs.tsx:18-21`) and the same rule. | P2 |
| IS-43 | Home → Attendance · both · 390 | Freshness stamp in the attendance footer | The green "live" dot wraps onto its own line above "Updated 11:55 PM" instead of sitting beside it: the dot is on one row, the text on the next. The stamp reads as two unrelated items. | `SP/r3/shots/is-r3-attendance-390.png` | `portal-premium.css:750-751`: the dot is a `::before` flex item in an `inline-flex; flex-wrap: wrap` line, and the long "Updates every 30s while this page is active." wraps first | Put the dot and "Updated <time>" in their own non-wrapping span (`white-space: nowrap`), with the cadence sentence on its own line below. Or use the kit `<Freshness>` component. | P2 |
| IS-44 | Time exports · both · 390, 320 | Inline `Timecards` link in "…finalize the period in Timecards." | The target is **84×20 px**, under the 44 px house rule for links in text. WCAG 2.5.8 exempts inline links, but the brief doesn't. Everything else on the new Time exports band passes:<br>• band, section tabs with white rings;<br>• Period start and end labelled;<br>• tab bar shows More selected;<br>• no other target under 44 px. | n/a (`SP/r3/targets-390.txt`) | Time exports empty-state sentence (export page component) | Add `padding-block: 12px; margin-block: -12px; display: inline-block` to the inline link, or a standalone `nv-link` "Open Timecards" under the sentence. | P2 |

### Round 3 sweep: checked and correct

**Keyboard**
- Tab order recorded on all 15 screen and role pairs at 390 and 320, including Time exports: 21 stops for the Manager, 23 for the Owner (`SP/r3/tab-order-390.txt`).
- Band stops have white rings everywhere. No stop sits under the tab bar or the decision bar.
- The only "covered" flags were Schedule chips caught mid smooth-scroll at 60 ms. At 700 ms they are fully in view (IS-3 table above).

**More sheet**
- Tabbing out closes it, and Escape returns focus to More with `:focus-visible`. Both hold on Home and Inbox, for both roles.

**States**
- With Today failing:
  - Home says "20 things need you today. Clock-ins can't be checked right now.";
  - the Inbox shows the clock-in notice;
  - Refresh retries Today (+1 call) and recovers.
- With the action center failing, the Home Try again and the Inbox Refresh each make 1 call and recover.
- Loading, offline and paused wording match between the band and the cards.

**Touch targets**
- None under 44 px at 390 or 320, apart from IS-41 and IS-44, and the `Apply filters` button while hidden (IS-35).

**Semantics**
- One h1 on every screen, including Time exports.
- 0 duplicate link names.
- Header and tab bar sit outside `main`.

### Verdict

**Not zero.** 11 of the 15 round 2 items are fixed. 4 are partly fixed (IS-3, IS-13, IS-35, IS-39) and 4 new ones were found (IS-41 to IS-44). All 8 open items are P2, with no P0 or P1 open.

## Round 4

Re-inspected October 19, 2026, 00:10–00:25 AST, on the same preview, with both roles. Phone widths were 390×844 and 320×568 (`isMobile`, `hasTouch`). Read only: nothing that changes data was pressed, and "Build week" was focused but never activated.

Evidence is in `SP/r4/`, with crops under `SP/r4/shots/` and accessibility trees under `SP/r4/aria/`.

### Status of round 3 open items

| ID | Status | Measurement now | Cause if open |
|---|---|---|---|
| IS-3 | Fixed | Every row now scrolls a focused item fully into view:<br>• Inbox at 320: focused `Plan ahead` is at x 185–292 with `scrollLeft` 82 of 82. The edge fade starts at x 292, so the pill and its ring are clear (`SP/r4/shots/is3-filter-320.png`).<br>• Owner Timecards: `Payroll settings` reaches the end of its row at 390 (x 251–374) and at 320 (x 181–304), with only the start fade showing.<br>• Schedule: `Main Office` (390) and `West Office` (320) are fully in view 700 ms after Tab. | |
| IS-13 | Fixed | Header `Search`: hover `rgba(255,255,255,.1)`, active `.18`. Owner setup card link: active #07605F.<br>Only two hover cases still show no change, and neither needs one: tab bar links (no hover on touch; they have a press state) and the already-pressed pill. | |
| IS-35 | Fixed | Team `Apply filters` now has `tabindex="-1"` and sits inside `aria-hidden`. Team tab order at 390 is 27 stops (it was 28), and the search field is the first stop in the form, with no layout jump. | |
| IS-39 | Fixed | After an in-app tap on Next up `Plan West Office` (390 and 320):<br>• Build and publish is `open`;<br>• focus sits on its `summary` (y 348–402 at 390, y 325–379 at 320);<br>• the next Tab goes to `Build week`, inside the panel.<br>No ring shows, which is correct after a pointer tap (`:focus-visible` false). | |
| IS-41 | Fixed | At 320 the `All` pill is 46.69×44 (`min-width` 44px). | |
| IS-42 | Fixed | No fade at 390 or 430: `mask: none`, and the row fits (`scrollWidth` 390, `clientWidth` 390). At 320, where the row overflows (402 vs 320), the fade still appears. | |
| IS-43 | **Not fixed** | Attendance footer at 390: the green dot still sits on its own line. The footer's first child starts at y 561, while "Updated 12:15 AM" (the `time`) starts at y 581. Crop: `SP/r4/shots/is-r4-attendance-390.png` | The round 4 rule `portal-premium.css:784-785` makes the wrapper `div` a block, with the dot as `::before { display: inline-block }`. But the text is inside a `<small>` that `globals.css:13136` sets to `display: flex` (a block-level box), so it always starts a new line after the dot. Fix: `.premium-home-view .attendance-review-footer small { display: inline; }` with the cadence `span { display: block }`. Or move the `::before` onto the `small` and give it `align-items: center; flex-wrap: nowrap` for the first row. |
| IS-44 | Fixed | The inline `Timecards` link on Time exports is now 84×50, its hit area extended by padding. | |

### Round 4 sweep: checked and correct

**Keyboard**
- Tab order recorded on all 15 screen and role pairs at 390 and 320 (`SP/r4/tab-order-390.txt`, `-320.txt`).
- Every band stop has a white 2px ring, and every card stop a teal one.
- No stop is hidden under the tab bar or the decision bar. The one "covered" flag at 320 was the Schedule chip mid smooth-scroll; it is in view 700 ms after Tab.
- The More sheet closes when Tab leaves it, and Escape returns focus to More with `:focus-visible`, for both roles.

**Touch targets**
- None under 44 px at 390 or 320, either role. The only small item is the Team `Apply filters` button, which is now out of the tab order and hidden from assistive technology.

**States**
- With Today failing:
  - Home says "20 things need you today. Clock-ins can't be checked right now.";
  - the Inbox shows the clock-in notice;
  - Refresh makes 1 call to the failing reader and recovers.
- With the action center failing, the Home Try again and the Inbox Refresh each make 1 call and recover. The Inbox eyebrow reads "Not available".

**Semantics**
- Exactly one `main` and one h1 on every screen.
- 0 duplicate link names across all 15 screen and role pairs.

**Press feedback**
- Every control that needs a hover or pressed change has one; the two exceptions are noted under IS-13.

### Verdict

**Not zero.** 7 of the 8 round 3 items are fixed. One P2 is still open: **IS-43**, the Attendance freshness dot that sits on its own line (`portal-premium.css:784-785` against `globals.css:13136`). No new defects were found in round 4.

## Round 5

Re-inspected October 19, 2026, 00:30–00:45 AST, on the same preview. Both roles, at 390×844 and 320×568 (`isMobile`, `hasTouch`). Read only: nothing that changes data was pressed.

Evidence is in `SP/r5/`, with crops under `SP/r5/shots/` and accessibility trees under `SP/r5/aria/`.

### Status of round 4 open items

| ID | Status | Measurement now |
|---|---|---|
| IS-43 | Fixed | The Attendance footer has exactly one dot: the `small::before`, 6 px, `rgb(46,138,91)`. It sits on the "Updated" line.<br>At 390, the dot is at x 40; "Updated" is on y 561; the `time` is at x 117, y 561; the 30s note is on the next line (y 581, x 40).<br>At 320, the "Updated" line is at y 583 and the note at y 603.<br>Crop: `SP/r5/shots/is-r5-attendance-390.png` |

### Round 5 sweep: checked and correct

**Keyboard**
- Tab order recorded on all 15 screen and role pairs at 390 and 320 (`SP/r5/tab-order-390.txt`, `-320.txt`). Stop counts are unchanged from round 4.
- Every band stop has a 2px white ring and every card stop a teal one.
- No focus stop is hidden under the tab bar or the decision bar. The one "covered" flag (Schedule `West Office` at 320) is a chip still mid smooth-scroll at 60 ms; it is fully in view at 700 ms (x 68–300).

**Focus-follow in scrolling rows**
- Owner Timecards `Payroll settings` reaches the end of its row at 390 (x 251–374) and 320 (x 181–304).
- Schedule `Main Office` at 390 is at x 125–346.
- Inbox `Plan ahead` at 320 is at x 185–292, at the end of its row.

**More sheet**
- Tabbing out closes the sheet, and Escape returns focus to More with `:focus-visible`, for both roles.

**Touch targets**
- None under 44 px at 390 or 320. The Team `Apply filters` button is 1×44, but it has `tabindex="-1"` and sits inside `aria-hidden`.

**States**
- Loading: "Checking…" on the band.
- 500:
  - Home band: "Some of today's numbers aren't available.";
  - Inbox eyebrow: "Not available";
  - retry recovers.
- Offline: "You're offline…" on Home and "Offline" on the Inbox; both recover when back online.
- One reader failing at a time: each retry makes 1 call to the failing reader and recovers.

**Semantics**
- One `main` and one h1 on all 15 screen and role pairs.
- 0 duplicate link names.

**Press feedback**
- Unchanged from round 4. Only tab bar links (touch; they have a press state) and the already-pressed pill have no hover change.

**Cross-area note, not filed here:** the Attendance footer's text starts at x 40, while the card text above starts at x 36. That 4 px is for the alignment inspector.

### Verdict

**Zero open defects in interaction and states:** IS-43 is fixed, and the round 5 sweep found nothing new. As in every round, these are Chromium-only results, with no WebKit, iOS or VoiceOver evidence.

## Round 6

This was a short regression check on what changed since round 5. October 19, 2026, 01:00–01:30 AST, same preview, both roles, 390×844 and 320×568 (`isMobile`, `hasTouch`). Read only:
- On Payroll, "Prepare a draft" was used only to open the panel; its submit, "Prepare draft", was never pressed.
- Dates were typed into fields without Enter or submit.

Evidence is in `SP/r6/`, with crops under `SP/r6/shots/`.

### Status of the changes

| Change | Status | Measurement |
|---|---|---|
| Bell "—" hidden (Manager, Owner) | Correct | Online, the name is "Notifications, 0 unread in your recent inbox". Offline, it is "Notifications, current count unavailable". The mark has `display:none`. The bell is 44×44, stays the 3rd Tab stop, and shows a 2px white ring at 2px offset with `:focus-visible` in both states, for both roles. |
| Client `RootLoading` placeholder (`src/app/app/root-loading.tsx`) | Correct, with one P2 (IS-45) | I made all 12 tab-to-tab changes per role with the keyboard (24 in total), plus three More destinations (Timecards, Payroll, Time exports). Every one:<br>• showed the destination's placeholder with the matching status text ("Loading schedule…", "Loading inbox…", "Loading your workspace…", "Loading timecards…", "Loading payroll…", "Loading time exports…");<br>• kept focus on the tapped tab, with `aria-current="page"` and `:focus-visible`;<br>• from the More sheet, closed the sheet and returned focus to `More navigation`;<br>• settled in 407–3,911 ms with no stuck placeholder.<br>Team's placeholder says "Loading employees…"; see IS-45. |
| Attendance footer while loading, and Refresh, retry and offline | Correct | The footer is 105 px tall in every state. The text starts at x 36.<br>• **Loading:** "Updated –" plus the 30s note, grey dot, Refresh reads "Refreshing…" (disabled).<br>• **500:** grey dot, "Attendance review unavailable", Refresh enabled; pressing it made 1 call and recovered with a green dot and "Updated 1:06 AM".<br>• **Offline:** grey dot, Refresh disabled, "Attendance updates paused"; back online it recovers. |
| Fields 48 px, 17 px text | Correct, except the Schedule search (IS-46) | Team (search, Role, Location), Timecards (2 dates and the action select), Time exports (both dates and all single-line fields) and Payroll (search, plus the draft panel's Period start, Period end and Payday) are all exactly 48.0 px with 17 px text, at 390 and 320. Textareas are taller by design.<br>Date pickers on Time exports and Payroll:<br>• focus shows a 2px teal ring at 2px offset;<br>• typing `10052026` sets `2026-10-05` and nothing submits.<br>Touch targets: none under 44 px at 390 or 320, either role. |
| Day strip trailing spacer | Correct | Tab order is Full week → Mon … Sun → the first shift. The spacer is an `aria-hidden` span (0 px at 390, 32 px at 320) with `tabindex -1` and nothing focusable inside, so it never takes focus.<br>Each focused day scrolls into the strip: at 320, Thu goes to x 134–178 inside 36–284.<br>Choosing a day with Enter keeps it selected and in view: at 390, Sun at x 300–344 with `scrollLeft` 132 of 134; at 320, Sun at x 196–240 with `scrollLeft` 236 of 236. Focus stays on the day. |
| Attendance footer at x 36 (cross-area note) | Fixed | The footer text starts at x 36, the same as the card text, at 390 and 320. |

### New findings (round 6)

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| IS-45 | Team tab change · both · 390 | Placeholder status text | The placeholder is announced as "Loading employees…", but the tab and the h1 are both "Team". | n/a (`SP/r6/tabs-nodelay.txt`) | `src/app/app/root-loading.tsx:11`: `label: "employees"` (and the matching Team `loading.tsx`) | Change the label to "team", or use the workspace's `words.people`, so it matches the tab. | P2 |
| IS-46 | Schedule · both · 390, 320 | `Search team` field (`.mws-search`) when focused | Two focus rings show at once:<br>• the wrapper's rounded 2px ring (`:focus-within`);<br>• a second, **square** 2px teal ring around the inner input, which crosses the field.<br>The inner input is 46 px inside the 48 px wrapper. The other fields (Team search, the date fields) show one ring. | `SP/r6/shots/is-r6-schedsearch-focus-390.png` | `portal-design-system.css:53` (the global `:is(input,…):focus-visible { outline: 2px solid }`) outranks `schedule/manager-schedule.css:46` (`.mws-search input { outline: 0 }`). `portal-premium.css:837` resets border and background but not the outline. | Add `outline: none` to the `portal-premium.css:837` rule for `.mws-search input`, or add `:focus-visible { outline: none }`, and keep the wrapper's `:focus-within` ring. | P2 |

### Verdict

**Not zero.** Every regression check passed, but two new P2s are open: IS-45 (the "Loading employees…" label) and IS-46 (the double focus ring on Schedule search).

## Round 7

Re-checked October 19, 2026, 01:30–02:00 AST, on the same preview: both roles, at 390×844 and 320×568, plus 150% root text. Read only. Evidence is in `SP/r7/`, with crops under `SP/r7/shots/`.

**How the error screen was reached:** I made the portal shell throw once, only in my own browser. A Playwright init script made the shell's first `matches(':popover-open')` check on `#manager-more-navigation` throw. No request was changed and no data was touched. Corrupting or aborting the RSC response during a tab change did *not* reach it; Next falls back to a full page load.

### Status

| Item | Status | Measurement |
|---|---|---|
| IS-45 | Fixed | All 6 changes into Team (from Home, Schedule and Inbox, for both roles) show the team placeholder with "Loading team…". `employees/loading.tsx` uses `label="team"`. Focus stays on the tapped tab in all 24 tab changes, with `aria-current="page"` and `:focus-visible`. |
| IS-46 | Fixed | Schedule `Search team` shows one ring while typing: the field's rounded 2px teal ring at 2px offset. The inner input's `outline-style` is `none`. The field is 48 px at 390 and 320. Crop: `SP/r7/shots/is-r7-schedsearch-focus-390.png` |
| WR-57 error screen (`app-error-screen.tsx` via `src/app/error.tsx`) | Correct | One `main`, one h1 "This page could not be loaded", and the card has `role="alert"`. There's no shell, no horizontal overflow, and no stray focus on load (focus starts on `body`).<br>Keyboard: Tab goes Try again → Back to home, each with a 2px teal ring at 2px offset and `:focus-visible`. In this dev build the Next dev overlay takes the first 3 Tab stops; it won't exist in production.<br>Targets:<br>• 390: Try again 103×44 and Back to home 138×44, side by side;<br>• 320: both 248×44, stacked;<br>• 150% text: 135×44 and 186×44, stacked, with the text fitting.<br>Back to home is a plain `href="/app"`. Pressing Try again with Enter reset the boundary and recovered Home ("Good morning, Morgan").<br>Not tested: `global-error.tsx` (a root layout failure); I could not trigger it without changing server code. Crops: `SP/r7/shots/is-r7-error-390.png`, `-320.png`, `-390-150.png`, `is-r7-error-focus-390.png` |
| Attendance footer text and dot by state | Correct, with one P2 (IS-47) | The footer stays 105 px tall in every state, with text at x 36.<br>• **Loading:** "Checking…", grey dot (#858B8F), Refresh shows "Refreshing…" and is disabled.<br>• **Ready:** "Updated 1:35 AM", green dot.<br>• **500:** "Couldn't update. Try Refresh.", coral ring dot; Refresh made 1 call and recovered.<br>• **403:** "No access. Sign in again to continue.", coral ring; the `Sign In` link is 318×44.<br>• **Paused (tab hidden):** "Paused. Return to this page to update.", coral ring, Refresh disabled.<br>• **Offline:** the same wording as paused; see IS-47. Back online it recovers to the green dot. |
| Day strip at 100% and 150% text | Correct, with one P2 (IS-48) | Day buttons are 44×64 at 100% and 66×86 at 150%.<br>Tab order is Full week → Mon … Sun → the first shift. Every focused day is fully inside the strip, with a solid ring, at 390 (100% and 150%) and at 320 (150%). Choosing Sun with Enter keeps it in view: at 150% and 390 it is at x 262–328 inside 36–354 (`scrollLeft` 302 of 302); at 150% and 320 it is at x 188–254. There is no page overflow. |
| Touch targets | Correct | None under 44 px at 390 or 320, either role. (Team `Apply filters` is out of the tab order and hidden from assistive technology.) |

### New findings (round 7)

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| IS-47 | Home → Attendance · Manager · 390 | Footer text when **offline** | It says "Paused. Return to this page to update." while the manager is on the page and offline, so the advice is wrong. The card above it correctly says "Reconnect and return…". | `SP/r7/shots/is-r7-att-offline.png` | `src/components/manager-attendance-review.tsx:205-209`: offline and hidden both map to `paused` | When `!navigator.onLine`, say "Offline. Updates when you reconnect." Keep "Paused. Return to this page to update." for a hidden tab. | P2 |
| IS-48 | Schedule · both · 390 at 150% text | `Full week` button in the day strip | The day buttons scale (44 to 66 px), but `Full week` stays 72 px. At 150% its label wraps to "Full / week", and "week" overflows its box (`scrollWidth` 75 against `clientWidth` 70). | `SP/r7/shots/is-r7-strip-fullweek-150.png` | `src/app/mobile-workforce.css:129`: `flex-basis: 72px; min-width: 72px` | Use `flex: 0 0 auto; min-width: 4.5rem;` so it scales with the text the way the days do. | P2 |

### Verdict

**Not zero.** IS-45 and IS-46 are fixed, and the error screen passes keyboard, focus and 44 px checks. Two new P2s are open: IS-47 (the offline footer wording) and IS-48 (`Full week` at 150% text). `global-error.tsx` could not be triggered without changing code.

## Round 8

Re-checked October 19, 2026, 02:00–02:20 AST, on the same preview. Both roles; 390×844 and 320×568; root text at 100%, 125% and 150%. Read only.

The error screen was reached the same way as in round 7: a one-time throw in my own browser, with no request or data changed. Evidence is in `SP/r8/`, with crops under `SP/r8/shots/`.

### Status

| Item | Status | Measurement |
|---|---|---|
| IS-47 | Fixed | The footer and main block now match the state. The footer stays 105 px tall with text at x 36 in every state.<br>• **Offline:** footer "Offline. Updates when you reconnect." with a coral ring dot and Refresh disabled; main block "You're offline / Updates when you reconnect."<br>• **Tab hidden:** footer "Paused. Updates when you're back."; main block "Attendance paused / Updates when you're back."<br>• **500:** footer "Couldn't update. Try Refresh."; main block "Attendance unavailable / The latest records didn't load."; Refresh makes 1 call and recovers to "Updated 2:00 AM" with a green dot.<br>• **403:** "No access. Sign in again." with a 318×44 `Sign In`.<br>• **Loading:** "Checking…" with a grey dot. |
| IS-48 | Fixed | `Full week` is 72×64 at 100%, 90×74 at 125% and 108×86 at 150% (390 and 320). Its two lines sit inside the button: at 150% the text spans x +26 to +82 inside a 108 px box.<br>The 5 px `scrollWidth` excess is the strip divider (`::after`, `right: -4.5px`), not text.<br>The strip starts at x 40. Tab order is Full week → Mon … Sun → the first shift, with every day fully inside the strip at every size. Crop: `SP/r8/shots/is-r8-strip-390-150.png` |
| Error screen, rebuilt with the kit | Correct for keyboard, focus and targets; one P2 (IS-49) | The screen has the band with the wordmark (`img "NEVORA"`), one h1, one `main`, no shell and no overflow.<br>Tab goes Try again → Back to home, each with a 2px teal ring at 2px offset and `:focus-visible`.<br>Buttons are 52 px tall:<br>• 390: 116×52 and 150×52;<br>• 320: 248×52, stacked;<br>• 150%: 149×52 and 201×52.<br>`Try again` (Enter) recovers Home. Back to home is `href="/app"`. Crops: `SP/r8/shots/is-r8-error-390.png`, `is-r8-error-focus-390.png` |
| Today placeholder head | Correct | The Today card head stays 50 px tall and the card 212 px from loading to loaded. The meta is 142 px wide while loading ("Loading…") and 139 px when loaded ("Updated 2:05 AM"); right-aligned, so the text start moves 3 px. |
| Sweep | Correct | None under 44 px at 390 or 320. Tab order on all 15 screen and role pairs at 390: white rings on the band, no hidden stops. The `Search team` input shows no outline of its own; that is IS-46's single ring on the field. The More sheet closes when Tab leaves it, and Escape returns focus to More. |

### New finding (round 8)

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| IS-49 | Error screen · both · 390 | `role="alert"` region | After the rebuild, the alert holds only "Try loading the page again before taking an action." and the two controls. The message itself is outside the alert: h1 "This page could not be loaded" and "Your current information is unavailable." sit in the band. The alert's `aria-label` repeats the h1, but screen readers don't reliably announce a live region's label, so the announcement may lead with the instruction and the button names. This is a regression from round 7, where the h1 and message were inside the alert. Judgment call: not tested with VoiceOver; the evidence is the accessibility tree in `SP/r8/err-tree.mjs`. | `SP/r8/shots/is-r8-error-390.png` | `src/components/app-error-screen.tsx`: `role="alert"` is on the card; the h1 and summary are in `Masthead` | Make the alert static text only: put `<p role="alert" className="nv-sr">This page could not be loaded. Your current information is unavailable.</p>` (or `aria-describedby` on the band summary) and drop `role` and `aria-label` from the card, keeping the controls outside the live region. | P2 |

### Verdict

**Not zero.** IS-47 and IS-48 are fixed and the sweep is clean. One new P2 is open: IS-49, the error screen's alert, which no longer contains the message.

## Round 9

Re-checked October 19, 2026, 02:25–02:45 AST, on the same preview. Both roles; 390×844 and 320×568; root text at 100% and 150%. Read only. Evidence is in `SP/r9/`, with crops under `SP/r9/shots/`.

**How the errors were triggered.** Both used one-time faults in my own browser only, with no request or data changed:
- **Root screen:** the shell's first `:popover-open` check throws.
- **In-portal boundary:** an Inbox filter tap re-renders the Inbox, and the Inbox's `en-CA` date formatter throws on its next 3 calls. One throw isn't enough, because React retries a failed render once.

### Status

| Item | Status | Measurement |
|---|---|---|
| IS-49, root error screen | Fixed | The accessibility tree has exactly one message alert, a visually hidden `p.nv-sr`: "This page could not be loaded. Your current information is unavailable. Try loading the page again before taking an action." It contains no controls. The only other `alert` in the tree is Next's empty route announcer, present on every page.<br>Tab goes Try again → Back to home, each with a 2px teal ring. Buttons are 116×52 and 150×52 at 390, and 248×52 stacked at 320 (Owner). Text starts at x 36. Enter on Try again recovers Home. |
| `app/app/error.tsx`, in-portal kit error page | Correct | Checked for both roles at 390, 320 and 150% text:<br>• the header and tab bar stay, with Inbox still marked selected, and the band starts at y 68 under the header;<br>• one visible h1 "This page could not be loaded";<br>• text starts at x 36 and there is no overflow.<br>**Exactly one message alert in the accessibility tree.** The employee-shell `section.portal-route-state` (also `role="alert"`) is in the DOM but `display:none`, so it is not exposed.<br>Buttons:<br>• 390: Try again 116×52, Back to home 150×52 (`href="/app"`);<br>• 320: both 248×52, stacked;<br>• 150%: 149×52 and 201×52, stacked.<br>Tab goes Try again → Back to home → tab bar Home, with 2px teal rings. Enter on Try again resets the boundary and the Inbox comes back. Crop: `SP/r9/shots/is-r9-page-AUDIT-M-390.png` |
| Home dashboard-read failure (`app/app/page.tsx:63-72`) | Code reviewed only, **not triggered** | The failure is a server read (`loadManagerDashboardData(...).catch(() => null)`), and I can't make it fail from the browser without changing server code. In code it is the same kit page (PageBand, card, 52 px `nv-btn`). "Try again" is a link to the current view, and "Back to home" appears only off the Home overview. One P2 from the code: IS-50. |
| Attendance footer: state word only | Correct | Offline "Offline.", paused "Paused." and no access "No access." each show a coral ring dot and keep the footer at 105 px with text at x 36. Loading shows "Checking… / Updates every 30s." with a grey dot. A 500 shows "Couldn't update. Try Refresh."; Refresh makes 1 call and recovers. Back online, the footer reads "Updated 2:38 AM" within 1 s. |
| Touch targets | Correct | None under 44 px at 390 or 320, for either role. |

### New finding (round 9, code review)

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| IS-50 | Home views, read failure · both | `Try again` link | The retry href keeps only `view`: `/app?view=${view}` or `/app`. It drops `week` and any `day`, `location` or `employee` in the URL. So a manager who hits the failure on another week (for example `/app?week=2026-10-12&view=team`) is returned to the current week by Try again. Judgment call, from code only: I couldn't trigger the server failure. | n/a | `src/app/app/page.tsx:69` | Build the href from the current search params, e.g. `` `/app?${new URLSearchParams(Object.entries(params).filter(([, v]) => v))}` ``, so Try again reloads exactly the view that failed. | P2 |

### Verdict

**Not zero.** IS-49 is fixed, both error boundaries pass the live keyboard, focus, live-region and 44 px checks, and the Attendance footer is correct. One P2 is open: IS-50, Home's read-failure Try again dropping the week. That finding is from code review; the Home read failure itself could not be triggered live.

## Round 10

Re-checked October 19, 2026, 02:50–03:10 AST, on the same preview. Both roles; 390, 320, 768, 1024 and 1440; root text at 100% and 150%. Read only. The error boundaries were triggered with the same one-time, browser-only faults as in round 9. Evidence is in `SP/r10/`, with crops under `SP/r10/shots/`.

### Status

| Item | Status | Measurement |
|---|---|---|
| IS-50 | Fixed (code check; the path is server-only) | `src/app/app/page.tsx:64,70`: `retry` is built from every non-empty string search param, and Try again goes to `/app?${retry}`, or `/app` when there are none. So `/app?week=2026-10-12&view=team` retries to the same week and view. One side effect is IS-51 below. |
| Button spacing (error pages, Timecards, Time exports, Schedule) | Correct | Adjacent buttons are 12 px apart at 390, 320 and 1440:<br>• Timecards: View period and Refresh timecards;<br>• Time exports: View finalized time and Refresh export data, and Select finalized and Clear;<br>• Schedule: Build week and Fill gaps only;<br>• both error pages: Try again and Back to home, side by side at 390 and 1440, stacked at 320.<br>With 2px rings at 2px offset, adjacent rings stay 4 px apart. Payroll's toolbar (Refresh and Prepare a draft) is still 10 px apart; it wasn't in the change list. That's a spacing note for the alignment inspector, not a defect here. |
| Error card sentence 17 px | Correct | 17 px on phones at 390 and 320, on both the root and in-portal error pages. At 1440 it is 16 px, the kit's desktop body size. One message alert, keyboard Try again → Back to home with 2px teal rings, and recovery on Enter all still hold. |
| Desktop day strip (768, 1024, 1440) | Correct for keyboard and focus; one P2 (IS-52) | Days are equal: 44 px at 100%, 66 px at 150%. Gaps are 8 px, plus 16 px after Full week, which includes its divider.<br>Tab order is Full week → Mon … Sun → the first shift. Every focused day is inside the strip with a 2px teal ring; nothing is clipped and no ring is missing.<br>**The fade follows the scroll at 768** (412 px strip, overflowing): the end fade only at start (`data-more-end`), both fades in the middle, the start fade only at the end. Choosing Sun with Enter scrolls to the end (`scrollLeft` 108 of 108 at 100%, 256 of 256 at 150%).<br>At 1024 and 1440 the strip fits, so there is no mask and no edge attribute. Crops: `SP/r10/shots/is-r10-strip-768-100.png`, `is-r10-strip-1440-150.png` |
| Touch targets | Correct | None under 44 px at 390 or 320, for either role. |

### New findings (round 10)

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| IS-51 | Home read failure · both (code) | `Try again` href | The retry now copies **every** non-empty param, including the one-time success flags the Toaster removes on the client: `decided`, `submitted`, `reviewed` and so on. A decision redirect lands on `/app?decided=timeoff-approved`. If the dashboard read fails at that moment, Try again links to `/app?decided=timeoff-approved` and shows "Time off approved. The employee will be told." a second time after recovery. Judgment call, from code only: the path can't be triggered from the browser. | n/a | `src/app/app/page.tsx:64` (`Object.entries(params)` with no key filter) | Allow-list the view keys: `['view','week','day','location','employee'].flatMap(k => params[k] ? [[k, params[k]]] : [])`. | P2 |
| IS-52 | Schedule · both · 768 and 1440 at 150% text | `Full week` in the desktop day strip | From 768 up, the label is a fixed **12 px** at both 100% and 150% root size, while the day labels scale to 22.5 px and 21 px. At 150% it reads as a much smaller word next to large days, and it sits below the kit's 15 px text floor. Phones are fine (15 px, then 22.5 px). | `SP/r10/shots/is-r10-strip-1440-150.png` | `src/app/app/schedule/manager-schedule.css:54`: `font-size: calc(12 * var(--type-unit, 1px)); min-width: 92px` | Use `font: var(--nv-t-label)` (rem-based) and `min-width: 5.75rem`, so it scales with the days. | P2 |

### Verdict

**Not zero.** IS-50 is fixed, and the spacing, sentence size and desktop strip keyboard and focus all pass. Two new P2s are open: IS-51 (the retry link can replay a one-time toast; from code) and IS-52 (the desktop `Full week` label doesn't scale with text size).

## Round 11

Re-checked October 19, 2026, 03:15–03:40 AST, on the same preview. Both roles; 390, 320, 768, 1024 and 1440; root text at 100%, 125% and 150%. Read only. Failure states were made by fulfilling `/api/manager/action-center` with 500 or 403 in my own browser only, or by going offline or blurring the window. Evidence is in `SP/r11/`, with crops under `SP/r11/shots/`.

### Status

| Item | Status | Measurement |
|---|---|---|
| IS-51 | Fixed (code; server-only path) | `src/app/app/page.tsx:65` builds `retry` only from `view`, `week`, `day`, `location` and `employee`, and only non-empty strings. `decided` and the other one-time flags can't ride along. |
| IS-52 | Fixed | At 768 and 1440, `Full week` is 14 px at 100%, 17.5 px at 125% and 21 px at 150%. It is 92, 115 and 138 px wide, with `white-space: nowrap` and the text on one line inside the box (at 150% and 1440, text x 345–437 inside 322–460). The 7 px `scrollWidth` excess is the divider (`::after`). Phones are unchanged (15 px, then 22.5 px).<br>Strip keyboard at 768, 1024 and 1440, 100% and 150%: Full week → Mon … Sun → the first shift; every focused day sits inside the strip with a 2px ring; the fades follow the scroll at 768. One P2: IS-53. |
| ST-25, Home action-center failure, offline, paused and no access | Correct, with two P2s (IS-54, IS-55) | Checked as Manager at 390 and Owner at 320:<br>• The band summary is one line: "Couldn't load everything." for 500 and 403, "You're offline.", "Paused while you're away."<br>• Next up shows the message as `role="status"`:<br>  – 500 and paused: `Try again` (318×52 at 390, 248×52 at 320), with a 2px teal ring on Tab; Enter after the read recovers to "20 things need you today.";<br>  – 403: `Sign in` → `/login` (318×52);<br>  – offline: no button.<br>• "Also needs you" keeps its 512 px placeholder shape with a "Not available" or "Offline" stamp and **no focusable elements**.<br>• The Plan ahead row reads "Not available right now."<br>• Card heights are unchanged from the loaded layout. |
| ST-26, Inbox status first | Correct | The status line comes before the placeholder or the button in DOM and visual order (y 332 vs 364), for loading ("Loading your Inbox…"), 500 ("The Inbox isn't available right now." + Try again) and offline. The eyebrow reads Checking…, Not available and Offline respectively. |
| 12 px gaps | Correct | Payroll `Refresh` / `Prepare a draft` is now 12 px apart, along with Timecards, Time exports and Schedule (Build week / Fill gaps only), at 390, 320 and 1440. |
| Timecards toolbar, two columns on phones | Correct at 390; one P2 at 320 (IS-56) | 390: Period start and Period end are 173×48 side by side, with View period and Refresh (173×44) below. 320: the same layout at 138 px per column. |
| Touch targets | Correct | None under 44 px at 390 or 320, for either role. |

### New findings (round 11)

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| IS-53 | Schedule · both · 1024 at 150% text | Desktop day strip | The strip overflows by **4 px** (`scrollWidth` 672 vs `clientWidth` 668). Tabbing to Sun scrolls it 4 px, which sets `data-more-start`. That brings in a 16 px start fade over the left edge of `Full week` for a scroll that reveals almost nothing. Sun's ring then sits flush against the strip's edge (x 948). | `SP/r11/shots/is-r11-strip-1024-150-sun.png` | The strip's 4 px inline padding plus the new 138 px `Full week` at 150%, in a fixed-width row | Let the row size to its content when it fits: `width: max-content; max-width: 100%`. Or only set the edge attributes when the overflow is more than 8 px. | P2 |
| IS-54 | Home · both · 390, 320 | Two status regions in failure states | The band summary (`role="status"`) and the Next up message (`role="status"`) both update together and say nearly the same thing. Offline, a screen reader can announce "You're offline." and then "You're offline. This updates when you reconnect."; for 500, "Couldn't load everything." and then "What needs you isn't available right now." Judgment call: the accessibility tree shows both live regions; not tested with VoiceOver. | `SP/r11/shots/is-r11-home-offline-AUDIT-M-390.png` | `src/components/premium-home.tsx:102` (band summary status) and `:240` (Next up message status) | Keep one live region. Make the Next up message plain text and let the band summary carry the announcement, or drop `role` from the band summary while the card shows its message. | P2 |
| IS-55 | Home · both · 390 | Paused wording | The band says "Paused while you're away." while the Next up card below says "Paused while NEVORA isn't in front. It updates when you come back." That's two wordings for one state again, which IS-33 had aligned. | `SP/r11/shots/is-r11-home-paused-AUDIT-M-390.png` | `src/components/premium-home.tsx:97` vs the Next up message for `paused` | Use one wording in both places, e.g. band "Paused while you're away." and card "Paused while you're away. It updates when you come back." | P2 |
| IS-56 | Timecards · both · 320 | Period start and Period end date fields | In the two-column layout each field is 138 px wide. At 17 px the date doesn't fit beside the calendar icon: "10/13/2026" shows as "10/13/202" with the last digit cut under the icon, in both fields. At 390 (173 px) the full date shows. | `SP/r11/shots/is-r11-timecards-toolbar-320.png` | `src/app/app/portal-premium.css:930` (phone two-column toolbar grid) | Stack the two date fields at ≤360 px (`grid-template-columns: 1fr` below 360) and keep two columns for the buttons. Or cut the date input's inline padding to 12 px and its icon gap so 10 characters fit in 138 px. | P2 |

### Verdict

**Not zero.** IS-51 and IS-52 are fixed, and ST-25, ST-26, the 12 px gaps and the targets pass. Four new P2s are open: IS-53 (a 4 px strip overflow at 1024 and 150%), IS-54 (two live regions announcing the same failure), IS-55 (paused wording mismatch) and IS-56 (the Timecards dates clipped at 320).

## Round 12

Re-checked October 19, 2026, 03:45–04:05 AST, on the same preview. Both roles; 320, 360, 390, 430, 768 and 1024; root text at 100%, 125% and 150%. Read only. Failure states came from fulfilling `/api/manager/action-center` with 500 or 403 in my own browser, going offline, or blurring the window. Evidence is in `SP/r12/`, with crops under `SP/r12/shots/`.

### Status

| ID | Status | Measurement |
|---|---|---|
| IS-53 | Fixed | **1024 at 150%:** the overflow is 4 px. With Sun focused (`scrollLeft` 4 of 4) there is no `data-more-start` or `data-more-end` and `mask: none`, so no fade covers `Full week`. Sun's ring ends at x 948, the strip's edge. At 100% the strip fits (472 px) with no attributes.<br>**768 at 150%** (after the scroll settles):<br>• at rest, `scrollLeft` 0 of 308, end fade only;<br>• Sun focused, 308 of 308, start fade only;<br>• back to Mon, 0 of 308, end fade only.<br>Tab order is still Full week → Mon … Sun → the first shift, with no clipped day and every ring present. Crop: `SP/r12/shots/is-r12-strip-768-150-sun.png` |
| IS-54 | Fixed | Home in 500, 403, offline and paused, as Manager at 390 and Owner at 320: exactly one `role="status"` with text, the band summary ("Couldn't load everything." / "You're offline." / "Paused while you're away."). The Next up message is plain text.<br>Controls are unchanged:<br>• Try again: 318×52 at 390, 248×52 at 320, 2px teal ring, recovers on Enter;<br>• Sign in → `/login` for 403;<br>• no button offline. |
| IS-55 | Fixed | When paused:<br>• the Home band reads "Paused while you're away.";<br>• the Home Next up card reads "Paused while you're away. It updates when you come back.";<br>• the Inbox status line reads "Paused while you're away. It updates when you come back.", with the eyebrow "Paused". |
| IS-56 | Fixed | Timecards period toolbar:<br>• **320, one column:** both date fields 288×48 at x 16; "10/13/2026" and "10/19/2026" show in full;<br>• **360:** two columns of 158 px, dates in full;<br>• **390:** 173 px each; **430:** 193 px each.<br>Large text at 390: one column at 125% and at 150% (358 px fields, 21.25 px and 25.5 px text). Crops: `SP/r12/shots/is-r12-timecards-toolbar-320.png`, `-360.png` |
| Sweep | Correct | None under 44 px at 390 or 320, either role (Team `Apply filters` is out of the tab order and hidden from assistive technology). Tab order on all 15 screen and role pairs at 390 shows white band rings, no hidden or clipped stop and no missing ring. The `Search team` input carries no outline of its own by design (IS-46); the field's ring shows instead. |

### Verdict

**Zero open defects in interaction and states.** IS-53 to IS-56 are fixed, and the round 12 sweep found nothing new. As in every round, this is Chromium only, with no WebKit, iOS or VoiceOver evidence.

## Round 13

This was a short regression check on two changes since round 12. October 19, 2026, 04:05–04:20 AST, same preview, both roles, at 390, 320 and 1440, plus 150% text at 390. Read only.

Failures were made only in my own browser by answering a read with a 500: `/api/manager/today`, `/api/manager/action-center` or `/api/payroll/runs`. To catch the busy state, I held one retry request open. Evidence is in `SP/r13/`, with crops under `SP/r13/shots/`.

### Status

| Item | Status | Measurement |
|---|---|---|
| ST-27, Today inline "Try again" (`.premium-today-retry`) | Correct, with two P2s (IS-57, IS-58) | **Shape:** the Today card keeps its 3 stat cells, a 50 px head and a 212 px card at 390 (190 px at 1440).<br>**Visible box:** 96×20 at 390 and 320, 83×20 at 1440, 129×30 at 150% text.<br>**Hit area** (with the `::after` at `inset: -12px -8px`): 112×44, 99×44 at 1440 and 145×54 at 150%. I tested hits 6 px outside each side and 10 px above and below the text, and all four land on the button. The hit area stays inside the card and clear of the "Today" title (96 px gap at 320).<br>**Keyboard:**<br>• Tab reaches it with `:focus-visible` and a 2px teal ring, but at a **2 px** offset, not 4 px (IS-57);<br>• Enter sets "Trying…", `disabled`, grey #5F666A, and makes exactly 1 request;<br>• on success the card shows "Updated 4:03 AM" and the three numbers, the button goes away, and the band reads "20 things need you today."<br>Focus is lost on the way: IS-58. Crop: `SP/r13/shots/is-r13-today-retry-focus-AUDIT-M-390.png` |
| WR-61, primary "Try again" | Correct (rings) | **Inbox failure:** 142×52, teal #077572 with white text.<br>**Home Next up:** 318×52 at 390, 248×52 at 320.<br>**Payroll failure:** 116×52, in a white kit card with "Payroll unavailable" (`role="alert"`).<br>Each takes a 2px teal ring at 2px offset with `:focus-visible`. The 2 px white gap keeps the ring distinct from the teal fill on the white card. Enter makes 1 request and recovers on all three. Crops: `SP/r13/shots/is-r13-payroll-tryagain-focus-390.png`, `is-r13-payroll-failure-390.png` |

### New findings (round 13)

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| IS-57 | Home · both · 390, 320, 1440 | `.premium-today-retry` focus ring | The ring renders at `outline-offset: 2px`, not the intended 4 px. It hugs the 20 px text line, about 1 px from the "n" of "again", and reads cramped next to the 52 px buttons' rings. | `SP/r13/shots/is-r13-today-retry-focus-AUDIT-M-390.png` | `portal-premium.css:943` (`.premium-today-retry:focus-visible { outline-offset: 4px }`, specificity 0,2,0) is outranked by `portal-premium.css:393` (`… [data-nv-page] .nv-content :is(a, button, …):focus-visible { outline-offset: 2px }`) | Give the retry rule the same prefix, e.g. `html body .app-shell.nevora-portal.nevora-portal .page-frame [data-nv-page] .nv-content .premium-today-retry:focus-visible { outline-offset: 4px; border-radius: 4px; }` | P2 |
| IS-58 | Home Today, Home Next up, Inbox, Payroll · both · 390, 320 | Keyboard focus after "Try again" | After Enter, `document.activeElement` is `<body>` in all four cases. **Today retry:** the button becomes `disabled` while trying, which drops focus immediately, and then it is removed on success. **Inbox, Next up and Payroll:** the button is removed when the content returns. A keyboard user is sent back to the top of the page and must Tab through the header again. Screen reader users get no landing point. | n/a (`SP/r13/today.mjs`, `SP/r13/primary.mjs` output: "focus after: BODY") | `premium-home.tsx:132` (`disabled={refreshing}`), and the retry buttons unmounting on recovery in `premium-home.tsx`, `manager-inbox.tsx` and the payroll state | While retrying, use `aria-disabled="true"` and ignore clicks, rather than `disabled`. When the content returns, move focus to the recovered card's heading (`tabIndex={-1}` on the Today or Next up `h2`, the first Inbox section heading, or Payroll's toolbar) with `focus({ preventScroll: true })`. | P2 |

### Verdict

**Not zero.** ST-27's target size, disabled state and recovery, and the WR-61 primary buttons' rings, all pass. Two new P2s are open: IS-57 (the Today retry ring is at 2 px, not 4 px) and IS-58 (focus drops to `body` after any Try again).

## Round 14

Re-checked October 19, 2026, 04:20–04:45 AST, on the same preview. Both roles at 390, 320 and 1440. Read only.

Failures were made only in my own browser, by answering a read with a 500. I held the retry request open, then let it pass or fail. Evidence is in `SP/r14/`, with crops under `SP/r14/shots/`.

### Status

| Item | Status | Measurement |
|---|---|---|
| IS-57 | Fixed | Today `Try again` ring: 2px teal at a **4 px** offset, at 390, 320 and 1440, with the refresh icon. Crop: `SP/r14/shots/is-r14-today-retry-focus-AUDIT-M-390.png` |
| IS-58 | Fixed | **Today:**<br>• while trying, the button has `aria-disabled="true"` (not `disabled`), reads "Trying…" and keeps focus;<br>• a second Enter sends no extra request (1 in total);<br>• on success, focus moves to `h2 "Today"` (`tabindex -1`) with a 2px teal ring, in view (y 236 at 390, 272 at 320 for the Owner, 265 at 1440);<br>• if the retry fails again, focus returns to `Try again` (4 px ring).<br>**Inbox:** on success, focus goes to `h2 "Act now, 19"`; on a second failure, back to `Try again`.<br>**Home Next up:** on success, the Next up `section` (`tabindex -1`, y 444–674); on a second failure, `Try again`.<br>**Payroll:** on success, `.pw-toolbar` (`tabindex -1`); on a second failure, `Try again`.<br>All of these targets show a 2px ring with `:focus-visible`.<br>**User moves away:** if the user presses Shift+Tab during the retry, the helper leaves focus where they put it (the Home stat, the Payroll section tab, the Inbox pill row), in all three cases. |
| Paused Home | Correct, with one P2 (IS-60) | Next up has no button when paused. |
| Refresh icon on every Try again | Correct, with one P2 (IS-61) | Each `Try again` has an icon: Today, Home Next up, Inbox, Payroll and both error pages. |
| Payroll failure card | Correct | A white kit card with no alert icon, the title in kit type (600 17/22 Inter), "Payroll could not complete this request." and a teal `Try again`. Crop: `SP/r14/shots/is-r14-payroll-failure-390.png` |
| Sweep | Correct, apart from IS-59 | None under 44 px at 390 or 320, either role. Tab order on all 15 screen and role pairs at 390 shows white band rings, with no hidden or clipped stop and no missing ring. |

### New findings (round 14)

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| IS-59 | Inbox read failure · both · 320 and 390 | The pill row `div.nv-filters` (`role="group"`, "Show") | When the Inbox read has failed, all four pills are `disabled`, and the row itself becomes a **Tab stop**: Refresh → **"Show" group** → Try again. Chromium makes a scroll container with no focusable children keyboard-focusable. Pressing anything there does nothing.<br>At 390 its ring is two full-width white lines across the band. **At 320 the ring is invisible**: the row's edge-fade mask and its overflow clip it (`SP/r14/shots/is-r14-inbox-filters-scroller-focus-320.png`). That leaves an empty stop with no visible focus. | `SP/r14/shots/is-r14-inbox-filters-scroller-focus-320.png`, `-390.png` | `src/components/manager-inbox.tsx:159` renders the row with disabled pills while not ready; the row is `overflow-x: auto` (`kit.css:170`) | While not ready, add `tabIndex={-1}` to the row, or `overflow: hidden`, or don't render the disabled pills. When ready, keep the row as it is: its pills are the stops. | P1 |
| IS-60 | Home · both · 390 | Next up text when paused | The card now says only "It updates when you come back." On its own, as a screen reader user moving card by card would hear it, "It" has no referent; the "Paused while you're away." it relies on is in the band. Judgment call: copy. | n/a (`SP/r14/misc.mjs` output) | `src/components/premium-home.tsx:236` | Use "Updates when you're back." (the Inbox and Attendance wording), or keep "Paused. It updates when you come back." | P2 |
| IS-61 | Payroll read failure · Owner · 390 | Refresh icon in the teal `Try again` | The icon is drawn in `#858B8F` grey on the teal fill (#077572), about 1.6:1. It reads as a faded, disabled glyph next to the white label. The other primary Try again icons are white. | `SP/r14/shots/is-r14-payroll-failure-390.png` | `portal-premium.css:947`: `.pw-state svg { color: var(--nv-icon) }` also matches the button's svg (`:964` only sets its size) | Limit it to the state icon, `.pw-state > svg { color: var(--nv-icon) }`, or add `.pw-state .pw-button svg { color: currentColor }`. | P2 |

### Verdict

**Not zero.** IS-57 and IS-58 are fixed: the ring is at 4 px, and focus lands on the recovered content or back on the button, without stealing it from the user. Three new defects are open: IS-59 (P1, an empty Tab stop on the Inbox pill row during a failure, invisible at 320), IS-60 (P2, paused copy) and IS-61 (P2, the grey Payroll retry icon).

## Round 15

Re-checked October 19, 2026, 04:45–05:05 AST, on the same preview. Both roles; 390, 320 and 1440. Read only.

Failures and the busy state were made only in my own browser: a read answered with a 500, or a request held open. Evidence is in `SP/r15/`, with crops under `SP/r15/shots/`.

### Status

| Item | Status | Measurement |
|---|---|---|
| IS-59 | Fixed | With the Inbox read failed, Tab from Refresh goes Try again → tab bar Home → Schedule, at both 390 and 320. The "Show" row is no longer a stop. When the Inbox is ready, Tab walks All → Act now → Requests → … as before. |
| IS-60 | Fixed | The paused Next up reads "Updates when you're back." |
| IS-61 | Fixed | The Payroll `Try again` icon is `rgb(255,255,255)` on teal, the same as the Inbox and Home Next up icons. |
| Attendance Refresh with `aria-disabled` while refreshing | Correct, with one P2 (IS-62) | At 390 (success) and 320 (failure), with the request held: two Enters send **1** request. Mid-refresh, focus stays on the button, which reads "Refreshing…" with `aria-disabled="true"` (not `disabled`) and `:focus-visible`. Afterwards focus is still on "Refresh" (`aria-disabled` cleared), showing "Updated 4:45 AM" on success or "Couldn't update. Try Refresh." on failure. Crop: `SP/r15/shots/is-r15-att-refreshing-390.png` |
| Paused Next up placeholder | Correct | When paused or offline, the Next up card shows a 52 px `premium-skeleton__button` that is inside `aria-hidden`, `tabindex -1`, and holds no link or button. |
| Home "needs you" column holds its height | Correct when paused or offline; **not when failed** (IS-63) | The column measures:<br>• 390: ready 761 px, paused 761, offline 761, failed 749;<br>• 1440: ready 640 px, paused 640, offline 640, failed 749.<br>At 1440 the failed state's "Also needs you" placeholder is 512 px against 415 px when ready. |
| Sweep | Correct | None under 44 px at 390 or 320, either role. Tab order on all 15 screen and role pairs at 390: no hidden or clipped stop. The one "covered" flag is the Schedule chip mid smooth-scroll at 60 ms, which is fully in view once it settles (as in earlier rounds). |

### New findings (round 15)

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| IS-62 | Home → Attendance · Manager · 390, 320 | `Refresh` while refreshing (`aria-disabled="true"`) | The busy style applies `opacity: .55` to the whole button, and that fades its focus ring too. The 2px teal ring (#077572) renders at about #77B3B1 on white, which is **about 2.4:1**, below the 3:1 a focus indicator needs, for the length of the refresh. Its accessible name also stays "Refresh attendance review" while the visible text is "Refreshing…", so the busy state is only conveyed through `aria-disabled`. | `SP/r15/shots/is-r15-att-refreshing-390.png` | `portal-premium.css:972` (`.attendance-review-refresh[aria-disabled="true"] { opacity: .55 }`); the aria-label at `manager-attendance-review.tsx:226` | Fade the text and border instead: `color: var(--nv-muted); box-shadow: inset 0 0 0 1px var(--nv-hairline)`, with no `opacity`, so the ring keeps full contrast. Optionally set `aria-label={refreshing ? "Refreshing attendance review" : "Refresh attendance review"}`. | P2 |
| IS-63 | Home · both · 390, 1440 | The "needs you" column in the action-center **failed** state | The column doesn't hold its height when the read fails, only when paused or offline. At 1440 it grows **109 px** (640 to 749), because the failed "Also needs you" placeholder is 512 px against 415 px when ready. At 390 it shrinks 12 px (761 to 749). This overlaps the stability inspector's area. | n/a (`SP/r15/col.mjs`, `col2.mjs` output) | The failed state's "Also needs you" placeholder height in `premium-home.tsx` (a fixed set of rows, not the ready height) | Use the same placeholder row count and height for failed as for paused and offline (the paused and offline versions already measure 640 and 761). | P2 |

### Verdict

**Not zero.** IS-59, IS-60 and IS-61 are fixed, Attendance Refresh keeps focus and sends one request, and the sweep is clean. Two new P2s are open: IS-62 (the faded focus ring while Attendance refreshes) and IS-63 (Home's column doesn't hold its height when the read has failed).

## Round 16

Re-checked October 19, 2026, 05:05–05:20 AST, on the same preview at 390, 320 and 1440. Read only. Busy and failed states were made only in my own browser, by holding a request or answering it with a 500. Evidence is in `SP/r16/`, with crops under `SP/r16/shots/`.

### Status

| ID | Status | Measurement |
|---|---|---|
| IS-62 | Fixed | Attendance `Refresh` while busy, at 390:<br>• effective opacity 1 (the whole ancestor chain);<br>• muted text #5F666A on white, a 1px #D5DAD9 inset edge;<br>• the focus ring is a full-strength 2px #077572 at 2px offset, with focus kept.<br>The name changes from "Refresh attendance review" to **"Refreshing attendance review"** while busy and back afterwards; the accessibility tree shows `button "Refreshing attendance review" [disabled]: Refreshing…`. Two Enters send 1 request. Crop: `SP/r16/shots/is-r16-att-refreshing-390.png` |
| IS-63 | Fixed on both paths | **Loaded, then a failed refresh** (a 500 on the action-center read, then blur and focus). The "needs you" column, Next up, Also needs you and Plan ahead all keep their loaded heights:<br>• 390: column 761 → 761 (Next up 230, Also needs you 515, Plan ahead 96);<br>• 320: 872 → 872;<br>• 1440: 640 → 640 (209 / 415 / 76).<br>Document height is unchanged at every width (2216, 2467 and 1385 px). The held Next up shows the message and a 318×52 `Try again`, the only focusable element in the column, with a 2px teal ring.<br>**First load, loading then failed:** identical on every measure: column 749, Next up 221, Also needs you 512, Plan ahead 76 at 390, 320 and 1440, with no document height change.<br>I agree with the note: the round 15 difference (640 against 749 at 1440) compared a first-load failure with real content, which no hold can know in advance. There is no movement on either path. Crop: `SP/r16/shots/is-r16-home-failed-after-ready-390.png` |
| Sweep | Correct | None under 44 px at 390 or 320, either role. Tab order on all 15 screen and role pairs at 390 shows white band rings, with no hidden, clipped or ring-less stop. |

### Verdict

**Zero open defects in interaction and states:** IS-62 and IS-63 are fixed, and the round 16 sweep found nothing new. As in every round, this is Chromium only, with no WebKit, iOS or VoiceOver evidence.

## Phase 3, round 1

This is the focused pass on the Employee and Lead screens, October 19, 2026, 05:30–06:30 AST, on the same preview.
- **Accounts:** `AUDIT-E` (employee), `AUDIT-LEAD` (lead), `AUDIT-LONG` (employee with a very long name) and `payroll-qa-a` (employee with pay statements), using the saved cookies in `p3/state/`.
- **Sizes:** 320, 360, 390, 430, landscape 844×390, and 1440.
- **Read only:** while I worked the keyboard on these screens, every non-GET request was blocked, apart from the screens' own read endpoints. I submitted, claimed, swapped, withdrew and confirmed nothing. I toggled one Availability switch and toggled it back, without saving.
- **States:** loading, failed and offline were made only in my own browser, by holding a read, answering it with a 500, or going offline.
- **Error pages:** reached with the same one-time, browser-only faults as in rounds 9–10.

Evidence is in `SP/p3/`, with crops under `SP/p3/shots/` and accessibility trees under `SP/p3/aria/`.

### Findings

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| IS-64 | Every employee and lead screen · 390 | The More sheet (`#employee-more-navigation`) | This is IS-5 again, now for employees. With the sheet open, Tab runs Updates → Notifications → Profile → Sign out → Close, then leaves the sheet while it **stays open**. Focus moves to the header, then to **"My time"** in Home's Clock status card at y 549, which lies under the open sheet (y 501–828; elementFromPoint returns the sheet). Escape does close the sheet and return focus to More (correct). | `SP/p3/shots/is-p3-more-focus-behind-390.png` | `src/components/app-shell.tsx:100-101`: the focus-out handler only checks `manager-more-navigation` | Apply the same check to `employee-more-navigation`: close it when focus moves outside the sheet and outside its trigger. | P1 |
| IS-65 | Notifications · Employee (shared with Manager and Owner) · 320, 360 | Filter pills (All / Unread / **Needs action**) | Tab to `Needs action` and the row doesn't scroll. The pill is at x 202–342 in a row that spans 36–284 at 320 (`scrollLeft` 0 of 62), so its label and the right side of its ring are cut. At 360 it is cut by 18 px (overflow 22). | `SP/p3/shots/is-p3-notif-pills-focus-320.png` | `app-shell.tsx:102` only follows focus for `.nv-filters, .section-tabs-track, .segmented, .mws-day-navigation`. This row is `styles.filters` in `src/components/notification-inbox.tsx:65` | Add the Notifications row to the follower: give it `nv-filters`, or a `data-follow-focus` attribute the follower matches. | P1 |
| IS-66 | My schedule (and `?intent=swap`) · Employee · 320, 360, 390 | Week-strip day links (`.my-week-day`) | The day targets are narrower than 44 px: **32×69 at 320**, 38×69 at 360 and 42×69 at 390, for all seven days. They reach 44 px at 430. | n/a (`SP/p3/targets-320.txt`) | `src/app/app/portal-design-system.css:81` (`.my-week-day { min-width: 0; padding: 8px 2px }`) overrides `employee-schedule.css:64` (`min-width: 44px`) | Keep `min-width: 44px` on phones and let the week row scroll sideways with focus-follow (as the manager day strip does), or drop the gaps so seven 44 px days fit in 320 − 2×16. | P2 |
| IS-67 | Timecards · Employee and pay employee · 390, 320 | Tab bar | On `/app/timecards` **no tab is marked current**: no `.active`, no `aria-current`. The Pay section tabs above show "Timecards" selected, so the page belongs to Pay, but the Pay tab isn't lit. My time and My pay light Pay correctly. | n/a (`SP/p3/nav.mjs` output) | `src/lib/navigation.ts:33-42`: `employeeNavigation` has no `/app/timecards` entry, so `activeNavigationHref` returns nothing, even though the Pay and Hours tab `owns` it (`:160-161`) | Add `/app/timecards` to the employee navigation as a hidden owned route, or check the tab's `owns` paths directly in `activeMobileTab`. | P2 |
| IS-68 | Home · Employee · 390 | Band summary **offline** | Offline, the band says "Paused while you're away." while the card says "Home paused — return online to refresh." The band calls offline "away", which is the wording for a hidden window. This is the same issue as IS-47 on Attendance. | `SP/p3/shots/is-p3-state-home-offline.png` | `src/components/employee-home-reviewed.tsx:252,257`: `paused` covers both offline and hidden | Read `navigator.onLine`: when offline, use "You're offline." in the band and "Updates when you reconnect." in the card; keep "Paused while you're away." for a hidden window. | P2 |
| IS-69 | Profile · Employee · 390 (104×17 at landscape) | Inline "Check NEVORA" link | The target is **125×20**, under the 44 px house rule for links in text. This is the same pattern as IS-44. | n/a (`SP/p3/targets-390.txt`) | `src/components/calendar-subscription-panel.tsx:40` | `padding-block: 12px; margin-block: -12px; display: inline-block` on the link, or move it out as its own `nv-link` row. | P2 |
| IS-70 | My schedule `?intent=swap` · Employee · 390 | Shift option links | Five links are all named "Request a swap" and five "Unable to work", each pair for a different shift. Each sits inside an `article` named by the day and a group "Shift options for Oct 19, 8:00 AM", so the context is there (meets 2.4.4, fails 2.4.9). This is the same pattern as IS-28 on the manager schedule, which was fixed with unique names. | `SP/p3/aria/EMPLOYEE-swap.yaml:56-101` | Shift options links in the employee schedule component | Give each link a full name with `aria-label`, e.g. "Request a swap for Mon Oct 19, 8:00 AM". | P2 |
| IS-71 | Error boundary · both roles · 390, 320 | "Try again" on the kit error pages | After a reset, focus is on `<body>`, for the root screen and the in-portal page alike, as Employee and as Manager. The IS-58 focus helper isn't used by the error boundaries, so a keyboard user restarts from the top. | n/a (`SP/p3/err.mjs`, `err3.mjs` output: `focus=BODY`) | `src/app/error.tsx`, `src/app/app/error.tsx` (reset without a focus target) | Call `focusAfterRetry` (or focus the page `h1` with `tabindex=-1`) after `reset()`. | P2 |
| IS-72 | My time and Timecards · Employee · 844×390 | Section tab "Hours" | The target is **43×44** in landscape. | n/a (`SP/p3/targets-h.mjs` output) | `.section-tab` padding 0 2px at landscape (portal-gusto section tabs) | `min-width: 44px` on `.section-tab`. | P2 |
| IS-73 | Profile, read failed · Employee · 390 | Two "Retry" buttons | When both profile reads fail, the page shows two buttons named only "Retry", one for Work details and one for the calendar link. Out of context the names don't say which read each retries. | `SP/p3/shots/is-p3-state-profile-500.png` | `src/components/calendar-subscription-panel.tsx:43` and the Work details recovery (`employee-profile-details.tsx`) | Name them "Retry work details" and "Retry calendar link", or use aria-labels. | P2 |

### Checked and correct

**Keyboard and focus (390, both roles, all 16 screens; `SP/p3/tab-order-390.txt`)**
- Every band stop (My shifts / Open shifts, New request / My requests, Available shifts / Your requests, Usual week / Specific week, section tabs) has a 2px white ring at 2px offset.
- Card stops have a 2px teal ring. No stop is hidden under the tab bar.
- The band pills are links with `aria-current="page"` on the selected one, for example "My shifts", "Open shifts", "New request", "My requests (1)" and "Available shifts".
- **Shift options:**
  - the `summary` is 128×44, named "Shift options for Oct 19, 8:00 AM";
  - Enter opens it (the summary widens to 264×44);
  - Tab then goes Request a swap → Unable to work (264×44 each, teal rings);
  - Enter on the summary closes it again.
- **Time off withdrawal:**
  - the `summary` "Withdraw this request" is 150×44;
  - Enter opens it, then Tab goes to the required checkbox "I confirm withdrawal of this pending request." (its label is a 294×51 target), then to "Withdraw pending request" (294×44), which I focused only.
- **Availability:**
  - the scope switch is links in `nav "Availability scope"`: Usual week (`aria-current="page"`, 111×44) and Specific week (128×44);
  - each day is a 44×44 `switch` ("Monday availability") with a teal ring, and Space toggles it (the row shows From – Until; toggled back; no request sent).
- **Requests overview:** five full-width row links (358×68 or 88) with teal rings, then the "Which request should I use?" disclosure.
- **Section tabs:**
  - Requests (Overview / Time off / Shift requests / Availability) and Pay (Statements / Hours / Timecards) mark the current page, and the tab bar marks Requests or Pay (except IS-67).
  - At 320 the Requests tabs follow focus to the end (`Availability` at x 217–304, `scrollLeft` 114 of 114).
- The More sheet opens with focus on its first item, and Escape closes it and returns focus to More (except IS-64). The More tab shows active on Profile, Updates and Notifications.
- **At 1440:** 16 screens with no clipped, hidden or ring-less stop. The Notifications search field shows one ring, on its wrapper (2px teal); the input itself has none.

**Touch targets:** none under 44 px at 390 or 320, across 49 and 32 screen-and-role combinations, apart from IS-66, IS-69 and IS-72.

**Semantics:** one `main` and one h1 on all 32 screen and role pairs. The banner, main and navigation landmarks are in order. The other repeated names my scan found are links inside closed `details`, which aren't exposed until opened, so they're not defects.

**States** (simulated in my browser; `SP/p3/states.txt`, `SP/p3/loading.mjs`)
- **Loading** (held for 9 s): Home "Checking your shifts…" with "Loading Home…", My time "Loading recorded time", My pay "Loading your statements", Profile "Loading profile…", Updates "Loading updates…", Notifications "Loading notifications…". Each is a status, with Refresh disabled where shown.
- **Failed (500):** each screen says the read is unavailable and offers a retry (Home: Retry home 90×44 and Refresh 88×44; My pay: a teal Try again; Updates: Refresh updates; Notifications: Retry). No stale numbers are shown.
- **Offline:** Home, My time, Profile, Updates and Notifications switch to "paused" or "return online" copy with their refresh controls disabled (Home's wording is IS-68).
- **Timecards** keeps the last read ("1 timecard in this period.") while offline. It doesn't poll, so this is not stale in the live sense.

**Error pages:** both are the kit version for employees.
- **Root:** the band with the wordmark and one message alert. Try again (142×52) → Back to home (150×52) by Tab, with teal rings; Enter recovers Home.
- **In-portal:** the shell stays, More is marked active on Updates, the band starts at y 68 and the text at x 36, and there is one exposed alert (the legacy section is `display:none`). 320 stacks the buttons at 248×52. Enter recovers Updates.

**Not tested:** WebKit, iOS and VoiceOver. Lead's My schedule showed the error page once, during one tab-order run; two reloads and the later runs rendered it normally, so I'm treating it as a transient dev reload, not a defect.

### Verdict

**Not zero.** Interaction and states on the Phase 3 screens has 10 open defects: 2 P1 (IS-64, the employee More sheet lets focus go behind it; IS-65, the Notifications pills don't follow focus) and 8 P2 (IS-66 to IS-73).

## Phase 3, round 2

Re-checked October 19, 2026, 06:30–07:10 AST, on the same preview with the same accounts, widths and rules. Read only: every non-GET request was blocked while I worked the keyboard, apart from the screens' own read endpoints. Faults were browser-only. Evidence is in `SP/p3r2/`, with crops under `SP/p3r2/shots/`.

### Status

| ID | Status | Measurement now | Cause if open |
|---|---|---|---|
| IS-64 | Fixed | The employee More sheet now closes when Tab leaves it: Updates → Notifications → Profile → Sign out → Close → **More** (the sheet closes and focus lands on the trigger). Escape returns focus to More with `:focus-visible`. The Manager sheet is the same: it closes after 10 Tabs, with focus on "More navigation". | |
| IS-65 | Partly fixed | Notifications at 320: focusing `Needs action` scrolls the row to x 144–284 inside 36–284 (`scrollLeft` 58 of 62), so the label is in full, with or without reduced motion. 360 is fine (184–324 in 36–324).<br>**Open (P2):** at 320 the pill ends exactly at the row's edge, so the **right side of its 2px ring (3 px offset) is clipped**, and the row stops 4 px short of its end. | `notification-inbox.tsx:65` row (`overflow-x: auto`, 4 px padding) with the `inline: "nearest"` follower in `app-shell.tsx` | Give the Notifications filter row `scroll-padding-inline: 8px` and `padding-inline-end: 8px`, so the ring fits when the last pill is in view. Crop: `SP/p3r2/shots/is-p3r2-notif-pills-focus-320.png` |
| IS-66 | **Not fixed (new look, P1)** | The week strip doesn't scroll sideways; it **wraps**:<br>• **320:** Mon–Fri on the first row (46 px each); **Sat and Sun on a second row, stretched to 122 px each**;<br>• **360 and 390:** Mon–Sat on the first row; **Sun alone on a second row, 288 and 318 px wide**;<br>• 390 at 150% text: the same as 390;<br>• 430: one row.<br>Focused days near the edges (Mon, Fri, Sat, Sun) have their 2px ring clipped by the row (`~ring` in `SP/p3r2/week.mjs` output), and at 360 the focused Sun's ring is cut at the bottom by the next card. The days are now at least 44 px wide, but the strip reads as broken. | `src/app/app/schedule/employee-schedule.css:64` (`@media (max-width: 400px) { .my-week-days { display: flex; flex-wrap: wrap } .my-week-day { flex: 1 1 calc(25% - 6px) } }`) still applies. `portal-premium.css:1149-1150` sets `display: flex; overflow-x: auto` and `flex: 1 0 44px` but not `flex-wrap: nowrap` | Add `flex-wrap: nowrap` to `portal-premium.css:1149`, plus `padding: 4px` (or `scroll-padding-inline: 8px`) so the edge days' rings aren't clipped. Crops: `SP/p3r2/shots/is-p3r2-week-320.png`, `-360.png` |
| IS-67 | Fixed | On `/app/timecards`, the tab bar marks `Pay` (`.active`, `aria-current="page"`) for both `AUDIT-E` and `payroll-qa-a`. | |
| IS-68 | Fixed | Home offline: band "You're offline." and card "You're offline. This updates when you reconnect." Paused (window blur): band "Paused while you're away." | |
| IS-69 | Fixed | The "Check NEVORA" link is 125×**50**, a 44 px+ target through its padding. | |
| IS-70 | Fixed | The swap view has 10 links with 10 unique names: "Request a swap, Oct 19, 8:00 AM", "Unable to work, Oct 19, 8:00 AM", … | |
| IS-71 | Fixed | After Try again (Enter), focus lands on the recovered page's band h1, with a 2px ring and `:focus-visible`:<br>• root error screen (Employee): "Hi, Alexandra.";<br>• in-portal (Employee, Updates): "Updates";<br>• in-portal (Manager, Inbox): "Inbox". | |
| IS-72 | Fixed | Landscape 844×390: My time and Timecards have no target under 44 px. | |
| IS-73 | Fixed | With both Profile reads failed, the buttons are named "Retry work details" (44×44) and "Retry calendar link" (78×44). | |

### Regression checks on the other changes

**More sheet (Employee and Manager)**
- Full width (x 0–390): the employee sheet spans y 509–844 and the manager sheet y 191–844.
- The backdrop is `rgba(28,28,28,.28)`.
- Scroll lock holds: neither a wheel over the backdrop nor the End key moves `scrollY`, which stays at 200.
- Escape returns focus to the trigger without changing the page's scroll position.

**Updates while loading:** the three filters (All / To review / Reviewed) show from the first frame, disabled ("–" counts). Their row has `tabindex -1`, so Tab skips them. Header → "Message today's team" → tab bar.

**My time, Profile and Home while loading:** no exposed placeholder text, apart from the status lines ("Loading Home…"). Home's review link ("3 items need your review" → `#employee-reviewed-actions-heading`) appears in the band once loaded; while loading the band shows only "Checking your shifts…", with no empty link stop.

**Sweep**
- Tab order on all 32 screen and role pairs at 390: band rings white, no hidden, clipped or ring-less stop. The Notifications search input has no ring of its own by design; its wrapper has a 2px teal ring.
- Touch targets: none under 44 px at 390 (Employee, Lead, pay employee) or at 320 (Employee, long-name employee).

**Note for the PM, not a defect in my area:** `AUDIT-E`, a plain employee, sees "Message today's team" (→ `/app/updates/compose`) on Updates. Worth confirming that this role should have it.

### Verdict

**Not zero.** IS-64 and IS-67 to IS-73 are fixed. Two remain open: **IS-66 (P1)**, the My schedule week strip, which wraps with Sun, or Sat and Sun, stretched on their own row at 320–390 instead of scrolling; and **IS-65 (P2)**, the last Notifications pill's ring clipped at 320.

## Phase 3, round 3

*In progress (partial results are written here as they come in; the final version replaces this note).*

Re-checked October 19, 2026, from 10:15 AST, on the new preview `http://127.0.0.1:51302`. Evidence is in `SP/p3r3/`, with crops under `SP/p3r3/shots/`. Read only: every non-GET request was intercepted in the browser (held, aborted or answered); none reached the server.

**Partial, Chromium:**
- IS-66: the week strip is one row at 320, 360, 390 and 430. At 320 it scrolls (`scrollWidth` 328 vs 288, 10 px insets, end fade) and Tab brings Sun fully into view (x 250–294, `scrollLeft` 40 of 40). No ring is clipped at any width.
- IS-65: at 320, tabbing to `Needs action` scrolls the row to its end (`scrollLeft` 72 of 72); the pill sits at x 127–256 inside 36–284 and its right ring edge is visible, with and without reduced motion.
- Submissions (Chromium, 390, all requests held/aborted/answered in the browser):
  - Time off submit and Availability save: double tap sends exactly 1 action. A failure, a 401 or a 403 replaces the page with the generic error page and drops what was typed (new finding).
  - Withdraw: double tap sends 1; failure keeps the page with "Retry same withdrawal". 401 and 403 also say "could not be confirmed. Retry" (new finding).
  - Request a correction: double tap sends 1; failure keeps the entries and offers "Retry same request". 401 and 403 say "service is unavailable" (new finding). Focus drops to `body` while sending in all four (new finding).
- Profile calendar link: double tap sends 1. On failure "Create link" stays disabled and the only explanation and Retry sit below the three provider rows (new finding). 401 and 403 say "This action is no longer authorized." with no sign-in link.
- Updates review: double tap sends 1; failure shows "Result not yet confirmed" with Check status; 403 shows "Access changed". No status is announced while confirming.
- 401/403 on reads: My time, Notifications, Home (Employee), Profile and Attendance offer Sign in. My pay, Updates (no link), Manager Home, Inbox and Payroll only offer retry (new finding).
- Tab walk at 390 (Employee): the My schedule "Planning ahead" rows, the Requests overview rows and Profile's settings rows and Sign out have their focus ring clipped by the card (new finding; crops coming).
