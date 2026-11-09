# 38 Frontend Engineer (data flow) — how Owner/Manager pages load and refresh data

## Verdict
The core engine is good. `createPrivateSnapshotController` (`src/lib/private-snapshot-client.ts`) allows one read in flight at a time, aborts stale reads, times out and expires each snapshot. The trouble is around it: about 15 components each wire their own lifecycle with different pause rules. They poll the same sources on unsynchronised timers, and most Manager pages get their data from the client after hydration. Users therefore see two placeholders in a row (the route placeholder, then the page's own), and the team has spent hundreds of CSS lines and roughly 7% of all commits lining those placeholders up. One shared, keyed read store and page-owned placeholders would remove most of that work. One real bug needs fixing now: the Timecards poll clears whatever the manager is doing every 30 seconds.

## Recommendations

1. **Stop the Timecards 30-second poll from clearing the manager's work.** `timecards.tsx:151` calls `sync()` every 30 s. `sync()` calls `clear()` (line 146), which runs `clearBatch()` (selection, batch review, confirmation and outcomes), `setData(null)` and `setNotes({})`, and then `refresh()` (line 127) clears them again. The only guard is `!commandRef.current`, which covers a command already being sent. So a manager who ticks 8 rows, opens "Review selected", or types a Reopen reason loses all of it at the next tick, and the table drops back to its placeholder. **Fix:** refresh in place the way the action center already does (`manager-action-center.tsx:110-112`, IS-P4-01: keep the confirmed read until the new one lands). Keep selections whose IDs are still present. Skip the poll while a review or typed note is open. Add a fake-timer test to `timecards.batch.test.tsx` that selects rows, advances 30 s and checks the selection survives. *Impact High · Effort S · Owner UI*

2. **Build one private-read hook with a keyed, shared registry.** Every component repeats the visibility/online/focus wiring by hand:
   - `use-clock-monitor.ts`, `manager-today.tsx:16-26`, `manager-action-center.tsx:108-120` and `communications/client.ts:28-34`
   - `notification-bell.tsx`, `timecards.tsx:145-153`, `payroll-export.tsx:80-81` and `use-inbox-count.ts`
   - `employee-*` panels, `manager-profile-live.tsx` and `calendar-subscription-panel.tsx`

   Each one listens to a different set of events. Replace them with `usePrivateRead(key, request, parse)` built on the existing controller:
   - Store controllers in a module-level `Map` keyed by URL plus body, so two consumers of the same read share one controller, one timer and one result.
   - Give each key one reference count.
   - Read page activity (visible, online, focused) from one `useSyncExternalStore` source.

   Home already found this need and solved it locally with `HomeActionCenterProvider` (`manager-action-center.tsx:131`); the registry generalises it. SWR or React Query would also work (`gcTime: 0`, `refetchInterval: 30_000`, a custom `focusManager`). But the clear-on-pause and expiry rules would still need custom code, so wrapping the tested controller in about 100 lines carries less risk. *Impact High · Effort M · Owner UI*

3. **Decide one pause policy and apply it everywhere.** On desktop Home today:
   - The action center (Tasks) clears on window `blur`.
   - `useClockMonitor` (Working now) and `useToday` never listen for `blur`.
   - Communications, the notification bell and Timecards clear on `blur`.

   So when the window loses focus, part of one screen blanks and part stays. Clearing on `blur` also means every click into another app (Slack beside NEVORA, a second monitor) blanks several panels and fires a burst of 4–5 reads on return. That churn is the main reason `HoldHeight` exists. **Decide:** clear on `visibilitychange: hidden`, `pagehide` and `offline` only, or on `blur` everywhere. Then encode the choice once, in the hook from #2. *Impact High · Effort S once #2 exists · Owner Product (decision), then UI*

4. **Stop the Inbox badge from repeating the reads Home and Inbox already make.** `/api/manager/inbox-count` runs `readToday` plus `readActionCenter` (`inbox-count.server.ts:15-17`). `useInboxCount` re-runs on every navigation because `pathname` is in its effect dependencies (`use-inbox-count.ts:37`), and also every 60 s. On Home and Inbox, `useToday` and `useActionCenter` read the same two sources on their own 30 s timers. Result: the server does each read twice per cycle, and the tab badge and the "Needs you" number can disagree for up to a minute. **Fix:** when the today and action-center keys are live in the registry from #2, derive the badge from them with the same `needsYou()`. Otherwise keep the 60 s badge read, without the `pathname` dependency. *Impact High · Effort S · Owner UI (Backend only if the route changes)*

5. **Make each page own one placeholder and drop the alignment CSS.** Timecards, Inbox, Updates and Notifications are thin on the server: `timecards/page.tsx:12` awaits only the session and workspace, and the client component then fetches the data. Users see `loading.tsx` → `RouteSkeleton`, then the page's own `HoldHeight` placeholder, then the data. These are two different DOM trees, kept aligned by CSS:
   - 692 lines mention `route-skeleton` across 8 stylesheets. `portal-premium.css` alone has 505, and `premium-desktop.css` has 79.
   - Per route there are up to 66 selectors (`home` 66, `review` 57, `timecards` 55, `schedule` 54).
   - 15 specificity hacks such as `:not(#cm-skel):not(#cm-skel2)`.
   - Margins set per route, per breakpoint and per text size (`premium-clean-manager.css:747-802, 920-941`).
   - 75 of 1,097 commits are about placeholders, skeletons or holds.

   **Fix:** each page exports a `<XPlaceholder>` that renders the real page chrome (the same `PageBand`/title/tabs components with their static text) plus the same body placeholder its client component shows while loading. `loading.tsx` renders that component. Alignment then holds by construction, and each page's offset CSS can be deleted as it moves over. *Impact Medium-High · Effort M (per page S) · Owner UI*

6. **Limit Home's `loading.tsx` to Home with a route group.** `app/app/loading.tsx` wraps every tab, so a tab change can flash the parent placeholder (ST-22). The current workaround is `root-loading.tsx`, which keeps a 37-entry pathname-to-shape table copied from each child `loading.tsx` (heights duplicated in three places: there, in the child, and in CSS), plus a second map in `settings/wave-c-route-loading.tsx`. **Fix:** move `page.tsx` and `loading.tsx` into `app/app/(home)/`, so the parent boundary no longer covers other tabs, then delete both maps. Dead code to remove while there: `RouteSkeleton` only sets `--route-band` when there is no `route` (`route-skeleton.tsx:15`), and every caller passes one, so the `band={172}` numbers only ever work as true/false. *Impact Medium · Effort S · Owner UI (verify the ST-22 frame is gone in a browser)*

7. **Read the session and workspace once per request on the server.** `getSession`, `requireSessionMutationProof` and `getWorkspace` are not wrapped in React `cache()` (`auth/session.ts:68,118`, `data/workspaces.ts:24`). One Home load looks up the session about 5 times:
   - layout: `layout.tsx:47-51`
   - page: `page.tsx:42,62,81`

   It reads the workspace 3 times (layout, page, and again inside `loadManagerDashboardData`), and the page runs session → workspace → proof one after another. **Fix:** wrap `getSession` and `getWorkspace` in `cache()`, run the independent awaits with `Promise.all`, and let security decide whether the mutation proof may be cached for a single render. *Impact Medium (latency and DB load on every page) · Effort S · Owner Backend*

8. **Paint Home from data the server has already read.** `page.tsx:62,84` builds `managerActions` on the server. After hydration, the client reads the action center again, so Home's "Needs you" column starts empty and needs its own height hold (`premium-home.tsx` layout effect after line 107). Where the server already holds the same canonical read, pass it to the store as its first value with `observedAt`/`validForMs`. It then expires on the controller's normal timer, so the privacy rules still hold, and Home's first-load placeholder goes away. *Impact Medium · Effort M · Owner UI + Backend (confirm the shape matches the action-center read)*

9. **Merge the height-holding code into one primitive.** There are four or more versions:
   - `HoldHeight` and `useHoldHeight` (`kit/hold-height.tsx`)
   - Home's own hold (`premium-home.tsx` ~107-130)
   - two in the Inbox (`manager-inbox.tsx:337,348`)
   - `.cm-hold` rules in `clean-manager/timecards.css`

   `HoldHeight` also calls `setLast` on every `ResizeObserver` tick (`hold-height.tsx:24-27`), which re-renders on every resize frame. Keep the measurement in a ref and store it in state only when `holding` flips. Once #2 and #3 stop needless clears, much of this code should simply go. *Impact Low-Medium · Effort S · Owner UI*

10. **Stream the pages that are heavy on the server.** There is no `<Suspense>` anywhere in `src`. Schedule's server reads run in a chain (`schedule/page.tsx:126-255`): session, then workspace, then presentation, then marketplace reads, then a claim proof, then one `readShiftChangeAvailability` per offered shift (lines 189-191). Home's server read is a 16-query batch. Render the header and tabs immediately and wrap the data body in `<Suspense fallback={<BodyPlaceholder/>}>`, reusing the page placeholder from #5. This also moves the wait from the whole route to just the grid. *Impact Medium · Effort M · Owner UI (Backend for parallelising the Schedule reads)*

## What's good
- `createPrivateSnapshotController` handles races carefully: generation counter, abort, 10 s timeout, expiry that subtracts the round trip, and it refuses an older snapshot. It is tested and is the right base for #2.
- The action center keeps its confirmed read on screen during a re-read (IS-P4-01), and Home shares one read between Tasks and the setup card. Both point in the right direction.
- Every poller pauses while the tab is hidden or offline. `HoldHeight` stores only numbers in `sessionStorage`, never private data.

## Not checked / limits
- No browser was allowed, so I did not measure request counts, latency or CLS. The Timecards clearing in #1 and the request duplication in #4 come from reading the code, not from runtime traces; a fake-timer test would confirm #1 in minutes.
- I did not verify the ST-22 parent-placeholder frame or whether the route group in #6 removes it.
- Employee and Lead pollers were listed but not reviewed in depth.
- I did not check whether `managerActions` (server) and the `/api/manager/action-center` payload share a canonical shape (#8).
- No tests were run.
