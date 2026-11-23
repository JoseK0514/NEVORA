# Timecards final fixes (D1, Owner and Manager), Nov 23, 2026

Branch `claude-codex-collab-nevora-timecards-final`, from `claude-codex-collab-nevora` at 12194c47, with origin's ab054840 (kit fixes) merged in 9054771a before the final captures. Only Timecards
files were changed: `src/components/timecards.tsx`, `src/app/app/owner-b-time-pay.css`, `src/app/app/owner-b-desktop.css`
(one Timecards-only rule at the end), and their tests. No kit, shell, server, permission or data-contract changes.
Fictional data and a throwaway local database only.

## Commits
| Commit | What |
|---|---|
| 61d48a28 | G89: on phones the band says the week (and when approval opens) without "12 people"; the Team card keeps "Team 12". The phone select view uses the same subtitle beside "Team (12)". |
| a28f66ce | At 320 with 200% text, the live dot sits beside the first line of a two-line "Clocked in now". |
| 69e34055 | G90: from 768 the title, period words, Show tabs, names, table cells and the person's week use the kit's rem type roles. The sheet wraps once its text passes 22rem. |
| a9bd8e79 | Person's week: an issue is said once (the header status is hidden while the amber note lists it); "Review the entries and resolve open time or corrections before approval." removed. |
| f0badef6 | Blocking: from 768 the band's Select was teal on the teal band (1.05:1, invisible). It's now the band's glass action. Show tabs get a 44px hit area; "Review correction" is now 44px. |
| 6f44f6b1, f8c12233 | G90 follow-up: at 768 with 200% text the Person column had shrunk to one letter. Under 36rem of table card, names and statuses wrap and Breaks steps aside, as on phones. |
| 9487f191 | 320: "Correction wai…" becomes the short form "Correction" (screen readers keep "Correction waiting"). |
| 08a33d62 | Phone select and review (Corp layout): title, week words, review button, count and hours in rem at the same default sizes; fixed heights became minimums (44/36/48px). Default pixel-identical (full-page diff at 390). At 320 with 200% text the footer wraps so Cancel stays whole. |
| 2e24fa18 | 320: Manager's own row "Jose approves thi…" becomes "Jose approves"; the Ready card's line breaks after the week, never inside "Nov 16–22". |

## Before and after words
- Phone band: "Nov 23–29 · 12 people · Approval opens Mon, Nov 30" → "Nov 23–29 · Approval opens Mon, Nov 30" (Team card: "Team 12").
- Person's week header: "Correction waiting" / "Clocked in now" chip above the note → no chip while the note shows; the note
  lists "Correction awaiting review" / "No clock-out yet".
- Note: "Review the entries and resolve open time or corrections before approval." → removed.
- 320 only: "Correction waiting" → "Correction"; "Jose approves this one" → "Jose approves".

## Checks
- Production build (`NEVORA_OWNED_APP_PRODUCTION=1`), Owner (QAOWNER, rich data) and Manager Elena (OWN-ELENA): list (this
  week), a person's week (last week) and Select → Review (last week), at 320, 390, 768, 1440, and 320/390/768 with 200%
  text, taken on the merged code (9054771a). 42 captures: page overflow 0, no overlapping row parts, no clipped or
  ellipsised text, axe 0 violations in `main` on every capture (all default rules plus label-content-name-mismatch and
  target-size, which the lead asked about; none found at 390, default or 200% text). `capture-log.jsonl` has each one.
- Fixed-px audit: from 768 at 200% text, every visible Timecards text doubles except the avatar initials (fixed circle,
  aria-hidden) and visually hidden status text.
- Keyboard: focus rings on every stop (white 2px on the band, teal 2px on white) at 390 and 1440.
- Targets: band Select 48px; Show tabs 36px look with a 44px hit area (checked by hit-testing 3px above and below); sheet
  link 44px; checkboxes inside 44px labels.
- Unit tests: `node scripts/run-rstest.mjs src/components/timecards src/app/app/timecards src/app/app/owner-b-time-pay`
  pass (new: G89 phone band, issue said once, dot, G90 rem roles, large-text sheet and table, Select on band, targets).
  `tsc --noEmit` clean, oxlint clean on changed files.
- Time format: day rows read "5:55 AM – 2:00 PM" (CorpTime); no other time ranges on the page.
- Not run: WebKit; reduced motion beyond the captures' `reducedMotion: reduce`; Clocker.

- Follow-up recapture (08a33d62, production, on ef0905bf merged): review view for Owner and Elena at 390, 390 with 200%
  text, 1440 and 320 with 200% text. Overflow 0, no overlaps, no clipped text, axe 0. Before, the phone select/review view
  left the title, week words, review button, count and hours fixed px at 200%; now they scale.

## Button styles and alignment
- Band: Select is the glass action (48px), the week control is the kit's segmented track (36px items, Package K).
- Summary: "Approve N ready timecards" is solid teal. Sheet: "Request time correction" and "Close open punch" are white
  secondary; "Approve timecard" is solid (disabled until allowed); Done is a text action in the sheet bar.
- Review (desktop): the confirm column is 560px wide by design (readable width), so its buttons end at 560px rather than
  at the card's right edge. Left edges line up with the card inset at every width.

## Impeccable audit
- Hierarchy: band title → period facts → week control → summary → table; each fact once (count in the Team card on phones;
  "All 12" is a filter count from 768).
- Spacing: 4/8 scale; the large-text rules change padding only below their thresholds.
- Accessibility: axe 0; names match visible text (short forms keep full words for screen readers); 44px targets in
  Timecards' own controls; text scales evenly at 200%.
- States: list, person's week, select, review, at default and large text, for Owner and Manager.

## Left for others (proposed ledger rows)
| Area | Item | Owner | Type |
|---|---|---|---|
| Kit `BSeg` / `--b-seg-fs` | Phone and desktop week control words are 14px fixed; item height 36px. | Package K | end sweep |
| Kit band rule (`owner-b-desktop.css` shared h1) | Every other page's band title is 32px fixed; Timecards now uses 2rem. | Package K | end sweep |
| Kit `BHero` glass Select | 40px on phones (under 44). | Package K | end sweep |
| Avatar initials | `c-av` 13px fixed in a fixed circle (same as G79). | Package K | end sweep |
| Timecards wording | "Approve each timecard, then finalize the week to lock it for payroll." explains the steps; kept as possibly approved payroll wording, so Jose should decide. | Jose | wording |

## Jose's review (Nov 23, 2026, ~15:40 UTC): the person's week and the review panel
Commit dbf064b6 (merged f5f64a2c first, 92a51801). Production recapture: Owner and Elena; list, Luis Torres's sheet
(correction waiting) and the review panel at 390, 390 with 200% text and 1440. All 18 have no overflow, no overlaps,
no clipped text and axe 0. `src/components` 3231/3231 pass.

| Jose's point | What changed |
|---|---|
| "Request time correction" cut off behind the sticky "Approve timecard" | When Approve (or Finalize) is the footer, "Request time correction" sits in the footer above it: both 44px, 8px apart, on the same edges, and the sticky footer no longer covers anything. |
| Grey "Approve timecard" with no reason | When an open issue blocks approval the footer isn't shown; one line says why: "Approve after the waiting correction is reviewed." (or "…after the open time is closed", "…after the overlapping time is fixed"; "Finalize after…" for an approved card). |
| "Request time correction" reads wrong for the Owner | It sends a correction request that another manager approves (its page is titled the same and its button is "Send correction request"), so the label stays. While a correction is already waiting it isn't offered; the note's "Review correction" is the next step. No server action changed. |
| "Needs attention" outside the cards, icon on the edge | The note sits inside the person's card under the figures, on the card's 22px inset with its dividing line. |
| Review panel stops at ~560px | From 768 the rows, the checkbox and Cancel/Approve use the card's width (Cancel's text and the rows on the 19px inset, Approve on the right edge). |

Before → after words: the disabled "Approve timecard" → "Approve after the waiting correction is reviewed."; the steps
line "Approve each timecard, then finalize the week to lock it for payroll." steps aside while the reason line shows.

## Jose's review, part 2: "on the select review page, this is not b2 COMPLIANT" (Nov 23, 2026)
Commit 22c67232. Select and the selected set's review are rebuilt on the Direction B kit for Owner and Manager at every
width; the selection rules, labels, steps and the approve and finalize actions are unchanged.
- Phone: Select and the review are a Direction B screen: the band with the week segment (as on the list, Done on the
  band), the set's card, the team as kit rows with the kit checkbox leading ("Select all eligible" first, people who
  can't be picked greyed with their reason), and the Time tools card. Before: the corporate small title, week control and
  rows.
- Every width: the set's card is the kit's white raised card: the card heading ("3 selected" with the ready count, or
  "Approve 3 timecards?" with the week), the steps line, the outlined action field (360px wide from 768), kit rows for
  each timecard and its hours or result, "I checked these hours" as a kit row with its consequence under it, and the
  kit buttons on the card edges (Cancel or Refresh left as the white outlined button, the main teal button right; full
  width alone on a phone).
- Production recapture: Owner and Elena; list, Luis Torres's sheet, select and review at 390, 390 with 200% text and
  1440: 24 captures, no overflow, overlaps or clipped text, axe 0. `src/components` 3233/3233 pass.
- Captures retaken after merging the shared tip c32ae519 (kit buttons in rem at 200%): 24 again clean.
- Kit item left: the kit checkbox stays 20px at 200% text (a fixed size in b-foundation.css).
