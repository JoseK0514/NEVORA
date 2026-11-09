# Employee mobile My Time and Timecards — 2026-10-13

Source branch: `codex/nevora-login-refinement-20261012`, parent `3a1478a84f917bc10da4b27c662de8410c9d5a09`. Jose approved implementation of the visual proposal for these two pages, coordinated blue color and consistent typography/alignment. The larger employee polish plan is narrowed to Tasks1–3 and verification/handoff Task5. Task4/Home remains deferred. No merge, push or production release is authorized by this step.

## Result and source

AppShell adds `data-employee-corporate="true"` only for role EMPLOYEE and exact `/app/my-time` or `/app/timecards`. `src/app/employee-mobile-corporate.css` applies the new presentation at screen widths <=760px, using shared color/type/spacing/control/state tokens and inherited local Inter/Phosphor. Native presentation classes come from `employee-corporate-ui.ts`; there is one existing live controller/control tree per page, with no duplicate mobile business logic or demo data.

My Time groups Current Status and Today in one white/soft-blue composition, flattens routine gray empty boxes, gives the title a quiet Timecards shortcut, and orders status/freshness/Refresh/Record details/Today naturally for keyboard and visual use. Record details retains exact observed seconds, timezone and polling cadence. Entry disclosures retain exact punch times, named breaks, dates and correction paths. Completed stays on one line at320px. Each clock value and its AM/PM stays together; overnight dates remain explicit.

Timecards retains native controlled start/end dates and the independent Choose/Refresh handlers. Peer actions share48px height and12px corners; native fields are52px. The correction row stays before the timecard in visual and DOM order. Totals lead review details. The typed presentation helper treats period-open alone as neutral Period information and reserves restrained warm warning color for unresolved issues, retaining every original reason and order. Eligibility, manager approval, revisions, retry commands and private expiry clearing remain unchanged. Expanded source labels are15px.

Original desktop labels/classes remain, with responsive spans hidden outside the scope; the overview wrapper is display:contents. The legacy CSS-module class remains last where existing mobile selectors depend on its suffix. Protected controller bodies are byte-identical to parent: EmployeeTime `449071208e226b3affe45c352c1977c7773f18f0ae7db30bb84e6de360f74807`, Timecards `4d8e61f08bbf4b996a01beed0f619a7078c3086a4ed9ee200bad8dd587573e29`. No API/auth/DB contracts changed.

## References and components

Mobbin Gusto Mobile paycheck detail `b9bf269f-2d5e-4f19-9ada-338ae6cdebdf` and time-off detail `615a1c68-9a32-4425-90eb-17f6a318a269` informed grouped hierarchy, typography and restrained color. These are composition references, not a timesheet pixel clone. The approved standalone proposal uses fictional sample records; the application retains its actual richer record/control requirements.

Actual21st source snapshots retrieved through the existing authenticated catalog CLI: Button143, Input167, Button Group8608, Item8663, Card15582, Badge27366, Accordion494, Separator1556 and Alert1170. Native ports adapt their component anatomy and states to existing React/CSS/Phosphor. Snapshots remain in the chat's `work/employee-mobile-plan/21st` and `work/employee-time-proposal`. The21st MCP was unavailable; no dependencies, hosted AI generation, paid trial or subscription was added. No reference screenshot is an application asset.

## Verification

- Full default unit suite:7065 passed,801 skipped;407 passing and27 skipped test files. PostgreSQL opt-in barriers and absent ambient database URLs were inspected before running. Skipped integrations are not certified.
- Focused final UI/controller suites:9 files135 passed before the final range fix; final five-file suite88 passed. Task3 independent presentation/consumer checks:2 files20 passed. TypeScript, scoped ESLint and isolated Next build passed.
- Final candidate build: `FzIsCUolwwSvyzzvZp8Zz`. All1232 source files match the runtime mirror except the existing approved mirror-only disposable DB adapter. Production DB source is unchanged.
-112 fresh validated native JPEG captures: both pages320/390/430/760/761/1440 at top/end; incumbent matched1440x1000 desktop pairs; keyboard focus/disclosures; correction form open/cancel only; native invalid/changed period and Refresh;14 renderer state fixtures at320/390 and twelve visible opened/expanded Timecards detail frames; other employee pages and Lead/Manager/Owner shared-route preservation. No recorded document horizontal overflow. Native Tab trace follows visible control order.
- Original independent visual/behavior reviews remain verbatim REVISE. Their findings prompted natural DOM-order fixes, shared token recipes, Completed wrapping and15px expanded source labels. The second visual pass identified a remaining PM orphan and offscreen Timecards details; complete time groups and twelve visible opened/expanded320/390 detail frames address these. Earlier unsettled/mismatched viewport/tool-fill artifacts are retained as exclusions, with corrected fresh captures. No product/controller change was made to accommodate the date locator driver.
- Independent final range code review: PASS/CLEAR/APPROVE,88 tests rerun; narrowed disclosure assertion and real issue-array consumer confirmed. Previously reported empty CSS selectors were removed. Fresh independent behavior and visual reviews both returned PASS with empty BLOCKING lists on build FzIsCUolwwSvyzzvZp8Zz; each directly opened all112 original captures. Reports are behavior-gate-approval.md and visual-gate-approval.md. Final public preview receipt remains separate and is recorded in the companion report.

## Evidence and limits

The calling chat's `work/employee-time-implementation` contains source/controller manifests, test/build logs, prior and final review reports and `r3` capture matrix/validation/originals/keyboard trace. Contact sheets are indexes. Controlled state fixtures use actual renderers and fictional parsed snapshots with lifecycle/network effects disabled; links and shell are stand-ins. They prove state appearance, not authentication/transport. Actual disposable preview reads and controller tests supply separate behavior evidence.

This is light-only responsive web browser QA. Native iOS/touch/DPR/notch, dark theme, reduced-motion emulation and200%zoom were not tested. Existing reduced-motion fallbacks were inspected; no new ornamental motion. No real messages, punch/correction submissions, approvals, payroll processing, credential changes or customer mutations were performed.

## Preview and rollback

The authorized public preview is `https://rent-less-momentum-tags.trycloudflare.com`. The candidate mirror is `work/employee-time-runtime-v7`; retained incumbent rollback is `work/mobile-site-runtime-v6`. Update only the owned loopback56316 Next server, retaining the existing Cloudflare tunnel and marked disposable PostgreSQL fixture. Verify exact PID/command/listener ownership before SIGTERM. If startup fails, immediately restart v6 on56316. Do not kill unrelated processes.

Final release state, source commit, owned PID, public browser verification and independent gate outcomes are recorded in the calling chat's `work/employee-time-preview-runtime.json` and `outputs/employee-time-preview-report.md`. Until that receipt exists, this document does not certify a public update. Keep the branch/checkout and v6 rollback mirror.
