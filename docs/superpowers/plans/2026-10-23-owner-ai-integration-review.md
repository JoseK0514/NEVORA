# Owner AI full review and development integration

Jose approved the proposed next release phase: source reconciliation, one combined candidate, full engineering/security and independent QA/UI review, development integration and hosted acceptance. Production is a separate decision. New metered AI testing requires an explicit additional cap; the prior $5 pilot is exhausted. A budget question is pending while unmetered work proceeds.

## Candidate custody

Local review branch `codex/owner-ai-integration-20261023` starts at freshly fetched development `40282f12c9f42ba00ed0f116c1dc6e42775efe8d` (merged PR26). Merge the clean enhancement branch `0ba7613138de2f1ba0158e84447aac8525aa12ec`, which already contains the original advisor PR25 head `2530a701bf554020a696e30ebb7fbb1131dcec44`. Preserve original worktrees/branches. Publish by fast-forwarding the existing owned PR25 head after the required source gate, keeping the five-branch ceiling. Do not create an extra remote branch or include the unrelated CI-spending PR27.

The local trial merge is preparation for review. The inventory remains a blocking gate for remote candidate publication/integration. The active “Verify Manager/Owner rebuild” task owns existing branch retirement and matching development CI; do not race its deletion script. At initial observation there were 56 active remote branches and 50 exact recovery tags. The refreshed inventory classifies the CI spending head as held, pins development and included PR26, and names the existing PR25 assembly branch. PR26's archive is intentionally required before the gate can pass; no ceiling/control is weakened.

## Execution and acceptance

1. Inspect the automatic merge, especially owned Next lifecycle/advisor environment and CI mandatory jobs. Freeze a clean candidate. Install existing dependencies without lifecycle scripts. Expected: ancestry includes current development and both advisor increments, no accidental CI-spending changes, no conflicts or unrelated edits.
2. Reverify the merged source: default tests, typecheck/lint/build, release-engineering and dependency audit. Use owned PostgreSQL and actual Chromium/WebKit surfaces with fictional data, no external delivery. Expected: relevant checks pass with exact SHA/source custody; report existing skips separately.
3. Obtain fresh independent engineering/security, QA and UI findings. Reviewers report directly to Jose and independently decide scope/acceptance; implementation cannot self-close their findings. Preserve raw reports outside the application checkout. Remediate material findings with reproducing regressions and request independent reproduction where closure is required. Expected: honest scoped recommendations and explicit open release gates.
4. Recheck fresh source inventory and remote PR25 head. Only after source control gates and review acceptance, fast-forward the existing PR25 branch, attach it, update its concrete review description and ready state as appropriate. Required cloud CI must identify the exact candidate/test merge. Expected: no force push or stale-head update; CI not claimed from a local run.
5. After mandatory candidate gates, merge only into development as authorized, then verify matching development checks. Coordinate through observed owner state so retirement/development writes do not race. Do not mutate main or production. Expected: immutable merge identity and matching remote evidence, or a precise documented blocker.
6. For hosted acceptance, first prove an isolated non-production environment/database and approved setup. The existing Preview setup is owned separately and held pending explicit database authorization; this task does not infer that production/customer credentials are safe. Prepare the exact reviewable request if missing. Live answer-quality testing uses only a newly authorized cap, fictional data and the approved transport/ledger. Expected: actual hosted evidence or a precise unresolved custody/budget gate; no paid requests without the cap.

Completion: preserve the candidate, reports, checks, deployment/data custody and any blockers in a durable handoff. Distinguish locally verified, independently reviewed, remotely published, development-integrated and hosted-verified states. Stop before production authorization.

## Progress

- Discovery: clean enhancement input verified; development advanced through PR26; source drift identified. Separate local checkout created from exact current development. Trial merge is automatic in the source inventory and owned Next fixture; inspection/reverification pending.
- Existing branch retirement is active under its own owner and development CI. No remote branch was deleted here. Budget question pending; no new inference authorized yet.
