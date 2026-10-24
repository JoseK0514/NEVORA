# Navigation settlement and role refresh correction

## Current state

Jose authorized Codex to implement the navigation corrections while preserving Claude's design. Code verification checkpoint: `393f3b110d1dcf14414cda7b277f0c8fd71dd93b`, on local `codex/quiet-ui-development-20261023`, descended from Claude's complete `a5470f79d0c47f5d6c2e8c56d7ae2bb454bfc0f3` and Codex's existing disclosure-readiness repairs. This document and source classification are subsequent documentation-only work.

The previous published PR30 source is `d6ce3ef9d7014be9f0f11126781f6b7b67c4e500`; development remains `8d4a3792aceb9cd56e7e33ce318f4d5e9a74f9bb`. Jose authorized the exact source consolidation below. Claude's complete tip is preserved remotely and the source gate now passes. This candidate is prepared for one combined publication through existing PR30; matching cloud acceptance remains required. No merge, deploy, alias change, hosted database write or real notification occurred.

## Final change

- `src/lib/navigation-coordinator.ts`: address observations settle only the current destination. An unrelated address cannot become completion evidence because it was evicted from a cache or observed before. The old destination-history map is removed, keeping destination state constant in size. Current-attempt Link completion, query canonicalization, supersession and exactly-once explicit discard recovery remain.
- `src/lib/navigation-coordinator.test.ts`: seven new regressions cover 64/128 abandoned destinations, repeated destinations across all four attempt kinds, encoded-query variants and an unknown address. Redirect positives now include the redirect's actual router-transition start and still require its destination commitment. No scenario or assertion is skipped.
- `src/components/app-shell.tsx`: identity revalidation, after the same navigation barrier, requests a server layout refresh. Next retains the layout during a client page transition; a full document reload after that transition interrupted streaming destination content. Server refresh reruns the existing session, operational authority and notification-authority readers and permits the existing identity-keyed shell replacement. Private snapshot retirement and authorization logic are unchanged.
- `src/components/app-shell-identity-refresh.test.tsx`: verifies that the identity-change callback actually requests that server refresh through the existing barrier.
- `scripts/scoped-navigation-browser-check.mjs`: strengthens the role-change control to require the employee shell and absence of the management shell before restoring the fictional actor's role. Existing destination, source retirement, scope restoration and deadlines remain intact.

Only these five implementation/test files differ from a5470f79. All CSS, assets, design files and both previously prepared disclosure-readiness scripts are unchanged. An experimental teardown change was fully reverted; the final diff does not change provider cleanup or identity-release behavior.

## Verification actually run

1. Before the coordinator correction, all seven new cases failed with premature completion. After correction, all pass. The shell regression first failed because no server refresh was requested, then passed after the callback correction.
2. Seven focused Vitest files pass134 tests: coordinator, navigation ownership, ScopedReadFrame, AppShell, management signout, identity refresh and private snapshots. No failing or skipped cases.
3. `npm run typecheck`, targeted ESLint and `git diff --check` pass.
4. `npm run test:release-engineering`:158 passed, zero failed/skipped/cancelled.
5. All nine direct exact-module review controls pass on393f3b11, including original H1/M1, mixed navigation, discard, history overflow and repeated destinations.
6. Native macOS WebKit26.5 / Playwright1.62.1 / Node24.19.0, exact committed application mirror and new isolated PostgreSQL16.15: all four existing navigation controls pass. These cover held destination without recovery, held destination with private-source retirement and zero source requests, explicit source recovery, and actual Manager-to-Employee redirect. The last control proves the employee shell, management shell absence, source-private absence, destination and awaited role/scope restoration.

The final browser receipt has zero JavaScript/native/framework runtime errors, zero caught RSC failures, zero API cancellation diagnostics, zero external requests and zero document navigations during the role redirect. It retains one `/api/notifications` HTTP403 response and its matching browser resource message during the real role change. This is an authorization denial, not a JavaScript exception; no repository error classifier or exemption changed. Earlier failed private runs remain preserved, including a stricter collector that initially counted every console resource message as a runtime exception. No historical failed cloud result is relabelled successful.

All1,882 application input hashes, source identity, mirror identity, clean start, browser/application closure and owned PostgreSQL shutdown were checked. These focused local controls do not substitute for Linux cloud CI, the full70-cell browser matrix, physical Safari or independent release certification.

Private raw evidence root: `/Users/josek0514/.codex/quiet-ui-pr30-evidence-20261023/`.

- `claude-393f3b11/lifecycle-controls.json` and `bounded-history-controls.json`: nine exact-module controls.
- `codex-393f3b11-webkit-attendance-policy/report.json`, `verified-summary.json`, `cluster-closure.json`, `runner.mjs` and its owned runtime manifests: final native browser evidence.
- `codex-091f410c-webkit/`, `codex-5e918970-webkit/` and `codex-393f3b11-webkit/`: preserved investigation/failure receipts, not acceptance.

## Positions and next gate

Engineering: the final correction removes history-based completion inference and revalidates the retained server layout. Security: existing server authorization, view bindings, stale private-data retirement and scope recovery remain mandatory; denied reads are preserved in evidence. Governance/release: local evidence and verified source consolidation support publication, but release status remains CONDITION pending matching full cloud acceptance. This is not independent audit closure or production approval.

After Jose replied "Yes preserve Claude branch" to the exact recoverable archive/retirement request, Codex fetched origin and verified Claude's remote tip was still a5470f79 and an ancestor of the candidate. The archive tag was created and pushed without overwriting any existing tag. A separate remote read verified both branch and tag resolved to a5470f79 before retirement. The branch deletion was conditional on that unchanged SHA; no branch history was rewritten. Other active branches and worktrees were preserved.

Completed consolidation:

1. Remote lightweight tag `refs/tags/archive/branches/2026-10-24/claude/role-nav-webkit` preserves `a5470f79d0c47f5d6c2e8c56d7ae2bb454bfc0f3` exactly. The active source branch was retired only after that verification.
2. Source inventory binds the included Claude source to that archive. After fetching, `npm run check:development-sources` passes:57 classified sources, six active branches, exact archives and included/current-development ancestry verified. All11 source-inventory contract tests pass. The maximum remains six; no gate was relaxed.
3. Private verification receipt: `/Users/josek0514/.codex/quiet-ui-pr30-evidence-20261023/claude-role-nav-archive-verified.json`. Restoring the branch from the tag recovers the complete Claude lineage.

Next: publish the combined candidate only through the existing Codex-owned PR30 branch and run all12 mandatory cloud jobs once. Preserve every test and evidence gate. Review matching results before development integration, then verify the development-push checks and follow the separately prepared DEV Preview procedure. The previously approved final five-branch cleanup remains after accepted development integration.

No production step is authorized by this handoff. Codex owns publication and verification. No additional Jose decision is needed to start this already authorized combined cloud run.
