# Employee and Lead screens check (package `staff`), Nov 23, 2026

Branch `claude-codex-collab-nevora-staff`. Capture and gate check with fixes for the Lead's and Employee's B5 Requests
hub, B6 Updates, B7 Update detail, B8 Compose, E1 Time off, C10 Availability, C12 Shift changes, I1 Profile, and G10 Pay
(check only). Final captures from 3b6af350 (this branch merged with `origin/claude-codex-collab-nevora` at 48f33359).
Fictional data, production build (`NEVORA_OWNED_APP_PRODUCTION=1`), Chromium, signed in as James Ortiz
(`QA-SCAN-B`) with the Lead role, then the Employee role.

## Commits
| Commit | Page | Change |
|---|---|---|
| d31515ac | B6, B7 | The update card no longer repeats the band's title, author and time; Open and Acknowledge are the same outlined button |
| 83369478 | E1 | Removed "Open a request to see its details or withdraw it." (explained how the list works) |
| a1cbc2c8 | Employee rows | A wrapped time range at 200% text kept its first digits (":00 PM") |
| e36e7ad8 | B5 | From 768px the band's Waiting and Needs your answer figures are the only counts (lead's item) |
| 9d68ad9d | Employee rows | The dot column keeps its width, so a wrapped detail line keeps its first letter ("ustomer") |
| 5582e46d, 4fb23cbe, 27186f09 | C12, E1, B5 | Band tabs wrap their own label and grow at 200% text instead of overlapping; rules sit in the `nv-b` layer because the shared band rules use layered `!important` |
| 4a68d143 | E1 | A Time off row's screen-reader name is its visible text (rule 7) |
| 37e0fd83 | C10 | A day's hours wrap at 200% text instead of ending in "…" |
| 1683948e | B5 | At 320 with 200% text a row's grey line and its chip show in full instead of ending in "…" |
| c3d502d7 | Empty states (C12, E1, B5) | Title and line in rem; at 200% text the lines overlapped |

All changes are in `src/components/employee-b/*` (`messages-b.tsx`, `timeoff-b.tsx`, `requests-b.test.tsx`,
`account.css`, `employee-b.css`, `time.css`). Typecheck, oxlint and `requests-b`, `account-b` and `messages-view`
tests pass (all 251 tests in `src/components/employee-b` and `employee-mobile`).

Shared effect to note: `employee-b.css`'s Dotted line rule and the band-tab rule also apply to Employee Home and
Schedule (another session's pages); they change nothing at normal text sizes.

## Per page
Gate checks run at 390, 768, 1440 and 390 with 200% text (root font size), for both roles: horizontal overflow,
clipped/overlapping text, repeated lines, left and right edges, button classes and heights, time format, screen-reader
names against visible text, targets under 44px, Tab order with focus rings at 1440, and axe (WCAG 2.2 A/AA) on `main`.

- **Axe:** 0 violations on every page, width and role.
- **Overflow:** 0px horizontal overflow everywhere (B8 at 390 has an inner overflow, see below).
- **Time format:** every range reads `7:00 AM – 3:00 PM` style (e.g. "12:00 PM – 8:00 PM", "9:00 AM – 12:00 PM").
- **Edges:** at 1440 the band title and the cards share the 296px left edge on every page; cards end at 1108 (single
  column) or 1376 (two columns: B5, C12, G10).

| Page | Before → after words | Buttons | Notes |
|---|---|---|---|
| B5 Requests hub | Desktop "Waiting 4" in the band and again on the card → band only | Request time off white 48px; Review ghost 44px | Phone keeps the card counts (no band figures) |
| B6 Updates | — | Open was a bare text button beside an outlined Acknowledge → both outlined, 44px | 3-line preview is clamped on purpose |
| B7 Update detail | Card repeated "New closing checklist" and "Management · Nov 23, 9:12 AM" under the band → card shows the chip, Edited and the text | Acknowledge update teal 52px full | |
| B8 Compose | — | Review audience teal 48px | **Not fixed here:** right-edge overflow at 390 (Package F) |
| E1 Time off | Removed "Open a request to see its details or withdraw it." | Request time off white | Rows' names now their visible text |
| C10 Availability | — | Change one week, Agreed times glass 48px | Hours wrap at 200% |
| C12 Pick up and swap | — | Pick up ghost 44px | Tabs and detail lines fixed at 200% |
| I1 Profile | — | English/Español toggle 36px drawn, 48px tap area (`::after`) | No change needed |
| G10 Pay (check) | — | View statement teal 52px; See your hours, Pay history glass 48px | Notes for the Pay session below |

## Impeccable audit (after)
- **Hierarchy:** each page leads with its band title; one filled action per page (Acknowledge update, View statement,
  Review audience); secondary actions are glass or outlined.
- **Spacing:** cards on the 4/8 scale, consistent 296px left edge at 1440; no card misalignment found.
- **Accessibility:** axe clean; Tab order follows the page at 1440 with visible rings on page controls; remaining items
  are listed below as end-sweep rows.
- **States:** loading, waiting, decided and empty states use the shared state card; checked in the captures where the
  data reached them.

## Blocking items left
1. (Resolved: B8 Compose at 390 was fixed by G86 on origin; 1440 with 200% text by d7b495a1.)
2. G10 Pay (check only) at 390 with 200% text: the "Statement ready" chip runs past the right edge. For the Pay session.

## End-sweep items (proposed ledger rows)
| Page | Item | Where |
|---|---|---|
| All Employee pages | Desktop sidebar links (Home … Updates) show no focus ring on Tab | app shell |
| B7, B8, E1, C10, C12 | Band back link / Cancel is 32px tall at 768 and 1440 | kit `BHero` |
| E1, C12 | Band tabs are 36px tall; the kit should also take the wrap-and-grow rule | kit `BSeg`, `owner-b.css` |
| E1 | Request time off is 40px tall at 390 | kit `BButtonLink` white |
| B6 | Earlier update rows' names add "Unread"/"Read" and the time to the visible text (kept: the unread dot is hidden) | `messages-b.tsx` |
| C10 | At 200% text "7:00 AM" can split across lines in a day's hours (the string uses plain spaces) | `availability-corp.tsx` (shared) |
| C12 | At 200% text the day badge's "TUE" touches the "1" under it | `parts.tsx` `BDay` (shared with Schedule) |
| G10 | Statement rows' names ("Friday, November 20, 2026, corrected statement…") differ from visible text | Pay session |

## Captures
`shots/staff/img/<row>-<l|e>-<390|768|1440|390t200>.webp` (quality 80), 72 images; `rows.json` has one entry per page per
role (`-l` Lead, `-e` Employee). Phone and tablet shots are viewport screenshots scrolled down the page and stitched,
so the fixed tab bar sits only at the bottom and hides no row. `390t200` is 390 with the root font size at 200%.

## Follow-up after the final captures (13:50)
- Lead item: Employee Time off "9:00 AM – :00 PM" at 200% text. Already fixed here by a1cbc2c8 and 9d68ad9d; the kit
  session's capture came from origin before those were merged. Rechecked on 59350479 (this branch merged with origin
  8f05f419), Employee, production build: Time off and the Requests hub at 320, 390 (both with 200% text) and 1440, with no
  clipping, overflow, overlap or axe findings.
- 1683948e fixes what that recheck found on the hub at 320 with 200% text ("swaps for yo…", "Needs your ans…").
  The B5 rows' shots above were taken before this fix and look the same at 390.

## B8 Compose follow-up (14:00)
- d7b495a1 (`account.css`): at 1440 with 200% text the page was 2018px wide. The intro line ("Send an update to today's
  team…") inherited `white-space: nowrap` from the compose page's container and ran 578px past the card. The form's text now
  wraps; the rule sits in `@layer nv-b` with the weight of the shared compose rules in `employee-b-desktop.css`.
- Back link: Compose has Cancel → Updates on the band at 390, 768 and 1440 for Lead and Employee. Updates is a tab root
  (in the sidebar), like the Requests hub, and has no back link at desktop widths, as the other Employee tab roots.
- Recaptured B8 for Lead and Employee from d7b495a1 (origin cbbad9ff merged) at 390, 768, 1440 and 390 and 1440 with
  200% text: 0px overflow, no clipped, offscreen or overlapping text, axe 0 at every width. The 390 overflow is gone
  (G86 from origin). Rows `B8-l` and `B8-e` now point at these shots.
