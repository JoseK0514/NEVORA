# 39 Next.js Engineer — routing (App Router tree under src/app/app)

## Verdict
The route tree itself is in good shape. No page or route file has ever been deleted (git history has zero page/route deletions), all 117 route files from the release candidate are still here, every page has a `loading.tsx`, and every internal `/app/*` link in `src` resolves to a real route. The weak spots are at the edges: unknown URLs, signed-out deep links, wrong-role visits, and deep links whose target has no anchor. In each of these the user lands somewhere generic, or gets a misleading message, rather than a dead link. Home's `?week` still changes the Home read, although the spec says it would stop.

## Recommendations

1. **Give unknown `/app/*` URLs the app's own not-found page.**
   - *Why:* `GET /app/does-not-exist` (Employee cookie) returns Next's bare default page: HTTP 404, "404: This page could not be found." It has no app shell, no sidebar or tab bar, and no "Back to Home". `src/app/app/not-found.tsx` only runs when a page calls `notFound()`. There is no catch-all route and no `src/app/not-found.tsx`. Any typo, stale bookmark or link from another branch (`/app/account/delete` exists on `claude/auth-premium` and others, but not here) is a dead end. The app's not-found page also still uses legacy classes (`portal-route-state`, `button secondary`), while `error.tsx` uses the kit.
   - *How:* add `src/app/app/[...missing]/page.tsx`, which calls `notFound()` and keeps the shell and session gate. Add a root `src/app/not-found.tsx`. Rebuild `app/not-found.tsx` with `PageBand` and kit buttons, the same way as `error.tsx`.
   - Impact **High** · Effort **S** · Owner **UI**

2. **Keep the destination when a signed-out user opens a deep link.**
   - *Why:* `requireSession()` redirects to a bare `/login` (`src/lib/auth/session.ts:113`), and so do `requireSessionMutationProof()` (`:121`, `:125`) and the role helper. Login already supports `returnTo` (`src/app/login/actions.ts:11,44`). Measured without a cookie: `/app/inbox?filter=requests` and `/app/requests?tab=pending&requestId=abc` both return 307 to `/login`, so the destination is lost. Only `/app/notifications/open` keeps it (303 to `/login?returnTo=…`).
   - *Also:* the `safeReturnTo` allowlist (`src/lib/notifications/destinations.ts:13-20`) covers only 8 paths. It rejects `/app/inbox`, `/app/timecards`, `/app/updates`, `/app/employees/*` and `/app/settings/*`.
   - *How:* add a Next 16 `proxy.ts` that sends unauthenticated `/app/*` requests to `/login?returnTo=<path+search>`, or that passes the path in a header for `requireSession` to use. Widen the allowlist to the manager routes, with validated parameters.
   - Impact **High** · Effort **M** · Owner **Backend** (auth and allowlist), **UI** (proxy)

3. **Fix the dead-end notice on approved, declined, coverage and activity deep links.**
   - *Why:* notifications send managers to `/app/requests?tab=approved|declined&requestId=X#request-X`, and to `/app/exchange?tab=coverage|activity&requestId=X#request-X` (`destinations.ts:83-84,101-104`, plus `withRequestFragment`). Those lists render no `request-<id>` anchor:
     - the time-off `Row` takes no `id` (`src/components/kit/kit.tsx:189`; `manager-time-off.tsx`, approved/declined branch);
     - coverage cards and activity `<li>`s have no `id` (`manager-shift-requests.tsx:145,157`).
   - `ManagerIssueFocus` is mounted for every tab, so when it finds no anchor it shows "That issue is no longer available in this view… Return to the Action Center" (`manager-issue-focus.tsx:24`). That message is wrong, because the item exists and was decided. It also names a page that no longer exists; the place is now the Inbox.
   - *How:* add `id={`request-${id}`}` (with `tabIndex={-1}`) to those rows and cards. Change the copy to point to the Inbox.
   - Impact **Medium–High** · Effort **S** · Owner **UI**

4. **Stop `?week` from changing Home's today read, as the spec says** (spec line 147: "Home stops letting `?week` change the today count").
   - *Why:* `src/app/app/page.tsx:58` still feeds `?week` into `loadManagerDashboardData` and into `HomeActionCenterProvider(weekStart)` (`manager-dashboard.tsx:201`, `manager-action-center.tsx:132`). Action items embedded in the server HTML for QAOWNER:

     | URL | Embedded action items |
     |---|---|
     | `/app` | 48 |
     | `/app?week=2026-10-26` | 47 |
     | `/app?week=2026-10-12` | 36 |

     The Inbox and its badge always read the current week (`inbox/page.tsx:16`), so the two can disagree.
   - *Real path:* Team overview or Schedule activity, then the week arrows, then "Back: Home". The Back link is `/app?week=${weekStart}` (`manager-dashboard.tsx:217`).
   - *How:* the overview ignores `?week` and always uses the current week. Back links from Home's views go to `/app`.
   - Impact **Medium** · Effort **S** · Owner **UI**

5. **Make wrong-role URLs land somewhere useful, and say why.**
   - *Why:* every `requireRoles` failure redirects silently to `/app` (`src/lib/auth/permissions.ts:31`). Because `loading.tsx` opens a Suspense boundary first, the redirect is streamed. For an Employee, `/app/settings` returns **HTTP 200**, renders the "Settings · Set up your workspace…" skeleton, then `<meta http-equiv="refresh" content="1;url=/app">`. The same happens for `/app/account-recovery` with an "Account recovery" title. `notFound()` pages are also 200 (a "soft 404").
   - *Inconsistent destinations:*

     | Visitor | URL | Goes to | Better |
     |---|---|---|---|
     | Employee | `/app/inbox` | `/app/requests/hub` | (already a good analog) |
     | Manager | `/app/requests/hub` | `/app` | `/app/inbox?filter=requests` |
     | Manager | `/app/my-time` | `/app` | `/app/timecards` |
     | Manager | `/app/settings/*` (Owner only) | `/app` | not-found "unavailable to your account" state, or `/app/schedule/settings` |

   - *How:* one `roleRedirect` map with analog destinations and a one-time notice, using a `?moved=` flag like the existing `decided=` pattern.
   - Impact **Medium** · Effort **M** · Owner **UI**

6. **Return the Time-off review to the list it was opened from.**
   - *Why:* the list's "Open request and that week's schedule" link has no `from`, and `ManagerTimeOff` defaults the origin to `inbox` (`manager-time-off.tsx:116`). So Back reads "Inbox", and the decision redirects to `/app/inbox?filter=requests&decided=…` (`requests/actions.ts:89`) instead of back to `/app/requests?tab=pending`.
   - *Smaller issues in the same flow:*
     - The error redirect drops `item` and the filter (`actions.ts:80`).
     - `from=home` no longer has any producer (dead branch).
     - `RequestsPage`'s `searchParams` type leaves out `item`, although `ManagerTimeOff` reads it (`requests/page.tsx:34-42`).
   - *How:* add a `from=list` origin, and carry `item` and `filter` through the error redirect.
   - Impact **Medium** · Effort **S** · Owner **UI**

7. **Use canonical tab values in generated links and alias the old ones.**
   - *Why:* action-center items for swaps and callouts link to `/app/exchange?tab=requests&requestId=…` (`src/lib/assistance/manager-actions.ts:155,166`). `requests` is an employee tab; the manager page only reaches "Pending" by falling back. `ManagerShiftRequests` doesn't map the old `?tab=history` to `activity`; only the notification summary path does (`destinations.ts:103`). Employee links mix `tab=my` and `tab=requests` for the same view (`callout-view.tsx:21`, `swap-page-content.tsx:21`).
   - Also, `?employeeId=` on `/app/schedule`, `/app/availability` and `/app/schedule/settings` is ignored by Schedule and by Scheduling rules. Only the `#…` fragment that `actionCenterNavigation` adds does the work, so a copy of the link without the hash loses the person.
   - *How:* emit `pending` and `activity` for managers. Add `history` → `activity` to the manager tab parser. Let Schedule and Scheduling rules read `employeeId` as a fallback focus target.
   - Impact **Low–Medium** · Effort **S** · Owner **UI**

8. **Make Back links follow the v3 navigation model.**
   - *Why:* Scheduling rules is now a top-level entry (sidebar Plan, More › Planning; `src/lib/navigation.ts`), but its band still has "Back: Schedule" (`schedule/settings/page.tsx:65`). Templates, in the same group, has no Back.
   - The Inbox's "Contact" and "View profile" open `/app/employees/[id]`, whose Back is always "Team" (`employees/[employeeId]/page.tsx:64`).
   - An Inbox "Set hour target" item lands on Scheduling rules, where Back goes to Schedule, not the Inbox.
   - *How:* top-level destinations get no Back. Detail pages accept a validated `from` (`inbox`, `team`, `timecards`), the same way Time off already does.
   - Impact **Low–Medium** · Effort **S** · Owner **UI**

9. **Use one default period across the Time and pay pages, and keep it when switching tabs.**
   - *Why:* each page falls back to a different period when `?start&end` is absent:

     | Page | Default period | Source |
     |---|---|---|
     | Manager Timecards | current Monday to Sunday | `timecards/page.tsx:20-22` |
     | Time exports | rolling 7 days ending today | `payroll-export/page.tsx:15` |
     | Insights | last full Monday to Sunday | `reports/page.tsx:15-16` |
     | Employee Timecards | rolling 7 days | `timecards/page.tsx:14` |

   - The Time and pay section tabs (`navigation.ts`, `sectionTabsFor`) don't carry `?start&end`, so tapping a tab silently changes the period.
   - *How:* carry the period across those tabs, and pick one default (Jose decides).
   - Impact **Medium** · Effort **S** · Owner **UI** + **Product**

10. **Housekeeping and orphans.**
    - Push APIs live inside the page tree at `/app/api/push/*` (`src/app/app/api/push/`); every other API is under `/api/*`.
    - Development probe pages `src/app/dev-inspect/page.ts` and `src/app/app/dev-inspect/page.ts` ship to production. They return `notFound()` in production, so they're harmless but orphaned.
    - Home's Attendance view still holds correction requests and a second "Clocker recovery" link (`manager-dashboard.tsx:225-228`), which the spec moved out. This is routing-adjacent; the spec reviewers own it.
    - Impact **Low** · Effort **S** · Owner **UI**

## What's good
- **Old URLs survive.** No page or route was ever deleted, and every internal `/app/*` href in `src` (about 40 distinct paths) resolves. Retired Home views redirect with their context (`src/lib/retired-views.ts`), measured:
  - `/app?view=requests` goes to `/app/inbox?filter=requests`.
  - `/app?view=schedule&week&day&location&employee` goes to `/app/schedule?week&day&location#schedule-employee-…`.
  - Old values are aliased: `?filter=exceptions` becomes `planning`, and `?tab=my|history` becomes `requests`.
- **Deep-link focus is thorough.** `actionCenterNavigation` and `ManagerIssueFocus` open closed `details` and popovers before focusing. Every fragment target the Inbox emits exists: `schedule-deadline`, `coverage-windows`, `target-*`, `staffing-*`, `employee-*`, `coverage-issue`, `schedule-review`, `timecard-*`.
- **Loading and errors are covered everywhere.** Every page has a `loading.tsx`, and `RootLoading` draws the destination's shape. Notification opens are validated by `safeReturnTo`, keep `returnTo` through sign-in, and add the request fragment.

## Not checked / limits
- **No browser (per brief).** I didn't time the meta-refresh bounce or observe client-side hash focus, and I didn't count Home's client-rendered "Needs you" figure for different `?week` values; I only counted the server-embedded items.
- **Not exercised:**
  - the Lead role (no state file);
  - workspaces with payroll off, or modules off (`moduleGate` pages);
  - a real sign-in round trip with `returnTo`;
  - Spanish copy on the not-found and redirect states.
- **Method:** all probes were read-only GETs against the preview, with the QAOWNER, AUDIT-M and AUDIT-E cookies plus anonymous requests, about 45 requests at two or fewer per second. No cookie values were printed.
