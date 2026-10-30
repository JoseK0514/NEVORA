# Independent whole-change code review

Date: 2026-10-30. Independent reviewer; no implementation fixes performed.
Candidate: `ecc247062363a8e5b93719ee0c3f26dae4710ae8` (detached).
Entire reviewed change: `1121f24e50190172d1fa40d931fd064715f31554..ecc247062363a8e5b93719ee0c3f26dae4710ae8`.
Independent evidence root: `/workspace/nevora-evidence/owner-ai-validation-20261030/independent-ecc24706`.

This is the bounded private Owner goals/tasks/context increment. The initial 32-case supplement describes additional future capabilities and is not the completed-scope acceptance list. Historical NOT_RUN submissions and the original R1 finding/recheck are preserved. Jose's subsequent authorization permits these isolated fictional tests; it does not authorize paid inference, provider/production changes, notifications, CI, shared integration or deployment.

## Decision

**Changes requested: one Important finding (UI-R1). No Critical finding. No additional Minor code finding.** Backend source and reproduced boundary behavior support the bounded design. The local increment is **NO-GO for final acceptance until UI-R1 is corrected and independently reproduced**. This is not a production recommendation.

Read AGENTS.md, the executive operating model, relevant engineering/security/technical-assurance/governance and independent oversight skills, current Owner design direction, SPEC.md, PLAN.md, IMPLEMENTATION.md, both original source reviews, the validation PLAN and active progress ledger. Inspected changed production/test/migration paths and the existing route, authority, store, tools, provider loop, controller/lifecycle, management/session and operational-scope guards. No source, index, ref or HEAD was mutated; only these three reports were written in the worktree. Probes, runtime logs and screenshots are external.

## Important — UI-R1: draft editor opens outside the viewport without focus transfer

Location: `src/components/owner-advisor/notebook-panel.tsx:42`; related openers at 47, 65, 72 and the shared form at 74.

The openers only set draft state. The sole editor is rendered after every saved task, and the clicked button becomes disabled. With one saved goal and eight short general tasks, click **Edit goal** at 390×844 or 1440×844. The form appears below the entire task list; focus falls to BODY. Tab moves to the **Your tasks · 8 open** summary rather than the form. No editor or unsaved-state feedback is visible in the viewport. This makes an ordinary edit appear ineffective, particularly on mobile, and requires navigating unrelated tasks to locate the form. Existing browser fill() calls scroll directly to fields and conceal this issue.

Independently reproduced in Chromium 151.0.7922.34 and WebKit 26.5 against real Next/login/scoped API/owned PostgreSQL. Form top after click is 3787.30px (Chromium mobile), 3786.30px (WebKit mobile), and 3352px (both desktop), relative to an 844px viewport. See `probes-01/ui-observations-summary.json` and the four `*-after-edit-click.png` plus `*-after-tab.png` viewport captures. The external probe intentionally asserts the observed defect; its green result proves reproduction, not acceptance.

Required correction: make the new goal/task editor discoverable and keyboard reachable immediately after deliberate Add/Edit, with appropriate focus and scroll behavior (or placement adjacent to the invoked item). Preserve the draft revision/conflict checks and finite private lifecycle. Recheck ordinary click/keyboard entry with populated task lists at mobile/desktop widths, plus save/discard return behavior. No implementation was performed by this reviewer.

## Verified source and boundary observations

- **Authority:** notebook commands admit no actor/workspace fields. Scope derives from the established Owner proof and original company admission. Each helper executes original workspace/employee/session/operational guards before and after its statement. Route protections and strict command parsers remain in force. No prompt text creates authority or selects another Owner's notebook.
- **Atomicity/lock order:** migration 0043 is additive and wrapped in BEGIN/COMMIT; canonical and disposable lists agree. Notebook save obtains the existing workspace advisory lock, then notebook row, then inserts the receipt atomically. Answer settlement uses the same workspace lock and checks notebook revision before writing history/answer. Existing authority locks precede that advisory lock; no new lock-order inversion identified.
- **Replay:** application replay precedes target/revision validation and SQL checks replay again under lock. Independent actual-PostgreSQL probe: committed save with simulated lost response replays revision 1; twelve concurrent identical deletes all return revision 2 while only one mutation occurs; original delete still returns revision 2 after a later save creates revision 3; altered expectedRevision with the same ID conflicts. Three operations yield exactly three revision-only receipts. See `probes-01/sql-results.json` and exact external probe source.
- **Bounds/context:** eight goals, twelve tasks including closed tasks, strict IDs/dates/fields/text bounds and 65,536-byte notebook bound. Only selected open task notes are provided; all goals/open task objectives are explicit saved intent. Fresh typed scope evidence is acquired through existing canonical read tools, within tool/time/output limits. Executable proposal review payloads are stripped from provider input. Provider instructions explicitly distinguish intent/history from facts and actions; they do not constitute a measured reasoning-quality result.
- **Compatibility:** optional snapshot notebook parsing retains old snapshot compatibility. Absent table/function yields unavailable, while malformed present records fail closed. Existing ask without notebook remains possible; author SQL case executed this absent-schema branch. This is not a rolling deployment/rollback rehearsal.
- **Staleness/lifecycle:** draft base remains stable across refresh. Explicit review is required to rebase. Current task selection is validated; a closed/deleted task cannot silently become a general ask. Automatic question provenance is cleared/updated separately from manual text. Existing generation/cancellation/content-version fencing and finite retirement encompass the new panel. Independent actual-app rerun verifies persistence, A→B selection/manual text, stale draft preservation and simulated explicit-signout retirement.
- **Information:** “Closed by you” and the explanation that closure does not verify resolution are accurate. Existing proposed coverage and payroll readiness caveats remain. Changed answer context has a visible notice. No autonomous business writer, notification, payroll approval or background monitoring path was added.

## Prior finding custody

Original R1 remains in `owner-ai-improvements-2026-10-30/independent-source-review.md`; its source recheck remains separate. The current independent browser rerun reproduces A→B automatic objective replacement, deliberate draft preservation and general clearing; this supports the prior correction at this candidate without rewriting the original record.

## Declined to judge

- Paid-model competence, blind prompt-injection behavior and statistical reliability: no live provider calls/budget authorized. Source tool restrictions are assessable; quality of actual model reasoning is not.
- Future whole-plan validation, canonical action execution, monitoring and verified business outcomes: explicitly outside this increment.
- Hosted/CI/release readiness, provider health and production database migration/rollback: no exact hosted candidate or authorized release execution supplied; local evidence is not parity.
- Full project unit completion: only a growing `ecc24706/all-unit-01/run.log` existed at this review's evidence cutoff; no terminal JSON or exit record, so no full-suite pass inferred.
- Absolute erasure from backups or prior answer history when deleting saved intent: current delete removes the active notebook item and receipts retain no text, but the bounded UI makes no universal purge promise. Retention/product-policy and backup erasure require separate decisions/evidence.
- Unbounded lifetime receipt count: inherited idempotency ledger retains operation identity. Notebook payloads are bounded; changing retention would need a recovery-policy design. No claim of bounded total storage is made.
- Every possible crash/lock interleaving: exercised twelve duplicate deletes and committed-response loss, and inspected author changed-context/authority SQL evidence. This does not prove all process-crash, deadlock or production-load behavior.
- Direct arbitrary database invocation of the function: application database credentials are the existing trust boundary; this feature does not expose SQL or claim a new database-role authorization system.
- Fixed navigation appearing mid-image in full-page stitched captures: independently inspected viewport captures; not classified as a runtime positioning defect from stitching alone.
