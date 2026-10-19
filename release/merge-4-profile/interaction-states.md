# Combined interaction and states

Candidate8e18a95; application checkpoint0bdaa4d (coordinator227150b, backendda2a4e5, Profileea58610/appcaef395). The sole8e18a95 delta restores a backend locator assertion; all application/build/config files are byte-identical to0bdaa4d. Earlier measurements name their exact source SHA. This is a partial combined inspection, not all-six release acceptance.

## Verdict

Not zero: P0 0 / P1 3 / P2 0 confirmed in Availability; no new Profile interaction defect reproduced. The final Availability failure-state recheck and automated matrix are recorded separately; incomplete states are not zero.

## Earlier findings / findings

No source-owner UI change beyond the separately authorized Profile initial-read wiring. Profilecaef395/ea58610’s Mac zero exit includes the finalIS-16 focus recheck, retained underreadiness/.

## Checked and correct

-24 Profile views have no page/status error. Employee/Lead’s8 samples render the personal Profile, no management Profile and no management-profile request. This is fixture-based UI evidence, not a production authorization audit.
-16 management samples receive200/ready from the protected client verification read; ready contacts are already present from the server initial value while that request is held.
-All4 notification double-click cases send exactly one intercepted POST, showSaving…, preserve checked state on the induced failure, show“Not saved. Try again.” and keep focus on thebutton. Geometry and scroll stay stable. [Raw state cases](profile-23fcdc3/profile.json).
-Fresh23fcdc3 Home/Inbox samples settle for all4 roles in both engines; the earlier8 loading captures on98b037b are not substituted. All8 More cases open/focus/Close/Escape/return focus pass, with44px minimum sheet targets. [Raw settled probe](combined-23fcdc3/probe.json).

The exploratory probe used invalid/app/time in4 cases. Those404s are harness errors and excluded from application findings; the actual/app/my-time route is checked afresh on0bdaa4d.

## Gaps

The complete every-page/every-fixture/eight-width/four-text-size exit sweep is not finished. Native keyboard and real-device checks remain on the Mac; device access awaits Jose. Screen-reader certification and complete manual contrast review are not claimed. The source wave’s earlier findings are not closed by an unmeasured area.

Latest application0bdaa4d:40/40 settled page captures have HTTP200 and no browser error; all8 More cases pass again. Tab/update-row focus is inside:2px solid outline with−3px offset, in both engines. [Fresh raw/crops](combined-0bdaa4d/probe.json).

## Current coordinator findings reconfirmed

All4 cases below are Employee/Lead,390/200, Chromium/WebKit; each was independently repeated, one intercepted503 response per case, with zero server mutations. [Raw verified states](availability-verified-0bdaa4d/state.json), [Chromium failed screen](availability-verified-0bdaa4d/crops/chromium-AUDIT-E-failed.png), [WebKit](availability-verified-0bdaa4d/crops/webkit-AUDIT-E-failed.png).

| Existing cloud ID | Measured failure | Cause / required result / owner | Severity |
|---|---|---|---|
| IS-P3-01 | Focus leaves Save for BODY during pending and remains there after failure, all4 cases. | Native disabled submit at `availability-editor.tsx:75`; coordinator must preserve focused control while guarding repeat submits, then focus the visible result after failure. | P1 |
| IS-P3-02 / coordinator IS-75 recheck | Moving the alert after Save fixes DOM order only. Alert startsy756.016, tab bar startsy761; alert ends1031.016 Chromium /1071.016 WebKit, below844px viewport. Text is hidden below the fixed bar; focus remains BODY. | `availability-editor.tsx:96`; coordinator must scroll/focus the result with clearance for the83px tab bar, making the whole message reachable/visible. | P1 |
| IS-P3-03 | Draft and submitted DOM values diverge after the caught failure. Employee: Monday readsUnavailable but checkbox revertschecked and FormData includesavailable-1=on. Lead: readsAvailable with time fields, checkbox becomesunchecked and FormData omitsavailable-1. All4 cases. | React form reset after the handled action at `availability-editor.tsx:85`; coordinator must retain the draft and keep DOM/FormData consistent with the displayed state on failure. | P1 |

The new focus-ring offset is verified separately:2px solid,−3px inset on tabs and update rows in both engines. That pass does not close submission focus or failure visibility. The older cloud IDs are reconfirmed, not renumbered or self-closed.
