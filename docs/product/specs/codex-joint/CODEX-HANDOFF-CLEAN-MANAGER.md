# Codex handoff: clean Manager/Owner rebuild and final UI fixes

Written October 20, 2026 by the Claude coordinator. This covers the Manager/Owner rebuild (`claude/clean-manager`, built to Jose's approved v3 light mockups at 44a8b751) and the final fix rounds on every other UI branch. Local paths are on Jose's Mac.

## 1. One branch to take

`claude/release-integration` holds everything. It is `claude/clean-manager` with the other UI branches merged in, and it already contains `codex/verify-preview-33` (2eb2a03a), so it fast-forwards from that branch.

| Branch | Head | Notes |
|---|---|---|
| `claude/clean-manager` | ac895632 | Wave A's rebuild plus the coordinator's confirmation-round fixes (`claude/clean-manager-qa-fixes`, same head) |
| `claude/premium-phase-1` | 13fdb91f | Employee/Lead fixes, CI fixes; already merges Desktop and Profile |
| `claude/p35-wave-c-93e13c` | f32340ea | Settings, auth and hub pages |
| `claude/p35-profile-6cdee8` | abb9aa2f | Profile |
| `claude/p4-desktop-240fe0` | 2d9d1312 | 768–1440 desktop rules |

The merge order was verify-preview-33, then premium-phase-1, clean-manager, wave-c, profile and desktop. Every merge was clean, with no conflicts. Before the confirmation-round fixes, its `src/` was byte-identical to the integration tree both confirmation passes tested (e21a3da3). Those fixes (section 6) were checked in the same preview as they landed.

**Not included: `claude/nevora-compliance` (d0b6d1f5).** Jose asked the Wave C chat directly for this branch, which is based on verify-preview-33. It adds public /privacy, /terms, /support and /account-deletion pages, a "Delete my account" option for every role, and migration 0034_account_deletion_requests. Jose has confirmed every policy fact, so the pages and links show in production. Until migration 0034 is applied, Delete my account says it isn't available yet and points people to the support email. Sign-in isn't affected. Migration 0034 needs Jose's separate authorization before it reaches production, and Jose plans to push this branch himself. A trial merge into this branch conflicts in one file, `src/app/login/auth-refinement.css`, against Wave C's rem changes. Merge it only on Jose's go. Details are in `docs/compliance/README.md` on that branch.

Checks on the integration branch (054aa3d4, Node from Jose's Mac): `tsc --noEmit` passes, `eslint src` passes with no errors, and `vitest run` passes 7,377 tests in 448 files (801 skipped, 27 files skipped), with no failures.

## 2. Server work the UI needs (Codex owns these)

1. **Availability deadline action.** It needs a `returnTo`, so that setting the deadline from Scheduling rules goes back there. Scheduling rules also needs a section that shows and edits the deadline.
2. **Approved time off in Schedule cells.** This needs an authorized read of approved time off for each employee for the selected week, so Schedule cells can say "Time off" and not offer an empty slot. Until then the cells don't show it.
3. **Schedule load.** Schedule now calls the existing `loadManagerDashboardData` read; there's no new query. The October 19 load run measured p95 10.6 s at 200 people with 20 requests at once. Jose decides whether that ships or needs a narrower read (LOAD-2026-10-19.md).

No server behaviour, permission or data contract changed in the UI work. The only server-adjacent edits are the existing Inbox `item=` link parameter (`withFilter`, 6ced0160) and a `returnTo` already supported by the routes.

## 3. CI and browser tests to rewrite

The clean pages changed markup that some older browser scripts depend on. The UI is right; the scripts need updating.

- `scripts/phase-d-browser-qa.mjs` passes up to line 105. From there on (Insights, Action Center, corrections and the Clocker PIN), the checks look for older Manager markup.
- Phase E Manager checks need the same review. Locally, the Phase E browser run needs Playwright 1.62.1, which isn't installed on Jose's Mac, so only CI can run it.
- Timecards: the Approve action moved from each row into the detail sheet.
- The auth button is now labelled "Sign in" (it was "Sign In").
- `scripts/phase-d-attendance-ui-qa.mjs` passes 46 of 46 locally.
- The validate job needs `fetch-depth: 0`, because the tenancy tests read the pinned commit 7c628e37 (1fa7a260).

## 4. Known items left as they are

- **Text-scale script warning.** On a `notFound()` page, the root layout's text-scale script prints a warning, in development only.
- **Clocker PIN and punch screens.** These still size in px. They weren't changed because no fixture could verify them.
- **Native selects.** Payroll's long select values end in "…". The wording stays word for word.
- **Inbox on blur.** Inbox pauses when the window loses focus. This is a privacy behaviour and stays.

## 5. Design rulings applied (Jose approved the v3 mockups)

- **Sizes and contrast.** Mockup sizes win: 13 px desktop text, 32 px rows and segments. Every small control on a touch screen gets an invisible 44 px hit area, and mouse targets may be mockup size. Text contrast is at least 4.5:1, other elements at least 3:1.
- **Fonts.** Owner and Manager pages use the system font, as approved in spec.md lines 16 and 181. Employee and Lead pages keep Inter.
- **Layout.** One title position (x264, y84 on desktop) and one 16 px card inset. "Add shift" sits in the top bar on Home; Schedule has its own.
- **Words.** The company's own vocabulary wins (for example "employees").

## 6. Test evidence

- **QA rounds.** Full layout, alignment and spacing rounds ran on every page and role at 320, 390, 768, 1024 and 1440 px, at text sizes 100–200%, plus landscape phone and WebKit. Rounds: emp-a, emp-b, mgr, h4–h9, r2–r4, final, final2. The last pass ran on the build above as two confirmation passes, confirm-desk and confirm-phone.
- **Evidence location.** On Jose's Mac, under `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS/8c7acfe8-4195-49cb-a26a-ba2ac9ec5c59/scratchpad/qa-out/`, with screenshots and JSON for each route.
- **Unit tests, types and lint.** All pass on the integration branch (section 1).
- **Confirmation round fixes (October 20), each re-measured in Chromium and WebKit where relevant:**
  - Scheduling rules and Payroll settings: a mouse click on page content jumped the page to the bottom and broke the WebKit back link (`KeepFocusClear` scrolled for a focused `<main>`). It now acts only on keyboard focus with a target that fits.
  - Inbox item sheet at 761–1023px: content touched the screen edge; it now uses the phone sheet insets as a centred 600px sheet.
  - Schedule More: on phones Close sits on the sheet's bottom edge, and no focused row hides under it. From 768 to 1299 the menu uses the same dropdown style as at 1300 and up.
  - Title at y84 on Pay runs, Time exports, Templates and Update detail.
  - Touch areas: 44px for Payroll tabs, Availability chips, Schedule location tabs and the "not planned" link (38px at 768).
  - Card insets: one 16px inset in Wave B cards, with the body 16px under a card head's rule.
  - Focus and text: inner focus rings where edges clipped them; no overlap from wrapped statuses; request dates break only at the dash; statement file names show at most two lines.
  - Payroll population on desktop shows plain labels, not raw codes (`period_open`).
- **Known small gaps left:** on Settings Find cards the body starts 4px in from the card head (x285 vs x281, Wave C pages, unchanged). Home's "Show N more" size depends on the time of day, so it couldn't be re-measured.

## 7. Still needed before production (Jose decides)

- Jose's real-device pass (iPhone with VoiceOver, Android with TalkBack), using DEVICE-CHECKLIST-REVIEWED.md
- **Release blocker: the production database is at about migration 0002.** On October 20 the Wave C chat ran a read-only check of Neon project NEVORA (rough-fire-63258908), branch main (br-green-night-b87vx3ud, the Vercel production branch), database fuel_scheduler. The tables employees, locations, employee_sessions and location_staffing_settings exist; it has 3 employee rows and no live sessions. Everything from 0003 on is missing, including time_entries (0005), push_subscriptions (0007) and workspaces / locations.workspace_id (0008). The release code needs 0003–0034 applied as one reviewed step, after a backup branch and with Jose's authorization. Codex owns this migration plan. Nothing was written to the database. Details are in `docs/compliance/README.md` on the compliance branch.
- Production settings
- The Schedule load decision (section 2, item 3)
- The scheduling rules wording, which is legal text and needs Jose's approval
- Jose's explicit go for the merge into main and the deploy. Nothing here is merged into main or deployed.
