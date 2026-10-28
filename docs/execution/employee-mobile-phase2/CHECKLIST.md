# Employee mobile Phase 2 — working checklist

Continuation of `codex/employee-mobile-local-resume-20261027` at `003bbe2c`, on branch
`claude/employee-mobile-phase2-20261027` (isolated worktree; the main checkout and the Codex
checkout were both occupied by other work). Phase 3 stays closed until every Phase 2 item below
is done and independently accepted.

Legend: `[ ]` open · `[~]` in progress / awaiting review · `[x]` done with evidence · `[!]` blocked (reason given)

## Feature ports

- [x] 1. Own account-deletion request — final `6931d90d`; [handoff](../employee-mobile-deletion/HANDOFF.md)
  - [x] Lost reply never reports "nothing happened" or "completed"; reference recoverable by counted password check
  - [x] Unknown storage outcome is unconfirmed; only statement-level SQLSTATEs are "rolled back"
  - [x] Password re-check counted by both sign-in limits
  - [x] Account-changed and signed-out outcomes instead of a bare redirect
  - [x] One state owner across resize/rotation; Quiet desktop and Manager/Owner preserved
  - [x] Unit + real-Postgres integration (concurrency, duplicates, stale session, lost reply, consequences, fence)
  - [x] Browser evidence (3 engines, both themes, 200% text, coarse landscape, keyboard)
  - [~] Independent review: UI **GO** (minors 19–22 fixed, closure with reviewer); code **GO with conditions** (CR-4/6/8 partial; two Jose decisions)
- [~] 2. Own published Pay and protected PDFs — `848e9cc5`; independent code and UI reviews running
- [ ] Phase 2 exit review (combined checks on the assembled revision; Jose checkpoint)

## Open corrections and risks (inherited)

- [~] A. Communications CR-4 / UI-COM-002 / UI-COM-003 — fixes at `fb065b37`; browser recheck and original-author closure pending
- [~] B. QA-OWN-3 — fixed at `663377ba` (turn-off ledger apart from IndexedDB; RED on `003bbe2c`); residual when all browser storage fails needs Jose's risk decision; QA-author closure pending
- [~] C. Legacy unbound status-cookie race — fixed at `9e261b65` (legacy status joins the lifecycle lock; server contract unchanged; RED with old condition)
- [~] D. Default suite — 13 deterministic failures repaired as test-fidelity defects (`15bdc3fb`, `13f5d1c0`); process-observation investigation running (`LEADER_UNPROVEN` after a 2 s `ps` timeout hypothesis)
- [ ] E. Calendar QA-CAL-1 Firefox request-monitor anomaly — not started
- [ ] F. Earlier landscape evidence audit/replay — not started (new batches here use viewport captures and media-verified coarse landscape)
- [~] G. Fixture forced-abort / cleanup-failure — test written (`owned-next-app-cancellation.integration.ts`); run pending

## Findings raised in this continuation

- DEL-1..5, DEL-CR-1..10, DEL-UI-1..22 — see the deletion handoff and reviews.
- HARN-1: `createOwnedNextApp` could not start at `003bbe2c` (tracked list > 1 MiB `execFileSync` default). Fixed in
  `owned-next-app.ts`; same latent limit in `scripts/phase-e-owned.mjs:448`, `scripts/lib/premium-owned-runtime.mts:30`.
- PAY: expired session shown as a generic failure (fixed `7537483f`); URL cleanup lost under Strict Mode (fixed
  `d64fb729`); router round trip cut off by navigation in WebKit (fixed `d72e21eb`).
- TEST-1: `scheduling-inputs.test.ts` mock never observed `executor.transaction` SQL since `4ae859d2` (5 failures).
- TEST-2: request page tests supplied an incomplete session proof since the planning batch (8 failures).
