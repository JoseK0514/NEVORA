**Not zero — 0 P0, 0 P1, 1 P2 confirmed.** Exit round 4 retargeted to `ea58610bf3bdc85319895689c3d88e064f6a76d5`. The WebKit band mismatch is fixed; the contact-read shift remains. The complete matrix and full exit sweep are incomplete. Original `829dfe6` reports/evidence are preserved under [history](history/829dfe6/stability.md).

## Status of earlier findings

| ID | Status | Measurement |
|---|---|---|
| ST-PROFILE-08 / ST-08 | Fixed | **32/32** cells match: Chromium/WebKit × 320/360/390/430 × 100/125/150/200%. In the former failing WebKit 390/150 cell, placeholder and ready bands are now **134=134px**. |
| ST-PROFILE-03 / ST-03 | Not fixed; integration dependency | Manager 360/100 still grows **44px** when its read arrives. The handoff now calls 320–360 set aside pending initial-data wiring; the measured defect remains above the brief's 0.01 bar on this exact source. |

## Findings

| ID | Screen, role and width | Element | Measured defect | Crop | Likely cause | Specific fix | Severity |
|---|---|---|---|---|---|---|---|
| ST-PROFILE-03 (ST-03) | Profile, Manager, 360/100, Chromium and WebKit | Email and Locations in `.pmp-details` | Email **77→99px**, Locations **53→75px**; later content moves **44px**. Chromium's read adds a **0.02974** layout-shift entry. WebKit has the same geometry (no supported CLS entries). | [Chromium loading](crops/ST-03-chromium-360-t100-loading.png), [ready](crops/ST-03-chromium-360-t100-ready.png); [WebKit](crops/ST-03-webkit-360-t100-ready.png) | `src/components/manager-profile/manager-profile.tsx:25–34` supplies no ready `initial` value on this branch; the read's wrapping values arrive after placeholders. | Complete the documented backend/`initial` wiring and verify its merged exact commit. Required here: **0px** contact-read movement and CLS **≤0.01**, including 320–360 and the long-address fixture. This report requests screen verification, not backend changes on this source branch. | P2 |

## Checked and correct

- [Band measurements](bands.json): every sampled band-height delta is **0px**. Authentic server fallback markup is placed in its original parent for this browser-only geometry proof; it is not a navigation/CLS claim.
- During the held failed alert saves, the focused first row retains its height and focus in eight role/browser/phone-text samples. [State evidence](states.json).

- **IS-15 desktop re-check:** four Owner/Manager/browser cases at 1440/100 retain **scrollY 0** and focused details through simulated blur/return plus **31s** of background polling. Details heights remain **400px** for the large Owner fixture and **378px** for empty Manager, with **0px** change. [Measurements](extra-fixtures.json). This does not close initial-read ST-PROFILE-03.

## Gaps

Remaining widths, assigned-location list variants, large-data initial contact shifts, timeout/slow/success cases and matrix/axe are incomplete. The earlier placeholder shift before releasing the held read is separate from the measured 0.02974 read shift and still needs shared-placeholder triage. No zero exit certificate is issued.
