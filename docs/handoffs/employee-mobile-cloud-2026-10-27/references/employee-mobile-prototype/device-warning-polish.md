# Employee device warning refinement

Current HTML SHA-256: `09384581c0106600a436d9cfd0f6c2acbf0f9e6a62780419b41e0ac1a9ddcbf1`.

The user rejected the device page’s yellow warning treatment. Attention labels now use the existing neutral surface, ink and border with a Phosphor warning circle. Cleanup guidance uses a quiet canvas notice, aligned icon, bold existing title and separate supporting explanation. Warning wording and status semantics are preserved. Other pages retain their existing status colors; healthy device states, actions, permissions and the source model are unchanged.

Only DeviceAlerts.tsx and DeviceAlerts.css changed. No real browser permission, setup, enrollment, delivery or production operation occurred. The projectless prototype has no branch/commit/PR/deployment.

Checks:8 focused groups plus311 prior groups pass in each Chromium, WebKit and Firefox (319 each). The focused checks verify neutral treatment, icons/text/status meaning, dimensions, contrast,320/390/430/884px,200% Light/Dark, native keyboard cancel, cleanup uncertainty/retry and source/theme preservation. TypeScript/build reproduction pass;21st review of2files has0findings. Existing model checks also pass.

The first finish review requested recapture because enlarged images showed recovery actions with the warning offscreen. Those were retained with recovery names; corrected images show the complete warning and separate header badge at200%. The reviewer then completed a full [review](device-warning-polish-ui-review.md) and approved the bounded refinement. [Design comparison](device-warning-polish-design-record.md) records the preserved system. Final [checks](checks.json) bind current source/saved/served bytes, references and69public raster hashes/origins.

[Light](device-warning-light.png) · [Dark](device-warning-dark.png) · [Blocked](device-warning-blocked.png) · [200% warning](device-warning-text200.png).
