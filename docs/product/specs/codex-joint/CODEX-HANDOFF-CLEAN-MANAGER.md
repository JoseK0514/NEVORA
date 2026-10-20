# Codex handoff: clean Manager/Owner rebuild and final UI fixes

Written October 20, 2026 by the Claude coordinator. This covers the Manager/Owner rebuild (`claude/clean-manager`, built to Jose's approved v3 light mockups at 44a8b751) and the final fix rounds on every other UI branch. Local paths are on Jose's Mac.

## 1. One branch to take

`claude/release-integration` holds everything. It is `claude/clean-manager` with the other UI branches merged in, and it already contains `codex/verify-preview-33` (2eb2a03a), so it fast-forwards from that branch.

| Branch | Head | Notes |
|---|---|---|
| `claude/clean-manager` | 3661a51e | Wave A's rebuild; includes `claude/clean-manager-qa-fixes` (37af930f) and Wave A's earlier head cfbfd062 |
| `claude/premium-phase-1` | 13fdb91f | Employee/Lead fixes, CI fixes; already merges Desktop and Profile |
| `claude/p35-wave-c-93e13c` | f32340ea | Settings, auth and hub pages |
| `claude/p35-profile-6cdee8` | abb9aa2f | Profile |
| `claude/p4-desktop-240fe0` | 2d9d1312 | 768–1440 desktop rules |

The merge order was verify-preview-33, then premium-phase-1, clean-manager, wave-c, profile and desktop. Every merge was clean, with no conflicts. Its `src/` is byte-identical to the integration tree every confirmation pass tested (e21a3da3).

**Not included: `claude/nevora-compliance` (13bb9149).** Jose asked the Wave C chat directly for this branch, which is based on verify-preview-33. It adds public /privacy, /terms, /support and /account-deletion pages, a "Delete my account" option for every role, and migration 0034_account_deletion_requests. Its pages and links stay hidden until Jose fills in the `CONFIRM_` facts in `src/lib/legal/policies.ts`. Migration 0034 needs Jose's separate authorization before it reaches production. A trial merge into this branch conflicts in one file, `src/app/login/auth-refinement.css`, against Wave C's rem changes. Merge it only on Jose's go. Details are in `docs/compliance/README.md` on that branch.

Checks on the integration branch (ed4bf218, Node from Jose's Mac): `tsc --noEmit` passes, `eslint src` passes with no errors, and `vitest run` passes 7,377 tests in 448 files (801 skipped, 27 files skipped), with no failures.

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

## 7. Still needed before production (Jose decides)

- Jose's real-device pass (iPhone with VoiceOver, Android with TalkBack), using DEVICE-CHECKLIST-REVIEWED.md
- Production settings, and migration 0033
- The Schedule load decision (section 2, item 3)
- The scheduling rules wording, which is legal text and needs Jose's approval
- Jose's explicit go for the merge into main and the deploy. Nothing here is merged into main or deployed.
