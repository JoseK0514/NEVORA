# PR15 development CI repair

Owner: Codex. Jose explicitly authorized repairing CI and integrating the new UI
into `development`. PR15 targets `development`; PR13 remains a separate production
candidate. This report is an implementation handoff, not independent acceptance.

## Cause and change

Baseline PR15 head `aca6d2035bc3ffaad7303005672308c8ed2e1b04`, hosted run
[39517059190](https://github.com/JoseK0514/NEVORA/actions/runs/39517059190), failed
standalone QA imports and five SQL configuration imports of `server-only`.
Those processes now explicitly resolve Next's empty server marker in test context.
The standalone preload rejects non-test processes and inherited application or
worker database credentials. It retains the normal React renderer. Production
application and worker entrypoints retain their existing marker and conditions.

The notification worker test mixed npm's stderr with the worker's bounded error.
Its original failing raw stderr was unavailable, so its historical extra text is
unknown. A controlled npm-parent diagnostic reproduces the assertion failure.
The repaired test captures actual npm-script stderr separately and still requires
the exact original worker message, exit status and absence of module-load errors.
It also verifies the injected parent diagnostic without suppressing diagnostics.

Legacy SQL fixtures stopped before Company Access. Current fixtures explicitly
apply checked-in payroll prerequisites and Company Access only to new, loopback,
ownership-marked disposable databases. Adoption runs after legacy actors exist.
The dedicated adoption fixture retains its own staged migration sequence. An
actual SQL regression proves refreshing a fixture session never restores revoked
Manager scope or grants a new Manager implicit scope. Company Access exchange
tests explicitly select the exchange database constructor instead of requesting
a foundation database inside that job.

Old fault hooks counted or interrupted newly added authorization preflights.
Scheduling instrumentation now targets the real scheduling snapshot and guarded
generation batch; admission and response fences still execute real SQL. Lock
tests pause the actual mutation batch, excluding `SELECT ... FOR UPDATE` from
mutation detection. Existing retry limits, exact after-state proofs, native SQL
lock observation, rollback and unchanged-history checks remain. Session/logout
and workspace-change tests distinguish committed state from private response
disclosure: a final authority fence can deny the response after the write commits.
Denied communication notification writes assert the current `false` contract and
preserve the entire notification row and its original read timestamp.

No application authorization, business logic, payroll wording, legal wording,
database migration source, mandatory job, scenario, threshold or runtime-error
failure policy was changed by these repairs.

## Evidence and remaining gate

Local evidence is retained under:
`/Users/josek0514/.codex/visualizations/2026/10/20/01a15962-cdee-7dd0-8a92-023551b076fb/pr15-ci-repair`.
Red runs are failure history, not successful acceptance receipts.

- Full unit run: 9,111 passed; 801 existing skipped; 516 passing files and 27
  skipped files. Vitest reports 9,967 total cases, including existing pending cases.
- Types, lint and 66 release-engineering contract checks pass locally.
- Production build passes locally; no build/start migration script is configured.
- Foundation: 281 passed. Phase B authority: 46 passed.
- Exchange SQL: 199 passed. Notifications SQL: 77 passed.
- Generation and the complete five-group SQL command are being rerun after the
  observed hook/fixture corrections. Browser and hosted checks remain required.

Each SQL run starts a new owned local PostgreSQL16.15 cluster. Notifications and
external delivery are disabled. Completed runners closed their owned clusters.
Browser verification uses the existing pinned Playwright1.62.1 and axe4.11.0,
exact committed source custody and its original owned runtime checks.

CTO position: repair test context and fixture fidelity while preserving current
server authority. CISO position: retain credential denial, real authorization
and private-response fences. Governance position: hosted mandatory checks must
pass on the exact candidate before the authorized development merge. Codex owns
implementation and matching evidence. No Jose decision is needed for that bounded
development integration.

Production remains separately held for the recorded independent UI findings,
Schedule performance decision and production migration authorization. No main
merge, production deployment, hosted database operation or real notification is
authorized by this development integration.
