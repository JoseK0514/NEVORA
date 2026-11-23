# Core screens check (package `core`, Nov 23, 2026)

Capture and gate check for the most-used screens, for every role except the location Manager (already approved):
B1 Home (Owner, Manager Elena, Lead, Employee), C1 Schedule (all four), C2 Add shift and C4 Edit shift (Owner, Manager),
F1 Team (Owner, Manager), and Who's working, `/app?view=attendance` (Owner, Manager). Branch
`claude-codex-collab-nevora-core`.

## Commits
- `e1b2f3f7` Lead and Employee Home: band figures named by their visible text; a Lead's range wraps after its dash.
- `7c822340` Employee Home: the in-progress shift card drops "Until 4:00 PM" (each fact once).
- `a5feee2d` Employee Home: a to-do's deadline stays on one line from 768 to 1023px ("By Nov 30, 9:00 AM").
- `56ac1462` Merge of `origin/claude-codex-collab-nevora` (wave 2, which includes the lead's cherry-picks a286a2aa, 832473e9
  and 9daa49c0 of the three fixes above). After the merge the tree matches the shared branch; the two home-b conflicts
  were resolved to the shared side.
- Shots commit (this file, `shots/core/`): captures only, no code.

Files changed: `src/components/employee-b/home-b.tsx`, `src/components/employee-b/home-b.test.tsx`,
`src/app/app/employee-b-work.css`. I didn't touch any kit, shell, Package F or Package K file.

## How it was checked
Production build (`NEVORA_OWNED_APP_PRODUCTION=1`) on fictional data in a throwaway Postgres, through the `tools/ui-scan`
harness with a scratch extension. It looks up a real shift id for Edit shift, runs axe-core 4 at 390 and 1440 (with
`label-content-name-mismatch` and `target-size` on), adds a 390 pass at 200% root text, records each visible string,
card edges, button sizes and every time range, and steps the keyboard through 14 focus stops at 1440 (Owner). Reduced
motion is on in every capture. Phone shots (390, and 390 at 200% text) are taken with the viewport set to the page's
full height, so the fixed tab bar sits at the real bottom and hides no row. Captures were first taken from the shared tip `12194c47`, then again after the merge from `56ac1462` (13:40–13:47 UTC); the shots and numbers below come from that final run.

## Per page

### B1 Home
- **Owner:** 0 axe violations, no overflow at 390, 768, 1440 or 200% text, and a visible focus ring at every stop.
  Buttons: Find cover is outlined white (44px), Prepare Nov 9–15 is solid teal and Prepare payroll is dark glass; the
  quick actions are glass, all 44px. Left and right edges are 14.5/375.5 (390), 108.5/739.5 (768) and 296.5/1002.5 with
  1023/1376 for the side column (1440). Not blocking, but outside my files: at 1440 the two payroll actions read alike
  ("Prepare Nov 9–15", "Prepare payroll") and are 44 vs 48px in adjacent cards (`home-b.tsx`, Package F's file).
- **Manager (Elena):** same as the Owner. **Blocking, not fixed:** the Timecards card says "10 to approve" and then
  "10 of 11 timecards". The code is at `home-b.tsx:437`, the same card as G73, so I left it to Package F. Suggested
  words: "11 timecards · Pay period ended".
- **Lead (James):** **Fixed.** At 768 the band's "8:00 AM – 4:00 PM" ran into "1 h 08 of 56 h", and at 390 with 200%
  text it ran off the band. It now breaks after its dash ("8:00 AM –" / "4:00 PM", each time kept whole), and the Hours
  and payday labels stay on the top line. Four links had screen-reader names that differed from their text: the three
  band figures (for example "On shift now, 8:00 AM to 4:00 PM, shift lead") and "Message today's team, everyone on shift
  today". Axe went from 4 to 0 nodes; each link is now named by its visible text.
  **Left for Jose:** from 768 the band repeats the shift card under it ("8:00 AM – 4:00 PM", "Shift lead · Customer
  Support"). That came from NV-161, which you approved.
- **Employee (James):** **Fixed.** The On shift now card read "Until 4:00 PM" above "8:00 AM – 4:00 PM", and from 768
  the band said "On shift until 4:00 PM" too, so the end time appeared three times. The card's meta is gone; a coming
  shift keeps "Tomorrow" or "Starts in 2 h". Axe went from 2–3 nodes to 0. **Fixed (lead's note):** at 768 a
  to-do's deadline broke into "Respond by" over "Nov 30, 9:00 AM"; from 768 to 1023px it now shows "By Nov 30, 9:00 AM"
  on one line, and the full sentence stays for screen readers. **Left for Jose:** the band's "On shift until
  4:00 PM · Customer Support · Main Office" still repeats the card (EM-025, approved).

### C1 Schedule
- **Owner and Manager:** 0 axe violations and no overflow. Buttons: All locations and the More icon are glass and Add
  shift is white raised, all 48px from 768 and 40px on phones (kit G88). Every time reads "7:00 AM – 3:00 PM". The grid
  cells break after the dash and set AM/PM smaller, as designed. Left and right edges are 14.5/375.5, 108/740 and
  296/1376. The "4 open" buttons in the grid are 36px tall (end sweep).
- **Lead and Employee:** axe is clean. The first run showed G80: "Open shifts and changes" overlapped its rows on phones
  and at 200% text, and the week rows overlapped at 768. Package F's e14267e3 fixed it, and the final capture shows no
  overlap (the audit's remaining hits are a visually hidden heading).

### C2 Add shift, C4 Edit shift (Owner, Manager)
- 0 axe violations, no overflow at any width or at 200% text, and focus rings on every field. Phone: Cancel is text,
  Save is a white pill (40px, kit G88). From 768: Cancel is white secondary and Save shift / Save changes is solid teal,
  both 44px; Delete shift sits under the form. Edit shows "Published" under the title and the locked Condado location
  with its reason. The empty Location, Start and End fields are blank by design (`.c-shift__empty`).
- Edges: on phones the form card sits at 12/378, while the other screens' cards sit at 14.5/375.5. This is the shared
  form-sheet gutter in `owner-b-pages.css` (every sheet page uses it), so I logged it rather than changed it.

### F1 Team (Owner, Manager)
- 0 axe violations and no overflow. On phones the four filters wrap onto two rows by design (G24). Buttons: Add employee
  is white raised (48px; 40px on phones) and the filter pills are 36px (kit G88). "Clocked in" is both a filter and a
  row status (G14, waiting on Jose).

### Who's working (Owner, Manager)
- 0 axe violations and no overflow. The band has "‹ Home". The card headings now read "Clocked in 7" (K8). Show 2 more
  is 44px. From 1440 the cards stop at 1108px, while Team's run to the band's 1376px edge.

## Impeccable audit

```
Impeccable audit: Core screens (Owner, Manager, Lead, Employee; 390, 768, 1440, 390 at 200% text; live, fictional data)
Checked: production build, full-page and fold captures, axe-core at 390 and 1440, text and edge measurements, 14-step
keyboard pass at 1440 (Owner)

Blocking
1. [Hierarchy] Manager Home, Timecards card: "10 to approve" over "10 of 11 timecards" says the count twice. Fix in
   home-b.tsx:437 (Package F's file): "11 timecards · Pay period ended".
2. (Resolved by the merge) Lead and Employee Schedule G80 overlaps: fixed by Package F's e14267e3 and confirmed in the
   final captures.

Fixed in this package
3. [Spacing] Lead Home band at 768 and at 200% text: the range overlapped Hours and ran off the band. Fixed (e1b2f3f7).
4. [Accessibility] Lead and Employee Home: band links and "Message today's team" were named differently from their text.
   Fixed (e1b2f3f7).
5. [Hierarchy] Employee Home: "Until 4:00 PM" over a range ending at 4:00 PM. Fixed (7c822340).

Should fix
6. [Hierarchy] Lead and Employee Home from 768: the band's first figure repeats the shift card (NV-161, EM-025). Jose to
   decide which keeps it.
7. [Hierarchy] Owner Home 1440: "Prepare Nov 9–15" and "Prepare payroll" read alike and differ in height (44 vs 48px).

Polish
8. [Spacing] Phone form sheets (Add and Edit shift) use a 12px gutter; cards elsewhere use 14.5px.
9. [Hierarchy] Lead Home "Your week" writes Monday as "1.2"; the band writes "1 h 13".
10. [Spacing] Who's working stops at 1108px at 1440; Team runs to 1376px.

States: Empty ✓ (Team filters) · Loading not captured · Error not captured · Success not captured · Edge ✓ (partial
publication note, 12-hour open clock-in, late arrival)
Not checked: loading, error and success states of these pages (no forced states in this run); 320px (not in this
package's widths); WebKit.
```

## Proposed ledger rows (end sweep)
| Page | Issue | Where |
|---|---|---|
| C1 Schedule (O, M) | "4 open" grid buttons are 36px tall at 768 and 1440 | `manager-weekly-roster.tsx` |
| B1, C1, C2, C4, F1 (phones) | Band buttons 40px (Save, Add, All locations, More, Availability) | kit G88 |
| F1 Team | Filter pills 36px | kit `--b-seg-item-h`, G88 |
| B1 Lead/Employee 768 | Band line under the first figure ends in an ellipsis ("Shift lead · Customer Su…") | kit BLive |
| C2, C4 phones | Form card gutter 12px vs 14.5px elsewhere | `owner-b-pages.css` |
| Who's working 1440 | Cards stop at 1108px; band to 1376px | `whos-working-corp.tsx` / CSS |
| B1 Lead | "1.2" vs "1 h 13" for the same hours | `employee-b/home-week.tsx` |

## Captures
`docs/handoffs/2026-11-23-phase2-cloud/shots/core/img/<row>-<o|m|l|e>-<390|390t|768|1440>.webp` (quality 80).
`390t` is 390 with 200% text. The index is `shots/core/rows.json` (16 entries).
