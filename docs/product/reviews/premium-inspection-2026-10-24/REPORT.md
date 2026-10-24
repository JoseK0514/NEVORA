# Premium inspection of the dev preview (Oct 24, 2026)

Jose asked for a full inspection of the dev preview because it "feels laggy and slow when transitioning between pages and scrolling, and in some cases ugly and broken". He wants a plan for a significant improvement toward an Apple-class feel.

## What was inspected

- **Hosted dev preview** (`fuel-scheduler`, commit `a62aeec7`, the merge of PR #30): public pages only, in WebKit and Chromium at 390 px. There are no fictional accounts on the hosted site, so nothing was signed in there.
- **Local production build of the same commit**, with fictional data:
  - **Captures:** 212 full-page captures.
    - Owner: 38 pages at 390 and 1440.
    - Manager: 13 pages at 390.
    - Employee: 15 pages at 390 (light and dark) and 1440.
    - Lead: 15 pages at 390.
    - Public: 8 pages at 390 (light and dark) and 1440.
  - **Timing:** page changes, scrolling (Chromium, plain and with the CPU slowed 4×) and in-page controls.
- **Code audit** of the same commit, read only.
- **Design reviews:** three agents compared every capture with the approved Quiet v4 mockups and the Signature spec.

## Not covered

- Signed-in timing on the hosted site (no test account there).
- WebKit after sign-in: WebKit drops the app's Secure session cookie on plain-HTTP localhost.
- A real iPhone.
- Lead in dark mode.
- Owner AI: `/app/ai-manager` returns 404 locally because the advisor is switched off in the test runtime. It hasn't been checked on hosted.

## Why it feels laggy (measured)

1. **Every tab tap swaps the page for a grey skeleton for at least 300 ms.**
   - The data for Schedule arrived in 38 ms, but the page appeared at about 400 ms. Frame by frame: the skeleton shows at 33 ms, a blank frame follows at 335 ms, and content appears at 400 ms.
   - React 19 holds a Suspense fallback for at least 300 ms once it shows. All 43 `loading.tsx` boundaries trigger this on every navigation.
   - The skeletons are also the old design (teal band, cards, a 21-cell grid) and shimmer. A Quiet page therefore flashes a different-looking page before it appears.
   - Inbox and Today flash a second skeleton for data they load in the browser.
   - Back links behave the same way (330 ms). Browser Back is 67 ms because it uses the cache.
2. **Only one `/app` route is prefetched after Home loads, and nothing is cached between visits.** There is no `staleTimes` setting, so every revisit re-renders on the server.
3. **Server waterfalls.**
   - Home runs about 7 dependent awaits; Schedule runs 16, including the session proof up to 4 times.
   - `getSession`, `requireSessionMutationProof` and `getWorkspace` aren't wrapped in React `cache()`.
   - Each await is a separate Neon HTTP round trip. Hosted, every one adds network time, on top of the cold starts (1.66 s) and database sleep found on Oct 23.
4. **CSS volume.**
   - The root layout ships 7 sheets (about 509 KB of source) to every page; the public Support page uses 48 of its 3,033 rules.
   - `/app` adds 19 more sheets (about 1.23 MB) for every role.
   - Entering the app loads 25 CSS files.
   - Expensive selectors: 357 `:has()` (50 anchored on `html` or `body`), a `*:not(svg):not(svg *)` font rule, the `.q-page *` rule, and 852 long `:not()` chains.
5. **Main-thread work during navigation.**
   - A MutationObserver on the whole Owner/Manager shell forces layout on every DOM change.
   - 14 gsap entrance animations run after paint.
   - A button spinner animates forever at 41 call sites.
   - Skeleton shimmer animates `background-position`.
   - Background polling (notifications, operational authority, inbox count) re-renders the 29 KB shell.
6. **Fonts.** Inter is redeclared as an 876 KB TTF in two CSS files, so it downloads twice (`woff2` and `ttf`) and text reflows on Schedule and Team.
7. **Scrolling** was smooth in Chromium (0 long tasks, even at 4× CPU). On iPhone, the likely costs are:
   - live `backdrop-filter` blur on fixed bars;
   - the scroll-driven box-shadow on the desktop header;
   - grain overlays with `mix-blend-mode`;
   - `overscroll-behavior: none` on `html`, which removes iOS bounce, so scrolling feels stiff.

   This still needs a check on a real iPhone.

## What is broken (confirmed in captures)

| Page | Problem |
|---|---|
| Owner Schedule, phone | The desktop week grid renders unstyled below the day list ("12a – 7a4p", "Rivera56h", a native "Show 7 unscheduled" button). This is Claude's regression from Quiet v4 (`34a974d8`): the rules that hide it on phones and style it on desktop require a `.cm-schedule` wrapper the Quiet page no longer has. See `evidence/owner-390-schedule-grid-leak.png`. |
| Owner Schedule, desktop | The same grid is unstyled (`evidence/owner-1440-schedule-grid-unstyled.png`). |
| Employee Delete account | No side margins; cards run off the edges; in dark mode the page stays white with a near-black field (`evidence/employee-390-*delete*`). |
| Public Account deletion | Leftover old page: grey canvas, coral button, a different typeface, the footer twice, 5,212 px tall. |
| Employee Swap and Callout | Opened without a shift, they show the false red error "That shift is no longer available for exchange". |
| Owner Time exports, desktop | Ten raw fieldsets, and the internal code "period_open" shown to users. |
| Owner Insights, desktop | The left half is empty. |
| Employee Updates, desktop | Segment labels overlap. |
| Owner Features | A divider cuts through helper text. |
| Employee Notifications | Two identical rows; three 404 resource errors in the console. |
| Manager (no access assigned) | Legacy cards with loose Refresh buttons; "Sign in again" shown on a 403. |

## Design consistency

- **Four looks** across the product:
  - Owner Quiet v4: white, bold titles, lists.
  - Employee Signature: deep teal band, thin display type, cream cards.
  - The old Owner tool pages on desktop: Timecards, Insights, Payroll, Time exports.
  - A leftover old style on public Account deletion.
- **Signing in jumps** from bold black on white to thin white on teal.
- **Two primary teals:** `#0B6E69` and `#0D3634`.
- **More than 9 button styles** on desktop.
- **Desktop shows phone layouts:**
  - Quiet pages are a 700 px column with about 450 px empty on the right.
  - Public pages are a 390 px column pinned left.
  - Phone back chevrons and Cancel/Add bars appear next to a permanent sidebar.
- **Data and copy:**
  - Long names wrap to 3 lines.
  - Initials and phone formats differ by page ("MF" vs "MJ"; "7875550101").
  - "employees" vs "people" for the same thing.
  - Zero counts are shown in filters.
  - Engineering and legal text walls on Payroll settings, Policies and Account recovery.
  - Manual "Refresh" links on six Employee pages.

## Dark mode

- **Fixed since Oct 23:** Profile rows, the correction button, today's date and the More tab.
- **Still wrong:**
  - the Delete page;
  - selected segments are darker than their track, so they look pressed in;
  - Callout "…" buttons look like holes;
  - a bright line in Profile;
  - the public pages ignore dark mode entirely, so a dark-mode phone gets a white sign-in and then a dark app.

## Evidence

- `evidence/`: the key screenshots and the navigation timing JSON (`nav-*.json`).
- The full capture set lives in Claude's scratchpad: `insp/shots/<role>-<width>-<scheme>/`, 212 PNGs plus `_metrics.json` per folder.
