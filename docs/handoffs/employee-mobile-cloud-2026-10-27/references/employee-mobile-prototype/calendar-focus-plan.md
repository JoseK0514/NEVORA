# Employee Calendar and sheet focus correction

Fix only two full-audit items: EM-A01 title/status overlap and EM-A02 generic-sheet focus return. Preserve the approved visual system and every Employee capability/model/API boundary. The application checkout remains read only.

Reproduce both defects on archived68aad106… first. Give the Calendar title a text-relative readable minimum so its existing badge wraps instead of painting over it. Capture the actual invoking control and focus it before native dialog opening, preserving native containment/return behavior and existing specialized flows. Verify all four Calendar lifecycle labels at320/390/430/884 and100/200% Light/Dark; pointer/keyboard/touch close, replacement, current-opener, and sign-out checks in Chromium/WebKit/Firefox. Rerun419 prior groups, refresh exact-hash evidence, then independent QA/UI closure and bounded design documentation. Remaining full-audit findings are outside this correction.
