# Phase 4 desktop inspection, round 1: interaction and states

Inspector: interaction and states. October 19, 2026, 11:30–13:10 AST. Preview `http://127.0.0.1:50144` (fictional data), using the saved Manager `AUDIT-M` and Owner `QAOWNER` states, with Employee `AUDIT-E` and Lead `AUDIT-LEAD` for the shell sample. Chromium at 1440×900, 1024×768/800, 900, 768, plus 390 and 320 (phone, `isMobile`, `hasTouch`). WebKit spot checks at 1440. Read only: nothing was approved, declined, saved, submitted, sent or signed out.

`SP` = `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS--claude-worktrees-p4-desktop-240fe0/55a133fe-0aa8-4472-a3aa-f939856da789/scratchpad/inspect/interaction-states` (scripts, `out-*.txt` logs, crops under `shots/`).

**Method note.** The dev server was very slow while the sweep and other inspectors ran: 7–47 s per page, and the Inbox reads often took over 10 s, so the client gave up ("The Inbox isn't available right now"). To judge the UI, I cached one real `/api/manager/action-center` and `/api/manager/today` response per account and served it back to my own browser, with a fresh `observedAt` and a 45 s validity. Failure states were made the same way, in my browser only (500, 401, held request, `setOffline`). Pages that showed "could not be loaded" twice were skipped and not filed. `checks-round-1.txt` wasn't there yet, so this report doesn't reference it.

## Verdict

The core list and detail behaviour works in Chromium and WebKit:
- A click selects the row without navigating, sets `?item=`, moves `aria-current` and focuses the pane heading.
- Enter does the same, with a visible ring.
- Escape returns focus to the row.
- Cmd-click and Shift-click open the item elsewhere and leave the selection alone.
- `?item=` survives a reload and browser Back from the review.
- The pane's one button opens the review. There is no decision control in the pane.
- Requests pages light Inbox, and the trails end with the page's own name.

It is not defect-free:
- **One P0.** Every 30 s the Inbox's background re-read unmounts the list and the pane. The page jumps to the top (scrollY 2579 → 0) and keyboard focus falls to `<body>`, with no user action.
- **Four P1s:**
  - The sticky pane's focused heading is hidden under the sticky header.
  - Tabbing out of the open account menu puts focus under the menu.
  - A selection inside a collapsed Plan ahead group is invisible, and Escape does nothing.
  - "Your profile" (and the new phone More › Profile entry) sends Managers and Owners to Home.
- **Ten P2s.**

## Findings, worst first

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| IS-P4-01 | Inbox · both · 1440, 1024 and phones (390) | Whole list column and detail pane, during the automatic 30 s re-read | With no user action, 30 s after each read the controller re-reads. While it does:<br>• `data-inbox-state` goes `ready → loading → ready` (log: `loading 73.1 s`, `ready 73.2 s` with an instant response; the live server took 1.7–10 s);<br>• every row and the pane unmount and are replaced by the loading card;<br>• **1440 Manager:** focused on the `Review time off` row at scrollY **2579** (document 3905 px). After the poll, scrollY is **0** and `document.activeElement` is `<body>`. The selection itself survives (`?item=`).<br>• **390:** scrollY **3838 → 0**, focus lost (`out-poll2-M-390-inbox.txt`).<br>A keyboard or screen-reader user is thrown back to the top of the document every 30 s, and a mouse user reading Plan ahead is scrolled to the top. Home holds (scrollY 445 → 445, focus kept), because Today keeps its snapshot while refreshing.<br>Related to ST-P4-03 (Refresh and blur collapse the layout), but that finding's height-holding fix would still unmount the focused row. The trigger here is the automatic poll. | `SP/shots/poll-AUDIT-M-1440-after.png`; logs `out-poll-M-1440.txt`, `out-poll2-M-390-inbox.txt` | `src/components/manager-action-center.tsx:109`: `setSnapshot(value.refreshing?null:value.snapshot)` and `setConnection('loading')` on every refresh. `src/lib/private-snapshot-client.ts:11` schedules `refresh` every 30 000 ms, and `:18` publishes `refreshing: true` first. `manager-inbox.tsx:227` then swaps the list for the status card. | In `useActionCenter`, keep the last ready snapshot while a re-read is in flight: `setSnapshot(previous => value.refreshing && !value.paused ? previous : value.snapshot)`. Only show `loading` when there is no snapshot yet (`setConnection(previous => previous === 'ready' ? 'ready' : …)`). Expose `refreshing` separately so the eyebrow can say "Checking…" and Refresh can show busy. The trust rule still holds: the controller's 10 s timeout and validity expiry (`private-snapshot-client.ts:19`, `:33`) still clear the items when a read fails or expires. | **P0** |
| IS-P4-02 | Inbox · both · 1024×768 and 1440×900, Chromium and WebKit | `#inbox-detail-title` (the focus target on select) under `.mobile-header` | Scroll the list, then select a row with the mouse or Enter. The pane sticks at top **16**. Its heading is at **y 38–62** (1440) or **38–86** (1024), under the **65 px** sticky header (`rgba(255,255,255,.78)`, blur, z 30). `elementFromPoint` on the heading returns the header. The focused heading with its 2px ring (`:focus-visible` true after Enter) is fully hidden, which fails WCAG 2.4.11. The avatar is cut too. | `SP/shots/sticky-1440x900-keyboard.png`, `sticky-1024x768-keyboard.png`, `inbox-AUDIT-M-1440-timeoff-selected.png`, `webkit-inbox-1440-scrolled.png` | `src/app/app/premium-desktop.css:114`: `.inbox-side-column { position: sticky; top: var(--nv-s-4) }` ignores the sticky header. `manager-inbox.tsx:204` focuses with `preventScroll: true`. | This is the same root cause as ST-P4-01; fix it once:<br>• `top: calc(65px + var(--nv-s-4))` (81px). Better, use a shared `--portal-header-h` token.<br>• Cap the column at `max-height: calc(100dvh - 97px); overflow-y: auto; overscroll-behavior: contain`. A shift entry plus All requests is 724 px, which doesn't fit 768 − 81. | P1 |
| IS-P4-03 | Account menu · both · 1440 (also 1024, 768) | `#portal-account-menu` (popover) | Open with Enter: focus lands on "Your profile", which is correct. Tab ×3 goes past "Sign out". Focus then moves to the band's `Refresh` (1278,97, 100×44) while the menu **stays open** over it (menu 1090,62, 318×232). `elementFromPoint` returns the menu, so no ring is visible. The next Tabs reach the filters. This is the Phase 2 IS-5 pattern, fixed only for the phone More sheets. | `SP/shots/shell-QAOWNER-1440-menu-focus-behind.png`; `out-menu2.txt`, `out-shell-M-1440.txt` | `src/components/app-shell.tsx:103`: the `focusin` close rule lists only `manager-more-navigation` and `employee-more-navigation`. The menu is `popover="auto"` (`action-menu.tsx:160`). | Add `"portal-account-menu"` (and `"portal-device-settings"` when present) to the id list at `app-shell.tsx:103`, so the menu closes when focus leaves it, as the More sheets do. | P1 |
| IS-P4-04 | Inbox · both · 1440, 1024 | A selected item inside a collapsed group (Plan ahead: "12 people with no weekly hour target", "7 people haven't sent availability", "5 people haven't confirmed the schedule"; 24 of the 49 items) | It happens four ways:<br>• `?item=HOURS%3AAUDIT-E` (deep link, reload, or Back from that item's page);<br>• collapsing the group after selecting;<br>• choosing **Plan ahead**, whose fallback selects `HOURS:AUDIT-BREAK`;<br>• opening the group, selecting, then reloading.<br>In each case the pane shows the item, but its row is inside a closed `<details>`, so nothing in the list looks selected. **Escape from the pane does nothing**: focus stays on `#inbox-detail-title` because `focus()` on a hidden row fails. With the group open, Escape works (focus returns to the row at 324,586). The selected item's own heading is "No weekly hour target", the same for all 12. | `SP/shots/inbox-AUDIT-M-1440-deeplink-in-group.png`, `inbox-AUDIT-M-1440-group-collapsed-selected.png`; `out-inbox3-M-1440.txt`, `out-inbox4-M-1440.txt`, `out-inbox6-M.txt` | `src/components/manager-inbox.tsx:128`: `<details>` never opens for the selection. `:191`: the fallback is `entries[0]`, even when it's hidden. `:291`: Escape only calls `focus()`. | • After `selectedKey` or `current` changes, open the group that holds it: `document.querySelector('[data-inbox-key="…"]')?.closest('details')?.setAttribute('open', '')`.<br>• In the Escape handler, open `closest('details')` before `focus()`.<br>• Make the fallback the first entry that isn't inside a closed group. | P1 |
| IS-P4-05 | Account menu (desktop), More › My account (phones), Search · Manager and Owner · all widths | "Your profile" and "Profile" → `/app/profile` | Enter on "Your profile" lands on `/app` (h1 "Good afternoon, Morgan"), with no message. The phone More sheet now lists **My account: My pay, Profile** at 390 (Manager) and 320 (Owner), which goes to the same place. Before Phase 4 the phone sheet had no Profile entry, so this is a phone change. | `SP/out-shell-M-1440.txt`, `out-phone-M-390.txt`, `shots/phone-AUDIT-M-390-more.png` | `src/lib/navigation.ts:140` adds `/app/profile` for management. `app-shell.tsx:250` adds the menu link. `src/app/app/profile/page.tsx:17` still redirects any role other than Employee or Lead to `/app`; the Profile session owns that check. | Land this together with the Profile session's page and role check. Until then, don't push `/app/profile` at `navigation.ts:140`. Tell the coordinator about the merge order. | P1 |
| IS-P4-06 | Inbox · both · 1440, 1024 | Arrow keys in the list; Shift+Tab from the pane | **Up/Down** on a focused Inbox row scrolls the page 40 px and doesn't move between rows. Team and Timecards rows do move (D6, checked on Team: Casey → Fictional Owner). **Shift+Tab** from the pane heading (Owner, row 3 selected) goes to the **last** group summary ("5 people haven't confirmed the schedule"), and the page jumps from scrollY **0 to 3005**. Escape is the only way back, and nothing on screen says so. The pane's heading also doesn't say where Escape goes (judgment). | `SP/out-inbox2-M-1440.txt`, `out-shifttab-O.txt` | `src/components/manager-inbox.tsx:245`, `:125`, `:135`: the Inbox `ul`s don't opt in with `data-row-nav`. The old action-center list did (`manager-action-center.tsx:92`). | • Opt the list column into D6: `data-row-nav` on `.inbox-list-column`, with a selector for the visible rows and the group summaries. Teach `rowNavigationTarget` (`src/lib/row-navigation.ts:16-23`) that a row which is itself focusable (`summary`) is its own control.<br>• Optional: add `aria-keyshortcuts="Escape"` to the pane section. | P2 |
| IS-P4-07 | Inbox · both · 1440 | Band `Refresh` by keyboard | Enter on `Refresh` immediately puts focus on `<body>`. The button becomes `disabled` while loading, and the list it would return to unmounts (see IS-P4-01). The next Tab restarts at the sidebar's first link. Attendance's Refresh already keeps focus with `aria-disabled` (Phase 2 IS-62). | `SP/out-inbox6-M.txt` (`2 refresh during … BODY`) | `src/components/manager-inbox.tsx:213`: `disabled={connection === "loading" \|\| …}` | Use `aria-disabled="true"` and ignore clicks while busy, with the label "Refreshing…". Keep the list mounted (IS-P4-01). | P2 |
| IS-P4-08 | Sidebar · both · 768–1440 | `Inbox` on `/app/requests`, `/app/exchange` and `/app/availability`; `Timecards` on `/app/payroll-export` | The holder link carries `aria-current="page"`, so a screen reader says "Inbox, current page" on the Time off page. The trail correctly marks "Time off" as the current page. | `SP/out-trails-M.txt` | `src/components/app-shell.tsx:193`: `aria-current={active ? "page" : undefined}` for a held page too | `aria-current={active ? (item.href === activeHref ? "page" : "true") : undefined}`, using the `activeHref` already computed at `:71` | P2 |
| IS-P4-09 | Header trail · both · 768–1440 | Trail on `/app?view=attendance`, `?view=team`, `?view=activity` | The trail reads "Plan › **Home**", with Home as `aria-current="page"` and not a link, while the page is "Attendance" / "Team overview" / "Schedule activity". This contradicts D-4 ("the trail ends with the page's own name"). The band does have "‹ Home". | `SP/out-trails-M.txt`, `out-trails-O.txt` | `src/components/app-shell.tsx:234-241` reads only `usePathname()`, so `?view=` is invisible to it | When the pathname is `/app` and `view` is one of the three, render Home as a link and add `<li><span aria-current="page">Attendance</span></li>` (or "Team overview", "Schedule activity"), using the same names as the band titles | P2 |
| IS-P4-10 | Inbox · both · 1024, 1440 | Selected time-off row, waiting avatar "AR" | The avatar disc vanishes when its row is selected: avatar `rgb(231,243,242)` on the selected wash `rgb(231,243,242)`, with no border or shadow. Only the letters "AR" float. | `SP/shots/selected-avatar-crop.png`, `inbox-AUDIT-M-1440-timeoff-selected.png` | `src/components/kit/kit.css:214` (`.nv-avatar[data-waiting="true"] { background: var(--nv-accent-wash) }`) with `premium-desktop.css:117` | `.premium-inbox .inbox-row[data-selected] > .nv-row .nv-avatar[data-waiting="true"] { background: #fff; box-shadow: inset 0 0 0 1px var(--nv-hairline); }` | P2 |
| IS-P4-11 | Review → Inbox · both · 1440 | In-page `‹ Inbox` on the time-off review | Browser Back restores `?item=TIME_OFF%3Aaudit-timeoff` and the selection. The band's `‹ Inbox` link goes to `/app/inbox`, which selects the **first** row instead of the request you just looked at. | `SP/out-inbox4-M-1440.txt` (`F back links`) | `src/components/manager-inbox.tsx:72-78` carries only `filter`. `src/components/manager-time-off.tsx:36` builds the back href from `filter` alone (Wave A's file). | Carry `item` with `filter` in `withFilter`, and have `backTo` append `item=` when it's present (allow-list it as an action-center id). Send the change to Wave A or the coordinator. | P2 |
| IS-P4-12 | Inbox (any long desktop page) · both · 1440 | Focus scrolling under the 65 px sticky header | Shift+Tab up the Inbox list: 2 of 12 focused rows land at **top 0**. Their top 65 of 104 px, including the title line, is under the translucent header. `html` `scroll-padding-top` is `auto` at desktop. | `SP/out-obscured.txt` | No desktop `scroll-padding-top`. Phones set it for the review only (`portal-premium.css:396`). | At 761 px and up: `html:has(body .app-shell.nevora-portal) { scroll-padding-top: 81px; }` in `portal-desktop.css` | P2 |
| IS-P4-13 | Header · both · 768–1440 | Account menu trigger (visible text "Morgan Rivera", or "Fictional Owner") | The accessible name is "Account menu" and doesn't contain the visible label (WCAG 2.5.3). A voice-control user saying "click Morgan Rivera" gets nothing. | n/a (`out-tab-M-1440-home.txt` stop 13) | `src/components/portal-account-menu.tsx:10`: `ariaLabel="Account menu"` | `ariaLabel={`${name}, account menu`}` | P2 |
| IS-P4-14 | Every desktop page · both · 768–1440 | Start of the Tab order | There's no skip link. The Manager has **13** stops (brand, collapse, 8 sidebar links, Search, Notifications, Account) before the band or first card, and the Owner has **14**. Landmarks (`nav`, `main`) satisfy 2.4.1, so this is a judgment call. Phase 2 noted it on phones, where there are 3 stops; the desktop sidebar makes it 4–5× longer. | `SP/out-tab-M-1440-home.txt`, `out-tab-O-768-inbox.txt` | `src/components/app-shell.tsx:168-173`: nothing before `<aside className="sidebar">` | Add `<a className="skip-link" href="#main-content">Skip to content</a>` as the shell's first child. It should be visible on focus (white chip, 2px teal ring, 44px tall). `#main-content` already has `tabIndex={-1}`. | P2 |
| IS-P4-15 | Team · both · 1024, 1440 | People table rows | The new **Phone** column shows the number, but each row's `aria-label` is "Alexandra Rivera, Employee, Main Office", so the phone is never announced. The new code comment says the label "already says all of this aloud". | `SP/out-tab-O-1440-team.txt` | `src/components/employee-directory.tsx:79` | Append `, ${formatPhoneNumber(employee.phone)}` when there's a phone. Or drop `aria-label` and let the cell text form the name. | P2 |

## Checked and correct

- **Click selects (1440, 1024; Chromium and WebKit):**
  - No navigation. The URL becomes `/app/inbox?item=<key>` by `replaceState`, so the history length doesn't grow.
  - `aria-current="true"` moves to the clicked row (teal wash, 3px edge).
  - Focus goes to `#inbox-detail-title`, with no ring for the mouse (`:focus-visible` false).
- **Enter on a row:** selects it and focuses the heading with a 2px teal ring. Tab then goes Contact (200×52) → Open timecard (99×44) → All requests rows.
- **Escape:**
  - From the heading or from `Contact` it returns to the row, which shows its 2px teal ring (Chromium and WebKit).
  - Escape outside the pane (All requests) does nothing, which is correct.
  - It also returns to a row scrolled off screen (the row comes into view at top 398).
- **Modifier clicks:**
  - Cmd-click opens a new tab with the original unchanged.
  - Shift-click opens a new window without selecting.
  - Ctrl-click on macOS Chromium is a context click, so it isn't counted.
- **Reload and Back:**
  - A deep link to a far row (Wed 5 PM gap) selects it after a reload.
  - Browser Back from the review restores `?item=TIME_OFF%3Aaudit-timeoff` and the selection.
- **Pane:**
  - It has exactly one action link, "Review time off" → `/app/requests?tab=pending&requestId=audit-timeoff&filter=all`, and no Approve or Decline.
  - The review shows h1 "Alexandra Rivera", the trail "Plan › Inbox › Time off" and the sidebar lighting Inbox.
- **900 and 768:** a row click navigates to its own href. Resizing back to 1024 restores the selection from `?item=`.
- **Filters with a selection:** `?filter=` and `?item=` are kept together. When the selected item isn't in the filter, the pane shows that filter's first item. All → Requests → All returns to the original selection.
- **States at 1440 (Manager):**
  - Loading: list 590 wide and pane placeholder 482×200, the same widths as ready.
  - Failed (500): one card. Try again recovers on Enter, with focus on "Act now, 25".
  - Empty: "All caught up", then All requests.
  - Today read failed: the Clock-ins card and the band sentence "Clock-ins can't be checked right now."
  - 401: "Sign in again to see your Inbox." with Sign in → `/login`.
  - Offline, then online: the selection comes back from `?item=`.
- **Focus rings at 768, 1024 and 1440:**
  - Sidebar links: 2px teal at −2.
  - Header controls: 2px teal at +3.
  - Band controls, filters, view chips and ‹ Home: 2px white at +2 on #1C4A47.
  - Cards and rows: 2px teal at +2.
  - No missing ring and no stop off screen, apart from IS-P4-02 and IS-P4-12.
- **Account menu:** Enter opens it with focus on "Your profile" (300×54). Escape closes it and returns focus to the trigger (Chromium and WebKit).
- **Search:** Enter and ⌘K open a modal `dialog` with focus in the combobox. ↑↓ move the highlight, and Escape returns focus to `Search`.
- **Sidebar and trail:**
  - The groups are Plan, People, Time and pay, Workspace. The people page is "Team". Requests aren't in the sidebar.
  - `/app/requests`, `/app/exchange` and `/app/availability` light Inbox, with trails "Plan › Inbox › Time off / Shift requests / Availability". The Inbox crumb is a link.
  - Time exports lights Timecards: "Time and pay › Timecards › Time exports".
  - Owner: Payroll and Settings. Employee and Lead (`/app`, `/app/my-time`): one ungrouped list with the correct active item.
- **Team finder (1024, 1440):**
  - The Tab order is one row: search → Role → Location → All / Active / Inactive → rows.
  - Typing "ri" filters (7 of 12) with focus and caret kept.
  - Up/Down moves between rows.
  - `?q=zzz` shows "No matching employees" with Clear filters.
- **Phones (390 Manager, 320 Owner):**
  - Rows navigate to their href, and `?item=` sets no `aria-current`.
  - The side column has `display: none`, with no sideways scroll (390 and 320).
  - The More sheet is unchanged apart from IS-P4-05.
- **Reduced motion:** the selected row and the pane have no transition or animation.
- **200% root text at 1024 and 1440:** select, Enter and Escape still work.

## Gaps

- Native window blur and tab switching can't be produced in Playwright. Pausing on blur is already decided (IS-17), so it isn't filed.
- These pages showed "could not be loaded" twice and weren't judged:
  - Owner `/app/payroll-export`, `/app/schedule/settings` and `/app/profile`;
  - `/app/schedule` (Employee) and `/app` (Lead).
- Team: a second typed query ("rizz") didn't apply within 9 s on the overloaded server. Not filed.
- I didn't exercise the collapsed sidebar toggle, the Notifications bell page, or WebKit at 1024.

Open: 1 P0, 4 P1, 10 P2
