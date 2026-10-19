**Not zero — 0 P0, 1 P1, 0 P2 newly verified.** Exit round 4 on `5f7c1660a9ca86f7c8fa3ed4e07a9453c000a3e8`. Baseline type/date checks pass their sampled scope; Account recovery's textarea edge still fails contrast. Full exit coverage is incomplete.

## Status of earlier findings

TC-23's field-edge repair is **partly fixed**: Account recovery's employee input is **#858B8F**, but its verification textarea is **#D5DAD9** (TC-WC-28). TC-04's dialog action wrapping has a remaining vertical-layout problem counted once as WR-WC-25. Other TC IDs are not closed by this interim report.

## Findings

| ID | Screen, role and width | Element | Measured defect | Crop | Likely cause | Specific fix | Severity |
|---|---|---|---|---|---|---|---|
| TC-WC-28 | Account recovery, Owner and Manager, 390/100; Chromium and WebKit | `#assisted-attestation` — How you verified them | Its only field edge is **1px #D5DAD9** on white: **1.41:1**, below **3:1**. Idle, hover and focus keep that border. The employee-ID field alongside it has the intended **#858B8F**, **3.45:1**. | [Chromium Owner](crops/TC-WC-28-chromium-QAOWNER-idle.png), [WebKit Owner](crops/TC-WC-28-webkit-QAOWNER-idle.png) | Shared `src/app/app/portal-premium.css:870–871` uses a stronger textarea selector with `border:1px solid var(--nv-border)`, overriding Wave C's field-border rule at `premium-wave-c.css:48–50`. The later shared general field-color rule still loses specificity to the textarea selector. | Coordinate the shared-style fix: in that winning textarea/search rule use **`border:1px solid var(--nv-field-border)`** (**#858B8F**, 3.45:1). Re-check this textarea and search fields after the shared update is included in the inspected commit. Keep the 2px focus outline. | P1 |

## Checked and correct

- The **141 baseline route/role/width/text samples** show no Wave C text below the applicable floor and no detected date/time splits. Samples cover all thirteen Owner routes and both Manager recovery routes, with Chromium at 320, 390, 844×390 and 1440, 100/200%, plus WebKit spot checks. This is manual sampling alongside the still-running full matrix, not a claim that the matrix has finished.
- Workspace's Business name is **17px** at 100%; recovery's employee field is **34px** at 200%. Both use the intended **#858B8F** edge.
- [Field-contrast evidence](field-contrast.json) records computed styles and matching border rules. All data is fictional; no recovery code was issued.

## Gaps

The remaining state-specific wording, contrast combinations, expanded disclosures, custom-policy states and all earlier TC IDs still need completion. Shared sidebar/footer text-floor flags belong to the coordinator/Desktop owners and are not counted again here. Native date/select formatting limitations are recorded in the source handoff; no payroll/legal wording change is proposed.
