# Package M: manager side of C12 Shift changes and C10 Availability (Nov 23, 2026)

Branch `claude-codex-collab-nevora-staff`, merged with `origin/claude-codex-collab-nevora` at ef0905bf. Production build
(`NEVORA_OWNED_APP_PRODUCTION=1`), fictional Owner business (`NEVORA_SCAN_RICH_OWNER=1`), Owner `QAOWNER` and Manager
`OWN-ELENA`, Chromium.

## Commits
| Commit | Page | Change |
|---|---|---|
| f9f9d9c2 | C12 (Owner, Manager) | The decision grid keeps both slots, so a lone "Close request" (Open cover) or a lone Decline sits in Decline's slot instead of stretching across the row; every row's buttons line up. `schedule-tools.css` only. |

## What I found
C12's manager side was already moved to Direction B by the Schedule tools package (76e1cea6, 81fbc917): Corp page as the
band, one segmented control with one count ("Waiting 5"), one white card, kit rows (face, name with its kind chip, day and
hours, then who else is involved), the decision pair, empty states ("You're all caught up", "No open cover", "Nothing
decided yet"), the done-state results, and the Decline question. Against the brief:
- **Band with one count:** yes, "Waiting 5" only.
- **Rows:** name with the kind, then day and hours, then the other person or the cover result. This is the three-line
  form Jose asked for on Nov 23 (comment in `manager-shift-requests.tsx`), so I kept it rather than cutting to one line.
  Flag for Jose if "title plus one line" should replace it.
- **Approve and Decline:** one pair on every row, both 44px, right-aligned at 768 and 1440, side by side at 390 and stacked
  at 390 with 200% text. Decline is the quiet text button and Approve the white raised one, the kit's row-action rule
  (`b-foundation.css`, `b-rowact--quiet` and `b-rowact--go`), as on Things to do. **Fixed:** Open cover's lone Close
  request was stretched across the row with its label centered; it now sits in Decline's slot.
- **Nothing said twice:** an opened request adds only what the row doesn't say (G87, already in).
- **Time format:** every range reads "12:00 PM – 8:00 PM".

C10 Availability for the Owner uses the same `ManagerAvailability` component as the Manager; side-by-side captures show
the same band (week), deadline row, Not sent / Sent chips with counts and person rows (location under the name). No
difference found, no change.

## Checks (both roles, every tab)
390, 390 with 200% text, 768, 1440 and 1440 with 200% text: 0px horizontal overflow, no off-screen text, axe (WCAG 2.2
A/AA on `main`) 0 violations everywhere. Phone shots are viewport screenshots scrolled and stitched.

## Impeccable audit
- Hierarchy: band title and one count; rows lead with the person; one pair of actions per row, positive on the right.
- Spacing: rows on the kit inset; the decision pair keeps the 52px text inset at 390 and a fixed 9rem pair at desktop.
- Accessibility: axe clean; buttons named "Decline swap request from …" / "Approve …" start with their visible word.
- States: waiting, open cover, done and their empty states exist; the done tab had one decided request in this data.

## Tests
CSS only; `manager-workflows.test.tsx` (which reads the decision markup) passes unchanged.

## Blocking items left
None found.

## Proposed end-sweep rows
- C12 Done at 390: with the status on the right, the day and the hours of a can't-work row wrap onto two lines
  ("Thu, Dec 3" / "2:00 PM – 10:00 PM"); readable, not cut.

## C10 follow-up (Jose, Nov 23: "the not sent button, that is wrong")
- 9d53bcb3 (`schedule-tools.css`, test `availability-segments.test.ts`): Not sent / Sent is the kit's segmented control in
  the people card for Owner and Manager. At 390 the chosen pill hung past the left of its grey track and the track ended
  faded after Sent (the filter chips' scroll fade). Now one grey track wraps both segments with an even 4px inset, each
  segment is half and 44px tall, the chosen one is the white pill inside the track, the counts are the kit's grey
  numerals, and labels wrap at 200% text.
- Checked for Owner and Manager at 320, 390, 390 with 200% text, 1440 and 1440 with 200% text (no overflow, clipping or
  overlap, axe 0) and in forced colours (the chosen segment has the Highlight outline). C10-o and C10-m shots replaced.
