# PRD: Search on phones for Owners and managers

- **Cycle:** 1, PRD step. Written 2026-10-17 by the Product Manager.
- **Approval:** direction item 6 (A8, score 15), approved by Jose at Checkpoint 1 on 2026-10-17 (`docs/product/direction.md`, "Checkpoint 1 decision").
- **Sources:** direction §1.3, §3.2 row 6, §4; trends T §2 (search row), T §3.4; DESIGN.MD U1, U8, D3, Owed testing.
- **Status:** ready for design. No backend, migration, legal or privacy change.

## Contents

1. Summary
2. Problem
3. Users and platforms
4. User stories and acceptance criteria
5. States
6. Out of scope and later
7. Dependencies and constants
8. Metrics
9. Release slices
10. Open questions

---

## 1. Summary

Owners and managers on a phone get a search button in the header. It opens the existing ⌘K finder (`src/components/command-finder.tsx`) as a full-screen sheet, with the same results, the same read-only people route and the same privacy rule: an empty query never lists the team. "Search" also appears first in the manager More menu. Desktop doesn't change. The four tabs plus More stay as they are.

## 2. Problem

- **The finder exists only on desktop.** `portal-gusto.css:324` hides `.command-finder-trigger` below 760px. The Product Designer confirmed on the live preview at 390px that phones show no search entry (direction §1.3).
- **What a manager does today.** To reach a person they tap Team, wait for Employees to load, type in the filter and tap the row. To reach an action ("Add a shift"), a location's schedule or a page outside the tabs, they open More and scan up to 10 entries (`mobileMoreForRole()`, `src/lib/navigation.ts:158`). Nothing on the phone jumps to an action or a location by name.
- **A gap in the phone chrome.** The phone layout also applies to phones in landscape (`(max-width: 900px) and (max-height: 430px) and (orientation: landscape) and (pointer: coarse)`, `portal-gusto.css:284`), but the trigger rule only checks `max-width: 760px`. A phone turned sideways shows the desktop "Search ⌘K" pill inside the phone header.
- **Expectation.** HIG Search fields (2025-06-09, 2026-06-08), Shopify's iOS search button and Jobber's search tab teach people to look for search on a phone (T §3.4).

## 3. Users and platforms

| User | Job made easier | How often |
|---|---|---|
| Owner | Jump to a person, a location's schedule, an action or a page from any screen | Several times a day on a phone, between desktop sessions |
| Manager | Same; most often "find this person" while on the floor | Several times a shift |
| Lead, employee | No change. The finder and `/api/manager/finder` refuse non-management roles (DESIGN.MD U8) | n/a |
| Clocker kiosk | No change | n/a |

| Platform | Behaviour |
|---|---|
| iOS app | No store app yet. When the Capacitor shell exists, the same web header button and sheet run inside WKWebView. A native search bar is out of scope (see the spike PRD) |
| Android app | Same as iOS app. Back closes the sheet (item 11, `prd-phone-polish.md`) |
| Desktop web | No change: "Search ⌘K" in the top bar, the 620px dialog, ⌘K / Ctrl K |
| Mobile web (Safari, Chrome) | Header search button; full-screen sheet; field at 17px so iOS doesn't zoom |
| PWA (installed) | Same as mobile web, inside the standalone window and its safe areas |

## 4. User stories and acceptance criteria

Each criterion names the role and width it runs at. "Phone layout" means the phone chrome media query in `portal-gusto.css:284` (390px, 375px, 320px, and landscape phones).

### S1. Open search from the phone header

*As a manager on my phone, I want a search button at the top of every page, so that I can jump to a person, place, page or action without hunting through tabs.*

- **AC1.1** Given an Owner or manager in the phone layout on any `/app` page, when the page renders, then the header shows one search button (Phosphor `MagnifyingGlass`, the icon the desktop trigger uses) with the accessible name "Search", at least 44 by 44px, beside the notification bell and account menu.
- **AC1.2** Given an employee or lead in the phone layout, when any page renders, then no search button appears (matches `!employee` in `app-shell.tsx:222`).
- **AC1.3** Given a phone in landscape (for example 844 by 390), when the page renders, then the header shows the phone search button and not the desktop "Search ⌘K" pill.
- **AC1.4** Given the phone header at 320px with a company logo chip (B1) and a notification count, when it renders, then the wordmark, logo chip, search, bell and account button don't overlap or clip, and every target stays 44px or larger.
- **AC1.5** Given a company brand (B1), when the header renders on the masthead colour, then the search icon meets 3:1 against the header (WCAG 1.4.11), using the header ink tokens the bell uses.

### S2. Search in a full-screen sheet

*As a manager, I want search to fill the screen with the field ready to type, so that the keyboard and results don't fight for space.*

- **AC2.1** Given the phone layout, when I tap Search, then the existing finder `<dialog>` opens full screen (the visible viewport height, inside safe areas), the field has focus and the on-screen keyboard opens on iOS Safari, the iOS standalone PWA and Android Chrome.
- **AC2.2** Given the sheet is open with the keyboard up, when I look at the screen, then the field and at least the first result row stay visible above the keyboard (checked at 390 by 844 and 375 by 667).
- **AC2.3** Given the field, when I type, then the computed font size is at least 16px (17px today, `portal-gusto.css:332`) so iOS doesn't zoom the page.
- **AC2.4** Given an empty query, when the sheet opens, then it lists Actions and Pages only, never People or Locations (`rankFinder()`, `src/lib/finder.ts:41`).
- **AC2.5** Given a query, when results appear, then they rank and group exactly as on desktop (same `finderItems()` and `rankFinder()`), each row is at least 44px tall in the phone layout, and long names wrap instead of clipping.
- **AC2.6** Given the phone layout, when the sheet is open, then the keyboard hint row ("↑ ↓ to move · Enter to open · Esc to close") is hidden and a visible Close button (accessible name "Close search") sits beside the field.
- **AC2.7** Given a result, when I tap it, then the sheet closes and the app opens that result's `href` with `router.push`, the same call desktop uses (`command-finder.tsx:48`).
- **AC2.8** Given the sheet, when I tap Close or press Escape, then it closes and focus returns to the Search button.
- **AC2.9** Given the desktop layout (1440), when I press ⌘K or click "Search ⌘K", then the dialog opens at its current size and position. The U10 computed-style snapshot of the top bar and the open dialog at 1440 shows zero differences.

### S3. Search from More

*As a manager who already opened More, I want Search at the top of that list, so that I find it in the place I'm already looking.*

- **AC3.1** Given an Owner or manager in the phone layout, when I open More, then the first item is "Search", above the destinations from `mobileMoreForRole()`.
- **AC3.2** Given More is open, when I tap Search, then More closes and the same finder sheet opens with focus in the field. The page has one finder dialog, never two.
- **AC3.3** Given the navigation data, when I compare `navigationForRole()`, `mobileTabsForRole()` and `mobileMoreForRole()` before and after, then they return the same lists. "Search" is a button the shell renders, not a destination, so `navigation.test.ts` needs no change.

### S4. Search with a weak or missing connection

*As a manager in a basement stockroom, I want search to say what it can't reach, so that I don't read "no results" as "this person doesn't exist".*

- **AC4.1** Given `/api/manager/finder` is slow, when the sheet opens, then the status line reads "Loading people and places…" and Actions and Pages still work.
- **AC4.2** Given the route fails or returns `unavailable`, when the sheet is open, then the status line reads "People and places are unavailable right now." and no People or Locations group appears.
- **AC4.3** Given the phone is offline (`navigator.onLine` is false), when the sheet opens, then the status line reads "People and places unavailable offline" and the sheet makes no request.
- **AC4.4** Given any failure, when I type a person's name, then the sheet never shows "No matches." for a query it couldn't check against people. It shows the unavailable line instead.

### S5. Reviewers see the button in the preview

*As a reviewer using `/ui-preview/home`, I want the preview header to match the live phone header, so that I review what users see.*

- **AC5.1** Given the preview as Owner or Manager at 390, when it renders, then the header shows the search button.
- **AC5.2** Given the preview, when I tap it, then the preview notice reads "Search is not connected in this sample." and nothing calls `/api/manager/finder` (the preview never mounts private readers, `home-preview.tsx:29`).

## 5. States

The finder already has four remote states (`idle`, `loading`, `ready`, `unavailable`, `command-finder.tsx:11`). This PRD adds a sheet layer and an offline cause.

| State | Trigger | What the person sees | Exit |
|---|---|---|---|
| Closed | Default | Search button in header | Tap Search, More › Search, ⌘K |
| Open, loading | Open while people not fresh (60s, `FRESH_MS`) | Field focused, Actions and Pages, "Loading people and places…" | Route answers |
| Open, ready | Route returns `ready` | Results; People and Locations only once you type | Type, select, close |
| Open, no match | Query has no result and people loaded | "No matches." | Edit query, close |
| Open, unavailable | Route error or `unavailable` | Actions and Pages; "People and places are unavailable right now." | Close and reopen; a failed read isn't cached, so reopening tries again |
| Open, offline | `navigator.onLine` false | Actions and Pages; "People and places unavailable offline" | Close; reopen online |
| Navigating | Result selected | Sheet closed; next page's route skeleton | Page loads |

| Cross-cutting state | Requirement |
|---|---|
| Loading | No skeleton. The status line has `role="status"`, which screen readers already hear |
| Empty | Empty query lists Actions and Pages only (U8 privacy rule) |
| Error | As "Open, unavailable". Never zero, never an empty People group |
| Offline | As "Open, offline". Picking a Page while offline shows the existing offline page (`public/fuel-portal-offline.html`) |
| Reduced motion | No open or close animation at any setting. U8 chose none on desktop; the sheet keeps that, so reduced motion needs no extra rule |
| Keyboard | ⌘K / Ctrl K toggles at every width. Up and Down move, Enter opens, Esc closes, Tab reaches Close. Focus stays inside the open dialog and returns to the trigger |
| Screen reader | Combobox with `aria-activedescendant` and a listbox, as today. The trigger announces "Search, button, pop-up dialog" or the platform equivalent |
| 200% text and zoom | At 200% browser zoom (720 CSS px) and at 320px, the field, Close button and rows wrap with no sideways scroll. Once phone type moves to `rem` (`prd-phone-foundations.md`), the finder rows follow the root size too |

## 6. Out of scope and later

| Item | Why | When |
|---|---|---|
| Search for employees and leads | The route refuses them by design; employees have no cross-team data to search | Not planned |
| Recent people and actions before typing | Storing names on the device is personal data on a shared phone, so it needs privacy review | After a privacy decision |
| Plain-language questions ("who's off Friday") | A14; needs B5 Spanish and new filters | After A8 and B5 |
| A search tab or a fifth tab | Breaks four tabs plus More (direction §4) | Not planned |
| Native search bar in the store app | Needs the Capacitor build decision | After the spike |
| Bottom-placed field | See open question Q1 | Not this cycle |
| Changes to `/api/manager/finder` or `finder.ts` ranking | Data contract stays; no backend phase approved | Not planned |
| 44px rows on the desktop finder (rows are 40px, `portal-gusto.css:336`) | Desktop is out of this PRD | Raise with the UI Designer for a desktop pass |

## 7. Dependencies and constants

**Reuse, don't rebuild:**

- `src/components/command-finder.tsx`: the one dialog, `open()`, `load()`, keyboard handling.
- `src/lib/finder.ts`: `finderItems()`, `rankFinder()`.
- `GET /api/manager/finder` (`src/app/api/manager/finder/route.ts`): unchanged.
- `src/components/app-shell.tsx:221-233`: header actions; `:320-333`: manager More (`ActionMenu`).
- `src/app/app/portal-gusto.css:284`, `:316-343`: phone chrome query and finder styles.
- `src/components/ui-preview/home-preview.tsx`: preview header and `notice()`.

**Engineering note.** More › Search must reach the finder's `open()`. Expose it from `CommandFinder` (a ref, a context or a window event) and keep a single `<dialog>` in the page.

**Dependencies:** none on B5, B6, migrations or the native wrapper. Back closing the sheet comes from item 11 (`prd-phone-polish.md`); this PRD ships without it, and item 11 adds the finder to its surface list.

**Constants touched: none.**

- Navigation structure: four tabs plus More stay. More gains a button at the top; no destination moves or renames, so no migration note is needed.
- Key action names: unchanged. No script in `scripts/` presses a finder string (searched 2026-10-17). Desktop "Search" and the dialog's accessible names stay exact.
- Teal: the search icon is an action, so it may use the header's action treatment. Selected result rows keep `--g-accent-wash`.
- Phosphor and Inter: unchanged. Targets 44px or larger.

## 8. Metrics

Measured on the fictional runtime in a worktree (owner and manager fixtures), at 390 by 844 in Chromium and WebKit, before and after.

| Metric | Today | Target |
|---|---|---|
| Taps to open a named person's profile from Schedule | 3 taps plus typing, with an Employees page load (Team tab › filter › row) | 2 taps plus typing (Search › row) |
| Taps to reach "Add a shift" from Inbox | 2 taps if you know it's on Schedule, plus a page load | 2 taps plus typing, no intermediate page |
| Taps to reach a location's schedule from Home | Schedule tab › location tab (2 taps, one load) | 2 taps plus typing |
| Requests to `/api/manager/finder` per open within 60s | 1 then 0 (desktop) | Same on phones |
| Status line shows "No matches." while people are unavailable | Not applicable | 0 occurrences in a blocked-route test |
| Desktop top bar and dialog style differences at 1440 | n/a | 0 against the U10 baseline |

**Later, with real use:** share of manager phone sessions that open search, time from open to selection, and searches that end with Close and no selection.

## 9. Release slices

Each slice ships alone, runs on the fictional runtime and ends with a checkpoint: the UI Engineer posts evidence, the Product Designer reviews it, and nothing is committed until Jose approves at Checkpoint 3.

| Slice | Contents | Checkpoint evidence |
|---|---|---|
| **1. Header button and full-screen sheet** | S1, S2, S4. Phone query fix for landscape | Screenshots at 320, 375, 390 and 844 by 390 (closed, open empty, open with results, unavailable, offline); keyboard run; axe on the open sheet; WebKit and Chromium; U10 snapshot zero diff at 1440; the U8 flow checks still pass |
| **2. More › Search** | S3 | More sheet screenshot at 390; one-dialog check; navigation unit tests unchanged and passing |
| **3. Preview and device check** | S5; run on the iOS simulator (Safari and standalone PWA) and the `Nevora_Pixel_7_API_36` Android emulator | Simulator and emulator screenshots with the keyboard up; preview at 390 for Owner and Manager |

## 10. Open questions

| # | Question | Recommendation |
|---|---|---|
| Q1 | Field at the top of the sheet or at the bottom above the keyboard (HIG's bottom placement)? | **Top.** A bottom field in a web page must track `visualViewport` as the keyboard moves, which is fragile in iOS standalone mode. Android's full-screen search view and the iOS Mail and Settings search fields also sit at the top. Revisit inside the native shell |
| Q2 | Label the close control "Cancel" (iOS habit) or "Close"? | **"Close"**, with the accessible name "Close search". It matches "Close actions" on the More sheet and the voice guide's verb-first rule |
| Q3 | Should the desktop finder rows also reach 44px? | Yes, but in a desktop pass, not here. Flag it to the UI Designer |
