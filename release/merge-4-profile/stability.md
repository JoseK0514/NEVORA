# Combined stability

Candidate8e18a95; application checkpoint0bdaa4d (coordinator227150b, backendda2a4e5, Profileea58610/appcaef395). The sole8e18a95 delta restores a backend locator assertion; all application/build/config files are byte-identical to0bdaa4d. Earlier measurements name their exact source SHA. This is a partial combined inspection, not all-six release acceptance.

## Verdict

Not zero: P0 0 / P1 3 / P2 0 confirmed in retained Wave A controls. No new Profile stability defect reproduced.

## Earlier findings / findings

| ID | Screen / role / size | Measurement | Evidence | Likely cause / specific fix / owner | Severity |
|---|---|---|---|---|---|
| ST-WA-7 (retained source) | Swap / Employee /320,200% / both engines | Pending button88→52px; layout moves while sending | [held cases](pending-23fcdc3/judgment.json), crops/*-swap-200-{before,pending}.png | Candidate retainsc05e0c7. `src/components/wave-a/pending-button.tsx` has no label-height reservation. Wave A must preserve idle/pending size on its source branch and obtain a zero exit. | P1 |
| ST-WA-8 (retained source) | Edit shift Delete / Manager /320,200% / both engines | Pending button88→52px | Same raw/crops for Delete | `src/components/delete-shift-button.tsx` uses a separate pending control. Wave A owns the source fix. Newer fixes remain excluded because7f75dc4 failsST-WA-11. | P1 |

These23fcdc3 measurements remain applicable:227150b changes Availability’s alert and focus offsets only;8e18a95 changes one test assertion. The source7f75dc4 resize defect is reported on that source, not counted as an integrated-candidate defect.

## Checked and correct

The authorized initial-read commit4ff37e5 is measured in16 management Profile views on23fcdc3 with the client verification read delayed1800ms. Details stay448→448px at320/360,426→426 at390,378→378 atlandscape/1440. Maximum recorded CLS0.000548, below0.01. “Checking…” while the protected client read runs is expected; the already-rendered contacts hold their geometry. [Raw profile data](profile-23fcdc3/profile.json).

All4 management notification double-click cases hold358×68px at y390, with unchanged documentY and scrollY before/pending/failure, in Chromium and WebKit. Each intercepted one request. Source profiles and fixture state are explicit; there is no general production shift guarantee.

## Gaps

The complete every-page/every-fixture/eight-width/four-text-size exit sweep is not finished. Native keyboard and real-device checks remain on the Mac; device access awaits Jose. Screen-reader certification and complete manual contrast review are not claimed. The source wave’s earlier findings are not closed by an unmeasured area.

## Current coordinator finding reconfirmed

**ST-P3-24, P1 — Availability, Employee and Lead,390/200, both engines.** Save usual week88→52px while Sending, with y550.016→586.016 (+36px); the failure returns88px. Cause: `src/components/availability-editor.tsx:75` replaces the wrapping idle words without holding the untransformed size. Coordinator owns the fix: preserve the88px pending geometry at this size. [Repeated held measurements](availability-verified-0bdaa4d/state.json). This is the existing cloud ST-P3-24, distinct from the coordinator’s placeholder P3-ST-24.
