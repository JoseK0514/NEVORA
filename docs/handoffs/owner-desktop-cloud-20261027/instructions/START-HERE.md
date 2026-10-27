# Nevora Owner desktop — Codex Cloud continuation

This is a continuation of Jose’s existing conversation. Preserve the decisions, scope and quality bar below. Do not restart discovery or propose a new visual direction.

## First five minutes

1. Read this document, `WORKING-AGREEMENTS.md`, `DESIGN-FOUNDATION.md`, `G10-REMAINING.md`, `PORTABILITY.md`, and `STATUS.json` beside it.
2. Confirm the source bundle is actually present in your Cloud workspace. Local Mac links and paths are historical references, not accessible Cloud files. Do not pretend you loaded missing files.
3. Read `work/owner-desktop/AGENTS.md`, `g10-brief.md`, `outputs/owner-desktop/group-10-payroll-runs-plan.md`, and `work/owner-desktop/evidence/g10/progress.md`. The handoff’s cutoff status supersedes stale “G10 unstarted” prose in older milestone documents.
4. Verify `outputs/owner-desktop/index.html` is SHA-256 `f6e3f5b3b332a61f12a2607c9a9728d7086a77747472f5217badc786ad543a3f`; build/source manifests must agree. Do not edit the runtime until you have a concrete reason.
5. G10 is now locally finalized and audited. Verify the imported evidence against `STATUS.json`/`G10-REMAINING.md`, then continue with **G11** when that next bounded group is authorized. An unstarted roadmap entry alone is not authorization. Jose’s latest request was a Cloud handoff, not new feature expansion.

## What Jose wants and how to work with him

Jose is building Nevora, a large workforce application. The initial design work focused only on Owner mobile, developed in another chat, using Gusto, ADP and Homebase as references for understandable corporate software. He then explicitly approved this chat building the **Owner desktop companion**, hand in hand with mobile.

The desired experience is intentional, modern, clean, premium, organized and easy for a nontechnical owner who is often on the road. Deep user empathy, reusable components and low cognitive load matter more than decoration. Feature completeness must not be sacrificed to get a clean screenshot. The Owner must be able to discover all relevant jobs through sensible roots, More/search and contextual links without a dashboard wall of tools.

Jose repeatedly asked for extreme attention to detail: alignment, spacing, colors, icons, same-role button sizes, logical page flow, meaningful hierarchy, accessible native controls, source/period/person context and polished empty/error/confirmation states. He described a zero-error tolerance for UI/UX. Do not claim perfection or certification beyond evidence. Find and fix concrete defects; do not invent reassurance.

He dislikes generic or “AI generated” design, especially the old yellow warning slabs, cheap calendar-warning tiles, tiny Draft chips, controls crowded against adjacent inputs, caret icons touching select edges and inconsistent button spacing. Those issues were already refined systematically. New work must inherit the fixes; do not reintroduce them.

He prefers action over repeated permission questions. Continue an authorized bounded group without asking again. Ask only for a truly missing requirement or consequential action requiring approval. Give concise meaningful progress updates at least about once a minute during sustained work. Report outcome and real checks, not a chronological tool transcript. Do not send messages to other chats/people without the user’s explicit authorization.

## Scope, ownership and source of truth

- **Owned here:** `work/owner-desktop/` and `outputs/owner-desktop/`, plus this handoff’s own files.
- **Read-only coordination:** `work/owner-mobile`, `work/schedule-mobile`, `outputs/nevora-owner-mobile.html`, mobile reports and shared root `PRODUCT.md`/`DESIGN.md`. Owner MOBILE owns those files. HOME PAGES owns access/mobile surfaces. Do not overwrite their work or transfer ownership merely because a snapshot is included.
- **Actual application is separate:** `/Users/josek0514/.codex/worktrees/pr32-dev-preview-20261025/Fuel Scheduler`, clean detached reference commit `46e202786863279302026ee03a0e225c359fa55c`. Source inspection was authorized. This task did **not** modify, integrate, commit, push, merge or deploy that application.
- Current prototype workspace on the Mac: `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying`. It has **no Git repository**. Existing baseline snapshots are its recovery/history record. Do not delete them on the assumption Git has the changes.
- This is a self-contained vanilla HTML/CSS/JavaScript **fictional in-memory prototype**, matching the original mockup stack. The real app is Next/React. Do not replace the prototype with React, paste its built HTML into production, or start integration without a separate authorized step.
- Roles remain Owner only in this companion. Employee/Manager surfaces are not new scope. Role-specific exclusions and personal Owner account tasks are distinct; read the source-backed register.
- All **96 Owner workflows** are assigned once across G01–G16; four additional role exclusions are explicit. No global application parity is certified.

The source-backed register is `outputs/owner-desktop/roadmap.json`; coverage is `feature-coverage.json`. Plans/reviews are per group. Original findings, executor corrections and final engine checks are separate records. A local prototype result does not prove real API/server/database/auth/mobile integration.

## Completed groups through G09

| Group | Implemented local prototype | Evidence entry |
| --- | --- | --- |
| G01 | Team and employee management | `outputs/owner-desktop/group-01-team-review.md` |
| G02 | Scheduling and availability gaps | `group-02-scheduling-review.md` |
| G03 | Requests and daily decisions | `group-03-requests-review.md` |
| G04 | Attendance and account/Clocker recovery | `group-04-attendance-review.md` |
| G05 | Company setup, locations, branding, workspace identity | `group-05-company-review.md` |
| G06 | Company operating rules, positions, break types, Clocker devices | `group-06-operating-review.md` |
| G07 | Timecards and period review | `group-07-timecards-review.md` |
| G08 | Time exports and payroll handoff | `group-08-exports-review.md` |
| G09 | Payroll configuration and employee facts | `group-09-payroll-settings-review.md` |

Paths abbreviated in the Evidence column after the first row are under `outputs/owner-desktop/`.

G09 was fully packaged and audited locally before G10. Its final runtime was `9876af02bc9d0c89297aa3a4195fb22d5bcc2693bc90e9be33559d6bfe559e98`: **2,457 browser executions across Chromium/WebKit/Firefox, 380 model cases, 98 syntax checks**, plus final artifact audit PASS. Original independent FIX and executor regressions were retained separately; no independent post-fix certification was claimed.

At G09 closure the published coverage was **66 interactive / 3 partial / 27 pending**, plus four role exclusions. G10 implements six more jobs and passed its final packaging gates; current global coverage/README/verification records were updated by the finalizer. G10 is fully closed at this handoff, and the published coverage is now 72 interactive / 3 partial / 21 pending plus four role exclusions.

## G10 — exactly where this conversation reached

Jose explicitly authorized “move to G10 if you are done on G09.” The detailed plan was created and executed inline using the approved composition. Scope is **P-11–P-16: Payroll runs and exact approval**.

Implemented:

- Current period from saved effective settings, historical native/provider runs, missing historical periods from real saved schedule history, transition acknowledgement and overflow-aware unknown counts.
- Manual preparation/date/payday review, distinct receipt, same-period identity/payday conflict. Preparation does not finalize timecards or approve payroll.
- Fresh native draft recalculation with explicit missing facts/calculator blocks. Ready native figures are labelled saved **illustrative fixtures**, not a verified tax calculator.
- Provider JSON/file import with 512 KiB limit, source/period/payday, balanced whole-cent amounts, exact company population and zero/excluded dispositions.
- Gross/deductions/contributions/net, employee search/details, native saved hours/wages/taxes/YTD/provenance/workweek and provider source evidence. Missing prerequisites are grouped, not 26 repeated employee warnings.
- Deliberate separate approval with exact run/revision/token/current source and independent approval capability; truthful reviewed vs stored revision receipt. Approval is not PDF readiness/publication/payment.
- Native/provider linked correction drafts with immutable original approval, reason, new review/approval and native chain/head/population/same-tax-year dependency guards.
- Private lifecycle, healthy unchanged draft renewal, pending duplicate/navigation lock, original-operation uncertain-result recovery, safe direct links/Back/context and exact Settings/population/timecard handoffs.
- Shared G09 opening-freeze evidence for historical/new native approvals; Owner actor included separately from Team people when needed.

**Final frozen runtime:** `f6e3f5b3b332a61f12a2607c9a9728d7086a77747472f5217badc786ad543a3f`.

**Already completed on this final build:** 424 model cases across 12 runners, 109 authored-JS syntax checks, limited documentation comparison of all 126 build sources and 13 incumbent files, all CSS tokens resolved, and eight raw native full-page captures at the unchanged 589px host width. Native console warnings/errors were empty. Read the actual cutoff status for the final browser matrix; do not infer its completion from these other checks.

The full browser gate is **20 suites in each of three engines**. All 60 completed successfully while the handoff was being prepared: **2,601 browser executions, 424 model cases, 109 syntax checks, 126 build inputs**, followed by finalization and artifact audit PASS. `STATUS.json` and the cutoff manifest bind the actual reports to the final hash. All local matrix processes exited 0; no running process needs to transfer.

**Completed:** G10 packaging/audit and the global coverage update to 72 interactive / 3 partial / 21 pending. **Still separate:** actual application integration, release, live payroll, provider/bank behavior and production verification. G11 is planned and unstarted. The imported-evidence preflight is in `G10-REMAINING.md`.

## Independent review and correction history — preserve this distinction

One fresh combined code/UI review adapter reviewed original candidate `f29fa042d32b0cbe6d7baec2a4f15b2cd434ee5a7c45b04b116c4d94bb4f14fc`. Report: `work/owner-desktop/evidence/g10/reviewer/independent-review.md`. The specialized Impeccable reviewer was unavailable; no specialized certification is claimed. Reviewer freshly ran 41 Chromium UI cases/28 responsive layouts and 41 model cases, then additional probes.

Original disposition **FIX**:

1. **R1 Important:** source-change recovery reloaded a stale keyed draft forever. Fixed with explicit fresh same-authority rebinding, cleared command/ack authority and retained entered values. Three form-family regressions plus independent action/draft isolation were observed RED→GREEN.
2. **R2 Important:** a 2027 approval incorrectly blocked a 2026 correction. Fixed dependent lineage scope by original payday tax year; same-year/head/sibling/population guards retained.
3. **N1 reviewer Minor, executor Important:** native/provider snapshots always claimed employee exception revision “none.” Fixed effective date/revision resolution and captured metadata. Regraded because it misstates evidence used for financial review; no wrong monetary mutation was claimed.
4. **N2 reviewer Minor:** dirty-discard handoff lost the requested opening year. Fixed within Jose’s explicit zero-error/context-preservation foundation, while retaining the Minor grade and manual new-opening-year semantics. No wrong-year saved balance was proved.
5. **S1 executor finding:** rebinding must not preserve private drafts after changed actor/session authority. Reproduced and fixed by private retirement on changed authority.
6. **S2 documentation discrepancy:** file input referenced undefined `--control`. Measured rendered targets were not claimed broken. Computed minimum was RED `auto` vs `48px`; corrected to existing `--control-height`, GREEN 48px, then froze the new final build and restarted exact-build verification.

Original report, probes, screenshots and candidate hashes are immutable under `original-review-identity.json`. Executor disposition is `review-disposition.json`. The final implementation is **not independently post-fix certified**. Do not request a redundant second original code/UI review merely to say “fixed”; use the reproduced regressions and whole final matrix. A new future group still receives its own fresh review.

A pre-token full matrix on `231de8c7…` was intentionally stopped after S2 required a new runtime. Its partial evidence lives in `pre-token-matrix`; it is not counted as final proof. Earlier REDs and partial candidate runs are retained rather than filtered away.

## Critical contracts to preserve in future groups

- `schedule-engine.js` public `syncTeam({revision,people})`, `syncLocations` and `syncPositions` keep stable IDs/keys and historical references. Do not reach into private module state.
- Team account activity is not employment-start/end evidence. Complete period population includes the Owner actor separately if absent from `people`; never silently drop inactive/zero-time people.
- Planned shifts, live attendance, recorded time, breaks, payable earnings, imported amounts, exports, approval, documents, publication and payment are separate facts/actions.
- G07 preserves original/effective recorded source, reasoned reopening, independent decisions and immutable history. G08 custody/hash/complete-population checks remain mandatory; manager-reported handoff is not provider verification.
- G07/G08 `resumePayroll` adapters and G09 `recordNativeApproval` are narrow public integration seams; preserve exact period/run return and employee/year opening freeze. Their previous suites must remain green.
- Monetary values are nonnegative whole-cent strings; aggregate arithmetic uses bigint. Do not use floating point or invent amounts for missing facts. Imported rows reconcile gross−deductions=net; optional earnings sum to gross.
- Native/provider authority belongs to each run and source capability, not a decorative user switch. Native fresh calculation remains blocked without verified calculator evidence. Do not pretend fixture amounts certify taxes or statutory rules.
- Approval requires the exact reviewed token/revision/source/current authority. Changed facts require a fresh review; old acknowledgement/command cannot silently become current.
- Unknown operations reconcile their immutable original actor-scoped command. Never generate a new operation ID to “retry” an uncertain financial/access operation. Device provisioning has a different refresh-before-another-action contract; do not invent replay semantics there.
- Private fields/drafts/review data retire on offline/background/access/expiry/session changes. Same-authority healthy renewal preserves unchanged active drafts. Old private entries must not resurrect after retirement.
- Consequential actions need clear exact-person/period/scope consequences and deliberate acknowledgement. No fake Undo, fake success, payment confirmation, sent-message confirmation or unauthorized reversal.

## What remains after G10

Read `REMAINING-ROADMAP.md`, `SOURCE-MAP.md` and the full original JSON, not just group names. Implement one authorized group at a time, with complete states and current source/mobile comparison.

- **G11:** Statements and payment-job visibility — P-17, P-18, F-04.
- **G12:** Team overview and insights — H-04, P-23, P-24.
- **G13:** Company updates and notification history — U-01–U-04.
- **G14:** AI manager/source-backed guidance — AI-01–AI-05. No paid model calls or automatic business actions in the prototype.
- **G15:** Personal account, security and support — F-01/F-02/F-03/F-05/F-06/F-07. No real credential enrollment or destructive deletion in QA.
- **G16:** Home, navigation and complete discovery — H-01/H-02/N-01/N-02; reconcile all 96 jobs, four exclusions and Q-01–Q-12. The global search/person cross-task area remains part of this later discovery reconciliation; do not silently claim it is complete because a current task page passes.

Four role exclusions remain: Owner employee-My-time navigation, employee Requests hub, employee swap/cover/callout submission, and employee-only account/profile affordances. These do not remove separately source-backed Owner personal account/My pay jobs.

Cross-cutting Q-01–Q-12 remain a global acceptance program, not certified wholesale: healthy/empty/partial/failed reads; offline/paused/stale; session/role/scope/module; historical/superseded; validation/missing vs zero; pending/receipt/batches; unknown originals; Back/deep-link/interruption; phones/text; keyboard/assistive technology; sensitive actions; actual integration/devices/permissions.

## Open minor and scope limits

Inherited G08 copy may still say “1 people” or “1 original batches.” Values and behavior are correct. This is the recorded shared copy-review backlog; no new G10 minor is left intentionally unfixed. Do not hide it or claim a perfect app.

Real server authorization, database concurrency/durability, tax/calculator/YTD arithmetic, provider/bank compatibility, payment, document/publication delivery, physical-device/screen-reader/forced-color/every-OS-picker certification and actual application/mobile integration remain separate. Browser viewport/root-font tests are not actual zoom or assistive-technology certification.

## Skills and continuity materials

Jose explicitly invoked: 21st Design Sync/UI Build, Mobbin Design, No AI Slop, OMO init-deep/remove-ai-slops, GPT Taste, Tastemaker, UI UX Pro Max, React UI Patterns, Impeccable, Apple Design and Premium UI Layout; Pages Organize Space was also named earlier. Relevant Superpowers planning/execution/TDD/review/verification skills governed the sequential work.

`skills/` contains available Markdown instructions/reference files copied read-only for continuity; `skills-manifest.json` records original paths and hashes. These do not install/authenticate plugins or provide Cloud tool access. Mac skill paths and launchers are not Cloud APIs. Read applicable guidance, not every unrelated skill on every task. Explicit user scope/pinned foundation wins over generic skill recommendations.

The actual app’s `AGENTS.md` is included as read-only reference. It applies when working in that app, but does not authorize turning this prototype handoff into integration work. If integration is later explicitly requested, inspect the real repo/development line and its current executive/security/release instructions first.

## Local preview and evidence

Local URL was `http://127.0.0.1:18763/owner-desktop/?page=more&payroll=1`. Cloud must run its own local server; this Mac URL is not a hosted deployment.

Native preview was left on Payroll’s current/past period overview. A fictional G09 pay schedule was saved in that browser session and a current draft prepared; it correctly showed missing population/time/wages/openings rather than invented amounts. Reload/new browser contexts reset in-memory data. Do not assume those session choices are persistent storage.

Mobile coordination at cutoff: the separate mobile handoff reports batch 3.5 Features and words complete locally, 53 working / 43 remaining-or-partial / 4 exclusions in its 100-group inventory. Its next batch is 3.6 Company/location operating policies; that numbering is separate from desktop G11. Current desktop and mobile counts must never be added together or treated as the same completion measure. Detailed mobile payroll settings remain preview destinations. See the included read-only mobile handoff entry and `mobile-handoff.json`; no cross-chat approval is transferred.

Eight final raw native full-page JPEGs are under `outputs/owner-desktop/previews/payroll-runs-*-live.jpg`; width 589px was the actual in-app host, not a claimed desktop screenshot. Automated fixtures separately cover 1456/1280/1024/768/390/320 and enlarged 320px/32px-root text. Tall diagnostic captures may contain fixed-chrome screenshot artifacts; original independent review includes live viewport supplements resolving those. Never edit pixels to hide a UI issue.

Use `STATUS.json` and `BUNDLE-MANIFEST.json` for the actual handoff cutoff. If a referenced historical image is absent from the smaller core archive, consult the full evidence archive; no test failure was deleted or changed to create the core package.
