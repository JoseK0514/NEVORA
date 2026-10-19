**Not zero — interim round 5, 0 P0, 1 P1, 0 P2 newly verified.** Exact source `227150bb2658cb5a30db3c644b6b8f76031d3c79`. Remaining earlier stability IDs and full matrix are in progress; no exit certificate.

| ID | Screen, role, width | Measured defect | Evidence | Cause and smallest fix | Severity |
|---|---|---|---|---|---|
| ST-P3-24 | Specific-week Availability, AUDIT-E, Chromium and WebKit320/200 | Idle submit **248×132px**, top **469.516px**; held pending submit **248×52px**, top **549.516px**: **80px** shrink/jump. | [Before](crops/availability-chromium-AUDIT-E-320-t200-before.png), [pending](crops/availability-chromium-AUDIT-E-320-t200-pending.png); [JSON](interaction-evidence.json) | `src/components/availability-editor.tsx:74` replaces the long idle label with short Saving…. Put both labels in the same grid cell with the inactive label invisible and removed from the accessibility tree, preserving maximum intrinsic dimensions. The submit must remain 248×132px at this cell. | P1 |

This retains the cloud round-4 ID **ST-P3-24**, distinct from the Mac report's **P3-ST-24** placeholder-band finding. Focus loss is counted separately as IS-74 in [interaction states](interaction-states.md).

Checks completed: [required smoke](checks-smoke.json), 15/15 AUDIT-E Chromium390/100. A failed action was intercepted/aborted in the browser. Source code, CSS and app tests are untouched.

Gaps: Employee/Lead parity, pending states elsewhere, Home/My time holds, route-placeholder geometry, large data and reduced motion remain in progress. No earlier P3-ST ID is closed by this interim result.
