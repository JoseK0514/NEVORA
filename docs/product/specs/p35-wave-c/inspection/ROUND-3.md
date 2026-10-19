# Wave C inspection, round 3

October 19, 2026. Every round-2 finding was worked through, and the fixes are live on the same preview (`http://127.0.0.1:49855`, frozen while you look). The rules and scope are the same as `ROUND-2.md`: re-check your own open findings by ID, then look only at what these fixes touched. Chromium at 320, 390, 844×390 and 1440, at 100% and 200% text, with WebKit spot checks. No Firefox and no shell. Append `## Round 3` to your report and end with the zero line. Keep it short and aim for about 30 minutes.

## What changed since round 2

- **Save bars:**
  - On portrait phones the save bar is now `position: fixed` on the tab bar. Its height is measured live, so it holds at large text too.
  - The page keeps that much room under its last card.
  - The bar is one row: buttons size to their label.
  - In landscape the bar stays in the page.
  - Policies' button label no longer changes while saving.
- **Dialogs:**
  - Archive break type, Revoke access and New setup code / Replace tablet open on Cancel.
  - After a failed edit, the dialog's reload button reads "Reload".
- **Color well:** 64×48 again (3rem).
- **Wrapping:**
  - No automatic hyphenation.
  - In narrow cards the hub's row tiles and the Positions "Edit" label step aside, so words keep their room.
  - Button icons move with their word.
  - Disclosure carets and link icons sit on the first line at any text size.
  - A band Add control that drops under Back starts on Back's edge.
  - The hub footnote is 16px below the columns.
- **Copy:**
  - Company words on the remaining Locations strings: the empty state, the eligibility link, the not-found page.
  - The Locations error page reads "Your workplaces".
  - One save-state wording on Branding, Features and Location detail: "Saved" / "Unsaved changes".
  - "Revoke access" throughout.
  - The Add break type subtitle.
  - Failure notices don't repeat their title.
  - Device dates are kept whole.
  - Shorter pending labels ("Issuing code…", "Checking…").
  - Back shows the employee ID only when it's 16 characters or fewer, otherwise "Employee".
  - "All" on every first filter pill.
- **Loading:** parent placeholder bands for landscape. Swatches keep their look before hydration.
- **Date and time fields:** more room beside the calendar button.

## Newly decided (don't refile)

| Item | Why |
|---|---|
| WR-09: a policy select's value cuts off at 320 with 150–200% text | It's a native select, which no browser lets wrap. The full value shows in the picker and to screen readers. Shortening further would lose meaning ("Off by default" vs "Off") |
| TC-24 remainder: at 390@200 the browser's own date format ("mm/dd/yyyy, --:-- --") is wider than the field | It's the browser's control and format. Wave C gave it the room it can |
| TC-25 remainder: "colour", "grey" and "acknowledgement" in `src/lib/workspace-presentation/` | That shared library is the coordinator's. Wave C's own files use US spelling |
| The Locations loading placeholders say "Locations" and "Add location" before the page names a company's own words | A loading placeholder can't read the company's words without a database read. The Standard preset matches; other presets change one word when the page arrives |
| Landscape at 125%+ text switches Wave C pages to the desktop shell | The shell's breakpoint (coordinator), not Wave C's |
