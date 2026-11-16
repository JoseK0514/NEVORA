# Phase 1, part E: every Phosphor icon draws bold (SY-012 / UI-6)

Patch: /private/tmp/claude-501/-Users-josek0514--claude-spares-spare-23XJTe/d762c6df-53eb-43b4-836f-475a53cde009/scratchpad/p1patches/e.patch
(113 files: 110 source .tsx, 1 test comment, 1 HTML file snapshot, 1 new guard test. No CSS. Nothing committed.)

## Counts (non-test .tsx under src, both ui-preview folders left out; includes icons drawn through `Icon` / `Glyph` / `x.Icon` aliases)

| Weight | Before | After |
|---|---|---|
| bold | 380 | 704 |
| no weight (drew regular) | 317 | 0 |
| explicit regular | 7 | 0 |
| fill | 9 | 9 |
| duotone | 9 | 9 |
| expression | 4 | 4 |
| Total | 726 | 726 |

The audit's "309 of 678" counted only directly imported tags; my count also includes the alias render points.

## How it was fixed

- 325 edits in all. 312 were per element (`weight="bold"` added, or `regular` changed to `bold`).
- 12 were at the single render point of an icon map or `const Icon = ...` alias (9 had no weight, 3 were `regular`): availability-feedback, employee-home-quiet, employee-updates (covers update-visual's map), legal/account-privacy-links, manager-action-center, manager-dashboard (`event.Icon`), manager-today, notification-inbox (two render points), signature/system-state, mobile-home-overview, update-visual.
- 1 expression: src/app/app/schedule/publish/page.tsx:169 `weight={allPublished ? "fill" : undefined}` now falls back to `"bold"`.
- No new wrapper default was needed: `NavIcon` and `ClockerIcon` already default to bold; BIcon children are plain icon elements and were handled per element where they lacked a weight.
- No IconContext provider: verified in node_modules/@phosphor-icons/react/dist/lib/SSRBase.es.js that the `dist/ssr` icons (nearly every import here) ignore the context and default to regular.

## Exceptions kept

- fill (9): account-deletion-form:86, command-finder:201, owner-setup-card:28 and :79, wave-b-forms:127/161/223, toaster:52, wave-a/parts:25. All filled-state marks.
- Expressions (4): app-shell:587 (`active ? "fill" : "bold"`), kit/kit.tsx:233 (`neutral ? "bold" : "fill"`), publish/page.tsx:169 (above), plus the pass-through in nav-icon / clocker-icon (default bold).
- duotone (9, all explicit before this pass, kept and allow-listed in the guard): requests/time-off-form.tsx:85, auth-access-symbol.tsx:7, company-access/employee-invitation-panel.tsx:75, company-access/manager-operational-scope-panel.tsx:41, employee-time-panel.tsx:70 and :105, payroll-export-motion.tsx:9, payroll/payroll-ui.tsx:39 (two). Note for the coordinator: these are 20 to 28px heading or tile marks, not large illustrations, so they still break "one weight"; a decision to make them bold is a one-line change each.
- regular left: none. All 7 explicit `regular` became bold (auth-disclosure-symbol x2, mobile-home-disclosure, notification-inbox x2, mobile-home-overview, update-visual); no comment said regular was intended.
- Not touched: src/app/ui-preview/** (as instructed; it has no icons itself) and src/components/ui-preview/** (30 unweighted icons in signature-preview 26, home-preview 2, kit-preview 2). Those components are only imported by the /ui-preview routes, so I treated them as part of the excluded preview surface. Say if you want them included; the guard skips both folders with a reason.

## Bold icon in a small circle or tile (16 to 18px icon, sizes unchanged, please look)

- 32px `.q-av` circle with a 16/18px `.q-ic`: account-deletion-form.tsx, employee-updates.tsx, manager-inbox.tsx, notification-inbox.tsx (line 94), quiet/quiet.tsx; also check availability-team-list.tsx, clocker-recovery-review.tsx, manager-profile/manager-profile-live.tsx, manager-shift-requests.tsx, employee-my-schedule.tsx, quiet/quiet-sheet.tsx (same class in a changed file).
- 26px `.auth-disclosure-symbol` circle with 16px plus/minus: auth-disclosure-symbol.tsx (was explicit regular).
- 24px `.em-request-icon`: employee-mobile/exchange-view.tsx, employee-mobile/messages-view.tsx.
- 36px `.c-row__icon` / `.c-act__icon` with a 16/18px `.c-ic`: employee-mobile/passkeys.tsx, employee-shift-sheet.tsx, corp/corp.tsx, manager-dashboard.tsx (line 192).
- 18px in icon buttons: payroll/native-tax-fields.tsx (`.pw-icon-button` trash).

## Guard

New: src/test/phosphor-icon-weight.test.ts. Parses every non-test .tsx with the TypeScript parser and fails with a `file:line <Tag> reason` list when a Phosphor icon (imported tag, or an `Icon` / `Glyph` / `x.Icon` alias) has no weight, can draw regular/thin/light/undefined, or is duotone outside the 7 allow-listed files (each with a reason). A second test fails if an allow-listed file no longer has a duotone icon. Checked that it fails when a weight is removed (toaster.tsx), then restored the file.

## Checks run

- `npx vitest run` on the 58 test files next to changed files plus app-shell.test.tsx: 59 files, 718 tests, 717 passed, 1 failed (timecards.employee-unchanged.test.tsx file snapshot). Refreshed that snapshot with `-u`; verified by script that old and new HTML are identical once `<path d>` data is removed (83 paths each). Added a dated line to the test's comment. Rerun: pass.
- Guard test, brand-lockup.test.tsx, timecards snapshot test: 3 files, 9 tests, all pass.
- `npx eslint` on all 111 changed .ts/.tsx files plus the new test: clean.
- Not run: project tsc, the whole suite, any browser render. No visual evidence was captured, so optical balance of the heavier strokes is unverified. Tests elsewhere that import changed components were not run; a grep found no other test asserting SVG path data.
