# Final shell/QA follow-up review

- codeQualityStatus: CLEAR
- recommendation: APPROVE
- blockers: []
- Exact checkpoint: a2e3571735ed5c17e959df9ea46ddc3673607f22
- Reviewed delta: dbd798c245c321de008d060b32a85c6e25b47c71..a2e3571735ed5c17e959df9ea46ddc3673607f22
- Previous reports are preserved; this receipt applies only to the seven changed files below.

## Files

- scripts/company-setup-qa.mjs
- src/app/app/availability/availability.css
- src/app/app/exchange/swap/swap.css
- src/app/app/settings/breaks/break-types.css
- src/app/app/settings/clocker/clocker-devices.css
- src/app/app/settings/locations/[locationId]/edit-location.css
- src/app/app/settings/locations/new/new-location.css

## Findings

CRITICAL: none established.
HIGH: none established.
MEDIUM: none established.
LOW: none raised.

The thirteen removed route-specific rules only override shell presentation. Their responsibilities remain covered by src/app/app/portal-design-system.css: sidebar background, navigation active/hover fill and icon color, mobile selected state, keyboard focus, footer text, and 44px minimum navigation/logout target height. The authenticated layout imports that shared layer and AppShell applies its nevora-portal class. No route, navigation entry, event handler, form control, or business operation was removed. Page-specific content styles remain.

The fixture role transition follows the production mutation ordering relevant to this single target: begin transaction, workspace row SHARE lock, employee row UPDATE lock, then UPDATE. Inspected src/lib/data/employees.ts:303–319 and workspaceReadGuard; production takes workspace first and then ordered employee row locks before employee mutation. The fixture has one target, so its id-order step is trivial. COMMIT/ROLLBACK handling preserves transaction cleanup and rethrows failures. This is a direct fixture mutation in an owned database, not a replacement for application authorization or session invalidation; the later adversarial requests still exercise the real application checks.

All 66 assertion-containing lines in company-setup-qa.mjs are byte-for-byte unchanged after whitespace trimming compared with dbd798c2. The script still forges OWNER options, checks explicit permission feedback, checks that a Manager's role remains MANAGER, and requires the forged employee to remain absent. The Details-tab click waits for an actual client-enhanced tab: employee-profile-tabs.tsx renders navigation anchors on the server and role=tab buttons only after useSyncExternalStore's client snapshot. Added network-idle waits do not suppress assertions or change their expected outcomes; they remain bounded browser waits, not proof of the authorization behavior themselves.

## Skill perspectives

Applied previously loaded remove-ai-slops and programming guidance. Removing redundant route overrides is a bounded reuse of the existing shared design layer. The QA helper has three concrete role-transition callers and a real transactional/lock-order responsibility. No assertion weakening, deletion-only tests, speculative abstraction, production parsing, or untyped production escape was introduced. No material violation of either perspective was found.

## Checks actually run / evidence inspected

- Full seven-file diff and relevant shared CSS, production employee mutation locks, and profile-tab hydration code inspected.
- `git diff --check dbd798c2 HEAD`: clean.
- `node --check scripts/company-setup-qa.mjs`: passed.
- Programmatic comparison: all 66 assertion-containing lines unchanged.
- Personally ran AppShell and employee-profile-tabs tests: **2 files / 24 tests passed**. Artifact: `.omo/evidence/ui-ux-final-a2e35717-regression.log`.
- Inspected `../implementation-interactions-004.log`, which retains selected-navigation consistency failures and passing keyboard/read/operation-retry scenarios. The old failures are not relabeled as passes by this review.
- Confirmed exact checkpoint and clean tracked status; reviewer changed no source or tests, only this ignored receipt and test log.

## Disposition and limitations

Approve this delta for local code quality. Existing shell functionality and adversarial assertions are retained, and the fixture lock order matches the relevant production order. This is not a claim that the pending current-source company08 run or 132 affected-route browser captures passed; their artifacts must independently establish runtime closure of the navigation findings and fixture reliability. Parent-reported browser004 aggregate coverage and company07c results were not rerun here. No production readiness, physical-device/screen-reader certification, merge or deployment authorization is implied. No external task was messaged and no tracked implementation was edited.
