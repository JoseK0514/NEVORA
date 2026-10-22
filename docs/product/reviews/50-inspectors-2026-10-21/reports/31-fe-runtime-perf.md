# 31 Web Performance Engineer (runtime): what users feel (LCP, interaction delay, CLS, network chatter, memory)

**Verdict.** Pages that render from the server feel quick even on a 4x-throttled phone: FCP and LCP were 0.28–0.39 s on Timecards, Requests and Employee pages. The two pages managers open most, Home and Inbox, are the slow ones. Their content waits on a client-side request chain (page, then JS, then 3–5 API reads), and once loaded they keep polling every 30 s on 5 separate timers. Every page also ships the same 1.6 MB of CSS (about 5,500 rules) and downloads the 876 KB Inter TTF instead of the preloaded woff2, even on Owner and Manager pages that use the system font.

Method: Playwright Chromium with CDP `Emulation.setCPUThrottlingRate=4`, at 390×844 with mobile and touch (desktop checks at 1440). Each route was warmed once, then measured on a fresh tab. PerformanceObserver collected LCP, CLS (with sources), long tasks and Event Timing. CDP `Performance.getMetrics` gave heap, nodes, style recalc and script time. The preview is a **dev server** (unminified, React dev mode, StrictMode), so absolute numbers are inflated. Compare pages with each other and treat the request counts and DOM/CSS structure as real.

## Measured summary (390px, 4x CPU, warmed dev server)

| Route (account) | FCP | LCP | LCP element | CLS | TBT* | API reqs on load | DOM nodes |
|---|---|---|---|---|---|---|---|
| /app Home (Owner) | 916 | 1840 | row title (client data) | 0.007 | 289 | 6 | 2166 |
| /app Home (Manager) | 280 | 1268 | row title | 0.008 | 154 | 6 | 1923 |
| /app/inbox (Owner) | 384 | **2792** | row title | 0 | **596** | 5 | 3138 |
| /app/inbox (Manager) | 280 | **1664** | row title | 0 | **446** | 5 | 3029 |
| /app/schedule (Owner/Mgr) | 536–1292 | 1080–1796 | row title | 0 | 153–283 | 3 | **4266–4697** |
| /app/timecards (Owner/Mgr) | 284–388 | 284–388 | h1 | **0.103** | 136–169 | 5 | 2184–2286 |
| /app/requests, exchange, settings | 316–752 | 316–752 | h1 / text | 0 | 118–146 | 3 | ~1.7–2.6k |
| /app/availability (Owner) | 6660 | 7208 | link | 0 | 279 | 3 | 2099 (TTFB 6.3 s) |
| /app/notifications (Owner) | 2372 | 2864 | summary | 0.009 | 148 | 4 | 1780 (TTFB 2.1 s) |
| Employee pages (5) | 268–756 | 268–1012 | icon / h1 | 0–0.001 | 115–192 | 1–4 | 975–2011 |

*TBT = sum of (long task − 50 ms) during load. JS heap was 11–20 MB per page. No page shows heap pressure.

## Recommendations

1. **Ship the first Home and Inbox snapshot with the page, and poll only after that.**
   - Why: on both pages the LCP element is a row filled in by client fetches (`useToday`, `manager-today.tsx:11-28`; action-center; inbox-count). Inbox LCP is 1.66–2.79 s and Home LCP is 1.27–1.84 s. Server-rendered pages land at 0.28–0.39 s. A traced Home→Inbox tap at 4x went: ~1.0 s with no visual change while the RSC and chunks loaded, then a skeleton at 1.09 s, then rows at 1.88 s. `/api/manager/inbox-count` returned last, at 1.91 s, so the badge updates after the rows.
   - Fix: pass the server-read snapshot as initial props and let the private-snapshot controller take over from there. That keeps the expiry and fencing rules.
   - Impact **High**. Effort **M**. Owner **Backend + UI**.

2. **Merge the Owner/Manager "today" reads into one polled endpoint and compute the badge from it.**
   - Why: Home runs 5 independent timers: today, action-center and clock-monitor at 30 s each (`private-snapshot-client.ts` `schedule()`), the bell at 30 s, and inbox-count at 60 s (`use-inbox-count.ts:33`). Idle Home for 95 s made **13 API requests**: today ×3, clock-monitor ×3, notifications ×3, action-center ×3, inbox-count ×1. `readInboxCount` (`src/lib/data/inbox-count.server.ts:15-22`) re-runs `readToday` and `readActionCenter` in sequence, plus a transaction, even though the same page already polls those two endpoints. So every Inbox/Home cycle computes "today" and "action center" twice on the server. `needsYou()` could run on the client over data the page already has. `useInboxCount` also restarts its fetch and interval on every pathname change (`[enabled, pathname]` deps).
   - Impact **High**: server load scales with managers × open tabs, and phone battery/radio wake-ups. Effort **M**. Owner **Backend** (endpoint), **UI** (hook).

3. **Fix the Inter font pipeline. The preload is wasted and the 876 KB TTF is downloaded instead.**
   - Why: `app/layout.tsx:49` preloads `inter/variable.woff2` (242 KB). Six other stylesheets re-declare `@font-face "Inter"` with a **TTF-only** `src`: `schedule/employee-schedule.css:1`, `availability/availability.css:1`, `components/app-error-screen.css:11`, `payroll-export/payroll-page.css:3`, `employee-directory.module.css:3`, `clocker-pin.module.css:3`. The later rule wins. Measured on first visit: the woff2 requests were `ERR_ABORTED` and `variable.ttf` transferred **458 KB**. Owner/Manager v3 forces the system font (`premium-clean-manager.css:14-18,1024`), so for those roles Inter is mostly unused. One exception: Owner Home's h1 still computes to `Inter`, which is a design leak worth noting.
   - Fix: keep one woff2 `@font-face` and delete the copies. Preload only for roles or pages that use Inter (Employee, Clocker).
   - Impact **High** on first visit over cellular. Effort **S**. Owner **UI**.

4. **Split the global CSS by role and route.**
   - Why: every `/app` page loads ~1.6 MB of source CSS (~211 KB gzip, measured by concatenating `globals.css` + root sheets + `portal-*` + `premium-*` + `clean-manager/*`). That is 5,268–5,764 rules, all render-blocking. **Employee pages load all of the Owner/Manager v3 CSS**: Employee Home has 5,764 rules, identical to Owner Home. The v3 sheets use 1,502 `:not(.cm-a):not(.cm-b):not(.cm-c):not(.cm-d)` chains under `html body .app-shell.nevora-portal.nevora-portal[data-nv-clean][data-nv-clean]`, plus a universal `* , *::before, *::after` font rule (`premium-clean-manager.css:1024`). Style recalc cost 80–211 ms per load at 4x.
   - Fix: import `clean-manager/*` and `premium-clean-manager.css` from a clean-role layout segment, not `app/layout.tsx:1-20`. Retire the superseded `portal-premium.css` (328 KB) and `premium-wave-*` layers where v3 overrides them.
   - Impact **Medium-High**. Effort **L**. Owner **UI**.

5. **Remove the Timecards phone layout shift (CLS 0.103, 2 of 2 fresh loads).**
   - Why: the shift sources were `DIV.cm-tc-tools` (y 261→790) and `P.cm-page-foot cm-tc-foot` (height 50→0) when rows arrive. The phone `tools` render *below* `<HoldHeight holding={!ready}>` (`timecards.tsx:308,371-372`), and on a first visit HoldHeight has no remembered height to hold. This is just over the 0.1 "good" threshold, on a page managers use weekly.
   - Fix: give the loading state a fixed minimum height (or a skeleton with the default row count), or put the period tools above the list on phone.
   - Impact **Medium**. Effort **S**. Owner **UI**.

6. **Render one schedule layout, not both.**
   - Why: `manager-weekly-roster.tsx:222-224` always renders `cm-sched-phone` (week strip and day list) **and** `cm-sched-desk` (full week grid). CSS hides one of them (`clean-manager/schedule.css:31`). Measured hidden elements inside `<main>`: 639 on phone and 318 on desktop. Schedule has the largest DOM: 4,266–4,697 nodes on phone versus ~2k on other pages, with fictional data for a small team (it grows by employees × 7). A week-strip tap is a 136–320 ms interaction at 4x. Script runs ~111–123 ms per tap and style recalc only ~15–18 ms, because `setPhoneDay` re-renders the whole roster, hidden grid included.
   - Fix: pick the layout with `useSyncExternalStore(matchMedia)`, or memoise the grid subtree so a day change doesn't touch it.
   - Impact **Medium** (gets worse with team size). Effort **M**. Owner **UI**.

7. **Make Inbox interactions lighter.**
   - Why: Inbox has the heaviest load (TBT 446–596 ms, a 383–441 ms long task). Opening an item sheet is a 296 ms interaction (196 ms in the click handler) and closing with Escape takes 304 ms, at 4x. It's all React work: the sheet uses `history.replaceState` (`manager-inbox.tsx:280,315`) and sends no network requests. All 51 rows are mounted, including those inside closed `<details>` groups (`manager-inbox.tsx:407-409`). Only 3 were visible on the phone.
   - Fix: lazy-mount the rows of collapsed groups when they open, memoise `Row`/`ShiftRow`, and keep sheet state in a small child so opening it doesn't re-render the list.
   - Impact **Medium**. Effort **M**. Owner **UI**.

8. **Throttle refocus refetches.**
   - Why: one window `blur`→`focus` on Home fired 3 immediate API reads (notifications, clock-monitor, action-center). So did `pagehide`→`pageshow`+`focus`. The bell treats `focus`, `pageshow` and `visibilitychange` each as a restart (`notification-bell.tsx:23-25`), and `pause()` nulls the snapshot (`private-snapshot-client.ts` `pause`). That is by design for privacy, but on desktop every alt-tab costs a burst of requests.
   - Fix: coalesce the three events into one restart. Skip the refetch if a valid snapshot is younger than ~10–15 s, and still clear it from screen as now.
   - Impact **Medium**. Effort **S**. Owner **UI**.

9. **Profile the server tail latency on a production build.**
   - Why: on the warmed dev server, Availability had a TTFB of **6.3 s** on its second visit and Notifications **2.1 s**. One of three `/api/manager/today` calls took **6.9 s** (the others took 52 and 443 ms). `/api/manager/inbox-count` ranged 97–1,355 ms. The snapshot client times out at 10 s and then shows "unavailable", so spikes like these turn into visible error states.
   - Fix: add `Server-Timing` headers (none found in `src/`) for the DB phases and measure on `next start` with production-like data volume.
   - Impact **Medium**. Effort **M**. Owner **Backend**.

10. **Add field measurement and a budget.**
    - Why: there is no `useReportWebVitals` or web-vitals reporting in `src/`, so production LCP, INP and CLS by role and device are invisible.
    - Fix: report the vitals to a first-party endpoint (fictional data only in tests). Set budgets: phone LCP < 2.5 s, INP < 200 ms, CLS < 0.1, ≤ 1 poll request per 30 s per page, CSS per route < 60 KB gzip. Fail CI on regressions with a throttled Playwright check like the one used here.
    - Impact **Medium**. Effort **S-M**. Owner **UI + Product** (Jose approves where the data goes).

## What's good
- Server-rendered pages paint fast even throttled. Timecards, Requests, Exchange, Settings and all 5 Employee pages reach LCP in 0.27–0.75 s, with CLS ≈ 0 everywhere except Timecards.
- The polling discipline is careful: one in-flight read, abort on supersede, a 10 s timeout, a pause when hidden or offline (`private-snapshot-client.ts`), and expiry tied to `validForMs`. The 95 s idle run had no aborted or overlapping requests.
- Memory is stable. Twelve client navigations across the phone tab bar with forced GC took the heap from 13.9 to 20.8 MB (+196 nodes, +55 listeners), which fits the router cache. No runaway listeners or detached-tree growth was seen.

## Not checked / limits
- Dev server only, so JS size (5–6 MB per page) and absolute timings are not production numbers. Next dev does not prefetch links, so the ~1 s "nothing happens" after a tab tap may be shorter in production. No `next build` was run, per the brief.
- No network throttling. Only CPU 4x. The font and CSS costs would grow on 3G/4G.
- I did not measure payload sizes of `/api/timecards` (polled every 30 s, `timecards.tsx:151`) or `/api/payroll-export` (30 s, `payroll-export.tsx:81`) at realistic team sizes, or the Lead role.
- Paired `inbox-count ×2`, `timecards ×2` and `time-corrections ×2` requests on load were aborted duplicates, consistent with React StrictMode in dev. Treated as dev-only.
- INP was approximated with Event Timing on scripted clicks. There was no real touch hardware and no Safari/WebKit runtime profiling.
- Total browser time was about 12 minutes, one browser at a time, read-only, with no forms submitted.
