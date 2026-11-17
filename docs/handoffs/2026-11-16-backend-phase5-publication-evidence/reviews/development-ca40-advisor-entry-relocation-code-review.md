# Proposed Owner advisor link relocation

CLEAR · APPROVE for submission to Jose. CRITICAL, HIGH, MEDIUM and LOW findings: none.

The external patch moves the same guarded link across ManagerDashboard inside the same ScopedReadFrame in src/app/app/page.tsx. The accessible name, route, class, feature flag and Owner role check are identical. This places the link later in scroll and keyboard order for eligible Owners on desktop and mobile.

The original phone link and wordmark occupied the same document origin. The new location follows the dashboard in normal flow. For phone Home, src/app/app/corp-shell.css:8 reserves 56px plus the bottom safe-area allowance plus 16px of end padding on the containing page frame. Lines 50–51 size the tab bar at 56px plus that same allowance. This gives the trailing link 16px of clearance above the navigation at the scroll limit under these rules. The proposal leaves both normal pointer ownership assertions and native clicks in place. The mobile-only absolute header rule is in src/app/app/owner-b-shell.css:10–14.

Read-only git apply --check passed. Patch remains unapplied and awaits Jose’s UI exception approval. Actual post-change pointer geometry still requires the Chromium/WebKit phone runs. The previously consulted remove-ai-slops and programming perspectives identified no test or production complexity issue.
