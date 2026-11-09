# Owner AI — first significant implementation increment

Source base:1121f24e50190172d1fa40d931fd064715f31554. Jose authorized implementation in this conversation. Shared collab continues separately; use this detached checkout and preserve all original drafts/evidence. Spec: SPEC.md. The active ledger is .superpowers/sdd/owner-ai-improvements-2026-10-30/progress.md.

## Scope and constraints

Implement an end-to-end private Owner workbench: explicitly saved goals, durable tasks/objectives/notes and contextual investigation. Goals persist beyond the12-message context. A task can be selected for current, source-grounded investigation and can open the existing canonical workflow review. Owner-controlled task state is labelled as such; model text never establishes a completed business action or verified resolution.

Keep existing Owner/company/session guards, finite display lifecycle, saved-priority conflicts, request identity/budget, current tool caps and typed canonical services. No autonomous business writer, background job, production configuration, migration execution, paid inference or new standing permission. Existing advisor functions stay usable if the additive notebook schema is not yet available. Reuse scoped UI components/tokens; no visual exploration.

User's no-testing-yet instruction overrides skill RED/GREEN execution. Write meaningful tests first, but leave them NOT RUN. Run only static TypeScript/lint/document/source checks and one fresh-context source review. Functional acceptance remains pending and no task is labelled verified complete.

## Task1 — contracts and guarded persistence

- Author pure parser/transformation tests before implementation: strict fields/IDs/limits, stale revision, explicit deletion, task-state labels and scoped context.
- Add bounded Goal/Task/Notebook contracts and command parser. Keep existing commands compatible and reject untrusted identity/authority fields.
- Add one classified additive schema migration with owner/workspace scope, optimistic revision, serialized writes and command-hash replay. Receipts retain revision/hash rather than deleted goal text. Update canonical migration order and the matching disposable literal; do not run migrations.
- Add guarded store methods. Missing schema has an explicit unavailable state, never a fabricated empty notebook. All reads/writes use existing original-authority guards.

## Task2 — contextual reasoning and continuity

- Read saved goals/tasks into snapshots and provider context as untrusted Owner-supplied data; facts/permission/rules stay fresh and authoritative.
- Support a task-bound investigation through the same bounded provider loop, budget/idempotency and current operational tools. A task ID cannot select another Owner's data.
- Strengthen the reasoning instructions for objectives, evidence, alternatives, cross-location/role effects, tradeoffs and honest next decisions. Do not imply combined-plan verification or business execution that does not exist.
- Preserve current conversation/priorities workflows and author service/provider/SQL boundary regressions without executing them.

## Task3 — usable Owner workbench

- Extend strict public parsing and the existing finite private controller; no parallel auth/cache owner.
- Add native labelled goal/task controls, explicit saved/unsaved/unknown/conflict states, task selection and continuation. Use a stable draft base; no refresh silently advances a dirty draft's revision.
- Reuse Owner styling and44/48px targets, rem type/reflow and contextual workflow controls. Pause/signout/expiry disposes all new private facts and drafts with the existing owner.
- Author component/controller regressions for stale responses, conflicts, pause and no model call from memory/task operations. Do not execute them.

## Task4 — static checks, source review and recoverable delivery

- Run whole nonincremental TypeScript and changed-file lint; inspect actual outputs. No test runner, browser, PostgreSQL, CI dispatch or model call.
- One fresh-context whole-change reviewer reads the spec, diff and ledger without executing tests. Correct material source findings and record unverified acceptance honestly.
- Commit recoverable work, preserve ledger/test drafts and create a source-pinned handoff/bundle. Do not push over Claude's active shared branch, merge, deploy, activate or migrate a real environment.

## Review focus

Check exact scope/authority, migration atomicity and lock order, idempotent replay after revision changes/deletion, bounded data and model context, no prompt-derived authority, optional snapshot compatibility, stale draft/operation races, lifecycle privacy, and UI distinction between proposed/Owner-closed versus verified business outcomes. All authored tests remain unexecuted; review is source assurance only.
