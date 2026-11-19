# Premium pass (Nov 18, 2026): status labels, notes, icons and building blocks

Jose's request, in his words: "go through every single warning, labels like the clocked late and all of those and every
single icon, and … make all of them more premium"; "besides icon … check buttons or those stuff that can have a premium
increase, make sure it is a upscale, you will only make the change if it is clearly an upscale"; and, pointing at the
information note on the Spanish Privacy page at 390: "things like this are the ones i am talking about that needs to be
improved … make sure if only upscaling".

This file restores the designer's spec, which was lost with the session's temporary folder on Nov 18. It is rebuilt from
the designer's final report, the mock images Jose received, the foundation builder's report and the decisions taken. The
foundation (section 5) is built and committed; sections 2 to 4 are what the page packages apply.

## 1. The rule

Change something only where it is clearly better at every width: crisper, more consistent, better aligned or better
proportioned, in a way a careful person sees at once. Where the current look is right or the gain is a matter of taste,
keep it. Never trade away DESIGN.MD (Inter, teal `#0B6E69`, the band, canvas, white 22px cards, pills, Phosphor bold,
light only), accessibility (44px touch, focus, contrast, reduced motion, High Contrast) or Phase 7 motion for a look.
If a change looks worse on a real page, scope it back or revert it and say why.

## 2. What the inventory found (today, before the pass)

- 11 components drew a status label; 92 chip looks in 7 heights and 6 type pairs.
- One meaning, many looks: "Clocked in" 6 looks in 3 words (Working, Clocked in, Clocked in now); "Not clocked in" 5 in 3
  words; "Clocked in late" 4 (amber on Home, green on Team); "On break" 4 (grey, teal, amber); "Approved" 4 (green or
  teal); time facts ("Tomorrow", "Starts in", "In 9 days") 6; Draft, Published, Open shift, Off today 3 each; Missed 3;
  Declined 2 (grey or red).
- Counts: 9 looks. Notes and alerts: 14 tinted or framed notes, 6 plain, 3 field-error looks, 2 toast looks.
- Icons: 140 Phosphor names in 1,008 uses; 12 fills outside a current entry; 9 duotone (a recorded exception); 19 sizes
  in code, 14 rendered; 12 containers; 5 row-chevron looks (one at 2.2:1); one concept with several glyphs (Time off 4,
  Can't work 3; Timecards, Payroll, the bell, More, error and success 2 or 3 each).
- Buttons: the filled teal button in 5 heights and 4 text sizes; 4 disabled colour pairs; 6 square buttons.

## 3. The target

### 3.1 Status labels
- **Quiet normal states.** In a list, the normal state is grey text (`BStatusText`, optional 6px dot): "● Clocked in",
  "Off today", "On break". Only exceptions are chips, so colour always means "look here".
- **One chip.** 22px tall, 12/16 at 600, 8px sides (7 with a dot, 6 with a glyph), radius pill, a 1px inset edge in the
  tone's own ink at 16% (`--b-*-edge`), never wraps, tabular figures on live chips. Five tones: amber (wait or check), red
  (stops you), green (done), teal (information), grey (neutral). A 6px dot marks a live state (someone is or should be on
  the clock). A 12px glyph only on a standalone red or green chip ("Stops payroll", "Published"). On the band the chip is
  white with its tone's ink.
- **One word set** (DESIGN.MD attendance words): "Clocked in", "Not clocked in · N min", "Clocked in late · N min",
  "Missed", "On break", "Off today". Never "Working".
- **Time facts are meta, not chips.** "Tomorrow", "Starts in 8 h", "In 9 days" are grey header text.
- **One count.** A 20px pill (`BCount`, `.b-pill`), tabular, never wraps ("At least 7" stays whole). The nav badge keeps
  its own form.
- **On phones a name and its time never wrap because of a status.** The status drops under the name and sub-line.

### 3.2 Notes and callouts (the anchor case)
The Spanish Privacy note at 390 is the reference. Before: a teal-50 box, dark-teal 15.5px paragraph, a 20px info ring,
an underlined link. After (`BCallout`):
- a one-line 600 ink title ("Este documento está solo en inglés" / "This document is only in English");
- the help path as the body, ink2 at 14.5/20;
- an 18px glyph centred on the title's capitals;
- a 1px edge hairline in the tone's edge colour (crisp on white, survives High Contrast);
- the email as the one teal underlined link, wrapping only after "@" (`BEmail`);
- 12px of space before what follows ("Abrir todo").
Five tones, one glyph per meaning: Info (teal information), ShieldCheck (privacy), HourglassMedium (wait), Warning (amber
check only), Question (not confirmed), WarningCircle (red only), Check (done), LockSimple (locked). Support's safety note
becomes "Keep private details out of email" with the ShieldCheck glyph. Every note family (offline, "Not confirmed",
closed-page notes, field help, card footers) uses the same anatomy by tone.

### 3.3 Field errors
One look on every form, signed-in and signed-out: red text at 500 with a 16px WarningCircle, the same anatomy as a red
callout's title line.

### 3.4 Icons
- Sizes per role: 12 chip, 16 inline, 18 lead, 20 control, 22 in a 48px state circle, 24 tab, 28 finish.
- Six round containers (`BIcon size` 32, 36, 40, 44, 48, 56); lead-circle tint follows meaning (timecards to approve
  amber, rail rows teal).
- One glyph per concept: CalendarMinus for time off (not Sun), Clock for timecards (not ListChecks); one glyph each for
  Can't work, the Owner's Payroll tab, My pay, the bell, More and retry.
- Row chevrons 16px in `--b-field-edge`. Sidebar Help 20px. Fill only for the current entry. The nine duotone icons stay.

### 3.5 Building blocks (16 reviewed: 11 changed, 5 kept)
- **Buttons:** one height ladder: 36 (card-header and explainer pills), 44 (row actions, state cards, form and sheet
  footers; drawn 44 on every width per B1), 40 on phone bands and 48 on the band from 768, 52 (a full-width primary, and
  red for the one destructive confirm). Text at 600 (the white band pill keeps 700). One disabled pair. Square buttons
  become pills.
- **Inputs:** 16px text (no iOS zoom), one placeholder grey, 48px. **Checkbox:** one 20px box, 6px corner, teal check.
- **Switch:** one off-track grey, the one thumb shadow. **Band search:** 44px, level with the filter track.
- **Counts, avatars:** initials at 600 in the person's own tint.
- **Toast:** Direction B: white, 16px radius, the elevation-2 shadow, the done mark for success, a round close.
- **State cards:** the card's own inset.
- **Kept:** segmented controls and switches (token hygiene only), selects and date fields, cards, sheet headers and footers.

## 4. Decisions (settled Nov 18; Jose left these to Claude under "only upscaling")

1. Chip hairline: yes.
2. Kiosk "not confirmed" glyph: the Question glyph (the circular arrow reads "send again").
3. Row actions 44px drawn on every width: yes (B1).
4. Phone bell: the coral dot (DESIGN.MD line 1912; done in Phase 8).
5. "Approved leave": kept (Jose's Nov 9 wording).
6. The nine duotone icons: kept (recorded exception).
7. Rondo AI glyph and name: the Rondo AI task.
8. The anchor note's title: yes (page chrome, not legal text).

## 5. The foundation (built, commit `cd28c5ab` on the local branch history)

Files: `src/app/b-tokens.css`, `src/app/b-tokens.test.ts`, `src/components/owner-b/b-kit.tsx`,
`src/components/owner-b/owner-b.css`, `src/app/app/b-foundation.css`, `src/components/toaster.tsx`,
`src/components/owner-b/b-kit-labels.test.tsx`. No user-facing words changed.

Reverted on real pages: band pills on phones at 15.5/22 (Payroll's band grew 52px; phones keep their type at 40px); row
buttons on phones at 14.5px (Home's "Next" line wrapped; phones keep 14px at 44px drawn); tabular figures on every chip
(Inter's tabular hyphen); compact buttons at 13.5px.

### Kit API for the page packages
- `<BChip tone="amber|red|green|teal|grey" label? dot? icon?="stop|check">`; without `dot`/`icon` the markup is unchanged.
  Without React: `span.b-chip.b-chip--{tone}` + `data-dot` + first child `<span class="b-ldot" data-tone="{tone}"
  aria-hidden="true">`.
- `<BStatusText dot?="green|amber|red|teal|grey" label?>` (`.b-status`); drops under the name below 360px.
- `<BCount tone?="amber" label?>` (`.b-count`); `BCard count` draws the same pill.
- `<BCallout tone icon? title? action? role? id?>body</BCallout>` inside a white card; `icon`: info, privacy, wait, check,
  unknown, offline, stop, done, locked, empty; `action`: `{label, href?, onClick?, aria?}` or a node.
- `<BEmail address="…" />` inside an `<a>`. `<BGlyph meaning="stop" />` for notice cards. `<BNote>` as a card's last
  child is its footer. `<BIcon tone size?={32|36|40|44|48|56}>`.
- Buttons: default `BButton` 36px; in `.b-row__trail`, `.b-row__acts`, a state card or `.b-notice` 44px; band 40/48;
  `full` and `big` 52px 16/22 600; `.b-rowact` 44px 14.5/20 600.
- No class needed: checkbox, field type and placeholder, error glyph, switches, disabled pair, toast.
- Tokens: `--b-*-edge`, `--b-chip-*`, `--b-count-h`, `--b-ic-*`, `--b-btn-h*`, `--b-shadow-thumb`, `--b-radius-menu`.

## 6. Page packages (no two share a file)

| Package | Scope | Files |
|---|---|---|
| P2 Owner and Manager | attendance words and variants, counts, Things to do icons and tints, Team, roster, Timecards, Payroll, Settings hub, Clocker owner pages, Schedule band, avatars, square buttons, closed pages | `components/owner-b/home-b.tsx`, `inbox-b.tsx`, `team-b.tsx`, `components/team-live.tsx`, `manager-weekly-roster.tsx`, `timecards.tsx`, `manager-time-corrections.tsx`, `components/payroll/payroll-runs.tsx`, `payroll-corp.css`, `components/corp/corp.tsx`, `corp.css`, `components/employee-requests-corp.tsx`, `owner-only-notice.tsx`, `components/clocker-device-manager.tsx`, `clocker-pin-inventory.tsx`, `clocker-photo/photo-settings.tsx`, `clocker-owner-b.css`, `components/manager-dashboard.tsx`, `app/app/schedule/page.tsx`, `app/app/more/page.tsx`, `app/app/owner-b-home.css`, `owner-b-schedule.css`, `owner-b-time-pay.css`, `owner-b-requests.css`, `owner-b-settings.css`, `owner-b-desktop.css`, `owner-b-pages.css` |
| P3 Employee and Lead | own clock state, time facts to meta, request words, Time off and Can't work glyphs, Updates glyph, callouts, footers, Pay chips, desktop week card chip | `components/employee-b/*`, `app/app/employee-b-desktop.css`, `employee-b-work.css`, `employee-b-account.css`, `components/employee-schedule-corp.tsx`, `employee-shift-sheet.tsx`, `components/employee-mobile/notifications-list.tsx`, `timeoff.tsx`, `components/restrictions/*`, `app/app/b-restrictions.css` |
| P4 Shell and navigation | nav glyphs, Help 20, bell glyph, sidebar ink token, top-bar initials, round sidebar toggle, a clean rail edge in short landscape | `components/app-shell.tsx`, `nav-icon.tsx`, `lib/navigation.ts`, `components/notification-bell.tsx`, `app/app/owner-b-shell.css` |
| P5 Signed-out pages | the anchor note, Support's note, sign-in banners, field errors, `.pl-note` and `.q-doc__note` to `BCallout` | `app/legal.css`, `components/legal/policy-page.tsx`, `policy-copy.ts`, `app/support/page.tsx`, `copy.ts`, `components/auth-premium/auth-b.css`, `auth-validation.tsx`, `app/login/page.tsx` |
| P6 Feature sheets and older kits | fills to bold, one success mark, notes in Wave A/B/C, payroll import and export, leave staffing, account deletion, setup card, error screens, square buttons | Wave A/B/C files, `schedule-corp.css`, `components/payroll-import/*`, `b-payroll-import.css`, `components/leave-staffing/*`, `account-deletion-form.tsx`, `account-deletion.css`, `owner-setup-card.tsx`, `payroll-ui.tsx`, `payroll-export-mapping.tsx` and its module css, `payroll-export-motion.tsx`, `kit/kit.tsx`, `time-off-form.tsx`, `components/company-access/*`, `employee-time-panel.tsx`, `auth-access-symbol.tsx`, `components/owner-advisor/*` (no Rondo name or glyph change), `app-error-screen.tsx`, `public-error-screen.tsx`, `calendar-subscription-panel.tsx`, `employee-account-panel.tsx`, `manager-action-center.tsx`, `manager-today.tsx`, `reports.tsx` |

Changes the foundation handed to the page packages: P2 row buttons pinned below 44px (`owner-b-home.css`,
`owner-b-schedule.css`, `owner-b-desktop.css`) to `var(--b-btn-h)`, Team desktop search to `var(--b-seg-h)`, thumb shadows
in `owner-b-desktop.css` and `owner-b-pages.css`, Home's full-width Prepare at 52px, `.c-pill` and count classes onto the
kit, Schedule band controls at 48px. P3 the 24px card-header chip, the glass chip on today's block (4.02:1) to the white
band chip, the count override, Pick up and Review at `var(--b-btn-h)`, thumb shadows, `.eb-callout` and the "still clocked
in" notice to `BCallout`. P4 the sidebar toggle round. P5 `.pl-note` and `.q-doc__note`. P6 `.q-deletion__box` onto the
checkbox rule; the payroll export module's hashed square buttons and disabled "Save mapping".
