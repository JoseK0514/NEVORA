# Fuel UI Phase 0 Implementation Plan

> **For agentic workers:** Execute this bounded plan in the isolated Phase 0 worktree. Use verification-before-completion; do not begin the next phase automatically.

**Goal:** Preserve the selected Fuel UI baseline, correct evidenced control/status issues, and document the reusable UI and automation delivery contracts.

**Architecture:** Narrow raw-CSS refinements reuse existing tokens and component semantics. The automation charter records future scope only; no service, rule, route, schema, permission or integration changes.

**Tech stack:** Existing Next.js 16.3.6, React 19.3.0, TypeScript, raw CSS, Vitest; existing local browser tooling, no new dependencies.

**Spec:** Jose's Phase 0 request dated 2026-10-02; the resulting UI contract and automation charter below capture its durable requirements.

## Verified base

- Source repository: `/Users/josek0514/Developer/Fuel-Scheduler-`.
- Development (local and remote): `07b15526963f2ac56e9945e84af4d3b6ef408fba`.
- Selected latest Fuel UI base: `5e983a6bf6d7b22d3b2f47f96f98d2236060d33e`, branch `codex/employee-portal-polish-v2`, clean at inspection.
- Phase worktree: `/Users/josek0514/.codex/worktrees/fuel-ui-phase-0/Fuel-Scheduler-`, branch `codex/fuel-ui-phase-0`.
- The older, separately cloned `Documents/ChatGPT/Fuel Scheduler` checkout and unrelated changes in primary development are preserved. Other Employee/Manager worktrees are preserved.
- The prior preview served the selected source through a fictional-data Vite harness; no server was running at inspection. Phase 0 uses the same actual components with explicit fixture documentation. No live authentication/database verification is claimed.
- Baseline tests: 25 files / 121 tests passed.

## Constraints

- Preserve page composition, widths, spacing, typography, icon family, navigation, permissions and Clocker layout.
- RAW CSS ONLY. No Tailwind, broad root palette replacement, global submit selector, broad important patch, or unrelated CSS cleanup.
- Reuse established color pairings. Any proposed new action pairing must be shown on representative existing controls for Jose's review before adoption.
- Do not treat form dismissal as destructive; distinguish status text from interactive actions.
- Do not build automation, run migrations, change credentials, push, merge, rebase, cherry-pick, deploy or alter production/main.
- One local phase commit: `style: establish Fuel UI quality baseline`.
- Human visual approval is pending; passing automated checks is not Jose's approval.

## Review focus

1. Transparency on hover/press can reduce small-label contrast even when the normal pairing passes.
2. A noninteractive status capsule can resemble a button beside real actions.
3. Loading labels and disabled controls must fit at 320px without changing page composition.
4. Focus/reduced-motion styles must survive selector specificity, overlays and mobile safe areas.
5. Shared CSS must not change Manager, Employee or Clocker outside the explicitly affected controls.

## Task 1 — baseline and narrow control refinement

**Files:** `src/app/globals.css`; only affected presentation components if the rendered audit proves they are needed.

- [x] Capture and inspect baseline Manager, Employee and Clocker screenshots before edits.
- [x] Measure normal/hover/pressed/focus controls and identify real defects. Record disabled/loading/status behavior.
- [x] Retain existing pairings when they pass; implement only evidenced refinements scoped to affected surfaces.
- [x] Run focused browser assertions for each changed state against both the selected baseline and Phase 0.

## Task 2 — reusable contracts

**Files:** create `docs/ui/fuel-ui-contract.md`, `docs/architecture/fuel-automation-charter.md`; add references to existing repository UI instructions and README without replacing unrelated rules.

- [x] Document color roles, variants/states, typography, spacing/surfaces, icons, focus, touch targets, empty/error/loading, responsiveness and screenshot requirements.
- [x] Record reference routes, exact baseline and screenshot artifact locations; keep fixture and live verification distinct.
- [x] Inventory existing scheduling/swaps/replacement/timekeeping/communication foundations and document future automation boundaries and explicit exclusions.
- [x] Record the verify/inventory/plan/reuse/test/implement/verify/review/stop workflow for each later phase.

## Task 3 — verification and handoff

- [x] Run lint, typecheck, 121 existing tests and production build; inspect scripts first and avoid migrations/setup.
- [x] Browser QA at 320, 375, 390, 430, 768, 1024 and 1440px; Clocker also at 1024×768 and 768×1024.
- [x] Check element/text bounds, mobile footer and safe-area clearance, contrast, keyboard, long content, loading/disabled/empty/error and reduced motion. Compare protected screens before/after.
- [x] Save reviewable before/after screenshots, measurements, logs and exact preview URL in the referenced artifact report.
- [x] Review/stage Phase 0 files only, create the requested single local commit, report clean/uncommitted state and stop for review.


## Verification and handoff record

**Presentation changes:** only `src/app/globals.css`: compact informational request statuses within unchanged 44px action bands; opaque Employee danger press; opaque Manager time-off submit hover/press; opaque Clocker action and utility-key presses; scoped Clocker reduced motion; mobile Manager Schedule More popover right anchoring. Existing normal action pairings are unchanged. No component, server behavior, schema, permission, route or dependency changes.

**Documentation files:** `README.md`, `.codex/skills/fuel-scheduler-ui/SKILL.md`, `docs/ui/fuel-ui-contract.md`, `docs/architecture/fuel-automation-charter.md`, and this plan. These six files (including CSS) are the complete Phase 0 checkpoint scope.

### Contrast evidence

Both Chromium and WebKit produced the same relevant ratios. These are composited small-label foreground/background measurements, not estimates:

| Affected state | Selected base | Phase 0 |
| --- | --- | --- |
| Employee danger pressed | 4.00:1 | 4.92:1 |
| Manager time-off submit hover/pressed | 3.90:1 | 4.70:1 |
| Clocker primary pressed | 3.00:1 | 4.70:1 |
| Clocker danger pressed | 3.59:1 | 5.76:1 |
| Clocker Clear pressed | 2.93:1 | 5.07:1 |

Employee primary normal remains 5.41:1 and hover 10.26:1. All 13 audited active control variants pass 4.5:1 in normal/hover/pressed/focus across both engines. Existing form Cancel stays neutral; withdrawing a submitted request retains its danger treatment. Disabled appearance is recorded separately and is not claimed to meet active-control contrast. No new action-color pairing was adopted, so no pairing approval was inferred.

### Checks actually run

- `npm run lint`: passed.
- `npm run typecheck`: passed, including a final run after removing only Next's own generated changes to `next-env.d.ts` and `tsconfig.json`.
- `npm test`: 25 files / 121 tests passed, including the final source state.
- `npm run build`: passed on the final source state. The initial run failed because Turbopack rejected an external `node_modules` symlink. Existing dependencies were copied locally using filesystem cloning; no install or dependency/configuration change. Generated build configuration edits were inspected and excluded from the phase.
- Employee/Lead: 560 normal/long-content cases at 320, 375, 390, 430, 768, 1024 and 1440px in Chromium/WebKit. All layout rectangles match the base except the intentionally changed status capsules; the action bands, row geometry and page composition match. 140 normal text contrast audits (lowest 4.75:1), 158 empty/feedback/state cases, picker validation/payload and keyboard/availability/mobile navigation checks passed. No browser errors in this matrix.
- Protected Manager: 154 normal-state comparisons at all seven widths, across Home subtabs, Schedule, Availability, Time Off, Shift Requests and Employees. Visible markup, geometry and full computed styles match the base. Closed native details contents are excluded because they are not rendered; opening the affected menu is tested separately.
- Clocker: eight normal-state comparisons covering both locations and both tablet orientations in both engines. Normal markup/geometry/styles match; pressed contrast and reduced-motion changes are tested separately. Real component demo recognition/actions were exercised, not a punch service.
- Manager More: reproduced baseline clipping at 320–430px with the actual menu open. All 14 width/engine regression cases now fit, retain their original widths/contents and clear navigation. Keyboard opens the native details and reaches its controls with visible focus. WebKit uses native macOS Option+Tab for full control traversal; Chromium uses Tab.
- Loading/disabled/status checks: native Employee time-off submitting state remains disabled, with stable width/height at all seven widths in both engines; compact statuses remain noninteractive and vertically aligned; selected request type, locked availability and reduced motion passed.
- Six simulated 34px safe-area cases plus two reduced-motion cases passed for long picker/mobile menus in Chromium/WebKit. These are desktop engine simulations, not physical iPhone/iPad verification.
- `git diff --check`: passed. Original worktrees and development state were rechecked and preserved.

### Review artifacts and remaining limits

Artifact root: `/Users/josek0514/.codex/visualizations/2026/10/02/01a0f8c7-f196-7d22-8896-8d3c96547bd9/fuel-ui-phase-0/`.

Review gallery: `http://127.0.0.1:4186/review.html`; actual Employee fixture: `http://127.0.0.1:4186/app`. Baseline fixture on 4185 reads the original, clean `5e983a6` worktree; Phase 0 fixture on 4186 reads this isolated worktree. Both are **fictional-data component previews with stubbed actions**, not authenticated Next.js/database workflows. The gallery links before/after, pressed/hover, tablet, submitting and long-content screenshots. Baseline/after JSON indexes and browser scripts/results/logs are saved alongside `phase0-verification.md`.

Known preserved limits: local-demo Clocker (four-digit recognition, no device/server PIN validation or persisted punches); disconnected My Time; Home demo clock/shift values; no submitting state in the current Manager time-off or Clocker demo; existing Manager 36–40px targets and 13px mobile time-off input text. These were not rewritten into new functionality or a new layout. Live auth/database/device/notification integration and physical-device testing remain unverified.

No push, merge, deployment, migration, credential change, production/main mutation or Phase 1 work. Phase branch: `codex/fuel-ui-phase-0`; exact parent base is recorded above. The one local checkpoint is `style: establish Fuel UI quality baseline`; its SHA is supplied in the final handoff and external verification record. Human visual approval remains pending: **stop for Jose's review**.
