**Incomplete — no zero verdict.** Wave C exit round 4 on exact `5f7c1660a9ca86f7c8fa3ed4e07a9453c000a3e8`. ST-02 is fixed in prior exact-SHA evidence. A large-text failed-save-bar reproduction needs a clean confirmation before reopening ST-13.

## Earlier findings

| ID | Status | Evidence |
|---|---|---|
| ST-02 | Fixed in prior measured scope | Both engines, 320/390,100/200%: zero Save/toast overlap; settled toast ends 8px above measured bar. See [prior re-check](../round-4/stability.md). |
| ST-13 | Recheck in progress; preliminary large-text failure observed | Policies 320×568/200%: 538px fixed bar at y−53…485. Features: 470px at y15…485. Header obscures the top of the error notice. [Policies crop](evidence/states/chromium-320-200-settings_company-policies-failed.png), [Features crop](evidence/states/chromium-320-200-settings_features-failed.png). This probe applied the root font before the explicit hydration guard and logged a hydration warning; confirmation with the queued guarded probe is required. |
| ST-05,ST-08,ST-14,ST-15,ST-16,ST-17 | Full recheck pending | Source fix locations reviewed; remaining loading, scroll-end, hydration and pending measurements are queued. |

## Findings

No new ST finding is counted before the guarded recheck. The preliminary ST-13 failure is retained as a risk, not silently closed. Likely cause: unrestricted `.wc-feedback` inside the fixed action bar (`premium-wave-c.css:521`; long failure messages in Features/Policies). A browser-only proof is prepared to constrain feedback to `max-height:min(28dvh,12rem);overflow-y:auto`, preserving all words and the visible action. Source and mirror remain unchanged.

## Checked and correct

- [Unchanged checker initial result](evidence/checks-initial.json): 26/26 samples, all 13 Owner routes,320/100, both browsers, axe; no sampled CLS above 0.01 or client error.
- Local blocked-submit probes observed exactly one intercepted request for repeated button clicks. Those requests were held and aborted, never sent to the server.

## Gaps

Browser work paused by coordinator for uncontended candidate release tests. Guarded failed-bar reproduction, full matrix, client-navigation loading, live resize, scroll-end bars, pending widths and remaining earlier IDs are not complete. A root-font timing warning in the exploratory probe is a harness artifact and is not filed against the app.

Zero open P0–P2 in this area: **not certified; incomplete**.
