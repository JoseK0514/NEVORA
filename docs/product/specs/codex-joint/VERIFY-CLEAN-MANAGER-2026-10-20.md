# Clean Manager verification ledger

Owner: Codex. Requested baseline: `30058003e3e3a77932016fa1aff0b4dcbe69c1a5`.
Working branch: `codex/verify-preview-33`. No production authorization is implied.

## Execution order

1. Fast-forward the verification branch; run types, full lint, units, production build and hosted CI.
2. Run the Manager/Owner exit matrix and inspect geometry, stability, type/contrast/copy, interaction/states and consistency against the approved v3 rulings.
3. Update legacy Phase D/E browser contracts, Timecards detail approval and sign-in selectors; execute the affected suites.
4. Add the availability deadline return path/section and authorized weekly approved-time-off read. Give Jose an evidenced Schedule load recommendation.
5. Deliver the reviewed production migration plan, with backup, rehearsal, verification, rollback and explicit authorization boundaries.

## Controls

- Fictional data and owned loopback PostgreSQL only; external notifications disabled.
- Keep `claude/*`, `main`, production deployments and production databases unchanged.
- Preserve payroll/legal wording. Compliance branch and its migration require Jose's separate decision.
- CTO owns implementation evidence; CISO requires scoped reads and safe return paths; Governance requires exact candidate custody, CI, backup/rehearsal and Jose's production authorization. Technical assurance challenges the Schedule read cost. Independent UI/QA results cannot be inferred from Claude's reports or self-certified after remediation.

## Evidence in progress

- Baseline branch fast-forwarded from `2eb2a03a` to `30058003`.
- Baseline typecheck, full lint and source-bound production build exited 0. Unit run pending.
- Baseline CI has no run; its push filter omitted the verification branch. A failing regression reproduced that omission; the bounded branch trigger fix enables every existing mandatory job.
- Local raw logs: `/tmp/nevora-verify-33-{types,lint,unit,build}.log`; build receipt: `/tmp/nevora-verify-33-build.json`.

No exit round, browser rewrite, server contract or migration readiness is yet certified. Update this ledger with final artifacts and exact results before handoff.
