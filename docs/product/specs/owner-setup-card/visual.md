# Owner setup card: visual spec

- **Initiative:** direction item 10 (A10). PRD: `docs/product/prd-owner-setup-card.md`, including "Decisions (Jose, 2026-10-17)": the availability deadline stays a Task; Owners only; no extra steps this cycle. Flows: `flows.md` in this folder.
- **Written:** 2026-10-17 by the UI Designer, cycle 1 design step.
- **Evidence:** live fictional Owner Home at 1440 on 2026-10-17 (`before-owner-home-1440.png`: "10 weekly hour targets missing" sits fifth in Tasks under an amber "Setup needed" tag); live Owner Home at 390 and 320 (`../phone-search/before-owner-home-390.png`, `before-owner-home-320.png`); `src/components/manager-home-gusto.css:290-291` (`.home-progress`); `src/components/mobile-home-overview.tsx:6-12` (`Fraction`). Mock-up: `mockup.html`, `mockup.png`.
- **References:** HoneyBook's setup list with green checks and open circles ([mobbin](https://mobbin.com/screens/7c915d6b-2a99-4eb0-956d-e7a3a97bb265)); Klaviyo's "3 / 3 completed" group beside its steps ([mobbin](https://mobbin.com/screens/709b5146-6c1e-4bb4-9dbf-a0acfab1c271)); Square's "3 of 6 steps completed" line ([mobbin](https://mobbin.com/screens/9a32644d-c67c-4185-b2f3-f50af9ecf43a)).

## 1. Visual intent

The card is a short to-do list in the same plain box as Tasks and the Today strip. It should look finishable: two rows, a count, a thin bar, and a link on whatever is left. It carries no illustration and no colour beyond the ladder green for "done", and it leaves without ceremony.

## 2. Tokens

No new colour token. I propose one local custom property so the bar colour can follow the Checkpoint 2 ruling in one line.

| Use | Value | Contrast |
|---|---|---|
| Card (desktop) | `--g-canvas`, 1px `--g-border`, 12px radius, no shadow | Same container as Tasks (`portal-desktop.css:76-78`) |
| Card (phone) | `--mh-surface`, 12px radius, `--mh-shadow`, no border | Same as the phone Home cards |
| Heading, desktop | 600 16px, `--g-ink` | 17.04:1 |
| Heading, phone | 400 15px, `--g-muted` (the "This week" label style) | 6.05:1 |
| Count line | Number `--g-ink` 600, " done" `--g-muted` (desktop); 600 20px ink (phone) | 17.04:1 / 6.05:1 |
| Bar track | `--g-hairline` #ECEDEF, 4px, 999px | Decorative, `aria-hidden` |
| Bar fill | `--home-progress-fill`, default `--g-accent`; recommended ladder green #1D6F42 (3.1) | Green 5.27:1 against the track |
| Done mark | Phosphor `CheckCircle` fill, #1D6F42 | 6.17:1 on white |
| "Done" word | #1D6F42, 600 | 6.17:1 |
| Open mark | Phosphor `Circle` regular, `--g-muted` | 6.05:1 |
| Step link | `--g-accent` 600; hover `--g-accent-hover` with underline | 5.53:1 / 7.82:1 |
| Reason | `--g-muted` | 6.05:1 |
| Brand (Ocean) | Links take the derived accent #1D4ED8 | 6.70:1; B1 keeps every brand at 4.5:1 or more |

The green is the existing success colour (`--color-state-success`, `globals.css:25`, used by `.status-pill.success`). A follow-up could name the ladder as `--g-status-*` tokens; this card doesn't need it.

## 3. Component and states

### 3.1 Layout

**Desktop, 900px and up** (`mockup.png` frame A):

- New grid area `setup` above `today` in `.home-layout` (`manager-home-gusto.css:355-365`): `"setup setup" "today today" "tasks week" …`. 20px gap to the strip.
- Inside the card, two columns: a 260px left block (heading, count, bar) and the steps in a two-column grid, each step after a 1px `--g-hairline` left rule with 16px padding. Card padding 16px 20px; height about 112px.
- 761 to 899px: the steps stack under the heading block, with hairlines between rows.

**Phone** (frames B and C):

- The card takes the position the Today tiles hold today, straddling the masthead edge (UX V1). The tiles follow on the canvas with 12px space.
- Padding 16px 20px. Heading, count, bar (8px above, 4px below), then the steps as rows with 1px hairlines between them.

**Bar colour (PRD Q5, UX V2).** The bar counts finished steps, and the card already marks finished steps green, so a green bar keeps one meaning for "done" on the card. Teal on a bar nobody can press strains P1. My recommendation for the Product Designer at Checkpoint 2: move both bars (this card and This week's) to the ladder green. Until that ruling, ship the existing teal through `--home-progress-fill`.

### 3.2 Step rows

| Part | Open step | Done step |
|---|---|---|
| Mark | `Circle`, 20px, `--g-muted`, aligned to the link's first line | `CheckCircle` fill, 20px, #1D6F42 |
| Title | The step name is the link (UX 2.1): "Set coverage periods" / "Add weekly hour targets" with a 16px Phosphor `CaretRight` (the visible "›" of the voice guide). Desktop 16px/600, phone 17px/600 | Plain name in ink 600: "Coverage periods" |
| Status | n/a | "Done", #1D6F42 600, right-aligned on the title line (desktop 14px, phone 15px) |
| Reason | Under the link, 14px desktop / 15px phone, `--g-muted`, `text-wrap: pretty` | None |
| Target | The link is a block, at least 44px tall, wraps on narrow screens; the caret stays with the last word | No link |

No strike-through on done titles: it lowers legibility and makes the card look like history instead of a status.

| State | Look |
|---|---|
| Link default | Teal 600 |
| Link hover (pointer only) | `--g-accent-hover`, underline at 3px offset |
| Link pressed | Same as hover; no scale (it's a text link) |
| Link focus | 2px `--g-accent` outline, offset 2px, 4px radius. Each step has its own ring; the card is never one link |
| Visited | Same as default |

### 3.3 Card states

| State (PRD §5) | Visual |
|---|---|
| Showing, first paint | Rendered from server props; no skeleton, no layout jump |
| Two gaps | "0 of 2 done", empty bar, two open steps (frames A, C) |
| One gap | "1 of 2 done", half bar, one done row, one open (frame B) |
| Live read loading, reconnecting, offline, unavailable | Identical to the last confirmed state. No stale badge, no spinner, no dimming. Tasks below shows its own status line |
| Done | The card is gone on the ready read. No "setup complete" message, no celebration (U7) |
| Regressed | The card returns with the new count; no highlight |
| Server read failed | No card |
| Manager, employee, lead | No card |
| 200% zoom and large root | Desktop steps stack below 900px CSS width; phone rows wrap; count and bar stay together |
| Increased contrast | Desktop border and phone hairlines turn `--g-ink`; bar track `--g-muted` |
| Forced colours | Card border `CanvasText`; bar fill `CanvasText`; marks use `CanvasText` (the "Done" word carries the state) |
| B1 brand | Links and focus ring follow the brand; done marks stay ladder green; the heading stays ink or muted |

### 3.4 Tasks below

The removed setup rows leave no gap or placeholder. The amber "Setup needed" tag (`portal-desktop.css:119`) stays on the weekly deadline and availability items.

### 3.5 Platforms

| Platform | Notes |
|---|---|
| iOS Safari, iOS PWA, Android Chrome, Android PWA | Phone layout above; the card sits under the masthead safe area like the tiles do today |
| Store app (later) | Same web card |
| Desktop web | Desktop layout above |
| Dark mode | Not in scope (A16) |

## 4. Mock-ups and screenshots

| File | What it shows |
|---|---|
| `mockup.html`, `mockup.png` | A: desktop 1440 crop, two gaps above the Today strip (hover shown on the second link). B: phone 390, one step done, focus on the open link. C: phone 320 with the Ocean brand, two gaps |
| `before-owner-home-1440.png` | Today: setup items buried in Tasks |

## 5. Motion

| What | Motion | Reduced motion |
|---|---|---|
| Card enter and exit | None (PRD §5) | Same |
| Bar width | Never animates, matching `Fraction` | Same |
| Step turning done | Swaps on the next ready read; no check animation | Same |
| Link hover | 120ms colour | Instant |

## 6. Draft scorecard

| Line | Score | Why |
|---|---|---|
| Usability | 2 | One tap from Home to each fix, no scroll |
| Familiarity | 2 | Setup checklists in Square, HoneyBook, Klaviyo |
| Trust | 2 | Never claims done from a failed read; no celebration |
| Accessibility | 2 | Text carries progress; 44px links; every text 5.5:1 or more |
| Brand distinctiveness | 1 | Plain; the calm, verified trait shows in its behaviour, not its look |
| Durability | 2 | Plain list container already used on Home |
| Cost | 2 | Existing checks, tokens and grid |
| Continuity | 2 | Same destinations; Inbox keeps every item |
| **Total** | **15 / 16** | Go |

## 7. Open questions

| # | Question | Recommendation |
|---|---|---|
| UI-1 | Bar fill: ladder green for both Home bars, or teal for both? | Green for both, ruled together at Checkpoint 2 |
| UI-2 | Use the `setup-checklist` illustration (UX V3)? | No. It adds height on phones and Home has no brand-moment slot to spare |
