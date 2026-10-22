# Inspector Evidence, CI and Branch Cleanup Implementation Plan

**Goal:** Preserve the50-inspector review in the next verified development candidate and reduce remote GitHub branches to at most5 without losing source or interrupting active work.

**Architecture:** A dedicated worktree starts from current development0f8ffee5 and incorporates report commit39ee9d1d unchanged. A dependency-free CI custody check verifies the raw report tree without executing scratchpad probes. Final integration follows the current PR23 owner's reviewed handoff. Remote cleanup preserves exact historical tips as tags and adapts the source inventory to intentional archival.

**Spec:** Jose's approved October22 request and the referenced preparation handoff `inspectors-ci-cleanup-20261022/NEXT_TASK.md` in this chat's visualization directory; raw review README/BRIEF at `docs/product/reviews/50-inspectors-2026-10-21`.

## Global constraints

- Development only. No main merge, deploy, hosted migration, live data, paid service or billing changes.
- Preserve all409 raw review files,50 reports and310 shots from39ee9d1d. The probe scripts are archived evidence with missing local/session dependencies, never a CI executable suite.
- Preserve every mandatory original test/release assertion and independent finding. Report recommendations are not automatically confirmed current defects or authorization for new modules.
- Do not mutate, cancel or merge PR23's active candidate. Fetch its actual final source and reviewed handoff before integration.
- Cleanup is authorized only after combined development merge; maximum5 remote branches, recoverable tags for retired tips, no local worktree deletion or force-push.

## Review focus

- An archive custody pass must not imply that audit findings passed or closed.
- Tampered/missing/extra archive files and incorrect source identities must fail the custody check.
- Archival must retain unique or held work and must not retire a currently advancing owner branch.
- Source inventory must detect missing/advanced archive tags as well as active branch drift.
- A post-review/source change requires an honest new candidate and affected verification.

## Tasks

- [x] Task1: Incorporate raw reports and reconcile current release findings against existing fixes/tests. Add archive custody checks with missing/tampered/extra-file regressions and bind them to CI. Preserve raw scripts as data in the exact evidence folder.
- [ ] Task2: Prepare recoverable branch retirement and source-inventory support. Test active/retired refs, omitted/advanced tags and the5-branch ceiling. Record all exact heads and retain main/development plus at most3 active/required branches.
- [ ] Task3: Obtain current integration handoff, rebase/merge the latest verified development source, refresh all relevant heads, run required checks and fresh whole-branch review. Publish one complete Actions candidate; do not stitch partial runs into acceptance.
- [ ] Task4: Merge the verified result to development, archive/delete only approved inactive branch refs, verify count<=5 and source recoverability, sync clean local development and deliver exact final handoff.

## Execution ledger

- Start: primary development clean at0f8ffee5. PR23 headaca55916 remains active; Home failed and is under bounded owner diagnosis while other jobs finish. No runtime or peer task was interrupted.
- Report input verified:39ee9d1d has sole parent0f8ffee5 and409 additions only in its report folder. Raw treefa1e9d3cb6c95f2f2f4cd7b51aa701224bb19385.
- Ruling: Jose's explicit approval covers the bounded implementation, development publication and recoverable remote branch cleanup. No repeated general approval is required; active work and production gates remain protected.
- Ruling: use inline execution with one fresh read-only final reviewer. The prepared plan is the workflow authority; ledger records task results and any source handoff updates.
- Task1 preparation: unchanged raw subtree incorporated; 409-file SHA-256 manifest and CI custody step added. Six negative/positive archive checks passed after the initial missing-module RED. Archived probes were not executed; their existing ESLint run passed without ignore changes.
- Task2 preparation: exact archive-tag support and explicit five-branch ceiling added to the source checker. Eleven source-inventory tests (including five retirement/ceiling additions) passed after the missing-export RED. No remote tag or branch mutation has occurred.
- Current release reconciliation is recorded in docs/handoffs/2026-10-22-inspector-review-integration.md; current Profile coverage is distinguished from the historical allegation rather than self-closing it.
- Local validation: lint, TypeScript and all69 existing release-engineering checks passed. Full unit suite is running; no full-suite outcome is claimed yet.
- Cleanup dry plan:53 observed remote heads,48 proposed recoverable retirements and5 retained refs. It is PREPARED_NOT_EXECUTED and must be refreshed after the active owner's final source handoff.
- Ruling: authorized branch deletions require exact-old-SHA leases and deletion-only refspecs. This compare-and-delete control prevents losing a concurrent push; it does not authorize forced updates or rewrites of any retained branch.
