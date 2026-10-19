# Phase 3 (Employee and Lead), round 5 — EXIT ROUND, for Codex

- **Round:** 5, the **exit round**: a full sweep, all five areas, plus every earlier P3 ID.
- **Commit:** the `claude/premium-phase-1` commit that adds this version of the file. It includes every round 4 fix (4d469a4 and earlier).
- **Earlier reports:** `docs/product/specs/premium-phase-3/inspection/*.md`. Round 4 sections are copied in. Round 4's interaction sweep may not be included; treat interaction as a full sweep.
- **Fixed since round 4 (re-check):**
  - TC-P3-32 / P3-WR-18: dates (only month and day are glued; "Mon, Oct 19" stays whole).
  - TC-P3-33: From and Until labels.
  - P3-ST-14: My time hold (the panel is a real box now).
  - P3-ST-17: Home title at 320 and 200%.
  - P3-ST-20 and -24: placeholder band per width and text step (`html[data-text-step]`).
  - P3-ST-21: Inbox eyebrow at 200%.
  - P3-ST-25: placeholder first block.
  - P3-WR-07, -11, -12, -14, -16, -17.
  - AL-P3-13, -22, -25, -26, -29, -30, -31.
  - The TC-P3 wording items.
  - The shared submit button keeps its size while sending.
- **Round 4 interaction (local) open items, for Codex to fix on the candidate if still present (Jose approved):**
  - IS-74: focus falls to `<body>` while sending in Availability, the My time correction, the calendar link, the swap and the Updates acknowledge. Keep the button focusable (`aria-disabled`) like `EmployeeSubmitButton`.
  - IS-77: Timecards removes the card on blur or offline but keeps "1 timecard" and Refresh enabled (`timecards.tsx:90,94`).
  - IS-78: withdraw, correction, calendar and Timecards 401 messages need a Sign in link.
  - IS-79: Updates acknowledge 401 copy and announcement.
  - IS-80: calendar link failure: Create link stays disabled and the retry sits out of view.
  - IS-82: a failed withdraw unchecks the confirmation box.
  - **Already fixed here:** IS-75 (Availability alert next to Save), IS-76 (= P3-ST-14), IS-81 (inset focus rings).
- **Known, not to file:**
  - One console 404 for `/api/manager/inbox-count` per Manager or Owner load before the backend merge.
  - Next's dev-only "negative time stamp" warning.

## Routes and roles

**Roles:**
- Employee: `AUDIT-E`, `AUDIT-LONG` (long name), `AUDIT-ON` (clocked in), `AUDIT-BREAK` (on break), `payroll-qa-a`
- Lead: `AUDIT-LEAD`, `payroll-qa-b` (with pay statements)

**Routes:**
- Home and schedule: `/app`, `/app/schedule`, `/app/schedule?view=open`
- Requests: `/app/requests/hub`, `/app/requests?tab=new`, `/app/requests?tab=my`, `/app/exchange?tab=available`, `/app/exchange?tab=requests`
- Availability and time: `/app/availability`, `/app/availability?week=<next week>`, `/app/my-time`, `/app/timecards`, `/app/my-pay`
- Account and messages: `/app/profile`, `/app/updates`, `/app/notifications`

**Widths:** 320, 360, 390, 430 and 844×390. 768–1440 for these pages is the Desktop chat's.

**Also yours here:**
- **The shared phone shell:** header, tab bar, More sheet and section tabs, for all four roles.
- **The shared placeholders:** loading screens on every route.

The other chats skip these.

**Large data:** Manager and Owner Home, Inbox, Schedule and Team on a `--large` preview. Check placeholders and bands at 100% and 200% text.

## Re-check these IDs, plus anything the fixes touched

- **Type, colour and copy:** TC-P3-09, TC-P3-18 to TC-P3-31.
- **Alignment and geometry:** AL-P3-03, AL-P3-12, AL-P3-13, AL-P3-17 to AL-P3-28.
- **Bars and stability:** P3-ST-02, P3-ST-04, P3-ST-14 to P3-ST-23.
- **Widths and roles:** P3-WR-01 to P3-WR-15.
- **Interaction and states:** full sweep. Round 3's partial notes cover the submissions, 401 and 403 handling, focus while sending, and clipped focus rings.

## What the fixes touched since round 3's preview (it ran on code from 09:44)

- **New in this round:**
  - `keepWhole` now also covers separators, weekdays, durations and Safari's "at".
  - One failure pattern ("Couldn’t load …" + Try again).
  - "Your session ended" + Sign in.
  - A failed send keeps the page and the entries (Time off, Availability).
  - The submit button stays focused while sending.
- **Heights and placeholders:**
  - `HoldHeight` holds in the same render.
  - My time holds its height.
  - Placeholder bands grow with text size: a root-layout script sets `--nv-text-scale`, with per-route `--route-band-grow` and landscape heights.
  - A single request's review has no section tabs.
- **Shared kit:**
  - Kit pages start at the left edge on desktop.
  - Inter has a metric-matched fallback.
  - Avatars and tiles are sized in rem.
  - The More sheet's Close is sticky.
  - Pill rows fade only when they truly overflow.
  - Double-tap guards on ConfigurationForm and ShiftChangeForm.
- **Test data:** a valid swap pair now exists (AUDIT-E ↔ AUDIT-SWAP). AUDIT-E's Availability page is no longer empty; use AUDIT-LONG for the empty state.

**Out of scope:** payroll wording. List it for Jose instead.
