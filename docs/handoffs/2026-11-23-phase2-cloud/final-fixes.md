# Final fixes (Nov 23, 2026, about 13:00 UTC)

Open items from every package's report, split into packages that don't share files. Each item says what's wrong and
where. Fix it, check it at 390, 768 and 1440 (and 390 with 200% text where text size is involved), and keep the README's
rules. Row numbers refer to `docs/product/gaps-ledger.md`.

## Package K: kit and shell (`src/components/owner-b/b-kit.tsx`, `src/app/app/b-foundation.css`,
`src/components/owner-b/owner-b.css`, `src/app/app/premium-desktop.css`, `src/components/corp/*`, the app shell)
1. G48: the band glass strips' contrast fix (commit "Kit: paint the band under every glass strip") has no browser
   check. Confirm with axe at 768 and 1440 (Payroll tabs, Team search, `nav.c-seg`, `nav.c-week`); fix if it fails.
2. G-ST7 / G87: band segments fail axe contrast at 1440 (Shift requests C12; also the desktop segment "white on
   #f3f6f5" reported on Time off).
3. G88: band segment items are 36px (`--b-seg-item-h`), band back links 32px, phone band "Edit" 40px. 44px targets.
4. G88: the closed-page card (`company-access/operational-unavailable.tsx`, BState) clips text at 200%.
5. G79: the header avatar's initials spill out of the 40px circle at 390 with 200% text.
6. Fixed px kit text that doesn't scale at 200%: `.b-day span` 12px, `.b-card__a` 14px ("See all", "Timecard"), chips
   ("Needs your answer") in `owner-b.css`.
7. `BLive` names: Employee Home band figures ("Hours", "Scheduled payday", "On shift until") still have names that
   differ from their text (2–3 nodes). Check after the space fix in `b-kit.tsx`; drop item aria if still needed.
8. G74: Who's working card headings read "Clocked in2" (`whos-working-corp.tsx` `headed()`, maybe CorpCard
   `withCount`).
9. Kit loading card contrast on Compose (B8) while loading.
10. Phone app device settings and shell items already fixed by the Alerts package: re-check only.

## Package F: screens (no kit files)
1. G73: Owner Home's load order moves cards: on phones Things to do grows from its loading line and pushes everything
   below (CLS up to 0.33 at 390); at 1440 the Timecards tile switches content mid-load (`home-b.tsx`,
   `owner-b-home.css`). Reserve the space or hold the cards below until Things to do has read.
2. G77: Schedule "More" menu: `.c-menu-group[role=group][aria-labelledby]` label-content-name-mismatch
   (`schedule/page.tsx`).
3. G78: Daniel's location menus on Home and Schedule don't mark the current place; Team's does (`app/page.tsx`,
   `schedule/page.tsx`).
4. G80 and S's G69: Employee Schedule: on an unpublished week at 320/390 (and 200% text) "Open shifts and changes" is
   clipped and overlaps "2 open shifts to pick up"; at 768 with 200% text the week card's day columns overlap
   ("6:30 AM –" × "9:00 AM –") (`employee-b` schedule files).
5. G82: the copy receipt for a location Manager shows a paragraph about access; use the closed-page notice instead
   (`schedule/copy-receipt`).
6. G84: Find cover after a save: "Replacement saved." is replaced by "Covered" within seconds because the address
   loses `saved=1` before the access frame's refresh (`schedule/coverage`, `coverage-assistant.tsx`, and how
   `scoped-read-frame.tsx` refreshes). Keep the success line until the person leaves.
7. G86: the Lead's own Compose at 390: the page is about 424px wide; the expiry help line runs off the card
   (`communication-compose.tsx` and its CSS).
8. G87: an opened shift request repeats the row's day and time (`manager-shift-requests.tsx`).
9. Messages: at 1440 the Notifications (B3) and Update detail (B7) bands have no back link ("‹ Home" / "‹ Updates")
   while other pages do; on B7's review step at 320, Edit lines up with the middle of a two-line title, not its first
   line.
10. Manager's Notifications from 768: the app shell hides `.b-screen`, so it can't show the Lead's desktop rows. If the
    fix needs a shell change, write it down for Package K instead.

## Package S2: Settings consistency (`src/app/app/settings/**`, `settings-b*`)
Every Settings page uses the shared parts. Make them behave the same:
1. G85 Save: phone Save in the band (`SettingsPageB phoneRight`), card footer from 768 (`CorpFormFooter`), for every
   form page (J2, J7, J10, J11, J12, J14, J15 …). J8/J9 edit a list row in a dialog: keep the dialog, but its Save and
   Cancel follow the kit's dialog buttons and the same order as the other dialogs (J3 colour dialog). J14 and J15 end
   Save at the same edge.
2. G85 Add: one pattern for adding: the "+ Add …" row (J5, J8, J9, J10). J13 "Add tablet" becomes that row.
3. G85 J12 Payroll settings: group labels inside the cards like the other Settings pages; keep Payroll's tabs.
4. J14/J15 use `FieldB` / `SwitchRowB` like the rest.
5. Locations: "Locations 2" in the card header repeats the page title; the second line repeats the short name; "Each
   location keeps its own schedule." is always true. Remove the repeats.
6. Break types: the edit dialog has three button styles, and Reactivate is drawn red; one solid main, white secondary,
   red only for a destructive action.
7. Positions: "Choose a position to rename or archive it." explains how the screen works; remove it.
8. Time off policies: the empty state has three button styles; one main action.
9. J5 Locations: the result icon is centred across both lines; it should align with the first line. The J5 error title
   reads "Your workplaces": use the page's name.
Approved payroll, tax, legal, billing and privacy wording stays word for word (J16's two privacy lines included).
