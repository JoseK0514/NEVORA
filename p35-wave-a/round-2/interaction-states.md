**Not zero — 0 P0, 1 P1, 0 P2 confirmed.** Exit round 2 on `a05f26a74b2979ce0efe1532f7f70d7064261bb9`. Failed actions stay on the page, but their shared focus/reveal fix races rendering. Full exit coverage remains incomplete.

## Status of earlier findings

**IS-WA-1: fixed in the sampled failed actions:** the page remains after the intercepted failure. **IS-WA-2: not fixed:** sometimes the newly inserted result receives neither focus nor scrolling. Other IS IDs remain under full re-check.

## Findings

| ID | Screen, role and width | Element | Measured defect | Crop | Likely cause | Specific fix | Severity |
|---|---|---|---|---|---|---|---|
| IS-WA-2 | Delete shift and manager Time off; Owner/Manager; Chromium 320/200 | `ActionForm .wa-target` after a failed action | After **2.4s**, focus remains on BODY and the notice stays below the tab bar. Owner Delete: **y 751.52…1077.52**; Owner Approve and Manager Decline: **743.52…1193.52**. Tab bar starts **761**. Of six Chromium action/role cases, **3 fail and 3 focus correctly**; the six WebKit replay cases focus correctly, while the separate WebKit Delete size probe reproduced the missed reveal. This is intermittent. | [Owner Delete](crops/chromium-QAOWNER-delete-320-t200-failed.png), [Approve](crops/chromium-QAOWNER-approve-320-t200-failed.png), [Manager Decline](crops/chromium-AUDIT-M-decline-320-t200-failed.png) | `src/components/wave-a/action-form.tsx:32–33` calls `setFailed(true)` and immediately schedules a frame using `notice.current`. A frame is not a guarantee that React committed the failed-state notice; if the ref is still null, the only reveal is lost. | Move the reveal/focus into an effect keyed by **`failed`**, after the notice's ref is mounted. Scroll the notice to the usable viewport with at least **8px** above the actual tab bar, then focus with `preventScroll:true`. Remove the catch-block frame callback. Re-test repeated failures of all three actions under a delayed response. | P1 |

## Checked and correct

- **12** controlled failure replays: both engines × Owner/Manager × Delete/Approve/Decline. Every action sends **1 intercepted POST** and leaves the page in place. [Full evidence](action-failures.json).
- Browser-only reveal/focus brings the missed Delete notice to **409.52…735.52**, and the decision notice to **285.52…735.52**, wholly above the **761px** tab bar. No app source was changed.
- The twelve pending-size cases also send **1 POST** each. All requests are held/aborted in the browser; no actual decision or deletion occurs.

## Gaps

The other routes/states/roles, successful outcomes, session recovery, offline behavior, accessible names, dialogs and the full exit matrix remain incomplete. Passing replay samples do not close this intermittent failure.
