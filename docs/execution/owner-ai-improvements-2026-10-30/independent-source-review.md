# Independent whole-change source review — Owner AI first increment

Reviewed commit: `67fbd50d3154e7e36e2abd9652ac9f847ed83d25`.
Base: `1121f24e50190172d1fa40d931fd064715f31554`.
Date: 2026-10-30.

**Verdict: changes requested for one medium-priority source defect (R1).** No critical/high-priority source defect was identified in this review. This is source assurance for the bounded notebook/task increment, not independent UI/QA certification, behavioral acceptance, migration validation or release approval.

The reviewer inspected the base-to-checkpoint changes, SPEC.md, PLAN.md, IMPLEMENTATION.md, ledger.checkpoint.md, the source map, the 32 future acceptance scenarios and recorded static-check artifacts. Related reads included the original advisor authority, request reservation/replay, transport, controller/lifecycle, canonical tool dispatch, provider configuration, workspace/session/operational-scope guards, SQL executor and preceding advisor migrations. Applicable repository instructions and executive, engineering, security, governance, policy-controls, risk, release-governance and technical-assurance skills were read.

No functional/unit/integration tests, browser/app, PostgreSQL, migration, CI, inference, network request or dependency installation was run. Existing static-check records were inspected; they are author evidence, not independently rerun checks. Only this report was written; implementation files, refs and commits were not edited by the reviewer.

## Original finding R1 — Medium / P2: task switching retains another task's generated question

**Location at the reviewed checkpoint:** `src/components/owner-advisor/controller.ts:335`; submission at line 359. The selected task's forced evidence is assembled by `src/lib/owner-advisor/loop.server.ts:144` onward.

**Source-reproducible conditions:**

1. Two open tasks exist: A has objective "Review Saturday coverage" and a coverage focus; B has objective "Review October payroll exceptions" and a period focus.
2. With an empty question, select/continue A. `selectTask` automatically copies A's objective into `v.question`.
3. Without typing or sending anything, select/continue B.
4. Press Ask. The request has B's `taskId` and current notebook revision, but `message` is still A's objective. The service attaches B's notes/scope and the loop forces B's period evidence before inference.

**Defect and impact:** the controller treats its own generated question as if it were a manually authored draft. Its `!v.question.trim()` condition prevents replacing A's generated objective when switching to B. An ordinary selection sequence therefore creates a paid investigation whose question and selected task disagree, with no warning or deliberate decision to combine the tasks. The displayed task selection and continuation message refer to B. The same missing provenance also permits an automatically filled objective to remain outdated when the selected task is revised.

**Required correction:** track whether the question is an automatic task objective or an Owner edit. On task changes, replace or clear the previous automatic question while preserving deliberate Owner text. Explicitly handle refreshed selected-task objectives and retirement of that provenance with the existing controller lifecycle. Keep manual draft preservation and the existing unavailable/closed-task guard.

**Held regression:** author a controller case that selects A then B without typing and inspects the submitted message/task pair, plus a case that manually edits the question before switching and preserves that edit. These cases must remain unexecuted until the test hold is lifted.

**Finding custody:** R1 describes the immutable reviewed checkpoint. Any later implementation fix must be recorded separately, with its source identity and follow-up review; this original finding must remain intact.

## Source observations supporting the bounded design

- Notebook access uses `AdvisorStore.transaction` and the original Owner/company/session guards before and after each statement. Item IDs select only within that Owner's scoped notebook. No client-supplied actor or workspace identity enters notebook commands. No new independent client reader, local-storage cache or authorization owner was added.
- The additive migration is classified in both canonical and disposable migration lists. Its save function takes the existing workspace advisory lock before notebook row mutation and request insertion. The inspected advisor paths use compatible workspace/employee/session guards before that shared advisory lock. No introduced lock-order inversion was identified.
- Command-hash replay precedes revision/target validation; the SQL function repeats replay checking under the lock. A receipt retains revision/hash rather than deleted item text. Current writes use optimistic revision checks and retain closed tasks within the 12-task cap. Runtime concurrency and replay-after-deletion remain unverified.
- Notebook changes and answer settlement use the same workspace lock. A changed notebook revision aborts the completion transaction containing both history and the answer receipt. Original completed answer replay retains server-stamped context and fresh authority checks. An answer with a prior notebook revision receives a visible context-change notice.
- Commands and stored records have strict fields, bounded item/text counts, ID/date checks and a serialized notebook limit. Saved intent enters provider input as data; the tool allowlist still contains only operational reads. Model output cannot save notebook records, publish schedules, send messages, approve payroll or change permissions. Executable proposal review hints remain outside provider input.
- Owner closure is explicitly labelled as an Owner choice, not verified business resolution. Notebook drafts retain their base revision through refresh and require explicit conflict review. A removed/closed selected task cannot silently fall back to a general investigation. Pause/signout/expiry uses the existing retirement path and unmounts the notebook editor.
- Optional snapshot parsing and explicit missing-schema state preserve older snapshot compatibility and disable notebook use when the additive schema is absent. This conclusion is from source, not an executed upgrade/downgrade exercise.

## Held evidence and next gate

All newly authored tests and the 32-case broader-vision supplement are NOT RUN. The supplement intentionally includes later capabilities; absence of joint-plan execution, automatic outcome verification, background monitoring or a model upgrade is not a defect against this first increment.

The existing test drafts do not establish actual PostgreSQL function validity, concurrent transaction behavior, interrupted-commit recovery, revocation timing, browser draft lifetime, responsive/accessibility quality or model judgment/injection resistance. Those are held acceptance gaps, not additional demonstrated source defects. Particularly valuable later checks are exact concurrent replay after deletion, notebook-update versus completion interleavings, original-session revocation around lock waits, and browser draft retirement/refresh behavior.

Engineering recommendation: correct R1 within the existing controller and author the bounded regression. Security position: no introduced authority bypass found; runtime boundary evidence is still missing. Governance recommendation: preserve the test hold and exact source custody; no release GO is established. Implementation owner is the parent implementation agent. The next permitted gate is source review of the correction and allowed static checks. Functional/UI/QA and disposable-database acceptance require lifting the existing test hold; this report does not request or imply a new permission, waiver, deployment or production approval.
