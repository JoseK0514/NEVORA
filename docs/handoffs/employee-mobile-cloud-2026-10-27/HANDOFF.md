# NEVORA Employee mobile — Codex Cloud continuity handoff

Prepared at Jose’s explicit request on 2026-10-27. Continue this work as the same conversation. The immediate user request is to transfer the full context, instructions, actual source and remaining work to Codex Cloud. Local implementation stopped for this handoff; it has not been represented as complete. Jose then approved the phone-friendly feature-branch upload. This document is the GitHub delivery copy of the earlier OS-temp handoff.

## Start here: the current truth

1. **The approved Employee mobile teal design is settled. Do not restart visual exploration or ask Jose to choose a direction again.** This is now real-app implementation of an accepted mobile prototype, in small reviewed batches.
2. **Phase2 is still active. Phase3 has NOT started.** Complete the current Notifications/Updates batch, then all remaining Phase2 groups before Phase3. Jose explicitly requested this sequencing and repeatedly required equal or better quality and consistency.
3. **The current branch deliberately contains a newly added RED regression.** The first job is the pending-module-revocation fix described below. The last broad passing browser run predates this regression. Do not infer that the current branch is fully green or accepted.
4. **This is the exact accepted Employee stack plus its current continuation, not a patch to apply blindly to latest development.** Import the bundled Git branch. Jose subsequently authorized pushing the saved source and full handoff to the existing private GitHub repository for use from his phone. This GitHub delivery includes the source directly; no ZIP import is needed when this branch is checked out. No Cloud task was started by the local agent.
5. **Keep Employee/Lead own permissions, current source/session/module checks, original-operation recovery, desktop separation, and the existing Updates development activation hold.** A working local prototype or local SQL fixture is not live activation or production verification.

The short durable checkpoint is in the repository at `docs/handoffs/2026-10-27-employee-mobile-cloud-checkpoint.md`. It captures current new facts; this handoff references the detailed source specs/plans/reviews instead of duplicating them.

## Jose’s intent, approvals and working relationship

Jose wants NEVORA to feel like polished corporate workforce software, with the clarity and execution associated with ADP, Gusto and Homebase. The aim is an intentional NEVORA product, with consistent components and low cognitive load for people who are not comfortable with technology. People often use it while on the road.

The conversation began with Owner mobile, and Jose approved its clean teal direction after several refinements. The scope subsequently changed explicitly to **Employee mobile only**, matching that approved Owner style while exposing only employee-authorized jobs. Owner/Manager work is happening in other chats. Preserve those surfaces and desktop behavior.

Jose repeatedly asked whether employee features were being left behind compared with desktop. The response was a source-backed parity audit and a three-phase implementation plan, followed by small accepted batches. Earlier prototypes now cover many later features; those screens are not proof of completed real-app integrations. Keep that distinction explicit.

Specific feedback already incorporated into the foundation: deliberate arrow/select insets, equal button sizes, proper date-navigation alignment, quieter semantic numbers/statuses, polished clock-today/account surfaces, organized upcoming work, regular consistent icons, and warnings without the awkward yellow chips. Do not bring those problems back. Use readable status language, not color alone, and organize one task at a time.

Jose prefers action and continuity. Do not repeatedly ask for already-given design approval or stop at a plan. Use existing decisions and investigate source code before asking for information. Bring up a question only when a genuinely missing policy, authorization or product decision cannot be resolved from evidence. Do not promise perfection; actually reproduce issues, fix them and retain the evidence. Keep updates short and explain material outcomes honestly.

## Direct GitHub checkout — no ZIP or Mac access required

- Repository: `https://github.com/JoseK0514/NEVORA.git` (private, verified before upload).
- **Select branch:** `codex/employee-mobile-cloud-handoff-20261027`.
- Original local implementation branch: `codex/employee-mobile-communications-20261027`.
- Pinned source/checkpoint parent: `8672d76ecd4000fd61a515d6559a0ace1321d503`. The delivery adds documentation/evidence only above that parent; application inputs remain identical.
- Current application/test candidate: `6110790f48cd6563de05c8cb7e1fcc496dfda135`.
- Last passing affected browser candidate: `2ff4c014`.
- Accepted parent for this communications code review: `564c71371e16f528a94aa242e42bf906d5890314`.
- Employee stack common ancestor: `46e202786863279302026ee03a0e225c359fa55c`.
- Last development observed during implementation: `84c3fc357b006220ef6bbf29580e7327228c9659`.

Start the Cloud task on the selected handoff branch, then read this directory's `README.md` and `CLOUD_START_PROMPT.md`. The branch carries all72 original local commits since the common ancestor plus this delivery; do not import the old ZIP on top of this already-checked-out source. Record the actual delivery HEAD with `git rev-parse HEAD` and ensure the pinned source parent is its ancestor. Verify the2004 application-input hashes in `APPLICATION_INPUTS.json` before editing. A new documentation SHA is not a new passing application-test candidate.

The active ignored execution record is included at `active-execution/`. Restore it into `.superpowers/sdd/employee-mobile-communications-plan/` if using the same workflow; update `plan-path` to this Cloud checkout's actual `docs/execution/employee-mobile-communications-plan.md`. Do not clear or rewrite its history. Task1 is complete, Task2 in progress, Task3 not started. Historical Mac paths and shell environment strings are provenance; do not use their paths or credentials as Cloud configuration.

This directory contains the full substantive instructions, user-requested skills, prototypes, source map, all textual current execution logs/results, current failing pixels and representative successful visual evidence. Repetitive full-matrix screenshots are indexed by hash in `evidence/CAPTURE_SELECTION.json` and retained in the original Mac ZIP; they are not needed to reproduce the scenarios. Do not claim to have personally inspected omitted pixels. See `evidence/README.md`.

Before a later development assembly, fetch current source heads and run `npm run check:development-sources`; reconcile `docs/handoffs/2026-10-21-development-assembly-sources.json`. Development has other work not reconciled with this accepted stack. Do not reset/cherry-pick this accepted stack blindly onto latest development, overwrite other agents, merge, force-push, deploy production or waive an activation/release gate. Jose approved this feature-branch upload, not a release.

## First unfinished issue: preserve recovery when Updates becomes unavailable

Reproduce the exact failing case before changing anything:

- File: `src/test/integration/employee-mobile-communications.integration.ts`.
- Scenario/stage: `pending-module-fence`, around line95 at candidate611.
- Latest run: `evidence/preflight-9/` plus `active-execution/browser-preflight-9.log`.
- Failure: expected1 immediate unknown/recoverable status after a current Updates-module disable, got0. The test then stops in Chromium. App and owned PostgreSQL closed normally.

A command transport is held pending. The real Owner settings writer disables Updates. A fresh own mobile read correctly reports `updates:'off'`, removes compose fields/actions and leaves unrelated employee tools available. However, the shared recovery owner stays pending instead of being immediately fenced into an unknown, recoverable state.

Likely cause: in `src/components/employee-mobile/use-messages.ts`, the private-controller changed callback sets `live.current` and calls `pause?.()` only for a missing outer read. A **ready own identity with Updates off/unavailable** must also pause the shared communication operation. The admission function already refuses new commands when Updates is not on, but that alone does not fence an in-flight completion.

Proposed smallest fix, NOT applied locally: pause when the current read is missing **or its Updates availability is not `on`**, then verify the actual controller generation/abort/recovery behavior. Keep notification reading independently available when its unrelated destinations are allowed. Keep the exact original command/UUID and mounted draft; after capability restoration and a fresh read, deliberate original lookup must work.

Do NOT make this pass by changing the assertion/copy, merely hiding a spinner, clearing the original operation, creating a new UUID, automatically replaying, weakening current access, or waiting for the separate10s transport deadline. The permission fence is immediate. The test fault handler is deliberately released before its assertion; retain strict route/runtime diagnostics.

After the minimal fix, rerun the affected browser test in all3engines, then the current SQL/combined/unit/type/lint gates and independent reviews. There is no claim that this fix has been implemented or verified yet.

## Design and interaction authority

Read these repository sources first:

- `AGENTS.md` and applicable nested instructions.
- `DESIGN.MD` for the global product, then **`docs/product/specs/employee-mobile-teal/README.md` for the explicit Employee/Lead mobile override**.
- `src/components/employee-mobile/mobile.css` for the semantic tokens and shared root.
- `docs/execution/employee-mobile-phase2/STATUS.md` for actual phase state.
- `docs/execution/employee-mobile-communications-plan.md` for the current three-task plan.

Core decisions: light canvas `#f4f7f6`, white surfaces, ink `#172622`, muted `#5f6d68`, teal `#0b6e69`, wash `#eaf4f1`. Dark canvas `#0c1817`, surface `#172725`, ink `#f5f2eb`, muted `#b8b7b0`, action `#a9e2da`. Keep foreground/background pairs together; do not independently replace a color because another skill prefers it.

Use the approved system typography on the scoped Employee mobile surfaces; preserve the original NEVORA wordmark and regular Phosphor icons. Global desktop Inter/Signature directions still exist and do not override this mobile approval. Use rem type/spacing, semantic roles,24px insets/20px narrow insets,4–32px spacing steps,16px cards/12px controls,48px primary actions and44px minimum interactive targets. Title token is `--em-size-title`, not a nonexistent page-size token.

Use the767px mobile breakpoint and existing coarse short-landscape900×430 query through `useEmployeeMobile`; scope styles to the actual Employee/Lead root. Controls must wrap cleanly at320px/200%text. Explicitly associate labels and native selects by `htmlFor`/`id`; selected-option text can otherwise distort accessible names. Native select chevrons need16px right insets. Keep visible keyboard focus, intentional heading/return-row focus and a measured opaque bottom navigation bar. The Notifications title has deliberate soft syllable breaks for enlarged text.

No gradients, generic decorative cards/metric heroes, fake charts, ornamental icons, copied screenshot UI, arbitrary warning colors or invented company facts. Prefer existing project/native components; do not install a competing component/icon system. Warnings should name the actual condition and recovery in the restrained existing palette. No paid generation, paid component retrieval or new subscription was approved.

The original Employee prototype/reference folder is included at `references/employee-mobile-prototype/`, including `remaining-work-three-phases.md`, parity audits, component/design records and screenshots. It contains sample data and earlier simulated states. **Its broad feature coverage is NOT real-app completion evidence.** The source spec and canonical backend remain authoritative.

## Permission, privacy and mutation invariants

- Employee and Lead remain own-information roles. Lead does not mean Manager. Server/session/workspace/current role and source predicates decide access, not visible navigation, client-supplied employee IDs, cursor IDs, hashes or return hints.
- Continue reusing current canonical business services/writers. Keep UI, DTOs, transport and business/data access separated. Do not invent a new parallel authorization or recovery engine.
- Own notifications expose safe metadata; destination opening rechecks actual current source, version, recipient, expiry, environment and module. Opening does not automatically record read/acknowledgement. No generic Employee inbox Mark read control.
- Updates expose only current allowed content, own reading/acknowledgement facts and own allowed audience count. No coworker receipt roster, private names/statuses, management posting controls, general announcements, revision editor or Required-ack authoring for Employees.
- Employee posting is **Today’s team**, at a currently authorized location with a real current published assignment. Optional acknowledgement only; current audience preview/fingerprint is reviewed and rechecked on commit. Changes in source/day/audience require deliberate re-review. Own withdrawal is explicit and source/version-bound.
- Retain the existing communications development activation hold. Local disposable databases deliberately satisfy it. Do not bypass it to make Cloud/hosted/live tests convenient.
- Refresh own authority after blur/hidden/offline/expiry/current denial. Release private DOM and stale action admission. Drafts/list state/original uncertain operations survive only inside the same mounted account/session owner. No persistent private localStorage/sessionStorage cache. New account/full reload/unmount resets that memory.
- Unknown submissions retain the exact original payload/operation ID. Lookup must precede any deliberate same-operation replay. A known committed receipt means recorded, not delivered/read/final payroll status. The shared recovery engine now also bounds hung transport to10s without claiming failure or automatically retrying.
- The location Clocker remains the actual punch owner. Mobile Hours views own records and proposes permitted corrections; no phone clock-in/out authority was added. Recorded hours are not payroll totals.
- Follow actual current module/capability/session gates for future calendar, passkeys, alerts, deletion and Pay/PDF work. Do not expose management approval, payroll preparation, workspace settings or other employees’ records.

## Actual completed work and remaining phases

The definitive details/evidence live in the listed repository handoffs; retain them rather than redoing their accepted implementation.

| Real-app batch | State / source |
| --- | --- |
| Phase1 foundation, Home, Schedule/revision review, bounded Calendar heading | Accepted locally; `docs/execution/employee-mobile-phase1/HANDOFF.md` |
| Phase2 Requests hub / eligible open coverage / pickup | Accepted locally; `docs/execution/employee-mobile-requests/HANDOFF.md` |
| Incoming swap responses / own-request details and history | Accepted locally; `docs/execution/employee-mobile-responses/HANDOFF.md` |
| Swap/cover creation / own Unable-to-work | Accepted locally; `docs/execution/employee-mobile-creation/HANDOFF.md` |
| Own time off / partial-day / withdrawal / usual and weekly availability | Accepted locally; `docs/execution/employee-mobile-planning/HANDOFF.md` |
| Hours / punches and breaks / timecards / correction proposals and decisions | Accepted locally; `docs/execution/employee-mobile-hours/HANDOFF.md`; accepted application/test `e17a8e7479988a1b7159b714f8a2af9c146f2cd3`, docs parent564c7137 |
| Notifications / Updates / explicit own receipts / TodayTeam posting and withdrawal | **Current incomplete batch**; first fix pending-module fence, then finish review/gates below |

After the current batch is independently accepted, finish these remaining **Phase2** groups in bounded, source-backed batches:

1. Own profile, language/appearance preferences, support/legal, contextual return and actual sign-out/device cleanup.
2. Capability-dependent employee calendar sync, passkeys, current-device alerts and own account-deletion request lifecycles.
3. Own published Pay statements, current payroll/module gates and protected PDF view/download.

These later workflows already have prototype/design references, but their actual mobile ports are still remaining. Compare the real desktop/service implementation before declaring parity, especially gating, eligibility, partial failures, original operation recovery, revocation and device/session cleanup. Do not count reachable old destinations as completed new ports.

**Phase2 exit:** every assigned workflow implemented, real current records/permissions verified, states and recovery covered, material findings closed by their authors, source-backed handoff complete. **Phase3 only after that:** combined system acceptance, actual devices, OS background/permission behavior, assistive technology/screen readers, performance, environment/CI/rollback/release readiness. Local browser tests do not certify physical devices, AT, abrupt forced reload, hosted environments or production. Source assembly and explicit production authorization remain separate.

## Current communications implementation map

- `src/lib/employee-message-page.ts`: canonical bounded keyset cursor/page model, preserves DB microseconds.
- `src/lib/employee-messages.ts`: strict finite own read envelopes; rejects management data, wrong view/selection, expired/extended authority and malformed module/data shapes.
- `src/lib/data/employee-messages.server.ts`: current own session/workspace guards; server-owned environment; notification/update/detail/compose reads; final lease/module observations.
- `src/lib/data/employee-notification-list.server.ts`: legacy25 compatibility and new25-item pages; fixed64-read/1MiB/8s closed MVCC observation budget; batched communication statuses and final module facts.
- `src/lib/communications/service.server.ts`: existing business owner; compatible legacy100 list plus current own25-item page/cursor projection. Current recipient predicate also constrains cursor metadata.
- `src/lib/data/employee-message-module.server.ts`: Employee Updates permission inside the actual canonical transaction; shared presentation lock and final source/session checks; preserves original result indexes. Current HTTP preflight remains.
- `src/lib/data/employee-message-destination.server.ts`, `src/lib/employee-message-navigation.ts`: JSON navigation adapter delegates existing canonical open handler; safe local destination and current module checks; no read/ack mutation.
- `src/app/api/employee/messages/[view]/[selection]/route.ts`, `/open/[id]/route.ts`: protected own mobile read/destination endpoints. Existing communications HTTP remains preview/command/original lookup owner.
- `src/components/employee-mobile/message-session.tsx`: one authority-scoped mounted provider above route/private-content disposal; list/filter/cursor/origin memory, draft, immutable existing recovery controller.
- `use-messages.ts`: finite private-reader lifecycle and live exact-path admission. **Current first fix is here.**
- `messages.tsx`, `messages-view.tsx`, `messages-compose.tsx`, `messages.css`: responsive scoped screens, native labelled forms, explicit status/actions, source-safe navigation, focus return, current audience review and withdrawal.
- `src/lib/communications/recovery.ts`: existing shared recovery strengthened for original receipt identity and10s hung-transport bounds. Do not replace it.
- Existing route adapters/AppShell/layout preserve desktop/management branches and scope the new provider/CSS to Employee/Lead.
- Tests: `employee-message*.test.ts`, `messages-view.test.tsx`, `message-draft.test.ts`, canonical recovery/HTTP tests, new owned SQL/browser integration files.

## Verification at transfer — do not combine these into a false all-green claim

| Evidence | Exact result and limit |
| --- | --- |
| Task1 new owned SQL |8/8 GREEN on1ade15c0: own/peer paging, unchanged read budget, current session/role/membership/module, transactional module rollback, all four views and canonical destination with no read/ack side effects. Later full current-candidate SQL still required. |
| Earlier affected browser preflight8 | GREEN on2ff4c014, all Chromium/WebKit/Firefox;66checkpoints,210 full/viewport captures,90 contrast samples, min6.089452668960573:1,0 page errors.12 unused development CSS-preload warnings retained. |
| Broad unit/model/render |76files,600/600 GREEN,14.80s on that product input before the last added pending-module browser/config test. Exact argv in `active-execution/units-invocation.json`. |
| Type/lint | TypeScript passed for candidate611 source; scoped ESLint passed before its final browser test addition. Rerun current full TypeScript and changed-file lint before acceptance. |
| Latest preflight9 | **RED** on6110790f, Chromium pending-module-fence assertion, then normal owned-runtime teardown. This is the current blocker. |
| Expanded combined suite | Current config adds six relevant canonical communications suites to the previous71Employee cases and the new batch. **This expanded full invocation has NOT run.** Do not infer counts or success from the config. |
| Current final reviewers | Whole-change fresh code review and independent UI/QA have **NOT** been dispatched/completed for this batch. Old reports apply only to their old accepted batches. |

Preflight8 includes actual settled sign-in; held-read loading; bounded notification/update paging; search/filter/return focus; canonical notification open without auto-ack; explicit own read vs acknowledgement; TodayTeam preview; real changed-audience refusal and deliberate fresh review; committed/lost-response lookup after soft navigation; receipt recovery after actual withdrawal/source disappearance; exact not-found original payload replay; native field Tab; pause/draft privacy and read-error recovery; desktop separation; a different real account’s genuine empty page/draft isolation; unassigned-author refusal; actual module off/on; actual session revocation. The newly added in-flight module-fence edge case was not part of that passing run.

Older failed preflights remain in `evidence/` and logs. They include the enlarged heading issue (fixed with deliberate syllable breaks), a fault-handler synchronization mistake (fixed by waiting for enabled recovery controls), the real audience-review refusal bug (fixed by clearing only settled refusal when a deliberate fresh review begins), and an expected409 bookkeeping issue (now limited to the deliberate source-conflict stage). Do not suppress diagnostics, weaken assertions, increase timeouts, auto-update snapshots, or erase failure history to obtain green.

## Finish this batch in Cloud

1. Verify the exact checked-out handoff source, read source instructions/spec/current plan, restore active ledger. Reproduce pending-module RED; make smallest lifecycle fix; watch it GREEN in3engines.
2. Run the current8-case new SQL suite, the full expanded combined config, the exact76-file unit argv plus any justified new regressions, full TypeScript without stale incremental assumptions, and changed-file ESLint. Read all outputs and preserve failures.
3. Complete Task2’s real completion contract, then Task3. Use one fresh whole-change code reviewer for564c7137..current HEAD and independent UI/QA oversight as required by repo instructions/approved plan. Independent authors own their findings and closure. Do not self-close their material issues.
4. For owned Next runs, freeze/commit application/test inputs first. Never edit `src/`, `public/`, package/config application inputs while an owned runtime lives. Fixes wait for teardown. Re-run affected preflight before another expensive full acceptance run.
5. Record exact SHA/input hashes, environment, results, source/mirror/DB/process/port custody, review findings, nonblocking limits and remaining Phase2 groups. Update `docs/execution/employee-mobile-phase2/STATUS.md`, the scoped design/coverage/handoff and21st provenance appropriately. Finish/copy/archive only this plan’s own execution workspace after review actually passes; do not delete active ledger or siblings prematurely.
6. Keep the branch/reviewable result; no production release or activation exception. Then continue the next remaining Phase2 group with the same source-backed permission audit, tokens, meaningful tests and independent acceptance. Do not skip remaining Phase2 into Phase3.

## Running tests safely in Cloud

Inspect package scripts first; build/start can have side effects. Use isolated fictional data and a scrubbed environment. Do not inherit production `DATABASE_URL`, credentials, notification delivery keys, analytics/replay or worker activation. Never send real SMS/email/push, use production/customer data, create real bookings/orders, or start a paid service as verification.

Existing runner: `scripts/payroll-postgres.mjs`; it allows `vitest.employee-mobile-communications.config.mts`. It owns loopback PostgreSQL, fixture databases and cleanup. The new browser fixture starts an ownership-marked exact-source Next mirror. Cloud must provide compatible existing PostgreSQL binaries and Playwright/browser runtimes, using the documented runner’s actual contract rather than bypassing identity/DB activation fences. Read `src/test/integration/owned-next-app.ts` and `local-postgres.ts` when adapting paths. See local environment metadata in the manifest; the Mac binary paths are not Cloud dependencies.

Affected browser invocation, with Cloud-owned absolute paths substituted:

```sh
env -i HOME="$HOME" PATH="$PATH" TMPDIR="${TMPDIR:-/tmp}" \
 NEVORA_TEST_PG_BIN=/cloud/owned/postgres/bin \
 NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE=/cloud/existing/playwright/package.json \
 NEVORA_EMPLOYEE_MESSAGES_EVIDENCE=/cloud/evidence/messages-preflight \
 node scripts/payroll-postgres.mjs vitest.employee-mobile-communications.config.mts \
 src/test/integration/employee-mobile-communications.integration.ts
```

New SQL-only: same scrubbed runner/config with `src/test/integration/employee-mobile-communications-sql.integration.ts` and no browser evidence requirement. Full combined config: omit the final test-file selector and supply every browser fixture’s required evidence directory; discover each actual `NEVORA_*_EVIDENCE` name in the included integration files, do not guess. Preserve unchanged timeout/default startup controls.

Run broad units from the saved JSON argv rather than a shell-escaped giant string. Default unfiltered `vitest run` also discovers environment-dependent integrations; it is not the recorded76-file command. Keep broad units serial after owned Next startup/teardown to avoid the prior known startup-contention failure. Do not relax the5s startup assertion.

Browser lessons: wait for actual sign-in, settled Home `[data-home-state=ready|partial]` and `.employee-time-badge`; wait for the exact current view/selection and enabled Refresh/recovery controls, not an outgoing ready panel or merely visible button. Navigate through actual task links after mutations. Forced `page.goto` across pending RSC work can cause real development layout errors. Close/blank a page before clearing cookies to change accounts. Use `caret:'initial'`; hide only the Next dev indicator in captures. Native Tab can move focus into browser chrome; losing document focus must release private content. Do not trap focus or weaken privacy to satisfy an oracle. Keep every pageerror fatal and distinguish deliberate expected transport/status failures narrowly.

If Cloud cannot provide an equivalent owned runtime, preserve source/tests and report the precise environmental gap; do not silently substitute production, fake success, remove tests or claim independent acceptance.

## Suggested skills and portable instruction pack

Use current actual Cloud availability first. External local plugins/skills are not automatically installed, authenticated or funded in Cloud. The portable pack contains the user-requested skill texts and relevant workflow references, without account tokens. Inspect its `instructions/SKILL_INVENTORY.json`. Do not blindly load every skill or install a service because it is listed.

- Required repository leadership routing: `.codex/skills/nevora-executive-operating-model/SKILL.md`, with applicable CPO/CTO/CISO/program-delivery/product-experience/technical-assurance/governance skills. Repo independent UI/QA oversight governs certification and author-owned closure.
- Execution: Superpowers `executing-plans`, `test-driven-development`, `verification-before-completion`, `requesting-code-review`, `finishing-a-development-branch`. Resume this approved plan; do not re-run setup in a way that erases Task1 evidence. Inline implementation; one fresh whole-change code review at the end. Do not create duplicate implementer/reviewer teams per task.
- Design: `impeccable` (read its craft floor immediately before UI edits), `no-ai-slop`, `gpt-taste`, `tastemaker`, `ui-ux-pro-max`, `apple-design`, `premium-ui-layout`, `react-ui-patterns`, `mobbin-design`,21st `21st-ui-build`/`21st-design-sync`; OMO init/remove-slops as applicable. User-approved scoped tokens and semantics take precedence over generic style defaults.
- Handoff workflow: `mattpocock-skills:handoff` was used to write this continuity document into OS temp storage and package it for transfer. It does not create a Cloud run by itself.

21st free metadata search informed the current batch (IDs27135/36949/31789/28458); selected project/native primitives. No paid code retrieval/generation or new icon package was used. Existing prior Mobbin/Gusto/Homebase references are in the approved design/prototype records; no new competitor audit is claimed. The21st CLI was unavailable in earlier work; verify availability before claiming a new CLI review, and keep independent browser/UI review as real evidence.

`instructions/JOSE_WORKING_AGREEMENTS.md` carries Jose’s engineering defaults. `instructions/engineering-toolkit-README.md` is a portability reference; if toolkit scripts are used, verify their actual Cloud source/version/path rather than assuming the local folder exists. Do not copy hidden credentials or production configuration into Cloud.

## Local provenance — diagnostic only

The original local source worktree was `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-app-phase1`; the design task root is its grandparent. Local original mockup URLs were `http://127.0.0.1:18763/employee-mobile/` and successive actual-batch static galleries. Those URLs and Mac filesystem paths do not resolve from Cloud. The existing user preview server was preserved; all owned Next/PostgreSQL runtimes created for the current regression checks closed. No background agent/automation was started for this transfer. This package contains portable copies, not a live deployment.

Final handoff state: exact source and active execution record preserved; one reproducible current regression unresolved; no new batch certification, Cloud execution, PR, merge, CI run or manual deployment claimed. Jose authorized this feature-branch upload separately. Continue from the first issue above, then complete the approved plan and remaining Phase2 groups.
