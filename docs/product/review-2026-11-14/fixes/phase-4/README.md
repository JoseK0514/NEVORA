# Phase 4: Employee and Lead screens (Nov 17, 2026)

Phase 4 of the Nov 11 plan: the Employee and Lead findings on phones, tablets and desktop. Commit `27e40ff2` on `claude-codex-collab-nevora` (local, not pushed), built on Development `22107a24`. Presentation only.

The same day's feature items (U01, U02, U03, U09, U10, U11 and Rondo business evidence) are separate commits; see [the delivery index](../../../../handoffs/2026-11-17-claude-ui-delivery/README.md).

## What changed

| Area | Report | Main changes |
|---|---|---|
| Home, Schedule, Time, Pay | [g-home-schedule-time-pay.md](g-home-schedule-time-pay.md) | Tasks in the server's order with the first required one always shown; hero figures on one line; 72px rows with teal lead circles; the phone Schedule as one "This week" card of three rows; day chips that never clip on tablets; past days dimmed on the week strip; Pay's period as plain band text; an amber "Still clocked in since…" on Home when a punch runs past the shift's end |
| Notifications, Pick up and swap, Time off, Availability, Updates, Profile, More, Help | [h-requests-updates-profile.md](h-requests-updates-profile.md) | Rows that lead with the outcome ("Time off approved / Dec 10 – 11"); the Waiting count and chip; tabs sized to their labels; three-line update previews; the language control on the segmented tokens; a quiet Delete row; Sign out as a pill; one not-found card for every role |

Three rules are written once for the whole Employee and Lead app in `src/app/app/employee-b-account.css`: a row that opens leads with the teal-50 circle and a teal bold glyph; a note that qualifies a card is that card's footer; notes and sub-lines wrap in balance.

New rules sit in `src/app/app/employee-b-work.css` and `employee-b-account.css`, loaded after the feature sheets.

## The tracker

`docs/product/review-2026-11-11/status.json`:

| | Fixed | Partly | Open |
|---|---|---|---|
| Employee and Lead (34) | 30 | 4 | 0 |
| Tablet (19) | 19 | 0 | 0 |
| Owner (39) | 32 | 7 | 0 |
| Manager (17) | 14 | 3 | 0 |

Whole tracker: 109 fixed, 25 partly, 36 open. The open ones are signed-out pages (27, some now covered by U11 and not yet re-marked) and system items (9).

The four partly-fixed Employee findings: EM-005 (the notifications read lacks fields), EM-008 (a chip wraps under a long title below 1280px), EM-014 (a range with minutes in a narrow block was not re-verified), EM-018 (one sentence for a partly published week is Jose's wording to choose).

## How it was checked

| Check | Result |
|---|---|
| Type check, lint | Clean |
| Unit tests on the final tree (`vitest run --dir src`) | 14,846 pass, 1 fails: the manuals guard |
| Browser, combined build | Employee at 1440, 900 and 390 and Lead at 1440 and 390 on 16 routes: no page errors, no overflow, no phone target under 44px, bands at 196, 224, 296 and 363 |
| Per package | Employee and Lead at 1440, 900, 768, 390 and 320; forced states for the open punch and a failed Home read; Confirm through to "Week confirmed" against the real local server |

Not checked: 200% text, a real phone, Safari, a screen reader. Evidence: [evidence-work/](evidence-work/) and [evidence-account/](evidence-account/).

## For you to decide

1. Home's task order: the server's order with the first required task always shown (built), or required first (needs Codex).
2. One sentence for a partly published week (Home and Schedule use two of your Oct 18 wordings).
3. Open shifts on the phone Schedule is a row with a chevron, not the tinted "See open shifts" pill.
4. The amber "Waiting" chip on every waiting Time off row reverses NV-280.
5. On phones a notification's time ends the sub-line; a trailing time column broke titles at 320px.
6. New sentences: "Your manager keeps these up to date.", "Ends your access to this workspace", and the notification titles.

## Release sequence

Unchanged. Codex integrates and verifies with the backend on development. The exact verified release is promoted to main only after Jose approves.
