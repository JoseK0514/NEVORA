# Final candidate UI verification

Exact immutable source `b9567abc26b977a517b77622a1661b16172f5b16`. This is a bounded candidate regression sample, not a complete exit matrix. All tested business mutations were held/answered in the browser or blocked; no tested business write reached the application. External origins and sign-out were blocked. Fictional owned fixture setup and login are separate authorized setup steps.

**Targeted cases: 152/152 completed, 152 passed, 0 incomplete. Unchanged checker: 60/72 passed.** All failures are retained and no pass is inferred from incomplete setup.

- [Alignment](alignment.md)
- [Bars and stability](stability.md)
- [Type, colour and copy](type-colour-copy.md)
- [Interaction and states](interaction-states.md)
- [Widths, roles and consistency](widths-roles.md)

The owned preview is closed: PostgreSQL stopped, exact source/mirror verified, audit errors empty. `final-receipt.json` records the exact source, clean tracked state, harness hashes and checker identity; source/mirror derivations remain in `source-manifest.json`.

[Finding-to-commit coverage](finding-results.md) maps the31-entry frozen ledger to executed cases and explicitly identifies the two unmerged Wave C controls. The prior90checkpoint named findings are preserved at [candidate-findings.md](../paused-ui-fixes-90fbb4d/candidate-findings.md); the later Compose focus finding is preserved in the [980checkpoint report](../paused-ui-fixes-980e823/candidate-findings.md). The supplied checker executes unchanged behind external context guards, whose installation/block records remain in `checker-guard.jsonl`. This report does not claim full exit certification, real-device access, unmerged branch acceptance, deployment or test/build gates owned by the coordinator. The initial Profile readiness attempts are retained under `attempts/001-profile-readiness/`; four no-operation setup attempts are excluded from unique-case totals and37 completed cases were preserved. A second archive, `attempts/002-ready-state-and-anchor-oracle/`, retains four triage rows: unready Retry/normal-field measurements and two absolute-scroll assertions replaced by visible-anchor/no-active-scroll proof. Other148 valid cases were preserved; only those four were replayed. No earlier attempt is silently discarded. Credentials and browser states are excluded. No app source, STATUS or commits were changed by this inspector.
