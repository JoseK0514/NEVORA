# Craft pass on the company-knowledge and weekly-plan screens (Nov 16, 2026)

Jose found the two new Rondo slices generic and their buttons mismatched and misaligned. This pass measured both slices
against approved Direction B screens (Settings, Company profile, a person's page, Add employee, Positions) on the local
fictional workspace, then fixed every difference that came from my screens rather than the shared kit. Presentation
only: no request, parser, recovery rule or contract changed. The knowledge and weekly APIs were MOCKED in the browser.

## What was wrong (measured) and what changed

| Area | Found | Now |
|---|---|---|
| Action pairs | Secondary actions were filled grey pills; on phones pairs stacked full width; a disabled "Save as draft" drew the same grey (#F0F2F3) as "Decline" next to it | The kit's pair everywhere: a quiet text action (`b-rowact--quiet`), then one teal pill, on the right edge at every width |
| Option cards | Each ended in a full-width grey "Review option" button | A teal "Review option A ›" row closing the list (the "+ Add position" pattern); side-by-side cards end on one line |
| Status chips | Chips sat on a row's second line, at different heights and x positions from the chevrons (x 927 vs 960) | Chips sit in the value column, centred beside the chevron, like Settings' values |
| Typography | A monospace face for the saved text and fingerprint (13/21, 12/18), a 20px "Options" heading, a 16px week label, 14.5 and 12.5 issue text | Inter only, at the app's sizes: the saved text is body 15.5/22 on the rows' inset; the fingerprint is meta 13.5/18; no custom headings. Every remaining text style traces to the kit |
| Density | Loose issue paragraphs inside a row card; values that wrapped ("40 h of 40 h covered · +16 h", "Left out: week already published") | One "Things to check · 4" row; "40 of 40 h · +16 h"; location states in one word with "Left out of this plan" under the name |
| Spacing | 12px between my cards on desktop | 20px from 768px, as the app's cards |
| Disclaimers | A grey paragraph under several sections | One line per page |
| Wording | The phone header said "Review plan" on the saved screen; "Saved" appeared twice | "Saved", "What was saved · Saved at", "On the schedule now" |

## Checks

`tsc` and `eslint` clean; 41 test files, 377 tests pass. Browser passes (mocked APIs) on the finished code: knowledge 28
measured screens, weekly 25, no overflow or clipping, no page errors; all flows in both runs completed. Before and after
captures are in this folder (`before-*`, `after-*`; `after-ref-settings-1440` is the approved reference).

## Copy pass (Nov 16, 2026, second review)

Jose found the screens still wordy ("dirty letters everywhere"). Every string was rewritten to the voice of Fable's
approved Direction B screens: titles of a few words, one short sub-line, one short sentence in a state card, no
disclaimers. Presentation and wording only; no request, parser rule or recovery behavior changed.

- Removed every footnote paragraph (privacy, plain-text, hours and fairness basis, "this records…", library limits) and
  the form help paragraphs (dates, settings source, plain-text note). Privacy moved to the library's band sub-line
  ("Only Owners can see this"); the weekend-history basis is a row ("Weekend history · 6 of 7 known"); a partial search is
  a "Stopped early" chip.
- State cards and toasts cut to one short sentence: "Approval not confirmed · It may have saved. Sending again can't save
  it twice", "Draft saved", "Published", "Plan declined", "Check your connection, then try again".
- Rows: the weekly review puts the day in the schedule's day column ("Mon 16") and uses the short time range
  ("8 AM – 12 PM"); dates read "Nov 16"; delete consequences are two short bullets; saved coverage is one line
  ("2 reviewed · locations changed").
- Labels and errors shortened in the shared word lists (mode lines, inspection reasons, profile field hints, editor errors).

Checks: `tsc` and `eslint` clean; 42 files, 408 tests pass; knowledge (28) and weekly (31) browser passes with mocked APIs,
no overflow or clipping, no page errors.
