# External proposals: root applies, one commit per finding

Nothing applied or executed here. Manifests record immutable original/proposed hashes. Original56570fd IS-P4-19 proposal is retained as superseded; current IS-P4-19 source/test patch is based on6aed3ea and preserves root TC-P3-25's publicationState-unavailable primary Try again condition. IS-P4-11 source patch remains based on56570fd; root reported apply-check passes current branch.

## IS-P4-19

Citation: original Desktop interaction-states.md150 (P2),229 (explicit still-open/waiting coordinator). The report measured Lead1024 Refresh recorded time native disable→BODY; naming portion has since improved, remaining focus behavior survives unchanged. The live Home footer has the same pending native-disable pattern.

Callsites:
- `EmployeeTimeView` is the read view for full My time and compact Home clock; `EmployeeTimePanel` supplies its original keyed independent controller. It is also the redacted clock fallback in Home.
- Live `EmployeeHomeActions` returns `EmployeeHomeReviewedRenderer` then `EmployeeHomeReviewedView`. Its ready ownTimeSlot is the original independently keyed `EmployeeTimePanel`; do not share Home and recorded-time authorities.
- Home's redacted fallback clock and Home footer both request the SAME Home controller read. Proposed shared refreshHome callback gates both synchronously, and fallback refreshing now includes actual Home refreshing as well as initial loading. This prevents one control restarting the other's pending read.
- Legacy exported `EmployeeHomeView` remains only as a test/reference view; no application callsite renders it. It is not arbitrarily rewritten.
- `createPrivateSnapshotController.refresh()` does NOT deduplicate: lines15–18 increment sequence,cancel/abort any active request,publish(true),then start request in a microtask. Existing lifetime/authority/expiry/paused clearing must remain untouched. Callback synchronously publishes pending props before that microtask, so the per-render synchronous closure blocks same-render double calls; subsequent pending renders block on refreshing, later settled render permits retry. No React hooks were added to pure views/direct-call tests.

Native disabled stays ONLY for paused state; refreshing is aria-disabled/aria-busy and handler-guarded. Denied Sign in branches and private-data clearing are unchanged. Existing tests are updated for required behavior: native paused lock,pending focusability,duplicate callback1,later-render retry,shared Home/fallback callback1,and existing absence of private fields. No new implementation-mirroring test was introduced. Root still needs real browser native Enter+held GET request count,focus before/during/after,503/retry,paused privacy and no unexpected exception in Chromium/WebKit.

Ready port: these component files originally matched candidate32; normally merge final root head first (including Home b68/TC25/IS19). Preserve Desktop premium CSS and already approved ST-P4-13/KBD commits. Do not apply a duplicate independent implementation afterward.

## IS-P4-11

Citation: original Desktop interaction-states.md43 P2;137 and230 waiting WaveA/unchanged. Browser Back restores item=TIME_OFF:audit-timeoff, while band's Inbox link only returns filter and selects first row. WaveA agent independently confirmed same retained Origin/backTo in its ready target.

Scope is the pre-decision in-page return. Originating Inbox withFilter now uses existing `timeOffRequestId(item)` on a released typed item and requires its parsed request id to equal destination requestId before encoding item.id. Unknown/pre-existing item is removed,so unrelated items cannot be smuggled into this link. Query is encoded once via URLSearchParams.

ManagerTimeOff already reads authorized pending requests. Proposed origin item is accepted ONLY when it equals TIME_OFF:<focused.id> from that existing authorized read, and from is not Home. Filters still pass through existing inboxFilter allow-list. A decided/unavailable/no-matching pending request drops selection; absent/mismatched/malformed item never invents one. Home's return remains /app. No new authority,read,command,decision or backend change. Decision mutation redirects remain unchanged; after a decided request disappears,normal fallback selection remains intended. Existing failed-decision redirect behavior is not broadened by this bounded Back-link repair.

Ready Desktop port: root candidate's old `ItemRow` directly calls withFilter; newer ready's `itemEntry` owns that href instead. Retain same withFilter import/helper changes and update `itemEntry` to `href: withFilter(action.href, filter, item)`. Keep Selection,one-time GroupDisclosure,ST-P4-13 layout opener,focus and native user-open semantics untouched. manager-time-off.tsx and RequestsPage item?:string plumbing port directly. Root normal merge may require this one concrete callsite conflict resolution.

Proof fixture: authorized synthetic pending time-off audit-timeoff; actual released ActionItem must be TIME_OFF:audit-timeoff. URL selection id is not business requestId. Test requests/all filters and allow-list fallback,valid same-id item,absent/mismatched/garbage item,Home return,decided/no-pending fallback,then on actual Desktop-ready geometry verify returned row/current detail still matches. Actual candidate old Inbox lacks Desktop selected-row markup: verify href/URL preservation there,do not falsely claim pane selection proof until Desktop integration is under test. No Approve/Decline may reach server.
