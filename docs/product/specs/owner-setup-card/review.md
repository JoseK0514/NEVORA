# Owner setup card: Product Designer review

- **Initiative:** direction item 10 (A10). Reviewed: `spec.md`, `flows.md`, `visual.md`, `mockup.png` (frames A to C), `before-owner-home-1440.png`, `docs/product/prd-owner-setup-card.md` with Jose's decisions (Q1 deadline stays a Task, Q2 Owners only, Q3 extra steps later) and `docs/product/direction.md`.
- **Reviewed:** 2026-10-17 by the Product Designer, cycle 1 sign-off before Checkpoint 2.
- **Code checked:** `src/lib/data/manager-dashboard.ts:131-137`; `src/components/mobile-home-overview.tsx:1-35`; `src/components/manager-home-gusto.css:285-291`; `src/components/manager-action-center.tsx:71-85`; `src/components/manager-action-center.test.tsx:13-30`; `src/app/app/schedule/settings/page.tsx:42, 70-100`; `src/components/manager-issue-focus.tsx`.
- **Method:** heuristic evaluation, aesthetic-usability check on the phone card, brand check against direction §1.2.

## 1. Final scorecard

| Line | Score | Reasoning |
|---|---|---|
| Usability | 2 | One tap from the top of Home to the section that fixes each gap, against two or three taps and a scroll today |
| Familiarity | 2 | A short setup checklist, as in Square, HoneyBook and Klaviyo; no tour, no coach marks |
| Trust | 2 | Never claims "done" from a failed read, plays no celebration, and words a blank target as a fact, not an error |
| Accessibility | 2 | Progress carried by text with the bar `aria-hidden`, a ring per link, reason tied by `aria-describedby`, 5.5:1 or more on all text |
| Brand distinctiveness | 1 | A plain container. The "calm and verified" trait shows in behaviour, not in the look |
| Durability | 2 | Uses Home's existing card, bar and grid |
| Cost | 2 | Existing checks and tokens; one lifted hook and filtered counts. No backend |
| Continuity | 2 | Same destinations; setup items move up the same screen; the Inbox keeps every item |
| **Total** | **15 / 16** | No 0 on Trust, Accessibility or Usability |

**Verdict: Go,** with the one required change in section 3.

## 2. Checks

### Constants

| Constant | Kept? | Note |
|---|---|---|
| Teal for actions only | Yes for the card; J1 fixes the bar | Links are teal; done marks use ladder green #1D6F42. The bar ships teal by default through `--home-progress-fill` until Jose rules |
| Status ladder | Yes | Green for done; deadline and availability items keep the amber "Setup needed" tag |
| Inter, Phosphor | Yes | `Circle`, `CheckCircle`, `CaretRight` |
| 44px targets | Yes | Each step link is a block at least 44px tall |
| 15px phone floor | Yes | Phone heading, reason and "Done" at 15px |
| WCAG 2.2 AA | Yes | Green 6.17:1; muted 6.05:1; forced colours rely on the word "Done" |
| Script-pinned strings and ids | Yes | "Open inbox", "Show all N tasks", "You’re all caught up" and the Tasks status lines keep their text |
| Navigation structure | Yes | No entry added or moved; links reuse `/app/schedule/settings` with section fragments |
| Payroll and legal copy | Not touched | |
| B1 branding | Yes | Links follow the brand accent within the floors; done stays green |

### Platforms and states

- **Platforms:** desktop at 900px and up, 761 to 899px, phone at 390 and 320 (iOS Safari, iOS PWA, Android Chrome, Android PWA), and the future store app. Covered.
- **States:** two gaps, one gap, first paint from server props, live read loading, reconnecting, offline and unavailable, link tapped offline, done, server read failed, other roles, preview Owner and Manager, regression when a new location or employee appears. Keyboard, screen reader, reduced motion, 200% zoom, increased contrast, forced colours and B1 each have a rule. Complete.

### Unapproved backend, legal or privacy work

None in the build. J3's "No target" follow-up needs a stored value, and the spec holds it for a separate backend go-ahead.

### Things I verified

- **J2's case is real.** With zero locations, `coverageRulesConfigured` is false because of `staffingSettings.length > 0` (`manager-dashboard.ts:131-137`), so the card does show and the coverage link lands on the settings page's "Add your first location" empty state (`page.tsx:92`).
- **The fragments resolve.** `#coverage-staffing` and `#target-hours` always render (`page.tsx:75`, `:96`), and `ManagerIssueFocus` handles the `coverage-` and `target-` prefixes (`page.tsx:42`). The "That issue is no longer available" notice won't fire for these links.
- **The coverage link lands on staffing, but periods live lower down.** Coverage periods save in a separate form below Location staffing. The card can't tell which of the three parts is missing without a data change, so the reason line naming all three is the right answer for now.

### Things I found that the spec missed

1. **"No tasks found in the checked sources." becomes untrue.** When only setup items remain, the spec shows the existing empty state (§1.8, AC3.3). Its second line says the checked sources found nothing, while the card right above lists two open setup steps. The D7 unit test reserves that line for a verified empty source (`manager-action-center.test.tsx:15`).
2. **The mock-up copy is stale.** Frames A to C show "Add weekly hour targets" and "7 employees don't have one yet." The spec's copy table (§1.6) replaced both with "Set weekly hour targets" and "{n} {people} have no weekly hour target." The build follows the spec.

## 3. Required changes before build

1. **A true second line for the filtered-empty case.** When Tasks are empty only because the card took the setup items, keep the "You’re all caught up" heading and replace "No tasks found in the checked sources." with "Setup steps are listed above." Keep the original line for a source that is empty, so the D7 test and its meaning stay intact. Add a unit test for the filtered-empty case and a row to check 2.9.

## 4. Decisions for Jose at Checkpoint 2

| # | Decision | Spec recommends | My recommendation |
|---|---|---|---|
| J1 | Progress bar colour for both Home bars (this card and This week), through `--home-progress-fill` | Ladder green #1D6F42 for both | **Agree.** Nobody can press either bar, so teal breaks P1. Both bars count finished things ("Availability received 3 of 10", "Locations published 1 of 2", "1 of 2 done"), so green carries one meaning. The change touches manager and Owner Home, so slice 2 must list the This week bars as intended differences |
| J2 | With zero locations, the coverage step reads "Add a location ›" and links to `/app/settings/locations` | Yes | **Agree.** I confirmed the card shows in that case, and without the switch the Owner lands on an empty state and needs one more tap. Home already loads the location count |
| J3 | Approve the softer hours wording now, and a follow-up for an explicit "No target" choice | Yes to both | **Agree.** The settings page invites blank targets ("Leave a target blank to leave it out of the hours review.", `page.tsx:97`), so the card mustn't call that a mistake. The follow-up needs a stored value and its own backend approval |
| J4 | Fix lost unsaved staffing edits on the phone settings page by adding a sticky save bar and an unsaved-changes prompt to phone foundations slice 8 | Add to foundations slice 8 | **Disagree on where.** Foundations slices are type and shape changes proven by zero-diff runs. A save bar and a leave-page prompt change behaviour and would break that proof. Make it its own small UI item (PRD plus spec) right after the card ships, since the card sends Owners to that page. Still UI-only, so it needs no backend approval |
