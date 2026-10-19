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

## Round 2

Re-checked on October 19, 2026, 14:10–15:05 AST, on the latest build (`0abdc74`), with the same preview and the same saved states. Chromium at 1440×900, 1024×768 and 768×900, plus phones at 390 and 320 (`isMobile`, `hasTouch`). WebKit spot checks at 1440 (Inbox) and 1024 (Employee).

Manager and Owner Inbox reads were served from one real cached response with a fresh `observedAt`, as in round 1. Failure, slow, 401 and offline states were made in my own browser only. Employee Home and My time used real responses cached the same way. Read only: nothing was saved, submitted or signed out.

Evidence is in `SP/r2/`: scripts, `out-*.txt` logs, and crops under `SP/r2/shots/`.

### Status of round 1 findings

| ID | Status | New measurement |
|---|---|---|
| IS-P4-01 | **Fixed** | **Manager, 1440:** with focus on `Review time off` at scrollY 2615 and the read slowed to 3 s, one 30 s poll ran. There was no state change (`data-inbox-state` stayed `ready`, with no mutations), scrollY stayed 2615 the whole time, and focus stayed on the row.<br>**Owner, 1024×768:** the same result at scrollY 3035. Log: `out-inbox-r2-M-1440.txt` G, `out-inbox-r2-O-1024.txt` G. |
| IS-P4-02 | **Fixed** | The side column is sticky at top **81**. After scrolling and selecting with Enter, the heading is at top **103** and visible: `elementFromPoint` hits the heading, at 1440, at 1024×768, and in WebKit. All requests left the side column, so the pane ends at 367 (1440) and 431 (1024×768), inside the window. Crop: `r2/shots/AUDIT-M-1440-pane-sticky.png` |
| IS-P4-03 | **Fixed** | **Owner, 1440:** three Tabs past the last item close the menu, and focus lands on a visible `Refresh` with its white ring. Shift+Tab returns to the trigger with the menu closed. Employee (1440) and Lead (1024) behave the same; their menu is Your profile and Sign out. |
| IS-P4-04 | **Fixed** | `?item=HOURS%3AAUDIT-E` opens its group, so the row shows as selected. Escape returns focus to it (318,438). Choosing **Plan ahead** keeps the selection visible. The same happens in WebKit. |
| IS-P4-05 | Waiting on the Profile merge (not counted) | As ROUND-2.md says. |
| IS-P4-06 | **Partly fixed** | Up/Down between plain rows works. Shift+Tab from the pane heading returns to the selected row: (292,337) at 1440, (260,323) at 1024, and in WebKit.<br>**Group headings are never reached:**<br>• Down from `Review time off`, the row just before the first group, doesn't move. The page scrolls 40 px per press instead (row top 211 → 171 → 132).<br>• Up from the first row inside an open group stays put (796 → 836).<br>• Down from a closed group heading stays put.<br>• Up from the row after a closed group (`Set deadline`) stays put.<br>Cause: `src/lib/row-navigation.ts:19-23` collects focusable elements *inside* each row, and a `summary` row has none, so the target is `null`.<br>Fix: `const controls = (c) => c.matches(FOCUSABLE) ? [c] : [...c.querySelectorAll(FOCUSABLE)].filter(visible)`. Also skip rows inside `details:not([open])`, because `getClientRects()` still reports them. **P2** |
| IS-P4-07 | **Fixed** | Enter on `Refresh` keeps focus on it (`disabled` false, white ring) through a 3 s read. A failed refresh also keeps focus on `Refresh`. See IS-P4-17 for the missing busy state. |
| IS-P4-08 | **Partly fixed** | Holders now carry `aria-current="true"`: Inbox on `/app/requests`, Timecards on `/app/payroll-export`.<br>Pages below an entry still say `"page"`: **Settings** on `/app/settings/payroll` (Payroll settings) and **Home** on `/app?view=team` and `?view=attendance`. A screen reader hears "Settings, current page" while the trail says "Payroll settings".<br>Cause: `app-shell.tsx:208` compares with `activeHref`, which is the prefix match.<br>Fix: `aria-current={active ? (item.href === activeHref && !deeper && !homeView ? "page" : "true") : undefined}`. **P2** |
| IS-P4-09 | **Fixed** | The trails read "Plan › [Home → /app] › *Team overview*" and "… › *Attendance*". Payroll settings reads "Workspace › [Settings] › *Payroll settings*". |
| IS-P4-10 | **Fixed** | The selected waiting avatar is `rgb(255,255,255)` with an inset 1px `rgb(232,236,235)` ring, on the row's `rgb(231,243,242)`. |
| IS-P4-11 | Waiting on Wave A (not counted) | Not re-checked. |
| IS-P4-12 | **Fixed** | `scroll-padding-top: 81px` on every desktop page checked. A focused row after Shift+Tab is visible below the header. |
| IS-P4-13 | **Fixed** | The trigger is named "Fictional Owner, account menu", "Alexandra Rivera, account menu" and so on, matching the visible name. |
| IS-P4-14 | **Fixed** | The first Tab on every desktop page is "Skip to content": 134×44 at (12,12), white, teal text, 2px teal ring, z 100, not covered. Enter moves focus to `main#main-content`, and the next Tab is the page's first control (Inbox: `Refresh`). It's `display: none` on phones (390, 320, all roles), and the first phone Tab is still the brand link. Crop: `r2/shots/QAOWNER-1440-skip-link.png` |
| IS-P4-15 | **Fixed** | "Alexandra Rivera, Employee, Main Office, 787-555-0101" matches the visible cells. |

### New findings (round 2)

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| IS-P4-16 | Inbox · both · 1440, 1024 | "Request pages" card (`#inbox-all-requests`) | It's drawn **first** in the list column: top 249, while the first Inbox row is at 377 (1440) or 429 (1024). In the DOM and the Tab order it comes **last**: stop 61 of 66, while the first Inbox row is stop 5. After the filters, Tab skips the card on screen. A keyboard user reaches it only after every row and group, and focus then jumps back up to the top of the page. This fails WCAG 2.4.3 (focus order). | `r2/shots/AUDIT-M-1440-inbox-top.png`; `out-inbox-r2-*.txt` A | `src/components/manager-inbox.tsx` renders `<AllRequests />` after the list. `premium-desktop.css:300` moves it up with `order: -1`. | Render `<AllRequests />` as the first child of `.inbox-list-column` (keep the `ready \|\| hasShown` guard) and drop `order: -1`. The picture doesn't change. | P2 |
| IS-P4-17 | Inbox · both · 1440 | Band `Refresh` during a refresh someone asked for | With the read taking 3 s, nothing shows that it's working. The eyebrow stays "Updated 2:15 PM", the button stays "Refresh" with no `aria-busy` or `aria-disabled`, and no status is announced. Only the time changes afterwards ("2:16 PM"). A second press starts another read. This is a side effect of the IS-P4-01 fix: `connection` now stays `ready` during a re-read. | `out-inbox-r2b-M-1440.txt` | `manager-action-center.tsx` (the early `return` on a ready re-read) and `manager-inbox.tsx` (Refresh relies on `connection`) | Expose `refreshing` from `useActionCenter`, but only for a refresh someone started, not the silent poll. While it's true, the button reads "Refreshing…" with `aria-disabled="true"` (focus kept, as Attendance does, Phase 2 IS-62), and the eyebrow says "Checking…". | P2 |
| IS-P4-18 | Every Manager and Owner page · all widths, phones included | Inbox count (`use-inbox-count.ts`) | `/api/manager/inbox-count` doesn't exist in this build. Each page load reads it, and it's read again every 60 s. Every read returns **404**: 7 in one short Owner session, each one a console error ("Failed to load resource … 404"). The sweep's console-error check will flag every Manager and Owner page.<br>The UI is correct when I answer the read in my own browser:<br>• 26: the sidebar badge shows "26" (28×20, 12px, white on teal) and the link is named "Inbox, 26 need you";<br>• 140: "99+";<br>• 0 and unavailable: no badge, and the name is "Inbox";<br>• the phone tab works the same.<br>Judgment: the route arrives with Codex's merge. | `out-shell-r2-O-1440.txt`, `out-count.txt` | `src/components/use-inbox-count.ts:19` and `:29`, `app-shell.tsx:68` | Until the merge, don't call the hook (a build flag, or `enabled` false when the route isn't present). Or land the hook together with Codex's route. | P2 |
| IS-P4-19 | Employee and Lead Home (clock status) and My time · all widths (desktop checked at 1024 and 1440) | `Refresh recorded time`; Home's `Refresh home` / `Retry home` | **Lead, 1024:** Enter on `Refresh recorded time` sets `disabled` while the read runs ("Refreshing…"), so focus drops to `<body>` and stays there after the read. The next Tab restarts at the skip link. The name stays "Refresh recorded time" while the text says "Refreshing…". Home's refresh button has the same `disabled={state.paused \|\| state.refreshing}` (from the code). Manager Inbox and Attendance already keep focus. | `out-mytimepoll.txt` | `src/components/employee-time-panel.tsx:62` and `employee-home-actions.tsx:61` (coordinator's) | Use `aria-disabled="true"` and ignore clicks while refreshing, instead of `disabled`, and name it "Refreshing recorded time" while busy (the Attendance IS-62 pattern). Send to the coordinator. | P2 |

### Fix areas looked at again: correct

- **The Inbox keeps the list during re-reads:**
  - The poll and Refresh keep every row and the pane.
  - A failed refresh keeps both columns: list column held at 4856 (1440) or 5518 (1024) by `min-height`, and the pane placeholder at 482×200 or 315×200.
  - Offline, then online, comes back to `ready`.
  - 401 shows "Sign in again to see your Inbox." with Sign in.
  - When the read fails while the page is scrolled to 2600, the page scrolls to 0 and focus goes to `<body>`. The failure message (top 325) is then in view. Dropping failed items is decided, so I'm noting this, not filing it.
- **Account menu:** Escape returns focus to the trigger (all roles). The items are Your profile, My pay (Owner and Manager) and Sign out.
- **Keyboard in the list and pane:**
  - Escape from the pane, including into a group that was closed, returns to the row.
  - In the pane, Up and Down don't move between rows; they belong to the page.
  - Pressing Enter on a group heading opens it, and Down then reaches its first row.
- **Trails:** Home's views, Payroll settings, Time off and Time exports all end with the page's own name. The middle crumb is a link.
- **Phones (390 Manager, 320 Owner, 390 Employee, 320 Lead):**
  - The Inbox has no `aria-current` with `?item=`, the side column and Request pages card are hidden, and there's no `min-height`.
  - A tapped row navigates to its href.
  - The skip link is hidden, and the first Tab is the brand link (white ring).
  - No sideways scroll.

### Employee and Lead desktop: first interaction pass

Pages: Home (`AUDIT-E`, `AUDIT-LEAD`, `AUDIT-ON`, `AUDIT-BREAK`, `AUDIT-LONG`); My schedule (plain, `?view=open`, `?intent=swap`); Requests overview, Time off, Shift requests and Availability; My time, Timecards and My pay; Profile, Updates and Notifications. Checked at 1440 (`AUDIT-E`), 1024 and 768 (`AUDIT-LEAD`), with WebKit at 1024. The only new finding is IS-P4-19. Correct:

- **Focus order:**
  - Skip link, then 9 sidebar links, then the header: trail link when you're deeper, Notifications, the account menu. There's no Search for these roles, which is correct.
  - Then the section tabs inside the band, then the band's view chips or links, then the cards.
  - Every stop has a ring:
    - 2px white at +2 on the band, for the section tabs, `My shifts` / `Open shifts`, `New request` / `My requests (5)`, `Usual week` / `Specific week`, `Available shifts` / `Your requests`, and "3 items need your review";
    - 2px teal elsewhere;
    - Notifications' search field shows its ring on its label (`:focus-within`, 2px teal).
  - No stop is under the header or off screen, and none is zero-sized.
- **Section tabs inside the band:** at 768, 1024 and 1440 they sit at y 97, 44 px tall, with white rings, in WebKit too. At 768, My schedule's and Shift requests' chips take their own row (y 197 / 213), in Tab order after the tabs.
- **My schedule side column (1440):**
  - The order follows the columns: week strip (7 days), then the shift options down the left column, then `Confirm schedule` (300×52) and "What changed" on the right, then the link rows.
  - `?intent=swap` adds `Done choosing` and, per day, Request a swap and Unable to work. The 52 stops are all visible.
- **Profile (1024 and up):** left panel (`Refresh details`), then the right panel (Notifications, Calendar), then `Sign out` across the full width.
- **Home states (`AUDIT-E`, 1440):**
  - Ready.
  - Loading: "Checking your shifts…" / "Loading Home…". The hidden `My time` link (`visibility: hidden`) isn't a Tab stop.
  - 500: "Couldn't load Home." with `Try again` and `Try again to load Home`.
  - 401: "Sign in again to view Home." with Sign in.
  - Offline: "You're offline." / "Updates paused".
  - Back online, it returns to ready.
  - A 30 s poll keeps focus on `Update availability`, and the document height stays 1347.
- **Other Home accounts (1024):** `AUDIT-ON`, `AUDIT-BREAK` and `AUDIT-LONG` each have 12–13 main stops in column order.
- **My time states (`AUDIT-LEAD`, 1024):**
  - Loading: "Loading recorded time".
  - 500: "Couldn't load your time records" with Try again.
  - 401: "Your session ended" with Sign in.
  - Offline: "Updates paused".
  - A 30 s poll keeps focus on `Request a correction` at scrollY 569, and the height stays 1337.
- **Profile from the account menu:** Your profile → `/app/profile` (h1 "Profile"), and the menu closes.

### Gaps (round 2)

- Paused (window blur) still can't be produced in Playwright; the code path is shared with offline.
- Employee Home caches loaded only for `AUDIT-E`. The other Home accounts were judged on live reads.
- No 200% text pass this round. Large data is not in this preview.

Open: 0 P0, 0 P1, 6 P2

## Round 4

Re-checked on October 19, 2026, 15:10–16:20 AST, on `a6f009d`, with the same preview and saved states. Chromium at 1440×900, 1024×768 and 768, plus phones at 390 and 320. Inbox reads were served in my own browser from one cached real response with a fresh `observedAt`. Slow (3 s), 500, 401 and offline states were made in that browser only. Read only.

Evidence is in `SP/r4/`: scripts, `out-*.txt` logs, and crops under `SP/r4/shots/`.

### Status of open findings

| ID | Status | New measurement |
|---|---|---|
| IS-P4-06 | **Partly fixed** | Down from `Review time off` now lands on the "12 people with no weekly hour target" heading (292,646). Up from the first row of an open group returns to its heading.<br>**Down from a closed group heading is stuck:** three presses leave focus on the same heading at y 646, and the page doesn't scroll either. Plan ahead has three closed groups, so a keyboard user moving down the list stops at the first one and has to switch to Tab.<br>Cause: `src/lib/row-navigation.ts:8` and `:16`. `visible()` uses `getClientRects()`, which still counts the rows inside a closed `<details>`. The next row is one of those hidden rows, its `focus()` fails silently, and the key's default is already prevented.<br>Fix: drop rows inside a closed group from the list: `.filter(el => visible(el) && !(el.parentElement?.closest('details:not([open])') && !el.matches('summary')))`. **P2** |
| IS-P4-08 | **Fixed** (named cases) | Section entries are now `aria-current="true"` on their sub-pages: Settings on Payroll settings, Home on Team overview, Attendance and Schedule activity, Inbox on Time off and Shift requests, Timecards on Time exports, and Schedule on Templates. The top pages themselves are `"page"`: Timecards, Settings, Schedule. Residual: see IS-P4-20. |
| IS-P4-16 | **Fixed** | Request pages is now DOM and Tab stop 5, with the first Inbox row at stop 8. After the filters, Tab goes Time off → Shift requests → Availability (y 253) → the first row (y 377), so the Tab order matches what you see. |
| IS-P4-17 | **Fixed** | With a 3 s read, Enter on Refresh shows "Refreshing…" with `aria-disabled="true"`, so `disabled` stays false and focus stays on the button. The accessible name is "Refreshing…", and it contains a `status` that says "Refreshing the Inbox…". A second Enter sends no second read. Afterwards it reads "Refresh" again, with focus kept. A failed refresh returns to "Refresh", with focus kept and the failure card shown. The 30 s background poll stays silent: the button only ever read "Refresh", and focus and scroll (2615) held. |
| IS-P4-18 | **Fixed** (known 404 counted under Gaps) | The count stops after its first 404. Owner session: 14 requests over 305 s across 8 full page loads, two per load (the dev server runs effects twice). There was no repeat during a 65 s wait and none on client navigation. |
| IS-P4-19 | Waiting on the coordinator (not counted) | Still open as measured. Lead, 1024: Enter on `Refresh recorded time` sets `disabled=true`, and focus drops to `<body>`. |
| IS-P4-05, IS-P4-11 | Waiting (not counted) | Unchanged. |

### New findings (round 4)

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| IS-P4-21 | Inbox · Manager · 1440 (same code at 1024 and on Owner) | Failure, sign-out and offline states arriving while the list is scrolled | Now that the list column keeps its height and the scroll stays put (ST-P4-03), a state that replaces the list leaves the reader looking at an **empty screen**. Scrolled to y 2000, with focus on a row:<br>• the poll returns 500;<br>• the poll returns 401;<br>• the network goes offline.<br>In all three, scrollY stays **2000** and document height stays 3941. The status card ("The Inbox isn't available right now. / Try again", "Sign in again to see your Inbox. / Sign in", "You're offline…") is at top **−1675**, far above the window. **No text at all** is in the window: the visible-text scan returned `[]`. Only the pane's still grey skeleton shows. Focus goes to `<body>`. The band's eyebrow ("Not available", "Offline") is off screen too. A screen reader hears the `role="status"`, but a sighted manager sees a blank page and has no Try again or Sign in in reach. | `r4/shots/AUDIT-M-1440-poll-fails-500-.png`, `AUDIT-M-1440-401-on-poll.png`, `AUDIT-M-1440-offline.png`; `out-scrolledstates-M-1440.txt` | `src/components/manager-inbox.tsx:293` puts the status card at the top of a list column held at its last height. The sticky side column (`:335`) shows only `DetailPlaceholder still`. | Show the state where the reader is. Render the status message and its action (Try again or Sign in) in the sticky side column instead of the still skeleton, for every state except `loading`; the sticky side column stays in view at top 81. Or make `.inbox-status` `position: sticky; top: 81px` inside the held column. Either way, move focus to that action only if focus was inside the list (`focusAfterRetry` pattern). | P1 |
| IS-P4-20 | Sidebar · both · 768–1440 | A sidebar entry on a page *below* it that has no trail page of its own | On `/app/employees/AUDIT-E` (Team member detail), **Team** is `aria-current="page"`. The trail ends with "People › Team", where Team is a link and nothing is marked current. A screen reader hears "Team, current page" on Alexandra's page. This is the same rule as IS-P4-08, for `deeper` pages. | `out-shell-r4-O.txt` | `src/components/app-shell.tsx:212`: `item.href === activeHref && !pageItem` ignores `deeper` | `aria-current={active ? (item.href === activeHref && !pageItem && !deeper ? "page" : "true") : undefined}` | P2 |

### Fix areas looked at again: correct

- **Request pages row:** three links across at y 253 with teal rings. ↓ on them scrolls the page, which is fine for a horizontal row.
- **Refresh:** only one read per press, and the silent poll is unchanged (see IS-P4-17).
- **Trails:** "Workspace › Settings › *Payroll settings*", "Plan › Home › *Team overview* / *Schedule activity* / *Attendance*", "Plan › Schedule › *Templates*".
- **Employee and Lead desktop (`AUDIT-E` at 1440 on My time, My pay, Requests, My schedule; `AUDIT-LEAD` at 768 on Shift requests, Timecards, Profile):**
  - The skip link is the first stop.
  - Pay tabs read My pay / My time / Timecards, inside the band at y 97 with white 2px rings.
  - The Requests tabs and the My schedule and Shift requests chips have white rings.
  - No stop is under the header, zero-sized, off screen or without a ring.
  - My time keeps focus and scroll (528) through a 30 s poll, and the height stays 1296.
- **Phones (390 Manager, 320 Owner, 390 Employee, 320 Lead):**
  - The Inbox has no `aria-current`, a hidden side column, the Request pages row hidden, and no held height.
  - A tapped row navigates, the skip link is hidden, and the first Tab is the brand link with a white ring.
  - No sideways scroll.

### Gaps (round 4)

- `/api/manager/inbox-count` is 404 on this branch, as expected. It logs one console 404 per full page load (two in dev), counted once here.
- Window blur (paused) still can't be produced in Playwright. Its code path is the same as offline, so IS-P4-21 applies to paused too, from the code.
- The Manager client-navigation part of the count check timed out on the slow server, so I used the Owner run.
- No 200% text pass this round.

Open: 0 P0, 1 P1, 2 P2

## Round 5 (exit round)

Checked on October 19, 2026, 15:50–17:05 AST, on `8012d97`, with the same preview and saved states. Read only.

- **Chromium:**
  - Manager and Owner at 1440, 1024 and 768;
  - Employee at 1440, Lead at 1024;
  - phones at 390 and 320 for all four roles.
- **WebKit:** spot checks at 1440 (Inbox arrows and groups).

Inbox and Home reads were served in my own browser from cached real responses with a fresh `observedAt`, and so were the slow, 500, 401 and offline states. Evidence is in `SP/r5/`: scripts, `out-*.txt` and `sw-*.txt` logs, and crops under `SP/r5/shots/`.

### Status of open findings

| ID | Status | New measurement |
|---|---|---|
| IS-P4-06 | **Fixed** | Down from `Review time off` steps through the whole list: "12 people with no weekly hour target" (closed) → Set deadline → both timecards → "7 people haven't sent availability" → "5 people haven't confirmed the schedule", and stops at the end of the list. Up retraces the same steps exactly. In an open group, Down goes through its 7 rows and then on to the next heading. No stop lands on a hidden row. Chromium and WebKit agree. |
| IS-P4-20 | **Fixed** | On `/app/employees/AUDIT-E`, Team is `aria-current="true"`. |
| IS-P4-21 | **Fixed** | Scrolled to y 2000, at 1440 (Manager) and 1024×768 (Owner): a failed poll, a 401 on the poll, and going offline each keep scrollY at 2000. The status card sticks at top **81** with its message in view. Try again or Sign in is at top 133. Focus moves to the message (`p.inbox-status-message`), and the next Tab reaches Try again (2px teal ring). Crop: `r5/shots/M-1440-failed-scrolled.png` |
| IS-P4-05, IS-P4-11, IS-P4-19 | Waiting on other owners (not counted) | Unchanged. |

### New findings (round 5)

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| IS-P4-22 | Inbox · Manager · **1440 and 390** (all widths: a phone regression) | Keyboard focus after the Inbox recovers | **`Try again` loses focus.** With the read failing, then succeeding, Enter on `Try again` leaves `document.activeElement` = `<body>`. That happens both when the very first load fails and when a read fails after the list has shown, at 1440 and at 390.<br>Phase 2 had fixed this (IS-58: focus lands on "Act now, 25"), and round 1 here measured it working. The Request pages card is now first in the list column (IS-P4-16), and it's in the DOM on phones too, where it's hidden. So the retry's target selector finds that card's **hidden** heading first (`#inbox-all-requests > .nv-card__head { display: none }`, and the whole card is `display: none` on phones). `focus()` on it fails, and `focusAfterRetry` stops there.<br>**Automatic recovery** (offline, then back online) also ends on `<body>`, because the status message that IS-P4-21 focused is unmounted. The next Tab then starts from the top of the list. | `out-retry` (console), `r5/out-recover.txt` | `src/components/manager-inbox.tsx:303`: `focusAfterRetry(".premium-inbox .nv-content .nv-card:not(:has(.inbox-status)) :is(.nv-card__title, h2, h3)", …)`; `src/components/kit/focus-after-retry.ts:15-16` | • Exclude the card: `".premium-inbox .inbox-list-column > .nv-card:not(#inbox-all-requests):not(:has(.inbox-status)) :is(.nv-card__title, h2, h3)"`.<br>• Have `focusAfterRetry` skip targets that aren't rendered (`found.getClientRects().length === 0`) and keep polling.<br>• For automatic recovery: when `ready` returns and `document.activeElement` is `<body>` because the status message had focus, focus the selected row (desktop) or the first section heading, using `preventScroll` so scrollY stays put. | P2 |

### Full sweep: checked and correct

- **Focus order and visibility.** Every Tab stop was recorded on each page below, up to 120 per page. No stop is missing a ring, sits under the header, is zero-sized or is off screen.
  - Owner at 1440: Home and its three views, Schedule, Team (plus `?q=zzz` and `?status=inactive`), Timecards, Payroll, Time exports, Time off, Updates, Insights and Settings.
  - Manager at 1024: Home, Inbox, Schedule, Team, Timecards, Time exports and Attendance.
  - Owner at 768: Home, Inbox, Schedule, Team and Payroll.
  - Employee at 1440: Home, My schedule (and `?view=open`), Requests overview, Time off, Shift requests, Availability, My time, Timecards, My pay, Profile, Updates and Notifications.
  - Lead at 1024: Home, My schedule (and `?intent=swap`), My time, My pay and Profile.
  - Three stops the script flagged are correct:
    - The search fields on Schedule and Notifications show their 2px teal ring on the wrapper (`:focus-within`).
    - The Manager Time off section tabs sit on the white page, not the band, so a teal ring is right there.
- **Shell (Manager, 1024):**
  - The skip link is Tab 1 (134×44, 2px teal ring), and Enter moves focus to `main`.
  - The account menu, "Morgan Rivera, account menu", opens with Enter. Its items are Your profile, My pay and Sign out. It closes when focus leaves, and Shift+Tab returns to the trigger.
  - Trails and `aria-current` are right on Time off, Time exports, Team overview and Attendance.
  - `scroll-padding-top` is 81px.
  - Team row names include the phone number.
- **Inbox list and pane (Owner, 1440):**
  - Request pages comes first in the Tab order.
  - The sticky pane's heading is at top 101 and visible.
  - Shift+Tab from the pane goes back to the selected row.
  - A deep link into a closed group opens it, Escape returns to the row, and the Plan ahead fallback stays visible.
  - The selected waiting avatar is a white disc.
  - The 30 s poll keeps scrollY at 2611 and focus where it was.
  - Refresh shows "Refreshing…" with `aria-disabled` and a status message, and focus stays on it. A failed refresh keeps both columns.
- **Home states (Manager, 1440):**
  - Ready: "26 things need you today."
  - Loading: "Checking what needs you…"
  - 500: "Couldn't load everything." with two `Try again` buttons. Enter on the first focuses the Next up card.
  - 401 and offline: the matching band messages.
  - Back online, it returns to ready. The document height stays 1345 in every state.
- **Employee and Lead pages:** focus and states as in rounds 2 and 4, with no regressions in the sweep.
- **Phones (390 Manager, 320 Owner, 390 Employee, 320 Lead):**
  - The Inbox has no `aria-current`, a hidden side column and Request pages, and no held height.
  - A tapped row navigates.
  - The skip link is hidden, and the first Tab is the brand link with a white ring.
  - No sideways scroll.
  - The exception is IS-P4-22 (`Try again` focus).

### Gaps (round 5)

- `/api/manager/inbox-count` is 404 on this branch, as expected. One console 404 per full page load.
- The dev server returned statement-timeout 500s on some first loads during the sweep. I retried once and didn't file them.
- Window blur (paused) still can't be produced in Playwright. It shares the offline code path, which passed.
- No 200% text pass this round.

Open: 0 P0, 0 P1, 1 P2
