**Not zero — 1 P1 remains: ST-13, partly fixed.** Exact `5f7c1660a9ca86f7c8fa3ed4e07a9453c000a3e8`. The fixed save bar docks correctly, but a failed save at large text expands it above the viewport and hides the notice title. The guarded recheck confirms the earlier exploratory result in both browsers with zero hydration warnings. Full exit coverage remains incomplete.

## Earlier findings

| ID | Status | Measurement |
|---|---|---|
| ST-02 | Fixed in prior exact-SHA scope | Both engines, 320/390, 100/200%: zero Save/toast overlap; settled toast ends 8px above measured bar. [Prior re-check](../round-4/stability.md). |
| ST-13 | Partly fixed; P1 remains for failed saves at large text | Idle/pending bars are docked; failed notices can grow beyond the screen. Finding below. |
| ST-15 | Fixed in fresh portrait measurements | In all 16 guarded cases, bar bottom equals tab-bar top: 500px at 320/100,485px at 320/200;776/761px at 390/100/200. |
| ST-05,ST-08,ST-14,ST-16,ST-17 | Full recheck pending | Loading,scroll-end,hydration styling,desktop pending widths and dialog row heights remain under exit recheck. |

## Findings

| ID | Screen / role / width | Measured defect | Evidence | Cause | Specific fix | Severity |
|---|---|---|---|---|---|---|
| ST-13 (Wave C continuation) | Features & words and Company policies;Owner;320×568 at 200%;Chromium and WebKit | Chromium: Features fixed bar 470px at y15–485; Policies 538px at y−53–485. Header ends 77px, obscuring Features' notice title at 41–81 and all of Policies' title at −27–13. WebKit is taller: 510px/y−25 and 578px/y−93. | [Guarded measurements](evidence/bars.json), [WebKit Policies before](evidence/bars/webkit-320-200-company-policies-failed.png), [Chromium Features before](evidence/bars/chromium-320-200-features-failed.png) | `premium-wave-c.css:521` places unrestricted `.wc-feedback` inside the fixed action bar; long messages in `features-editor.tsx:68` and `company-policy-editor.tsx:136` grow with text. | On portrait phone fixed bars, bound feedback with `max-height:min(28dvh,12rem);overflow-y:auto;overscroll-behavior:contain`. Preserve its focusability and every message word. At 320×568 it becomes 159.03px high with scrollHeight 310/390px in Chromium; complete action bars become 319.03/307.03px and start 165.97/177.97px below the 77px header. | P1 |

## Checked and correct

- [Guarded probe](evidence/recheck-bars.mjs): 16 cases, both engines, 320×568 and390×844,100/200%, Features and Policies. Waited for hydration, fonts and live bar/tab-bar dimensions. **Zero hydration warnings.**
- Browser-only bounded-feedback proof keeps every bar below the header and exactly above the tab bar in all 16 cases. [WebKit Policies proof](evidence/bars/webkit-320-200-company-policies-browser-proof.png). All message text remains in a focusable scroll region; source and mirror CSS are unchanged.
- Repeated activations produce **one intercepted request** per case. Requests are held and aborted; no save reaches the server.
- [Unchanged checker initial result](evidence/checks-initial.json): 26/26 samples, all 13 Owner routes, 320/100, both browsers, axe; maximum CLS 0 and no client errors.

## Gaps

Full matrix, client-navigation loading, live resizing, scroll-end bars, desktop pending widths and remaining earlier IDs are incomplete. The first exploratory font-timing warning was a harness artifact; this finding uses only the clean guarded follow-up. Browser-only CSS proof is not an integrated candidate or source fix.

Candidate-only commit `64f15e6` stages this bounded-feedback rule for the unmerged Wave C UI. The source finding remains open; combined candidate inspection follows an eligible merge.

Zero open P0–P2 in this area: **no**.
