# Candidate-only fix review for the coordinator

Exact inspected source: `227150bb2658cb5a30db3c644b6b8f76031d3c79`. Browser work paused at the coordinator's request so the first candidate gates and isolated retries can run uncontended. These are client/UI proposals; no server behavior change is proposed. Only the root edits the candidate.

## IS-77 — Timecards pause state (source-confirmed; browser recheck pending)

`timecards.tsx:90` clears data/private actor state but leaves the ready-count message untouched and sets busy=false. Refresh at line177 is disabled only by busy. Preserve clearing of private data. Add a paused state, update the message when pausing, and disable both Refresh and View period while paused. Offline copy: “You’re offline. Reconnect to see timecards.” Hidden/blur copy: “Timecards paused. Return to this page to refresh.” `sync` should resume/refresh only when visible and online; protect `refresh` itself against offline/hidden invocation. Do not retain cards simply to make the old count truthful. Keep expiry distinct: an expired snapshot may offer refresh while online.

## IS-78 — Sign-in recovery

**Correction action is browser-verified:** intercepted401 gives the generic “We couldn’t send your correction…” with no login link, although My time remains loaded. `time-corrections/client.ts:58` flattens401/403 into `{state:'unavailable'}`.

Smallest precise client-only solution: keep `state:'unavailable'` for compatibility and add optional local metadata such as `reason:'access_denied', httpStatus:401|403` in that fetch branch. Employee correction views can then say “Your session ended” for401 and render a real Link to `/login`;403 can say access changed. The metadata is created by the client from HTTP status, not accepted as an added server payload field. This avoids changing manager consumers to a new action-state variant accidentally. Preserve existing unknown-outcome command recovery for network failures; do not classify them as signed-out or throw away the original operation.

**Withdrawal:** render an actual Sign in link alongside the existing denied outcome, and in the optional sign-in recovery sentence for unavailable. Preventing native reset must preserve the same hidden operation ID. HTTP status may not be observable after a rejected Next action; do not label every network failure as an ended session.

**Calendar:** the POST code currently parses the body, treats a401 body as the generic fallback, then refreshes. A subsequent real read may succeed in the injected401 scenario, leaving generic sign-in text with no link. Handle401/403 explicitly before parsing command receipts, clear transient URL and rejected command as the existing denied path does, set unauthorized UI state, and offer Sign in. Generic network/503 unknown outcomes must retain the pending command. This is UI handling of existing responses only.

**Timecards:** add explicit auth UI state on the existing401/403 read/action branches and render Sign in beside the message. Clear protected cards as today. A fresh successful read clears auth UI state; a pause gets paused/offline wording rather than an old count or old sign-in notice.

## IS-79 — Updates acknowledge401 and pending announcement (source-confirmed; browser recheck pending)

`communications/client.ts:13` merges401 and403 into one unauthorized response; `recovery.ts:24` maps that to notice=blocked; `communication-detail.tsx:38,43` then shows Access changed/Retry, no Sign in. Preserve401 vs403 in client-local reason metadata and use a distinct signed-out notice or explicit auth-status field. The existing not-ready message already has `role=status` at line42; put the correct session-ended text in it and render Sign in for401. Do not remove the existing operation fences/authority checks.

If adding a notice variant, update **both** Detail and Compose consumers plus recovery's authorization-reset path: Compose currently handles only blocked. Otherwise its401 could fall through into the form. A small local auth-status field that preserves notice=blocked is an alternative, but must still survive until the view has fresh authority.

In the ready receipt, keep one persistently mounted polite status region for the pending announcement (“Confirming your review…”); aria-busy alone does not announce the operation. Keep existing receipt/outcome status announcements; do not announce the same outcome twice. IS-74 separately keeps the pending button focusable.

## IS-80 — Calendar unknown outcome retry (browser-verified)

Chromium390/100: Create link stays disabled after the aborted operation; outcome is y1013…1085 and Try again y1101…1153, below the viewport and phone bar. Move notice and the same-operation retry into `.employee-calendar-status-box`, beside the initiating action, and reveal/focus the outcome. Keeping Create disabled while an operation is unknown is correct; enabling a fresh ISSUE would lose the safe-retry guarantee.

The existing `onRetry` at line86 already calls `submit(pending.current.kind,true)`. Retain the entire stored command: **operationId, kind, authority and expectedGeneration must stay identical**. Never call the fresh-command factory for retry and never replace pending from a new read generation.

One source weakness to check in this same flow: `submit` currently rejects any retry unless the latest status has a generation. A failed read after resuming can leave `pending.current` intact but status=unavailable, making the visible retry return immediately. For an existing authorized retry, reuse the stored command without needing a fresh generation; only new commands need a current status generation. Still reject while paused/busy or explicitly unauthorized. Current 401/403 handling should clear denial state as appropriate; a generic read failure must not manufacture a new operation.

## Review of the root's first five fixes

- **IS-P3-03 / IS-82:** preventing native reset is appropriate. Availability's explicit Reset changes is type=button and updates state directly, so it remains effective. Success/complete paths already refresh/remove the withdrawal UI; preserve those effects.
- **ST-P3-24:** EmployeeSubmitButton's children must always contain the idle label/icon. Do not pass a pending-dependent short label as children: the maximum intrinsic reserve would disappear. Keeping the existing disabled prop in the first commit cleanly leaves focus for IS-74's separate commit.
- **IS-74:** guard the form/send synchronously, including Enter submission, not just button clicks. Calendar already has busyNow; swap already has its controller guard. A submit inside a native disabled fieldset still loses focus even if the button itself has aria-disabled: the pending submit needs to be outside that disabled ancestor while editable fields remain locked. For corrections, a send ref prevents rapid repeated submit before state commits.
- **IS-P3-02:** center scrolling fixes the measured portrait cells. When an alert is taller than the usable landscape/keyboard viewport, align its top below measured `.mobile-header` plus8px instead. Respect `.mobile-nav`, `visualViewport` where available, and reduced motion; focus with preventScroll after revealing. Do not assume the whole alert can fit at landscape200. Verify a second failed retry also triggers reveal.

No app source, CSS, tests or STATUS.md were edited by this inspector. No candidate commit is independently closed here; fixes still need targeted candidate browser reproduction after the pause.
