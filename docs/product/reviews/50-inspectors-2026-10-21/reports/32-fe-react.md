# 32 Senior React Engineer — correctness of Owner/Manager client components

**Verdict.** The live-read plumbing is careful: generation counters, AbortControllers, expiry timers and listener cleanup are present almost everywhere, and the hydration-sensitive reads mostly use `useSyncExternalStore` with a server snapshot. The bugs that remain come from two habits. Background polls and focus handlers clear user-owned state (selections, notes, results, previews), and the top-bar portal remounts its children whenever it moves. One recovery key also never clears and leaves Schedule's Copy action stuck. None of these crash the app, but the first two lose work a manager has already done.

## Recommendations

1. **Stop the 30-second Timecards poll from wiping what the manager is doing.**
   *What:* make the poll a background re-read that keeps the current cards on screen until the replacement lands, the way the action center does (IS-P4-01). Then carry selections and notes forward by `employeeId` + `revision` + `sourceHash`, and drop only the ones that changed. Never clear `outcomes` on a poll, and skip the poll while `selecting`, `review`, `outcomes` or the detail sheet is open.
   *Why:* `timecards.tsx:151` runs `sync()` every 30 s. `sync` → `clear()` (`:146`) → `invalidate(); clearBatch(); setData(null); setNotes({})`, and `refresh()` clears them again (`:127`). The only guard is `!commandRef.current`. Failure scenarios:
   - (a) A manager ticks 12 of 20 timecards on a phone and takes longer than 30 s; the selection, the "Review selected" result and the confirm tick all reset.
   - (b) After a batch, the per-card results ("Each card has its own result…", `:207`) vanish within 30 s, including which card was blocked or in conflict.
   - (c) A Reopen reason typed in the sheet (`:397`, `notes`) is erased mid-typing.
   - (d) The phone "Show N more" `<details>` (`:364`) unmounts with the list and comes back closed.

   Window `blur` (`:146`, `:150`) does the same on desktop: clicking the address bar or another window wipes everything.
   *Impact:* High. *Effort:* M. *Owner:* UI (the backend validity window ≤45 s, `lib/timecards/client.ts:6`, stays as is).

2. **Clear Schedule's copy-recovery key on final answers.**
   *What:* `ScheduleCopyForm` must remove `nevora-copy-pending:<actor>` when the server's answer is final: `conflict`, `invalid` (400), and 403 / access lost. It should keep the key only for `unconfirmed`, network errors and 5xx. Add a "Dismiss" for a stale reference, and scope the key to the week (`weekStart`).
   *Why:* `schedule-copy-form.tsx:74-90` clears only on `state === "complete"`. The route returns `conflict` and `invalid` as final answers (`app/api/schedule-copy/route.ts:34,45`). The failure: one Copy previous week that hits a conflict leaves More → "Check / retry original copy" on **every week**, for that manager, in that browser, for good (the key is per actor, `:21`). Each retry re-sends the old week's command and gets the same conflict back.
   *Impact:* Medium-High. *Effort:* S. *Owner:* UI (Backend to confirm which states are final).

3. **Stop `TopBarTools` remounting its children when it moves between the page and the header.**
   *What:* render the tools once into a stable host, always through a portal. Either portal into an in-page host `<div>` when there is no slot, or move one DOM node between hosts. Also replace the `cm-schedule-day` event with a small shared store (`useSyncExternalStore`) so a newly mounted `DayAwareLink` reads the last chosen day.
   *Why:* `top-bar-tools.tsx:10` switches between `createPortal(...)` and `<>…</>`, which are different fiber types, so React unmounts and remounts the whole subtree. The slot resolves in a microtask after the first commit (`top-bar-slot.ts:34`), so this happens on every desktop load at 1300px or wider and on every phone load. It happens again on each crossing of 1300px, of the phone query, or of the text-zoom threshold.
   - `DayAwareLink` starts again with `day=null` (`day-aware-link.tsx:8`). The roster announces the day only when `phoneDay` changes (`manager-weekly-roster.tsx:102`).
   - Failure scenario: Inbox opens `/app/schedule?day=…` on a phone. The strip shows Friday, but the header's Add shift drops `&date=` and opens the form on the default day. The same happens after rotating a phone, or resizing past 1300px after picking a day.
   - The Schedule More menu (`ActionMenu`) also remounts, so an open menu closes and a half-typed Availability deadline is lost.

   *Impact:* Medium. *Effort:* M. *Owner:* UI.

4. **Fix the attribute order and cleanup in `useTopBarSlot`.**
   *What:* set `data-cm-topbar` and `data-cm-phonebar` only after the header slot exists, and delete both attributes in the cleanup.
   *Why:* `top-bar-slot.ts:23-24` writes `cmTopbar="1"` from the width alone, then returns `slot=null` when `.mobile-header` isn't found (`:27-28`). The page then renders its tools inline, but `schedule.css:289` and `updates.css:42` hide the in-page copy while `data-cm-topbar` isn't "0". At 1300px or wider the Schedule stepper and Add shift, or Updates' Create update, disappear completely. The cleanup (`:36`) never removes the attributes, so they leak into later routes and make the next page's first paint depend on the previous page.
   *Impact:* Low (latent; the header normally exists). *Effort:* S. *Owner:* UI.

5. **Give all live reads one focus/blur/visibility lifecycle.**
   *What:* extract one shared hook from the action center's pattern, with the `active` guard and no clear-then-restart on focus. Show a distinct "Paused" state instead of "unavailable".
   *Why:* there are four different policies today.
   - `useCommunicationResource` runs `sync=()=>{controller.pause(); … start()}` on every `focus` and `storage` event (`lib/communications/client.ts:31-32`). `pause()` nulls the snapshot (`private-snapshot-client.ts:39`), so the Updates list blanks to "Loading updates…" each time the window regains focus. It also blanks whenever another tab writes localStorage.
   - `NotificationBell` does the same (`notification-bell.tsx:22,25`). While paused it renders "—" and "current count unavailable" (`:32,35`), so the bell reads as broken whenever the user Cmd-Tabs away.
   - On Home, the action center pauses on blur (`manager-action-center.tsx:118`), but `useToday` (`manager-today.tsx:23-25`) and `useClockMonitor` (`clean/use-clock-monitor.ts:12-15`) don't. Needs you says "Paused" while Working now keeps names and clock-in times on screen, which contradicts the private-data rule the other reads follow.

   *Impact:* Medium. *Effort:* M. *Owner:* UI.

6. **Don't tear down Updates Compose on window blur.**
   *What:* for the compose context, pause only on `visibilitychange: hidden`, not on window `blur`. Alternatively, keep `preview` in `retained` and don't fence an in-flight publish on a plain blur.
   *Why:* `communication-compose.tsx:131` gives `context = resource.value`, which is null while paused, so `ComposeForm` unmounts (`:144`) whenever the window blurs. Field values survive through `retained`, but the audience preview, focus and scroll do not. `useCommunicationAction(..., !!context)` then calls `authorize(false)` → `fence()` (`recovery.ts:34`), which aborts the publish POST.
   *Failure scenario:* a manager clicks Publish and a macOS notification or a Cmd-Tab blurs the window. The send is aborted and shows "unknown", the manager has to look it up, and the form comes back without its preview.
   *Impact:* Medium. *Effort:* S. *Owner:* UI.

7. **Keep the Inbox badge honest after actions.**
   *What:* re-read the badge on `nevora:time-correction-changed` and after Inbox decisions (as the action center does). Replace the module-level `absent` set with a timed back-off.
   *Why:* `use-inbox-count.ts:37` re-reads only on a path change or every 60 s. Approving a request in place on `/app/inbox` leaves the sidebar and tab at the old count for up to a minute, so "3 need you" sits beside a list of 2. `absent` (`:8,24`) disables the badge for the rest of the session after a single 404, for example one served by an old instance during a deploy.
   *Impact:* Low-Medium. *Effort:* S. *Owner:* UI.

8. **Make `focusAfterRetry` cancellable.**
   *What:* return a cancel function, and cancel it on unmount and on route change.
   *Why:* `kit/focus-after-retry.ts:11-21` polls with `setTimeout` for 15 s with no cleanup (called from `premium-home.tsx:103,208`). Failure scenario: Try again on Home, then a tap to Inbox. Focus sits on `body`, so the timer keeps polling. If the manager returns to Home within 15 s, focus jumps to the Needs you title unprompted.
   *Impact:* Low. *Effort:* S. *Owner:* UI.

9. **Stop reading `window.location` in Inbox state initializers.**
   *What:* derive `selectedKey` and `sheetOpen` from `useSearchParams()` (the Next router already tracks `replaceState`), or set them in an effect.
   *Why:* the initializers at `manager-inbox.tsx:261` and `:264` give different values on the server and the client. They are safe today only because everything they affect is gated on `ready`, which is false during hydration. Any future markup that reads `selectedKey` before the read lands (an `aria-current`, a pane title) will cause a hydration mismatch. The initializers also don't follow Back or Forward for `?item=`.
   *Impact:* Low. *Effort:* S. *Owner:* UI.

## What's good
- `createPrivateSnapshotController` (`lib/private-snapshot-client.ts`) keeps one request in flight with a generation fence, an abort, a timeout and an expiry. Every live read reuses it, so the poll and Refresh can't land out of order.
- Listener cleanup is almost always complete and symmetric. The effects defer their first start to survive StrictMode (`use-clock-monitor.ts:17`, `communications/client.ts:33`).
- The Schedule roster is keyed by `week:location:day` (`app/app/schedule/page.tsx:409`), so the chosen day can't carry over into a different week. Hydration-safe patterns are used where it matters (`premium-home.tsx:61`, `manager-inbox.tsx:260`, `root-loading.tsx:59`).

## Not checked / limits
- No browser was used (not allowed), and no tests were run. Every scenario above comes from reading the code, not from a reproduction.
- Not reviewed in depth: Settings and Payroll forms, `manager-attendance-review.tsx`, `manager-profile-live.tsx`, `manager-time-corrections.tsx`, and all Employee/Lead components.
- I didn't verify whether Next 16's `replaceState` integration changes `useSearchParams` timing in Timecards' period URL updates.
