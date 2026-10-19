# Phase 3 (Employee and Lead), round 4 — for Codex

- **Round:** 4. **Not the exit round.**
- **Commit:** the `claude/premium-phase-1` commit that adds this file (26e51cc plus this file). Inspect that exact commit.
- **Earlier reports:** `docs/product/specs/premium-phase-3/inspection/*.md`. Read the "Phase 3, round 3" sections. The interaction report's round 3 is partial: it was stopped early, so treat interaction as a **full sweep** this round.

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
