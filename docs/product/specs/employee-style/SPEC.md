# Employee app style

**Current target (Oct 20, 2026): Signature.** After v5 and v6, Jose asked for "way way way more upscaling" and picked direction A, Signature: the approved sign-in (E4) carried into the app. He approved all eight Signature pages ("Approved all"). Targets: `signature/sig-*.png` (board: `signature/sig-board.png`). Tokens: cream `#F4EFE7`, paper `#FFFDF9`, ink `#161C1B`, ink-2 `#5F625E`, ink-3 `#6F6C66` (text; 4.6:1 on cream), faint `#B9B2A6` (decoration only), rule `#E2DACD`, deep `#0D3634`, mark `#164B48`, teal `#0B6E69`, sky `#35B6EC`. A deep-teal band with grain and the large Λ under the phone header, a cream sheet with 28px top corners, paper lists with 1px rules, light (300) figures, tracked-caps labels (12px, the only text under 15px besides date-block weekdays), underlined text links. Home is built (`employee-home-today.module.css`); the other pages follow one at a time.

The sections below describe the earlier Withings-inspired pass and stay for history.

## Earlier pass: new style (Withings-inspired), approved

Jose approved this on October 20, 2026 ("Approved"), after picking reference 8 (Withings Health Mate) from a board of nine real Home screens. Earlier attempts he rejected: a dense card layout ("dirty, overwhelming, looks like an AI app") and a sparse text-only one ("horrible").

The target is `png/BOARD-ALL.png` and the eight phone mockups in `png/`: Home (`h4-phone-390.png`), Schedule, Requests, Pay, the More sheet, My time, Notifications and Profile. Home on desktop: `h4-desk-1440.png`. Source: `html/`, `home4.css`, `allpages.css`, the `.py` builders.

Scope: Employee and Lead pages only. Owner and Manager keep the approved clean v3 style. Sign-in keeps E4.

## The language

- **Canvas:** soft off-white `#F6F6F4`; cards white `#FFFFFF`; hairlines `#E6E6E2`; the frame around a feature card `#EFEFEC`.
- **Ink:** `#121615`, secondary `#6B6E6A`, tertiary `#9C9E99`. Brand deep teal `#0D3634` for primary buttons, the avatar and today's markers; teal `#0B6E69` for small labels; sky `#35B6EC` only for unread dots and the logo spark; green `#2F8F4E` only for done and approved.
- **Top of every page:** a round avatar button (profile) on the left; on the right a round "+" (new request) and the bell with an unread dot. Then a big bold title (Home 34/40, other pages 32/38, weight 700) with one short grey line under it.
- **One framed feature card per page** (radius 30 frame, 10px padding, radius 22 inner white card) for the page's main thing. Home's card has the illustration on top.
- **Rows:** rounded white cards (radius 18, 1px hairline), a 44px soft-tinted icon tile, a title (16/21, weight 500) and a short grey line, the status or chevron on the right. Gaps of 10px between rows.
- **Segmented control:** a soft grey track with the selected option on white.
- **Section titles:** 22/28, weight 700 ("Today", "This week", "My requests").
- **Tab bar:** thin line icons; the active tab is ink and others grey. No filled placeholders.
- **No:** icon-in-box on every possible element, multiple coloured tags, gradients, badges with borders, long explanations. One short line at most.

## Pages

- **Home (replaced by v5, Oct 20):** the illustrated Home was built and then rejected ("AI and cheap and dirty"). Jose approved Home v5 option A "exactly like that": `home-v5/h5-a-teal.png`, `h5-a-teal-long.png`, `h5-c-dayoff.png` (source `home-v5/home5.*`). The date, then "Hi, {first name}"; one deep-teal shift card ("Scheduled now", the hours, the place, a progress bar with the time left, then the clock strip: status, refresh, My time); To do as one grouped list with empty rings; Coming up with a date block and View schedule; the publication note; Recent activity. No illustration, review pill, icon tiles or footer stamp. Built in `src/components/employee-home-reviewed.tsx` with `employee-home-today.module.css`.
- **Schedule:** "My schedule" with "{n} shifts · {h}h"; My shifts / Open shifts; the week strip with today on deep teal; the confirm card when the manager asks for confirmation; a row per shift with a date tile, today outlined; publication and time-zone note as one quiet line.
- **Requests:** Time off / Shift swaps / Availability; a "Need time away?" card with the button; the request list with Waiting / Approved / Declined in colour.
- **Pay:** the latest statement as the feature card with a Download button; earlier statements with a round download button; the privacy line.
- **More (sheet):** your name and role, then My time, Team updates, Notifications (unread count), Profile and settings, Sign out in red.
- **My time:** today's card (Off clock / Clocked in, Recorded, Breaks); recent entries or a calm empty state; Request a correction.
- **Notifications:** All / Unread / To do; rows with a blue unread dot.
- **Profile:** large avatar and name; Sign-in and security (Face ID), Preferences (Language, Notifications, Calendar), Your workplace, Help; Sign out.

## Rules for the build

- Look and layout only: the same reads, actions, permissions, private-data clearing and states. Every feature on today's pages stays reachable.
- Every state gets the same care: loading placeholders that match the final layout, empty, error, paused, signed out.
- Phone first: 320, 390 and 430px, landscape, 200% text, both engines, keyboard and 44px targets. Then 768 and 1440.
- Build one page at a time, Home first, each shown to Jose before the next.
- No illustration on Home (v5). The Canva illustration stays in Jose's Canva account and in `home-illo.jpg` here for reference only.
