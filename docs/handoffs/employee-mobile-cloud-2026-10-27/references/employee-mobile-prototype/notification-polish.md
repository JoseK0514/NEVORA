# Employee notification row refinement

HTML SHA-256: `77e32e914510996abb774acb06a37b307981b28748754e51bb7716fbe8695acc`.

The requested warning/status rows now align the source icon, title and date above a full-width footer. Status sits on the left; the next action sits on the right with one directional icon. The row remains one keyboard-accessible button. Inset focus stays visible inside the card; enlarged text wraps rather than overlapping. Existing status meanings, amber/teal roles, labels, source destinations and permissions are unchanged.

Only Notifications.tsx, Communications.css and the optional Row className hook in ui.tsx changed. No data/model/API, external service, real message or production mutation occurred. This projectless prototype has no branch/commit/PR/deployment.

Validation: 10 focused groups plus 269 prior groups pass per engine in Chromium/WebKit/Firefox (279 each). Tests include footer geometry, title/date alignment, single affordance, keyboard/source navigation, minimum row target, unchanged filters/search/refusal behavior,320/390/430/884px,200% text and Light/Dark. TypeScript/build reproduction pass;21st review of 3 changed files reports 0 findings. Current raster/source/reference hashes are in [checks.json](checks.json); [independent review](notification-polish-ui-review.md) and [design comparison](notification-polish-design-record.md) describe their bounded scope. Browser logs/results in work/employee-mobile/evidence/notification-polish.

[Light](notification-actions.png) · [Dark](notifications-dark.png) · [200% text](notifications-text200.png). Opening a notification still does not confirm a schedule or acknowledge an update.
