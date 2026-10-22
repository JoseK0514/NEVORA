# Inspector archive integration and branch retirement

Jose approved preserving the NEVORA-50-inspectors input in the next development CI candidate and then reducing GitHub to at most five branches. This task does not authorize a production release or treat every historical recommendation as a new implementation task.

## Original evidence

- Repository: JoseK0514/NEVORA; target: development.
- Source branch: NEVORA-50-inspectors.
- Original commit: 39ee9d1dbfd9e69dee8ffdfe9662465919e1aa33, with sole parent 0f8ffee52d85f48cd2fe890dc9aa682e995de4eb.
- Original subtree: fa1e9d3cb6c95f2f2f4cd7b51aa701224bb19385 at docs/product/reviews/50-inspectors-2026-10-21.
- All 409 files are preserved unchanged: 50 numbered reports, 310 screenshots and 49 brief/queue/probe/output files. The original README explains the probes' missing scratchpad/session dependencies.
- The sibling custody manifest records each file's SHA-256. CI checks the original and candidate Git subtree identities, exact inventory, bytes and numbered reports. It never executes archived probes.

## Current release reconciliation

Historical labels are retained in the raw reports. The rough High/Medium/Low totals contain duplicates and are not a verified current blocker count. These dispositions distinguish published claims, existing coverage and actual acceptance:

| Review topic | Current evidence and next gate |
| --- | --- |
| Wave A UI repairs | The README names e5766609/bc2a28b2 as incorporated. Current combined UI/browser acceptance must come from the exact candidate's mandatory CI; historical screenshots do not certify current behavior. |
| Profile read failure (CODEX item 1; reviewers 10/47) | Current development already contains 30d165a1 and management-profile unit/real-PostgreSQL tests. The read uses live Company Access authority before/after the snapshot. This contradicts treating the historical "always fails" statement as an established current cause, but inspection alone cannot close the allegation. The specific profile integration suite and a current browser observation remain the reproduction/acceptance sources. No new profile repair is claimed here. |
| Sign-in/activation hardening | PR18 is incorporated and the archive README acknowledges the repair. Current authentication/activation/security assertions remain mandatory; do not rerun historical scratchpad attacks or mark all security recommendations closed. |
| CI and release operations | PR23 currently owns consolidated validation, owned PostgreSQL and browser gates. At preparation, its Home suite failed and the owner was diagnosing it. Integration waits for its actual final source, complete CI and review handoff. A focused diagnostic pass cannot substitute for the complete run. |
| Database upgrades/restores, including 0034/0035 classification | The earlier 56-check report is bound to its earlier candidate. Preserve the existing exact-source migration/rehearsal gates and their unresolved D4 disposition until current integration evidence resolves them. No hosted migration runs here. |
| Logging, concurrency/idempotency, scale/caps, location scope, action-item contracts and graceful failures | Retain the detailed CODEX items and existing current release issues. This docs/CI change provides custody and traceability; it does not establish these recommendations as reproduced defects or assert their closure. Any release-blocking occurrence must be reproduced against the final source and handled by its release owner. |
| Payroll legal rules, pricing/billing, full translation, browser floor, larger UI/PWA redesign | Product/policy decisions and broader recommendations remain separate. Archiving the reports does not approve new modules, legal assumptions, paid services or an expanded release. |

The raw README, FIXED-AND-REMAINING.md and clean-manager/CODEX.md remain dated source reports. This handoff records reconciliation without rewriting their history. Deployment stays disabled; main is not an integration target.

## Recoverable branch cleanup

After verified integration, preserve every retiring remote tip as a lightweight tag named `archive/branches/2026-10-22/<original-branch>` at its exact commit. Check the remote tag and unchanged branch head before deleting that head. Deletion must use an expected-old-SHA lease so a concurrent push cannot be deleted after the read; only deletion refspecs are allowed, with no rewrite of a retained branch. Keep active owner branches and the legacy `codex/premium-backend` evidence-publication dependency while required; retain main and development. Never delete local worktrees or uncommitted files.

The development source inventory accepts an intentional missing branch only when its exact archive tag is present. It still rejects an advancing branch, missing/changed tag, omitted included source, unclassified new branch or an explicit branch ceiling violation. Tags preserve held/prototype/governance proposals without silently integrating them. A live owner/source advance requires reconciliation before deletion.

Final source identities, complete CI/review results, exact retired/retained heads and the observed branch count will be appended only after those actions actually finish.
