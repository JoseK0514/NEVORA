# Owner final polish, round 2 findings (deep pages and states; captures cap/pol1-desk, cap/pol1-phone). Nov 20, 2026
Source paths under src/. H=high M=medium L=low.
D1 (forms/pages outside the kit)
1 H exchange/open-shifts (app/app/exchange/open-shifts/open-shift-board.tsx): form not in a card, no gutter, heading white on canvas (phone); desktop fields on bare canvas, select placeholders cropped, Post shift 16px off. Wrap in kit card + 560 field block like Add shift.
3 H open shifts nav: back link "Schedule", sidebar lights Things to do, phone tab lights Home. Light Schedule.
8 H requests/hub closed page (app/app/requests/hub/page.tsx): step is filled teal (should be tinted), desktop has no 48px holder circle. 9 M it is the only deep page on b-screen--back (title 185 vs 158): move to c-nav frame.
16 M schedule/publish phone: empty lower band, card doesn't overlap; exit should be "Done" when nothing pending. 15 M compose + publish: no step line ("Step 1 of 2 · …").
17 M settings location (new) + updates compose phone: card 32px below band with a paler strip behind; use c-sheetpage frame.
18 M native date/time inputs (components/employment-date-fields.tsx, open-shift-board.tsx): placeholder in ink, browser glyphs. Grey placeholder, Phosphor indicator.
13 M Save/Cancel placement desktop: compose + company policies on band, others in card footer. 14 M branding + company policies show Save before any change.
D2 (notes, buttons, chips)
4 H timecard "Needs attention" block (components/timecards.tsx; b-foundation.css): not BCallout (no glyph/edge, bullets, amber body, filled teal inside). 5 H timecard sheet sticky footer ends 48px above sheet bottom on phone, content shows under it.
6 H grey filled pill as a 4th button kind: Request time correction, Decline (time off open), Prepare / Choose dates (payroll prepare), Download (payroll history), Upload (branding), Cancel (form footers). Reads like disabled. Use tinted/ghost/quiet kinds.
7 H amber notes with Tray glyph: person pay rate page, schedule Base scheduled pay (polC may have fixed schedule): drop icon override.
10 M Delete shift (app/app/schedule/edit/delete-shift-button.tsx; owner-b-pages.css): white pill with shadow inside a white card, red label left. One red-ink quiet pill, centred.
11 M settings/time-off buttons: filled, white outlined, bold ink text in one row (components/time-off-admin/). One filled, one tinted, one teal quiet. Also "Keep my account" white outlined on delete account.
12 M person time-off grey note: closing period, link 4px off with 30px empty under. Use callout action slot.
21 M chips without the 1px edge: "Waiting" (time off open), "Preview" (branding), "Meal" (break types) -> BChip.
22 M timecards list: every row has a chip ("Ready to finalize" green, "Ready to approve" amber): normal states -> BStatusText; keep chip for Correction waiting / Missing clock-out.
24 M help expanded: open item shows right chevron; "Forgot password?" only underlined link.
26 M schedule/templates "Save template" full-width primary 40px tall, 2px off field edge (should be 52). 27 L header divider stops at 900 of 1085.
31 L publish foot success: dark green disc -> kit done mark. 34 L timecard approved sheet: white circle on green card (reverse of kit); repeated sentence; cut-off Finalize period.
32 L delete account: red button 44 (rule 52), looks enabled with empty password.
D3 (facts, alignment)
19 M activity (view=activity) coverage rows: facts line ends on a dangling dot -> BSegs. 30 L locations "Northside Bakery — / Condado": em dash separator -> BSegs.
20 M branding preview dashed frame outside column, touches its label; divider stops short.
23 M date ranges: "Nov 16 – 22", "Nov 16 – Nov 22" (Activity), "Nov 16–22": one formatter.
25 M attendance "Clock-ins to check" heading lighter than siblings; red chip between heading and sub-line.
28 L company policies expanded: inner dividers short, text 3px off. 29 L payroll prepare "Weekly payroll" card three left edges. 33 L timecards/corrections rows have no avatar lead. 35 L footnote inset (312 vs 296/319) and band-to-card offset 32 vs 56 on rs/pto pages.
Not captured yet: decline steps and results, "decision isn't confirmed" note, cancel approval, delete shift confirm, delete account submit, approve N timecards confirm, finalize, payroll review/approve, add employee step 2, update send receipt, pay rate change flow, time off adjustment, PIN set, setup code QR, field errors on rs forms, toasts, discard changes, menus open, phone picker sheets.
