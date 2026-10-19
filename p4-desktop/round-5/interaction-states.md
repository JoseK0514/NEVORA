**Incomplete — 0 P0, 0 P1, 0 P2 newly verified in this area; no zero certificate.** Exit round 5 on `8012d9790e72987140f939c7d70e1df9612ea009`.

## Status of earlier findings

The IS-P4 ID re-check, including Inbox state/focus changes, remains incomplete. No earlier item is closed solely by these menu samples.

## Findings

None newly verified in the completed interaction scope.

## Checked and correct

- Owner, Manager, Employee and Lead, **both browsers at 1440/100**: keyboard opening focuses **Your profile**; Escape closes the account popover and returns focus to its exact trigger, **8/8** cases.
- Collapsing the sidebar yields **80px**, `aria-expanded=false`, **8/8** settled cases. Waiting for the transition avoids premature WebKit width readings.
- [Account/menu evidence](account-menu.json). Sign out is never pressed; no submission reaches the server.

## Gaps

Other menus/states, Inbox keyboard navigation and failures, focus under sticky bars, deep-page current markers, all role pages and the full matrix remain incomplete.
