# Navigation settlement and role refresh correction

## Current state

Jose authorized Codex to implement the navigation corrections while preserving Claude's design. Code verification checkpoint: `393f3b110d1dcf14414cda7b277f0c8fd71dd93b`, on local `codex/quiet-ui-development-20261023`, descended from Claude's complete `a5470f79d0c47f5d6c2e8c56d7ae2bb454bfc0f3` and Codex's existing disclosure-readiness repairs. This document and source classification are subsequent documentation-only work.

Nothing from this correction has been pushed. PR30 still publishes `d6ce3ef9d7014be9f0f11126781f6b7b67c4e500`; development remains `8d4a3792aceb9cd56e7e33ce318f4d5e9a74f9bb`. No new full cloud workflow, merge, deploy, alias change, hosted database write, real notification, archive tag or branch deletion occurred.

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

Engineering: the final correction removes history-based completion inference and revalidates the retained server layout. Security: existing server authorization, view bindings, stale private-data retirement and scope recovery remain mandatory; denied reads are preserved in evidence. Governance/release: local evidence supports review, but release status remains CONDITION/BLOCKED pending source consolidation and matching full cloud acceptance. This is not independent audit closure or production approval.

After fetching origin, the source inventory now classifies the exact Claude tip as included. The gate still refuses assembly because seven remote branches exceed the recorded maximum of six. The ceiling and its validation are unchanged.

Concrete proposed consolidation, requiring Jose's authorization because it retires Claude's active branch before the previously sequenced post-integration cleanup:

1. Verify `claude/role-nav-webkit` is still exactly a5470f79 and is an ancestor of the candidate.
2. Create `refs/tags/archive/branches/2026-10-24/claude/role-nav-webkit` at that exact tip. Push and verify its remote peeled commit before any branch deletion. Do not overwrite an existing archive tag.
3. With Jose's explicit approval, retire only that included remote branch, bind its source entry to the archive, then fetch and rerun `npm run check:development-sources`. Other owners' active branches remain intact.
4. Publish the combined candidate only through the existing Codex-owned PR30 branch and run all12 mandatory cloud jobs once. Preserve every test and evidence gate. Review matching results before development integration, then verify the development-push checks and follow the separately prepared DEV Preview procedure.

No production step is authorized by this handoff. Codex owns the correction and next publication; Jose's only immediate decision is whether to authorize the specific recoverable retirement above.
