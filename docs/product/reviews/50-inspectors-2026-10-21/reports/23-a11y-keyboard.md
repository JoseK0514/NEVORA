# 23 Accessibility Engineer — keyboard-only use of the Owner and Manager app (desktop 1440 and 1024)

**Verdict.** The basics are solid. Every page starts with a working skip link, every one of the 2,156 Tab stops I measured shows a 2px teal ring, and nothing is hidden under the sticky header. Search, menus, the period picker and the timecard sheet all close on Escape and send focus back to where it came from. What remains is structural. Some pages clear their data when the browser window loses focus, and this closes the Timecards sheet and erases text the manager typed. The Schedule grid makes keyboard users press Tab once per shift. Focus is also lost after navigating (Edit shift → Back, Home "Show 2 more"), and every page has the same document title.

## Recommendations

1. **Stop closing sheets and clearing data when the browser window loses focus.**
   - *Why:* `timecards.tsx:146,150` listens for `window` `blur` and runs `clear()`. That calls `setData(null)` and `setNotes({})`, which closes the open timecard sheet and erases a typed "Reopen reason" (`timecards.tsx:397`). This is the measured result: the sheet is open, the window blurs, the sheet is gone, and after returning focus sits on BODY.
   - *How a keyboard user hits it:* in Chrome, Tab past the last control of a native modal dialog moves focus to the browser toolbar, and that fires `window` `blur`. My Tab walk inside the sheet went "Done → entry summary → (browser) → Skip to content". The dialog had closed and focus was back in the sidebar, for both Owner and Manager at 1440 and 1024. A password-manager popup, voice control, a screen magnifier or Alt-Tab do the same.
   - *Where else:* the same blur-pause pattern is in 15 files (`grep "'blur'"`; for example `manager-action-center.tsx:14-15`, `payroll-export.tsx`, `reports.tsx`, `manager-time-corrections.tsx`). Inbox blanks its list to "Paused while you're away" when the window blurs. It does restore focus to the same row afterwards (verified), which is good.
   - *Fix:* pause polling only on `visibilitychange` (hidden) and `pagehide`. Keep the last snapshot on screen with a "Paused" freshness tag. Never close an open dialog or clear typed input because of a blur.
   - Impact **High** · Effort **M** · Owner **UI**, plus **Product** if the "clear protected data on blur" rule is a deliberate privacy requirement.

2. **Make the Schedule week grid a single Tab stop with arrow-key movement.**
   - *Why:* on `/app/schedule`, 67 of the 94 Tab stops are individual shift cells, and that is with only 7 people (Owner, 1440). A 30-person location means over 200 Tab presses to get past the grid to "Show 7 unscheduled".
   - *Fix:* use `role="grid"` with a roving tabindex. Arrow keys move across days and people, Home/End jump within a row, and Enter opens the shift. Tab then leaves the grid in one press.
   - Impact **High** · Effort **L** · Owner **UI**

3. **Return focus to the shift you came from after Edit shift.**
   - *Why:* Enter on a shift cell opens `/app/schedule/edit`. Coming back with Back or Cancel lands on BODY at scrollY 0, and the next Tab goes to the first item on the page. The user loses their place in the grid. Measured at 1440 and 1024.
   - *Fix:* keep the shift id in the history state or a `?focus=` parameter, then focus that cell (and scroll it into view) on return.
   - Impact **Medium** · Effort **M** · Owner **UI**

4. **Give each page its own document title, and move focus to the page heading after in-content navigation.**
   - *Why:* `/app`, `/app/inbox`, `/app/schedule`, `/app/employees` and `/app/timecards` all have the title "NEVORA Workforce". Because the title never changes, Next's route announcer announced nothing after navigation (measured: empty).
   - After a sidebar link, focus stays on that link, which is fine. After a link inside the page (Home "Show 2 more", a shift cell), focus drops to BODY.
   - *Fix:* add per-route `metadata.title`, for example "Inbox · NEVORA". Focus the `h1` (`tabIndex=-1`) when the navigation started inside `main`.
   - Impact **Medium** · Effort **S–M** · Owner **UI**

5. **Fix Home's "Show 2 more" (Later today).**
   - *Why:* the label promises to expand the list in place, but it is a link to `/app/schedule` (`premium-home.tsx:246`). Pressing Enter changes the page and focus lands on BODY.
   - *Fix:* either rename it to "See all 6 in Schedule", or expand in place and focus the first revealed row. `manager-weekly-roster.tsx:141` already does exactly that.
   - Impact **Medium** · Effort **S** · Owner **UI**

6. **Let the skip link reach the page's own tools at 1300px and wider.**
   - *Why:* on Schedule, Timecards and Insights, the week/period stepper, More, Add shift and Export are moved into the top bar (`useTopBarSlot`), which comes before `main`. "Skip to content" jumps past them. Reaching "Previous week" from main takes 7 Shift+Tabs.
   - At 1024 the same tools sit inside `main`, so the order differs between widths.
   - *Fix:* add a second skip target ("Skip to page tools"), or point the skip link at a region that starts with the title and toolbar.
   - Impact **Medium-Low** · Effort **S** · Owner **UI**

7. **Take the Search (⌘K) results list out of the Tab order.**
   - *Why:* inside the dialog, Tab goes input → results `ul[role=listbox]` → the dialog element itself. Chrome makes scrollable lists focusable. Once focus is on the list, the arrow keys and Enter do nothing, because the key handler lives only on the input (`command-finder.tsx:108-111,135`).
   - *Fix:* add `tabIndex={-1}` to the `ul` so the combobox is the only stop. Escape and Ctrl/⌘K already work well.
   - Impact **Low** · Effort **S** · Owner **UI**

8. **Make all menus open the same way.**
   - *Why:* the account menu and Schedule More (`ActionMenu`) move focus to their first item on Enter. The Insights "Report period" and "Export" popovers (`reports.tsx:300-304`) leave focus on the button, so it takes an extra Tab to get in.
   - *Fix:* when a menu opens from the keyboard, move focus to its checked or first item.
   - Impact **Low** · Effort **S** · Owner **UI**

9. **Lock in what passes with a keyboard regression test.**
   - *Why:* all of this held across 58 page walks, but nothing in CI protects it.
   - *Fix:* adapt my Playwright tab-walk (`scratchpad/r23/walk.mjs`, `ov*.mjs`) into a short test with these checks:
     - the skip link is the first stop and lands on `#main-content`;
     - no stop is hidden, has no visible ring, or sits under the header;
     - each overlay closes on Escape and focus returns to its trigger;
     - a simulated window blur does not close a dialog.
   - Impact **Medium** · Effort **S** · Owner **UI**

## What's good

- **Skip link and focus rings.** "Skip to content" is the first Tab stop on all 58 page × width walks (Owner 21 pages, Manager 8 pages, at 1440 and 1024). It moves focus to `main#main-content` and the next Tab reaches the first control in main. All 2,156 stops had a visible 2px teal ring; Notifications search shows its ring on the field wrapper, verified on screen. No stop was hidden, and none sat under the sticky header, because `scroll-padding-top` works.
- **Overlays.** Search (native modal, opened by the button or Ctrl/⌘K), the account menu, Schedule More, the Insights period and Export menus, the Timecards period picker and the Timecards sheet (Escape or Done) all close on Escape and return focus to their trigger. For Ctrl/⌘K, focus returns to the element that had it before.
- **Inbox.** Enter on a row moves focus to the detail heading, and after a pause and resume focus comes back to the same row (IS-P4-21/22 work as designed).

## Not checked / limits

- Chromium only (headless Playwright, dev server). I did not check Safari, where Tab skips links by default and most of the sidebar and the grid are links, or Firefox.
- In my headless run the Next dev overlay (`nextjs-portal`) took one Tab stop at the end of each page. I ignored it because it does not ship to production.
- I did not test the Inbox item sheet at 761–1023px, or phone widths.
- I did not submit any form, so I did not check where focus goes after a validation error or a successful save. That includes Add shift, Compose update, Settings saves and timecard approve/reopen.
- I did not test screen-reader output; that is reviewer 24's lens.
- I simulated window blur with a dispatched `blur`/`focus` event pair, plus the observed headless Tab-out. A real Chrome Tab into the toolbar fires the same event, but I did not confirm that by hand in headed Chrome.
- Scripts and outputs are in `scratchpad/r23/`.
