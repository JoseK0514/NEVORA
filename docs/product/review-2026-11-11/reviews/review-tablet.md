# Tablet (900px) visual review: Owner and Employee (Nov 11, 2026)

Evidence: screenshots in `inspect2/owner-tablet/` and `inspect2/emp-tablet/` at 900px wide. Read-only; nothing was run. Findings with values and code locations are in `review-tablet.json` (19 findings: 4 High, 10 Medium, 5 Low). Findings that are the same as at 390 or 1440 are not repeated; they are listed at the end.

**Verdict.** The "small desktop" works: no page scrolls sideways, cards keep their shape, forms and tables fit, and Timecards is better here than at 1440. What holds it back is the rail (icons with no names on a touch device), two schedule grids that are squeezed, and bands sized for a taller screen.

## Top changes

1. **Label the rail (TB-001).** Nine icons with no names; the tooltip needs hover, which a tablet does not have. Put a 10.5/13 label under each icon (64 x 56px items, 80px rail). The touch rule's comment already says labels show; no rule does it.
2. **Stop clipping the chip in the Employee's week (TB-002).** "Starts in 4 h" is cut off in today's block. Use "In 4 h" at 11.5px in narrow blocks and never clip a chip.
3. **Give the Owner's week grid a tablet density (TB-003).** Names, positions and long times wrap, so rows are 67, 75 and 82px. Drop the avatar, 124px person column, one-line time and position, 60px rows, "Open shifts" with a count pill.
4. **Tablet band heights (TB-004, TB-014).** Owner Notifications and Updates spend 296px on the band with 70px of empty teal; Home's band ends at 383px. Use 144 / 168 / 200 / 300px presets and one title position. A phone held sideways gets this layout and would show almost no content.
5. **Fill or reshape the Home cards (TB-005, TB-006).** Owner: Payday has a 170px empty middle; make it a 104px full-width card. Employee: a 327px hole under Things to do; lead with Today's shift across the page.
6. **One rail badge, one bell (TB-007, TB-008).** Red 20px pill over the icon for Owners, teal 16px for Employees; and Employees have two Notifications entries on one screen.
7. **Right highlight in the rail (TB-009).** Owner More lights Home. Use the filled icon for the current entry.
8. **Finger-sized targets for text controls (TB-010, TB-011).** Timecards' underline tabs, card-header links and the 28px open-shift chips. One "4 open" chip per day replaces 22 chips.
9. **Remove keyboard hints on touch (TB-012).** "Ctrl K" in the search field.
10. **Features page: one card per section (TB-013).** A second rounded card shows inside the first.

## Keep

- **No sideways scroll anywhere.** The Owner's week grid stays a seven-day grid at 900, as DESIGN.MD asks.
- **Timecards table** (`owner-timecards-900.png`): four columns fill the 772px card, status chips end at the card's edge, the total row lines up. Better than at 1440, where the right 460px is empty.
- **Settings hub in two columns** (`owner-settings-900.png`): 376px cards, 60px rows, icons and chevrons aligned.
- **The rail's shape:** 72px, 48 x 48 entries, teal-50 current square with 12px corners, the workspace tile on top, Help pinned at the foot, a hairline between the main pages and the rest.
- **The flat teal top bar:** search, bell and account pill at one height (40px), 28px from the edge, and it joins the band without a seam.
- **Segmented controls on the band:** 44px track, counts beside labels, never wrapping (four items on Things to do fit in 392px).
- **Owner Schedule band:** location, menu and the white Add shift pill on the title's line; week stepper on its own row.
- **Time corrections:** Recorded and Asked for sit side by side at 360px each and stay readable.
- **Forms:** paired fields (First / Last, Location / Position, Start / End) keep two columns; footer buttons right-aligned at 48px.
- **Employee More:** the glass profile block with the white pill is the best "who am I" header in the set.
- **Payroll's notice card** overlapping the dark band with one filled action.

## What I could not see

- **Touch rendering.** The captures used a mouse pointer, so the `(pointer: coarse)` rules (44px floor, 48px rail and schedule blocks) were not drawn. TB-010 and TB-011 are read from the code and the fine-pointer sizes.
- **A phone held sideways (844 x 390)** and **768px**. TB-004's landscape claim is computed from the 900px band heights.
- **The rail's tooltip, focus ring and expanded state**; menus, the finder, the account menu, sheets and side panels (shift panel, timecard panel) at 900.
- **Team, Activity and Employee Time:** the captures are the 404 page (wrong routes).
- **Manager and Lead at 900**, and any loading, empty, error or offline state at 900.
- **Hover, press, motion, reduced motion and keyboard order.** Stills only.
- Rail icon weight was judged from pixels (about 1.8px strokes, so bold); not checked in the markup.

## Earlier findings that also show at 900

OW-001, 002, 003, 006, 009 (as one narrow column, so only the band-action part), 010, 012, 013, 014, 015, 019 (404), 022, 024, 025, 026, 027, 030, 032, 033, 034, 035, 036 · EM-001 (worse: the card also covers the "Change one week" pill), 003, 004, 005, 006, 007, 009, 010, 011, 014, 017, 018, 020, 021, 023, 027, 028, 029, 034 (rail ends at 844px on long pages; likely a capture effect) · MG-005, 012, 016 · SY findings are width-independent.
