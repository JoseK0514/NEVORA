**Not zero — 0 P0, 0 P1, 2 P2 confirmed.** Round 4 on `829dfe6cf45beb71b77db573c0263c60a5f69856`, a re-check round. The complete matrix is still running; this is not an exit certificate.

## Status of earlier findings

| Earlier ID | Status | Measurement |
|---|---|---|
| ST-03 | Partly fixed | Owner at 100%: loading/ready Sign out position differs 0px at 320, 390, 430, 844, 1024 and 1440. Manager at **360/100** still grows 44px; this is outside the handoff's explicit 320px exception. |
| ST-08 | Partly fixed | 31 of 32 browser/phone-width/text cells match. WebKit 390/150 is 36px short. |

Legacy IDs are retained below alongside the chat-prefixed IDs.

## Findings

| ID | Screen, role, width | Element | Measured defect | Crop | Likely cause | Specific fix | Severity |
|---|---|---|---|---|---|---|---|
| ST-PROFILE-03 (ST-03) | Profile, Manager, 360×844/100; Chromium and WebKit | `.pmp-details` Email and Locations | Email grows **77→99px**; Locations **53→75px**. Everything below the details moves **44px**. Chromium CLS **0.02976**; the unchanged checker independently reads **0.0297**. WebKit has the same 44px geometry delta (no supported layout-shift entries). | [Chromium loading](crops/ST-03-chromium-360-t100-loading.png), [ready](crops/ST-03-chromium-360-t100-ready.png); [WebKit loading](crops/ST-03-webkit-360-t100-loading.png), [ready](crops/ST-03-webkit-360-t100-ready.png) | `src/components/manager-profile/manager-profile.tsx:25–34` supplies no `initial`; placeholders cannot size the wrapping email and assigned-location list. | Complete the documented server-read wiring after the backend merge: parse `readManagementProfile(proof)`, pass a ready value as `initial` to `ManagerProfileLive`, catch unavailable reads as null. Ready geometry must be present in the first render; target **0px** movement and CLS ≤0.01 at **360** as well as 320. This is an integration dependency, not a request to change backend behaviour here. | P2 |
| ST-PROFILE-08 (ST-08) | Profile, Owner, WebKit, 390×844/150 | `.route-skeleton[data-route=profile] .route-skeleton-band` | With Inter loaded and root **24px**, the ready summary uses two **36px** lines: band **170px**. The authentic server-rendered placeholder is **134px**. Difference **36px**. Chromium uses one summary line and matches **134=134**. | [WebKit placeholder](crops/ST-08-webkit-390-t150-placeholder.png), [ready](crops/ST-08-webkit-390-t150-ready.png) | `src/app/app/premium-profile.css:87` estimates a 13.2rem summary width. At 150% its query ends at **388.8px**, just below this 390px card; WebKit wraps sooner than Chromium. | Size the placeholder from the actual Profile title and summary markup with invisible text, using the same fonts, padding and 318px summary width. Required height here: **170px in WebKit, 134px in Chromium**. A single larger numeric threshold would make Chromium wrong. | P2 |

## Checked and correct

- Empty Email and Phone both stack at **card +20px**, with **4px** label/value gap at 320, 390, 430 and 1024, at 100/200%.
- ST-08's other 31 sampled cells match: both browsers, widths 320/360/390/430, text 100/125/150/200%.
- Focus restoration and a 401 save do not scroll the page; details are in the interaction report.

## Gaps

- The **Manager 320px** remainder remains set aside exactly as the handoff requests. The newly confirmed **360px** remainder is counted; the exception was not expanded.
- Band comparison uses actual server fallback markup placed in its original page-frame parent in the browser. It proves geometry, not a navigation/CLS measurement.
- Enlarged-contact first-read movement needs its remaining visible-state traces. The matrix and axe are not yet complete.
