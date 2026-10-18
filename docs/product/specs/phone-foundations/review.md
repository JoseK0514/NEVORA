# Phone foundations: Product Designer review

- **Initiative:** direction item 8 (A9). Reviewed: `spec.md`, `flows.md`, `visual.md`, `mockup.png` (frames A to H), `before-timecards-390.png`, `before-schedule-daypicker-390.png`, `before-schedule-1440.png`, `docs/product/prd-phone-foundations.md` with Jose's decisions (Q1 snapshot script, Q2 desktop stays px) and `docs/product/direction.md`.
- **Reviewed:** 2026-10-17 by the Product Designer, cycle 1 sign-off before Checkpoint 2.
- **Code checked:** `src/app/app/portal-gusto.css:25-32, 75-82`; `src/app/app/schedule/manager-schedule.css:44-66, 140-143`; `src/app/mobile-workforce.css:122-129`; `src/app/app/portal-design-system.css:94-97`; `src/components/manager-weekly-roster.tsx:105-125`; `public/fuel-portal-offline.html:22`.
- **Method:** design-debt audit of the day picker cascade, heuristic evaluation, brand check against direction §1.2.

## 1. Final scorecard

| Line | Score | Reasoning |
|---|---|---|
| Usability | 2 | Text can grow on migrated pages, "Refresh" stops wrapping to two lines, and the chosen day stops looking like a button you still have to press |
| Familiarity | 2 | Phones get the segmented control and button shape desktop already has (D4) |
| Trust | 2 | One button shape reads finished, and teal goes back to meaning "act here" (P1) |
| Accessibility | 2 | The chosen-day ring meets 1.4.11 at 5.64:1; 44px holds at a 200% root; inputs stay at 16px or more |
| Brand distinctiveness | 1 | Neutral at default size. It protects the teal trait without adding one |
| Durability | 2 | Retires legacy pills and px type, and unblocks dark mode |
| Cost | 1 | Nine slices, each with two diff proofs, and a rebuilt snapshot tool. Bounded, but not small |
| Continuity | 2 | Same labels, positions and accessible names; zero visible change at default size in step A |
| **Total** | **14 / 16** | No 0 on Trust, Accessibility or Usability |

**Verdict: Go,** with the five required changes in section 3 folded into the spec before slice 0 ends. Changes 2 and 4 must be settled before slice 6.

## 2. Checks

### Constants

| Constant | Kept? | Note |
|---|---|---|
| Teal for actions only | Yes, strengthened | The chosen day moves to ink plus a muted ring. J1 would clear four more teal marks on Schedule |
| Status ladder | Yes | Nothing on the ladder changes |
| Inter, Phosphor | Yes | Same scale; only the unit changes |
| 44px targets | Yes | Targets stay in px and are checked at a 200% root (A.5) |
| 15px phone floor | Yes | `--g-t-small` and `--g-t-caption` keep 15px as 0.9375rem. Tab labels at 12px (13px cap) predate the floor (U1); the spec should name them as an exception so the inventory doesn't flag them |
| WCAG 2.2 AA | Yes | Ring contrast measured; forced-colours outline specified; focus stays clear of sticky chrome |
| Script-pinned strings and ids | Yes | "Refresh timecards" stays the accessible name (`phase-d-browser-qa.mjs:66,70,82`); "Full week", `aria-pressed` and " · Full week" stay (`manager-weekly-roster.test.tsx:44`) |
| Navigation structure | Yes | Nothing moves |
| Payroll and legal copy | Yes | Check 8.1 requires an empty payroll copy diff |
| B1 branding | Yes | Each slice runs the default brand and one stress brand (S.3) |

### Platforms and states

- **Platforms:** §1.10 covers iOS Safari, iOS PWA, Android Chrome and PWA, the store apps and desktop. The spec states that most iPhone users won't see text grow until the shell exists. Good: that keeps the release notes honest.
- **States:** §1.8 covers loading, empty, error, offline, partial, success and permission denied at default size and at a 200% root. Reduced motion, keyboard, screen readers, zoom, increased contrast and forced colours each have a rule. Complete.

### Unapproved backend, legal or privacy work

None. Committing the snapshot script is approved (Jose, Q1). Desktop type stays px (Jose, Q2).

### Things I found that the spec missed

1. **Unitless line-heights won't give zero diff.** Spec §1.1 converts px line-heights to unitless at three decimals. 22px on 15px text becomes 1.467, which computes to 22.005px. The U10 snapshot compares computed values, so step A fails on rounding, and sub-pixel heights can move a line on long pages.
2. **The phone day picker has three competing rule sets.** `manager-schedule.css:142-143` (a flex row), `mobile-workforce.css:124-129` (flex, nowrap, 15px for both lines, `--mobile-selected` wash with `--mobile-accent` teal text) and `portal-design-system.css:95-97` (a four-column grid with `overflow: visible` at 600px and below). The spec says the phone picker "keeps `overflow-x: auto`" and computes 15px weekday over 17px date, but `mobile-workforce.css:128` sets both lines to `--mobile-caption`. The before capture shows a scrolling row, which suggests the mobile-workforce rules win. Nobody has measured it.
3. **On phones the chosen day isn't solid teal today.** The phone rule paints a wash with teal text (`mobile-workforce.css:129`); the solid teal fill is the desktop rule (`manager-schedule.css:55`). Teal text on a selection still breaks P1, so S3 applies. The step B change list has to name both rules.
4. **The offline page already meets D4.** "Try again" is 48px with 8px corners (`fuel-portal-offline.html:22`, DESIGN.MD U0). If slice 1 lists it as an intended change, check B.1 ("nothing missing") fails when nothing changes.
5. **Scroll into view can jump the page.** §1.5 calls `scrollIntoView({ block: 'nearest' })` when the picker mounts. At 390 the picker sits at the bottom of the first screen (`before-schedule-daypicker-390.png`), so on load the browser can scroll the whole page to reveal it.
6. **Build order with phone search.** Both initiatives touch the finder sheet's type. Phone search writes px; slice 1 here converts it.
7. **Mock-up typo.** The token table shows `min(0.75rem, 14px)` for tab labels. The spec already overrides it with 13px (D3).

## 3. Required changes before build

1. **Line-height rule.** Replace "convert px line-height to unitless" with "convert px line-height to rem (px ÷ 16)". Every n/16 value resolves exactly at a 16px root, and a rem line-height grows with the root. Keep a unitless value only where px ÷ font size is exact to three decimals.
2. **Map the day picker cascade in slice 0.** Record the computed layout, font sizes, padding and selected colours of the phone picker at 320 and 390 and state which rule wins. Then update spec §1.5 "Phone sizes" to the measured values, and list `portal-design-system.css:95-97` for removal in step A if it never applies (removing a dead rule is zero diff). If the grid rule does apply at 320, the spec must choose between grid and scroll before slice 6.
3. **Name both selected rules in the slice 6 change list.** `manager-schedule.css:55` (desktop solid fill) and `mobile-workforce.css:129` (phone wash with teal text), plus `.today:not(.selected)` teal text at `manager-schedule.css:56`.
4. **Scroll only the picker.** On mount, set the picker's `scrollLeft` so the chosen segment shows, with no page scroll. Use `scrollIntoView` only after a tap or key press inside the picker. Add a check to slice 6: loading Schedule at 390 with a day chosen leaves `window.scrollY` at 0.
5. **Housekeeping.** Remove the offline page from the slice 1 change list (it already conforms; verify it in slice 0). Add tab labels to the exceptions list as below the 15px floor by design (U1). Add one line on build order: phone search slice 1 lands first in px, and foundations slice 1 converts the finder sizes with the rest of the shared chrome.

## 4. Decisions for Jose at Checkpoint 2

| # | Decision | Spec recommends | My recommendation |
|---|---|---|---|
| J1 | Add Schedule's four other teal "selected" and "today" marks (grid-header disc, "Today" label, today column tint, phone location switcher) to slice 6 as listed intended changes | Yes | **Agree.** The P1 inventory at 1440 will flag all four, and the phone location switcher is a D4 miss. Fixing them in the slice that already touches the picker gives the page one way to show selection. The grid header is `aria-hidden`, so screen-reader output doesn't change |
| J2 | Give every D4 segmented control the same 1px muted ring on the chosen segment (14 desktop pages) | Yes, as its own follow-up after this cycle | **Agree, and make it the first desktop item next cycle.** A white chosen segment on the inset track measures 1.07:1, so today's selection cue relies on weight alone. That gap sits on an accessibility constant, so it shouldn't wait behind new features. It needs its own inventory and snapshot run, which is why I wouldn't fold it into this cycle |
