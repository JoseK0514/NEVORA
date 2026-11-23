# Package F (screens): final fixes report

Branch `claude-codex-collab-nevora-screens-final`, from `claude-codex-collab-nevora` at `1480ed4c`. Code only in page
files; no kit or shell files edited. Fictional data only, throwaway local Postgres, nothing sent.

## Commits
| Item | Commit | Files |
|---|---|---|
| 1 G73 Owner Home load shift | `152b2ac9` | `owner-b/home-b.tsx`, `owner-home-corp.test.tsx` |
| 2 G77 Schedule More menu names | `b97b7036` | `app/schedule/page.tsx` |
| 3 G78 Daniel's location menus | `b7c1f2b2` | `app/page.tsx`, `app/schedule/page.tsx` |
| 8 G87 Shift request repeats | `bfcbbb14` | `manager-shift-requests.tsx`, `manager-workflows.test.tsx` |
| 4 G80 / G69 Employee Schedule | `cab0bde9` | `app/schedule/page.tsx`, `app/employee-b-desktop.css` |
| 6 G84 Find cover success line | `9d809496` | `coverage-assistant.tsx`, new `coverage-saved.tsx` |
| 7 G86 Lead's Compose overflow | `6e7338bc` | `app/employee-b-work.css` |
| 9 Messages back links, review Edit | `309f2014` | `messages-manager-b.tsx`/`.css`, `notifications-manager-b.tsx`, `communication-detail.tsx` |
| 5 G82 copy receipt | no change | already the closed-page notice (below) |
| 10 Manager Notifications from 768 | no change | cards render outside `.b-screen` (below) |

## How it was checked
A held copy of the owned test app (the scan harness with a scratch-only "hold" hook, **development build**, not a
production build), seeded with the rich Owner data and Daniel (`OWN-DANI`) limited to Condado. Edits were applied to
the running copy and measured with Playwright: page width, overlap boxes, axe-core, aria-current and layout shift. Unit
tests beside each change, `tsc --noEmit` and oxlint pass. Captures in `shots/screens-final/` are AFTER only and come
from this development build: there was no time left for the single production-build capture.

## Per page
**Owner Home (G73).** While Things to do (and the Timecards facts that come with it) is still being read, Shortcuts and the
second column (Payroll notice, Payday tile, This week) wait; a failed or offline read releases them at once. No words
changed. Measured layout shift: 0 at 390, 768 and 1440. Gap: this harness renders Things to do with the page, so the
pre-fix shift didn't reproduce here either (also 0 with API replies slowed 2.5 s). The proof is the unit test (loading
and reconnecting draw an empty second column; unavailable draws "Not available right now").

**Schedule More menu (G77).** "Availability" and "Availability deadline" had aria-labels that differed from their text;
they are now named by their text with a hidden comma between the two parts. axe with the menu open: before 2
label-content-name-mismatch nodes (Owner, 1440); after 0 (Owner 390, 768, 1440; Elena 390, 1440).

**Daniel's location menus (G78).** Home and Schedule mark the current place with `aria-current="page"`, the same as
Team, so the shared menu draws the check. Checked with Daniel given two fictional places: "All your locations" and
"Condado" each marked when chosen, Home 390, 768, 1440 and Schedule 390, 1440; axe clean. Schedule at 768 not captured
(the test app had stopped).

**Employee Schedule (G80, G69).** The cause on an unpublished week: the page always passed a "changes" element that
renders nothing, so the card drew a blank row and was titled "Open shifts and changes". Now no changes means no row, and
the card reads "Open shifts". Before/after words: "Open shifts and changes" → "Open shifts" (when nothing changed).
Your week (768 and up): seven columns while each day has 4.5rem; with 200% text at 768 the days wrap into rows of three
instead of overlapping ("8:00 AM –" over "9:00 AM –"). Default text keeps one row of seven at 768 (75px days, as
before) and 1440. Page width equals the viewport at 320, 390, 390 at 200%, 768, 768 at 200% and 1440.

**Copy receipt (G82).** Daniel opening a copy receipt sees the closed-page notice at 390, 768 and 1440: band "Copy
result", "Company-wide access needed", "An Owner can give it to you.", Return to Home. No access paragraph remains
(it was removed by the closed-page work earlier today), so nothing changed.

**Find cover (G84).** The shell removes `saved=1` from the address; the access frame's re-check then draws its checking
shape in place of the page (unmounting it) and the re-read came back without the flag. The page now keeps the saved
result for that cover address while the person stays on it, through remounts; another address or a reload drops it.
Checked at 390, 768 and 1440 with the flag removed from the address and 7–8 frame re-checks over 25 s: "Replacement
saved." stays and "Covered" doesn't appear. Before the change it was lost at 390 and 768 in the same check.

**Lead's Compose (G86).** The expiry help line inherited the kit's `.b-keep` nowrap; it now wraps. Page width 390 at 390
(was 424), also 390 at 390 with 200% text; 768 and 1440 unchanged.

**Shift requests (G87).** An opened request no longer repeats the row: the request's own shift shows only what the row
doesn't say (an overnight "Ends Tue, Oct 6", the place, the position, the lead); a cover request's "Result" row is
gone because the row's line already says it ("Picked up by Valeria Díaz", "Nobody has picked it up yet"). The other
person's shift in a swap keeps its full day and hours. Before: "Ana Colon's shift Tue, Dec 1 · 12:00 PM – 8:00 PM ·
Calle Loíza · Barista" + "Result Picked up by Valeria Díaz"; after: "Ana Colon's shift Calle Loíza · Barista".

**Messages (item 9).** Notifications (B3) and Update detail (B7) now show "‹ Home" / "‹ Updates" on the band from 768
(the same `CorpNav` link Shift requests uses); phones keep the B hero's link; one back link at every width. On the
review step, Edit is moved up by half the difference between its 44px height and the 1.5rem title line: its centre
matches the title's first line at 320, 390, 390 at 200%, 768 and 1440 (measured equal to the pixel).

**Manager Notifications from 768 (item 10).** The cards are rendered outside `.b-screen` (in the Corp page), and the
state card shows at 768 and 1440, so hiding `.b-screen` doesn't hide them: no shell change needed. Not verified with
rows: in this test app `/api/notifications` answers 503 (the notification service isn't configured), so every width
shows "Notifications didn't load".

## Buttons, edges, alignment
No button style changed. Every checked page's width equals its viewport at each width listed above, except the Lead's
Compose at 1440 with 200% text (not required; logged below).

## Impeccable audit (changed parts)
- Hierarchy: each fact once (G87, G80 title); one success line on Find cover (G84). Pass.
- Spacing: the Your week rows use the existing 10px gap; Edit's offset is derived from the title's line height. Pass.
- Accessibility: G77 names now match text; G78 current place exposed; one back link per width. Pass.
- States: Home loading (held cards), Find cover saved, unpublished week, closed copy receipt checked. Notifications rows
  not checked (503 in harness).

## Blocking items left
None of the ten is open in code. Unverified in a browser: G73's original shift (didn't reproduce in the harness) and
Notifications rows (503 in harness).

## Proposed ledger rows (end sweep)
| Page | Finding | Kind |
|---|---|---|
| Lead's Compose | At 1440 with 200% text the page is about 2018px wide (shell or band; not in the compose form) | end sweep |
| Updates (B6), Compose (B8) | No back link on the band from 768 either ("‹ More", "Cancel"); `deskBack` on `ManagerMessagesPage` can opt them in if wanted | end sweep |
| Copy receipt (location Manager) | Closed notice offers only Return to Home; the scoped variant's "Open your schedule" may suit Daniel better (wording decision) | end sweep |

No kit or shell change is needed for these ten items.

## Added items from the lead (after 13:51 UTC)
Merged `claude-codex-collab-nevora` (`dc0385d4`) first: `24b107ef` (one append-only conflict in `employee-b-work.css`,
both sides kept). Checked in a fresh held development build of the test app at the merged tip.

| Item | Commit | Result |
|---|---|---|
| Elena's Home Timecards tile repeats its count | `b244c59b` | "10 to approve" once; the detail says only "Pay period ended" (the header says Timecards; the other reviewer's card keeps its own line). |
| Owner Home: two Prepare buttons | `b244c59b` | While an overdue payroll leads, the Scheduled payday tile has no button; "Prepare Nov 9–15" (44px teal, unchanged) is the one action. Checked at 1440. |
| 11 B4 Things to do count twice | `cfacd9f5` | The band keeps the total; "All" has no count. |
| 16 B7 Remind drops under each name | `77fd3454` | Remind stays on the row while the name fits: rows 64px at 390 and 768; at 320 names wrap between words beside Remind. At 390 with 200% text it moves under the name (one row in the seed). |
| 14 B9 Help Contact paragraph short | `1c731363` | The note uses the card's width (right edge = card edge at 390, 768, 1440; Owner and Elena). The shared rule was in `@layer nv-b`, so the override is in that layer in `help/help.css`. |
| 13 E1 Time off closed card | `d54d17ca` | Band "Team time off", title "Time off is decided by an Owner", line "Jose Natal decides requests at your locations." (Spanish matched); way back is "Return to Home" for Elena and Daniel. 390, 768, 1440. |
| 15 F9 Help someone sign in at 390 | `7a5d584f` | On phones the form is one card with 16px gutters: Employee ID, How you checked, the guidance and Make reset link inside. 320, 390, 390 at 200% (width = viewport); 768 unchanged. |
| 12 B2 More profile line | `7d9ce66c` | Daniel: "Manager · Condado · Northside Café & Bakery", from the authority read the page already makes; Elena and Owners unchanged. |

Not captured as webp (time): these checks are measurements and the PNGs in the session scratchpad.
Note for Package K: none of these needed kit or shell files.
