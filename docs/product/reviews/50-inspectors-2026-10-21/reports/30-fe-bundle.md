# 30 Frontend Performance Engineer (build side): shipped JS and CSS for the Owner and Manager app

## Verdict
The JavaScript is in reasonable shape. Client boundaries are mostly justified, icons are imported per icon or tree-shake cleanly, and there are no heavy date or UI libraries. CSS is the structural problem. Every `/app` page, for every role, loads a render-blocking stack of 22 global stylesheets: 1.60 MB raw, about 1.36 MB minified and about 143 KB gzip. Roughly a quarter of it is dead or belongs to the other role. On top of that, the v3 layer wins a specificity war by repeating a 117-character selector prefix 1,502 times. One cheap JS fix is also open: Owner and Manager Home ships the whole Temporal polyfill (about 44 KB gzip) for a single date comparison.

Method: static import-graph walk from every `"use client"` file and every `/app` page, CSS parsing scripts (minify, gzip and brotli estimates, dead-class scan against all `src` TS/TSX, role-scope classification), and a few read-only GETs of the running dev preview to confirm chunk contents. There was no `next build` and no browser. Dev-server numbers are unminified.

## Recommendations

1. **Stop shipping the other role's CSS and delete the dead layers. Start with the dead CSS.**
   *What:* (a) Delete rules whose classes no longer exist anywhere in `src`. (b) Then split the role layers: Employee-only rules stay out of the Owner/Manager payload and the v3 (`data-nv-clean`) files stay out of the Employee payload. Since Owners and Employees share URLs, load role CSS from the server layout, which already knows `session.role`, for example with React 19 `<link rel="stylesheet" href=… precedence="v3">`. The alternative is to move v3 rules into a role-specific entry imported only by Owner/Manager components.
   *Why:* `src/app/layout.tsx:4-7` and `src/app/app/layout.tsx:1-20` import 22 global sheets for every role. Measured from the minified estimate:
   - About 348 KB is v3-only (scoped to `[data-nv-clean]`) and ships to Employees, who are the phone-heavy majority.
   - About 128 KB is Employee-only (`.employee-shell`, `[data-employee-corporate]`) and ships to Owners and Managers.
   - About 176 KB matches no class in the codebase: 1,414 of 8,330 rules. In `globals.css` alone it is 1,179 of 2,987 rules (about 130 KB). Examples: `.schedule-settings-page` has 85 refs and `.dashboard-overview` has 80, and neither appears in any TS/TSX file.

   The login and clocker pages also inherit `globals.css` (372 KB raw), plus `mobile-workforce.css` and `employee-mobile-corporate.css`, which only match inside `.app-shell`.
   *Impact:* High. It cuts render-blocking CSS parse and style-recalc cost on every page load, and cold-cache transfer drops by roughly 25–30%.
   *Effort:* M for dead-rule removal (scriptable, then screenshot-diff every route against the existing QA shots). L for the role split.
   *Owner:* UI.

2. **Delete the three dead Home stylesheets.**
   *What:* Remove the `manager-home.css`, `manager-home-mobile.css` and `manager-home-gusto.css` imports in `src/components/manager-dashboard.tsx:9-11`. Keep only the few rules still used, about 40 of 533, by moving them into `premium-clean-manager.css` or the kit.
   *Why:* 467 of 533 rules (about 67 KB minified) are keyed on `.manager-portal-home`, `.home-layout` or `.dashboard-hero`, and none of those classes appear in any TS/TSX file. The dev preview confirms they load on Owner Home as the 138 KB `src_components_*.css` chunk.
   *Impact:* Medium. Home is the landing page for every Owner and Manager.
   *Effort:* S.
   *Owner:* UI.

3. **Replace the specificity-hack prefix with CSS cascade layers.**
   *What:* Wrap the legacy sheets (`globals`, `portal-*`, `premium-wave-*`, `premium-desktop`, `premium-profile`) in `@layer legacy`. Put v3 in a later layer, or leave it unlayered. Then shorten the v3 selectors to `[data-nv-clean] …`.
   *Why:* `premium-clean-manager.css:1-7` says the prefix `html body .app-shell.nevora-portal.nevora-portal[data-nv-clean][data-nv-clean]:not(.cm-a):not(.cm-b):not(.cm-c):not(.cm-d)` is "long on purpose" to beat the older layers. It appears 1,502 times across the six v3 files, which is about 175 KB raw, or 11% of all `/app` CSS. Each copy is specificity (0,10,2) and is matched right to left on every style recalc. The legacy layers carry their own heavy prefixes too: `portal-premium.css` has 649 `:not(` uses and `globals.css` has 168 `!important`. This is a cost multiplier: every new v3 rule must out-shout everything before it. Today nothing in `src` uses `@layer`.
   *Caveat:* inside layers `!important` reverses priority, so audit the 187 `!important` uses first, mostly in `globals.css` and `portal-premium.css`.
   *Impact:* Medium for performance, High for maintainability.
   *Effort:* M.
   *Owner:* UI.

4. **Remove the Temporal polyfill from Home and Inbox.**
   *What:* In `src/components/manager-action-center.tsx:192`, replace `Temporal.Instant.compare(Temporal.Instant.from(now), Temporal.Instant.from(candidate.validUntil)) < 0` with `Date.parse(now) < Date.parse(candidate.validUntil)`, then drop the import at line 168. Separately, `src/lib/business-time.ts:1` imports Temporal at module top even though the formatters the client uses (`formatBusinessTimestamp`, `formatBusinessDateTime`) are pure `Intl`. Move those formatters into a Temporal-free module.
   *Why:* `@js-temporal/polyfill` plus `jsbi` is about 129 KB + 29 KB minified, about 44 KB gzip. The dev chunk for Owner `/app` (`node_modules_1w-aovq._.js`) contains both. They reach `manager-inbox.tsx` through the action center as well. Timecards (`lib/timecards/project.ts` `parsePeriod`) and Reports (`reports.tsx:61-132`) genuinely use `PlainDate`. They could later move to the existing `lib/date-utils.ts` (`addDays`, `weekStartFor`), but that is optional.
   *Impact:* Medium-High, because it is about 44 KB gzip of JS parse on the most-visited page.
   *Effort:* S.
   *Owner:* UI.

5. **Make fonts consistent: one Inter `@font-face` (woff2), and no Inter preload for system-font roles.**
   *What:* (a) Delete the TTF-only duplicate `@font-face` blocks in `schedule/employee-schedule.css:1`, `availability/availability.css:1-2`, `payroll-export/payroll-page.css:1-13`, `employee-directory.module.css:1-9` and `app-error-screen.css:11`. `typeface-theme.css:14-21` already declares Inter with woff2 first. (b) Ship JetBrains Mono as woff2. (c) Issue `preload()` in `src/app/app/layout.tsx:49` only for roles that render Inter, because v3 sets `--cm-sys` (system font) on the whole Owner/Manager shell.
   *Why:* When the same family has several `@font-face` rules with the same descriptors, the last one in cascade order wins. On Schedule, Availability, Payroll, My Pay, Payroll settings and Employees, Inter therefore resolves to `variable.ttf`, which is 877 KB against 242 KB for woff2. JetBrains Mono is TTF-only at 187 KB everywhere. Meanwhile Owners and Managers pay for a 242 KB woff2 preload on every `/app` cold load that v3 text likely never uses. Portals render into in-shell slots, so they stay on the system font.
   *Impact:* Medium. Up to about 1 MB of avoidable font bytes on cold cache. This needs browser network confirmation; see the limits section.
   *Effort:* S.
   *Owner:* UI.

6. **Replace GSAP entrance tweens with CSS or WAAPI, or lazy-load GSAP.**
   *What:* The GSAP uses on manager routes are 6–8 px "rise in" tweens behind `prefers-reduced-motion` (`notification-inbox.tsx:55-57`, `reports-entrance.tsx:12-14`, `schedule-template-controls.tsx:47-49`, `update-visual.tsx:31-33`, `timecards-heading.tsx:13-15`). `portal-motion.css` already holds the CSS motion system, so these can move there.
   *Why:* `gsap` core is about 28 KB gzip, plus `@gsap/react`, and ships on Schedule, Reports, Notifications, Updates and Requests (from the import-graph walk). It buys effects CSS can do for free, and the v3 spec asks for a native-iOS feel with short motion.
   *Impact:* Medium.
   *Effort:* S–M (15 files).
   *Owner:* UI.

7. **Split the app shell's rarely used parts out of the initial JS with `next/dynamic` or on-demand `import()`.**
   *What:* Load `CommandFinder` (plus `lib/finder.ts`) on first ⌘K or search tap. Load `PortalDeviceSetup` (plus `lib/notifications/device-client.ts` at 24 KB and `destinations.ts`, which drags in `assistance/publication-diff` and `scheduling/coverage-repair`) only when push setup is offered.
   *Why:* `src/components/app-shell.tsx` is the single client entry in the layout and pulls 34 modules (about 179 KB of source) onto every page for every role. There is no `next/dynamic` or `React.lazy` anywhere in `src`, so route-level splitting is the only splitting.
   *Impact:* Low-Medium (estimated 8–12 KB gzip off every page).
   *Effort:* S.
   *Owner:* UI.

8. **Fix cache churn on the one big CSS file.**
   *What:* After recommendations 1 and 3, group the `/app` layout CSS into a stable "legacy" bundle and a "v3" bundle (separate import points) instead of 18 imports merged into one chunk.
   *Why:* In dev, Owner `/app` gets a single 1.07 MB layout CSS chunk (`src_0mp7rcb._.css`). Any edit to any of the 18 sheets invalidates the whole file for every user on every deploy, and the v3 sheets are still changing daily (see the recent commit log).
   *Impact:* Low-Medium.
   *Effort:* S.
   *Owner:* UI.

9. **Use one Phosphor import style and let Next optimize it.**
   *What:* Add `experimental.optimizePackageImports: ['@phosphor-icons/react']` to `next.config.ts`, and lint toward a single style. Today the code mixes 26 files that use the `@phosphor-icons/react/ssr` barrel with 288 per-icon `dist/ssr/X` imports. Phosphor is not in Next's default optimized list (checked in `node_modules/next/dist/server/config.js`).
   *Why:* The package has `"sideEffects": false`, so production tree-shakes and the shipped cost is small. Dev chunks still carry 17–83 Phosphor modules each, which slows dev compiles and HMR.
   *Impact:* Low.
   *Effort:* S.
   *Owner:* UI.

10. **Move two hook-free client components to the server.**
    *What:* Drop `"use client"` from `src/components/activity-history-panel.tsx` (7.8 KB; no hooks or handlers) and `src/components/employee-profile-details.tsx`. Everything else marked client legitimately uses state, effects, polling or handlers. The large ones (`timecards.tsx` 59 KB, `manager-inbox.tsx` 42 KB, `reports.tsx` 38 KB) are interactive by design.
    *Impact:* Low.
    *Effort:* S.
    *Owner:* UI.

## What's good
- Data passed to client components is lean. The inline RSC payload on Owner `/app` is 46 KB, of which the action-center `initialItems` is 23 KB. On `/app/schedule` it is 65 KB. AppShell receives only names, role, brand style and words. No server modules leak into client bundles: the only `.server` hits were type-only `import('…')` references and `"use server"` action boundaries.
- Server and client split is mostly right. Settings and Employees pages ship almost no client JS: 2–3 small client modules, under 10 KB of source. No moment, date-fns, lodash or UI-kit dependencies exist. `pdf-lib`, `web-push`, `nodemailer` and `pg` are server-only.
- About 290 Phosphor imports go per icon (`dist/ssr/X`), and the package is side-effect-free, so the icon cost in production is near the minimum.

## Not checked / limits
- No `next build`, so all sizes are estimates. CSS minify sizes come from a crude whitespace and comment strip. JS sizes come from package dist files plus dev chunk inspection. Real production chunk sizes, Lightning CSS output and any CSS merging by Next 16's `cssChunking` are unverified.
- The dead-CSS scan is a heuristic. A class counts as "dead" when its name appears nowhere in `src/**/*.ts(x)` as a token, and dynamically built names were allowed by prefix. Expect a small number of false positives. Verify with route screenshots before deleting.
- No browser was allowed, so these were not measured: font requests (whether the TTF or the preloaded woff2 is actually fetched on each route), style-recalc time, long tasks, and LCP/INP on a low-end phone. Recommendation 5 in particular needs a network-panel check.
- I made 3 read-only GETs of HTML pages and the static chunks for 2 Owner routes on the dev preview. I did not inspect Manager-role or Employee-role chunks live, and nothing was written.
