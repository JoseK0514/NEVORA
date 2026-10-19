**Not zero — 0 P0, 1 P1, 0 P2 newly verified.** Exit round 4 on `9bd265ebb5d2bdfa98eb51f4b386018d5aeecbf7`. Compose's interrupted-publication recovery is off screen. The full state sweep remains incomplete.

## Status of earlier findings

IS-B12, IS-B29 through -33 remain under full re-check. The earlier “failed Publish focuses Audience preview” observation reproduces, but that target hides the recovery outcome (new IS-WB-34).

## Findings

| ID | Screen, role and width | Element | Measured defect | Crop | Likely cause | Specific fix | Severity |
|---|---|---|---|---|---|---|---|
| IS-WB-34 | Compose, Owner/Lead; both browsers at 320/200, Chromium Owner at 1440/100 | Publication needs a status check / Check status | After aborting Publish, focus goes to **Audience preview**, while the recovery notice is off screen: phone **y 883.52…1351.52**, below tab bar **761**; desktop **902…1044**, below viewport **900**. Publish is disabled, but the user cannot see the offered next step. | [Phone](crops/chromium-QAOWNER-320-t200-failed.png), [desktop](crops/chromium-QAOWNER-1440-t100-failed.png) | `src/components/communication-compose.tsx:43` prioritizes the existing preview heading whenever the action notice changes. The status-check notice at line 102 sits outside `feedbackRef`. | Give the actual recovery notice a ref, or move it inside the feedback region. On unknown/unavailable publication, reveal that notice within the usable viewport with **8px** bar clearance and focus **Check status**. Focus Audience preview only when a new preview first arrives. Keep the entered draft. | P1 |

## Checked and correct

- Owner's double-Enter cases send **1 publication request** at each measured width. Audience preview and publication are answered/held/aborted entirely in the browser.
- Title and message remain unchanged after interruption. Pending retains BUTTON focus.
- [Raw Compose states](compose-states.json) preserve all observations. [Classified replay](publication-request-trace.json): Owner/Lead × Chromium/WebKit at 320/200 each send **one `PUBLISH` POST**. The other application POST is the audience preview. One WebKit Lead run also attempts Next’s dev-only stack-frame POST, which is held/aborted locally and is not a publication. The earlier unclassified count is not filed as a duplicate-submission defect. These four replays use fictional ready contexts answered only in the browser; they make no backend claim.

## Gaps

The four controlled replays reproduce Audience preview focus instead of recovery in both browsers/roles. All remaining pages/states and earlier IS IDs are incomplete. Some seeded Employee/Lead reads do not reach the expected ready form/detail and need controlled fixtures/retry; they are not called UI defects from the locator timeout alone.
