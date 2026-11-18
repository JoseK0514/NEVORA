# Phase 7, package B: follow-up (b2)

Patch `p7patches/b2.patch` is the diff from `ba484432` (the end of `b.patch`) to `90ff6ed4` in `wt/p7b`. Seven files, 41
lines added, 23 removed. Evidence `evidence-moments/follow-up/` with `b2-log.json`. Nothing pushed, no branch.

## 1. Schedule published: the result sat above the week stepper

**What was wrong.** On tablets and desktop the result card was the first thing after the page title, in front of the
week stepper. The band's rules expect the stepper there, so the stepper fell onto the grey canvas with white text. The
card stood in that place before Phase 7 too; my patch kept it there.

**Fix.** `src/app/app/schedule/page.tsx`: the card moved into the roster's `notices` slot, which the page already uses
for route errors and "Not published yet". That slot is under the band and above the grid. No rule was needed in
`b-moments.css` and no other sheet changed. Phones were not affected (their result is in the phone screen's own notes)
and are unchanged.

**Measured** (`b2-log.json`, `after.normal` against `after.withResult` and `after.partial`), the same week loaded three
ways: without the result, right after a real publish, and with `published=all` where one of two locations is published.

| Width | Title top | Stepper box (x, y, w, h) | Behind the stepper | Result card top | `sameStepper` |
|---|---|---|---|---|---|
| 1440 | 88 | 296, 172, 276, 44 in all three | the band's glass in all three | 244 (overlaps the 296 band by 52, as a first card does) | true |
| 900 | 88 | 108, 172, 250, 44 in all three | the band's glass in all three | 244 | true |
| 390 | 74 | 20, 197, 350, 278 in all three | the band's glass in all three | 507 (under the band) | true |

The grid's head moves from 355 to 453 when the card is there, which is the card's own height plus the gap. Horizontal
overflow is 0 everywhere. The "1 of 2 locations published" case reads "1 of 2 locations published. Your team can see
those. The rest are not published." at all three widths.

Evidence: `schedule-published-1440`, `-900`, `-390` (after a real publish), `schedule-published-partial-1440`, `-900`,
`-390`, `schedule-normal-1440`, `-900`, `-390`.

## 2. The "4 Issues" badge

**What they were.** Two React hydration errors, each reported twice (once for `<details>`, once for `<summary>`): "In
HTML, `<details>` cannot be a descendant of `<p>`" and "`<p>` cannot contain a nested `<summary>`". They come from the
**Build and publish** page (`/app/schedule/publish`), not from Schedule. The badge was still on screen in my picture
because publishing redirects to Schedule inside the same document and Next's badge keeps its count.

**Where.** `src/components/schedule-generation-controls.tsx:49`: `<p className="schedule-generation-summary">` holds
`<Coverage>`, which since U09 (commit `868e2ed2`, Phase 4) renders `Explain`, a `<details>` with a `<summary>`
(`src/components/review-details/explain.tsx:9`). Line 29 of the same file has the same paragraph in the result of a
build. Both predate Phase 7; nothing I added or touched caused them.

**Fix.** Both paragraphs are now `<div className="schedule-generation-summary">`. Plain markup, no behaviour change.
The styles are by class (`publish.css:24`), so the line looks the same. The only tag-based rule that touched it
(`globals.css:12653`, under `.manager-schedule-page`) belongs to a page class no component renders any more.

**After.** `consoleErrors: []` on every run in `b2-log.json`, including the runs that go through Build and publish, and
no badge in `schedule-published-1440`.

Nothing else was left to report: these were all four.

## 3. Payroll approved said twice, and a ring on the title

**What was wrong.** The inline card and a toast both said "Payroll approved", and a screen reader got it twice. The
focused title drew the 2px ring of a control.

**Fix.**
- `use-payroll.ts`: the hook takes `inlineResult` (default true). When the screen draws the result inline, no toast is
  sent for it. The toast stays in two cases: "Pay statements shared" (the receipt for sharing has no inline done card,
  as before), and the native pay setup (`native-payroll-config.tsx`), which has no `Feedback` card and passes `false`.
  No payroll sentence changed.
- `payroll-feedback.tsx`: while the done card is shown, the block around it is `aria-live="off"`. The title takes focus,
  so focus is the one announcement.
- `b-moments.css`: a result's title is a heading, not a control, so it draws no ring on focus. This is what the Phase 5
  finish does (`.q-auth__receipt { outline: none }`, `quiet.css:528`) and what the Direction B page titles do
  (`time.css:78`, `hours.css:85`). It now holds for every done title, the confirmed week's included; before, a
  keyboard user saw a ring there too. The next Tab lands on the result's step, which draws the normal ring.

**After** (`b2-log.json`, `said`): `toastsInDom: 0`, `feedbackLive: "off"`, `activeIsTitle: true`, `outline: none`, at
390, 1440 and with reduced motion. Evidence: `payroll-approved-1440`, `payroll-approved-390`. As before, this approval
is forced in the page (the fixture has no payroll that can be approved); see `b.md`.

## Confirmations asked for

- **(a) U02.** `restrictions-screen.tsx` no longer imports or calls `toast()` (`agreed-times-sent-390`, `-1440`:
  `toasts: 0`). The result is announced by the page's hidden live line, `p.rs-sr[role="status"][aria-live="polite"]`,
  which was already there ("Request sent" in the log's `liveLine`). The visible card is `silent`, and focus goes to the
  page title as it did before.
- **(b) Any other moment with a toast and an inline result.** None. `toast(` is called in nine files. Among the Phase 7
  moments only payroll called it, and it no longer does when the card is drawn. The Toaster's own `?decided=` toast
  (a manager's time off decision) has no inline result. Its success flags (`published`, `submitted`, `saved` and the
  rest) are only removed from the address and are never toasted. The other callers (positions, break types, branding,
  features, Clocker tablets, Rondo) are not Phase 7 moments.

## Checks

- `tsc --noEmit -p .`: clean in `src`.
- `eslint` on the six changed TypeScript files: clean.
- Unit tests for the touched areas: `src/components/payroll`, `src/components/owner-b`, `src/app/app/schedule`,
  `b-viewport.test.ts`, `b-foundation.test.ts`, `timecards.batch.test.tsx`, `employee-mobile/moments.test.tsx`,
  `celebrations.test.ts`: 55 files, 819 tests passed. `schedule-generation-controls*.test.tsx` and
  `review-details`: 4 files, 42 tests passed. One test added (no toast repeats an inline payroll result) and one
  assertion (the block is not live while the card is shown).
- `git apply --check -R p7patches/b2.patch`: passes.
- Browser: owner at 390, 900 and 1440 (schedule published, payroll), employee at 390 and 1440 (agreed times, week
  confirmed), on the owned local database.

## Not verified

- The full unit suite was not run again after b2; the areas above were.
- Payroll approval is still a forced reply, and "Pay statements shared" was not exercised in a browser.
- The native pay setup's toast path is covered by a unit assertion on the source, not by a browser run.
- A screen reader was not used; the log records roles, `aria-live` and focus.
- Build and publish was loaded as part of the publish flow; the result of a build (line 29's paragraph) was not
  rendered in a browser.


---
Filing note (Nov 17, 2026): paths that start `p7a-work/`, `p7b-work/`, `p7c-work/` or `p7patches/` name the builder's working files, which were not kept. The pictures kept are in the evidence folder beside this report; where a builder captured more frames than are filed, the file named may not be there.
