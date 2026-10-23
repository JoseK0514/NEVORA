# 17 UX Designer — system states across Owner and Manager pages

Lens: first-run and empty, loading, offline, paused, signed out, failed reads, partial data, success confirmations and undo. Method: code reading only (no browser), plus one earlier QA probe log. Line numbers refer to the `p35-wave-a-1283c8` worktree.

## Verdict

Every Owner and Manager page now has a loading, failed and signed-out state, and the layout no longer jumps between them. The weak part is what the states do to the user. Live lists and typed input are wiped whenever the window loses focus, and on Timecards every 30 seconds. "Try again" on the shared error page probably doesn't re-read the server. "Sign in" always drops the user on Home. And each page words, places and confirms things its own way, with no undo anywhere.

## Recommendations

1. **Keep the last confirmed data on screen when a page pauses, and pause on "hidden", not on "blur".**
   - *Why:* Home, Inbox, Timecards and Insights clear their data on a window `blur`:
     - `manager-action-center.tsx:119` listens for blur.
     - `private-snapshot-client.ts:39`: `pause()` sets the snapshot to null.
     - `timecards.tsx:146` clears on blur.
     - `reports.tsx:272,278` does the same.
   - On a desktop with NEVORA beside another window (payroll system, email), one click elsewhere blanks Inbox and Timecards and closes the open item. Earlier QA logged this: `qa-out/final2-mgr-phone/pause-AUDIT-M.log` shows "after window blur: sheetOpen=false … rows=0". After focus returns the sheet stays closed, so the item is lost (`manager-inbox.tsx:285` closes it "for good").
   - The pages don't agree on when to pause: Payroll (`use-payroll.ts:38`), the clock monitor and the Inbox badge pause only on `visibilitychange` hidden.
   - *Proposal:* pause on hidden or offline only. While paused, keep the last read visible but dimmed and read-only, with "Paused · as of 10:15" and actions disabled. Keep the open item and any typed text.
   - If the privacy rule ("nothing stale outlives its window") must stay, Jose should confirm it applies to a window that is still visible.
   - *Impact:* High · *Effort:* M · *Owner:* UI (Product for the privacy rule).

2. **Stop Timecards' 30-second poll from wiping selection, the review step and the reopen reason.** This is likely a bug.
   - *Why:*
     - `timecards.tsx:151` calls `sync()` every 30 s whenever no command is in flight.
     - `sync` (`:147`) always calls `clear()` first.
     - `clear()` (`:146`) runs `clearBatch()`, `setData(null)` and `setNotes({})`.
   - So the "N selected" set, the reviewed approval set and its confirm tick, the per-card results and any half-typed "Reopen reason" are all reset every 30 s.
   - While the refresh runs, the open detail sheet shows only its "Timecard" heading.
   - No test covers it: `timecards.batch.test.tsx` only advances 1 s.
   - *Proposal:* a background poll should use the Inbox's "keep the confirmed read until the new one lands" rule (`manager-action-center.tsx:112`). Never poll while a selection, review or note is in progress.
   - *Impact:* High · *Effort:* S · *Owner:* UI.

3. **Make "Try again" on the shared error pages actually re-read the server.**
   - *Why:* these pages wire their button to `reset`:
     - `src/app/app/error.tsx:17`, the fallback for Inbox, Schedule, Timecards, Insights, Updates, Notifications, Payroll and most Settings pages.
     - `settings/locations/error.tsx:19`.
     - `src/app/error.tsx` → `AppErrorScreen`.
   - In Next 16.3, `reset` only clears the boundary's state. `retry` does `router.refresh()` and then `reset` (`node_modules/next/dist/client/components/error-boundary.js:40-47`).
   - When a server read fails, `reset` re-renders the same failed payload, so the button can loop until a full reload. The Wave A error pages already use `retry` (`components/wave-a/route-error.tsx`).
   - *Proposal:* switch all three to `retry`. While you're there, give `employees/error.tsx` the kit band and a "Back to Home" like the others; it is still the old directory layout with no way back.
   - *Impact:* High (a dead-end recovery) · *Effort:* S · *Owner:* UI.

4. **"Sign in" should bring the user back to where they were.**
   - *Why:* about 20 sign-in links go to bare `/login`, including:
     - `premium-home.tsx:298`, `manager-inbox.tsx:390`, `timecards.tsx:98`, `reports.tsx:156`
     - `employee-updates.tsx:97,123`, `notification-inbox.tsx:111,124`, `communication-compose.tsx:69,144`, `company-policy-editor.tsx:249`
   - `requireSession` also redirects to bare `/login` (`lib/auth/session.ts:113,121,125`).
   - Login already honours `returnTo` (`login/actions.ts:11,44`). But `safeReturnTo` only allows notification destinations (`lib/notifications/destinations.ts:33-38`), so Inbox, Timecards, Insights and Settings can't be returned to.
   - Compose says "Sign in again to keep writing", but the draft lives only in memory (`communication-compose.tsx:144`, `retained` ref), so the draft is lost.
   - *Proposal:*
     - Widen the allowlist to every `/app` page and its view parameters.
     - Pass `returnTo` from every sign-in link and from `requireSession`.
     - Keep compose drafts in sessionStorage across the sign-in.
   - *Impact:* High · *Effort:* M · *Owner:* Backend (allowlist, `requireSession`) + UI (links, draft).

5. **Say when part of a page couldn't be checked, instead of hiding it.**
   - *Why:* Schedule catches three reads to `null` (`schedule/page.tsx:243-245`).
   - If `listScheduleStatuses` fails, `facts.locations` becomes `[]` and `toPlan` becomes `[]` (`:294`, `:314`). The "West Office isn't published" rows and the "X of Y published" line then vanish, and the week looks fully published.
   - Hour targets and the availability line drop out the same way.
   - The Inbox already does this right: "Today's clock-ins can't be checked right now … Everything else here is current." plus Try again (`manager-inbox.tsx:295,396-401`).
   - *Proposal:* give Schedule, and any page that `.catch(() => null)`s a section, that same one-line notice in place of the missing section.
   - *Impact:* Medium–High (trust) · *Effort:* S · *Owner:* UI.

6. **Confirm every decision and save the same way, and return to where the user started.**
   - *Why:* there are five patterns today:
     - **(a) Toast:** time-off decisions (`toaster.tsx:19-22`), Settings positions, brand, features, breaks and devices, and Payroll (`use-payroll.ts:91,118`).
     - **(b) Green banner at the top of the page:** Schedule "Shift updated." and "Shift deleted." (`schedule/page.tsx:383-384`), Rules saved, Template saved.
     - **(c) Text in the page foot, far from the button pressed:** "Timecard approved." (`timecards.tsx:375`). On a phone the modal sheet covers it.
     - **(d) Inline in a card that then refreshes away:** swap and call-out decisions. `shift-change-form.tsx` shows `form-success`, then `router.refresh()` drops the decided card from Pending. Likely unseen; needs a browser check.
     - **(e) A dead-end message:** "Employee created. Open Employees to view the scheduling profile." with no link, under a form still filled in, so a second Save could try to create the same person again (`employees/actions.ts:83`, `configuration-form.tsx:58`). The `?created=1` and `?reviewed=1` flags are stripped silently by `Toaster` (`toaster.tsx:15,82`).
   - Time off returns to the Inbox (`requests/actions.ts:89`). Swap and call-out reviews leave the user on Shift requests.
   - *Proposal:* one rule for all three cases:
     - **After a decision:** a toast naming the outcome and who is told, then return to the origin (Inbox or Home).
     - **After a create:** open the new record.
     - **After a save:** the inline "Saved" next to the button.
   - *Impact:* Medium · *Effort:* M · *Owner:* UI.

7. **Add Undo where an action is reversible and nobody has been told yet.**
   - *Why:* there is no Undo anywhere in the Owner and Manager app (a search for "Undo" in `src/components` and `src/app` finds nothing). Everything is either a confirm step or a one-way action:
     - "Delete this shift … This can't be undone." (`schedule/edit/page.tsx:118`)
     - Archive a break type or position (`clocker-break-types.tsx:103`, `position-catalog.tsx:50,96`)
     - Mark read (`notification-inbox.tsx:40`), whose confirmation is a 14-word sentence with no undo.
   - *Proposal:* add "Undo" in the success toast (about 5 s) for mark read, archive and restore, rename, settings toggles, and a shift deleted from an unpublished draft. Keep confirm-first for anything that notifies people: publish, time-off and swap decisions, timecard finalize.
   - *Impact:* Medium · *Effort:* M · *Owner:* Product (which actions) + UI.

8. **Use one wording dictionary for states.**
   - *Why:* the same state is worded differently on almost every page:

     | State | Variants found (examples) |
     |---|---|
     | Paused | "Paused while you're away. It updates when you come back." (Inbox) · "Updates when you're back." (Home) · "Timecards paused. Return to this window…" · "Return to this page to see the current numbers." (Insights) · "Return online and to this page to refresh." (Updates) · "Payroll is paused while this page is hidden. Return to reload current access." |
     | Offline | "Updates when you reconnect." (Home, auto) · "Connect to the internet, then refresh…" (Insights, manual) · "Reconnect to see timecards." · Updates folds offline into "Updates paused" |
     | Failed | "This page could not be loaded" · "Couldn't load this page" · "Directory unavailable" · "Page unavailable" · "What needs you isn't available right now." · "The Inbox isn't available right now." · "Couldn't load timecards" |
     | Signed out | "Sign in again to see what needs you." · "Your session ended" · "Sign in to see timecards" · "Sign in with a manager or owner account." |

   - **Wrong noun:** Notifications says "Updates paused" and "Some updates could not be checked" (`notification-inbox.tsx:81-82`). Updates is a different page.
   - **System words leak:**
     - "Timecards expired. Refresh a current protected snapshot." (`timecards.tsx:122`)
     - "Retry original attempted action" (`:329`)
     - Per-card results print raw status words such as "outcome unknown" (`:328`, `replaceAll('-',' ')`)
     - "Checking your current access." (Notifications loading)
     - "reload current access" (Payroll)
   - *Proposal:* one kit `StateNotice` with a dictionary: a title, one plain line, and the one action. Write the Spanish strings once against it.
   - *Impact:* Medium · *Effort:* S–M · *Owner:* UI.

9. **Put the recovery action in the same place with the same weight, and don't show loading bars for a failure.**
   - *Why:* the recovery button's place and weight vary:

     | Page | Recovery action |
     |---|---|
     | Inbox | Primary Try again in place |
     | Home "Needs you" | Secondary button |
     | Home "Working now" | A small text button in the card header. The still grey skeleton bars stay underneath, so a failure looks like loading (`premium-home.tsx:205-212`). |
     | Insights | No button in the failed card; only the "Refresh" in the page foot (`reports.tsx:156,339`) |
     | Manager Updates | Nothing in place; "Try again" only in the foot (`employee-updates.tsx:85,97`) |

   - *Proposal:* use one rule everywhere:
     - **Failed:** say so in place, with no skeleton, and a primary Try again there.
     - **Paused or offline:** no button; it resumes by itself; show the stamp.
     - **Signed out:** Sign in, with `returnTo`.
   - *Impact:* Medium · *Effort:* S · *Owner:* UI.

10. **Give a new workspace a real first-run path.**
    - *Why:* the Owner "Finish setting up" row covers only coverage periods and weekly hour targets (`owner-setup-card.tsx:69-73`). It skips adding the team, publishing a first week and setting up a Clocker device, and Managers never see it.
    - With no employees, Home reads as "all calm": "Nothing needs you right now…" and "No one is clocked in right now." (`premium-home.tsx:161,238`).
    - Other empty states have no next step:
      - Timecards: "No employees are available for this period." with no link to Add employee (`timecards.tsx:331`).
      - Manager Updates: "No current updates", with no "Create update" in the empty state (`employee-updates.tsx:49`).
    - The Team page's first-run ("Your team starts here" + Add employee, `employee-directory.tsx:95-98`) is the right pattern.
    - *Proposal:* extend the Team page pattern. Give Home a 4–5 step setup row (shown to Managers too, read-only for steps they can't do). Give every empty state the one next action.
    - *Impact:* Medium · *Effort:* M · *Owner:* Product (the steps) + UI.

Minor, not ranked:
- The phone Inbox badge re-reads every 60 s (`use-inbox-count.ts:34`), while Home and Inbox re-read every 30 s, so the badge and "Needs you" can differ for up to a minute.
- There is no app-level offline indicator. About 26 components each check `navigator.onLine` separately.
- Server reads that hang show the route skeleton forever, with no "taking longer than usual" message. Client reads give up after 10 s.

## What's good

- Height-holding (`HoldHeight`, ST-28 and ST-P4-03) and per-route skeletons with screen-reader labels mean a state change never shifts the page. The Owner setup row keeps its last confirmed steps, so a failed read never makes setup look done (`manager-action-center.tsx:128-137`).
- Signed out, failed and partial are told apart: 401 and 403 lead to Sign in rather than a retry that can't succeed (`employee-updates.tsx:33`). The Inbox names a missing clock-in read instead of dropping it.
- Wave A forms handle trouble well:
  - `OfflineNotice` says "What you've entered stays here".
  - Double taps send only once.
  - Errors say "Nothing was changed. Try again, or go back."

## Not checked / limits

- I had no browser for this review. Behaviour comes from reading the code, plus the one earlier pause probe log (`qa-out/final2-mgr-phone/pause-AUDIT-M.log`).
- These were not reproduced at runtime:
  - The Timecards poll reset (rec. 2).
  - Whether the `reset`-based Try again re-throws (rec. 3).
  - The swap-confirmation disappearing (rec. 6d).
- I did not check Spanish strings, Employee and Lead pages, reduced motion, or screen-reader announcement order across state changes.
- I did not test a truly empty workspace (no locations, no employees). The first-run findings come from the code paths.
