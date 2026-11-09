# Employee mobile — current closure checklist, October29

Current source and exact results: [closure handoff](../employee-mobile-closure-2026-10-29/HANDOFF.md) and [verification manifest](../employee-mobile-closure-2026-10-29/VERIFICATION.json). Historical checklist below is preserved; it is not the current unstarted-work list.

- [x] Current deletion authority inside acceptance transaction, with real SQL RED/GREEN and duplicate/lost-reply controls.
- [x] Independent worker-readable suppression across restart, saturation/upgrade controls and immediate settings guidance for unconfirmed turn-off.
- [x] Supervisor/pinning/default nested Worker repair, full42-file Clocker allocation and source-capture regression.
- [x] Exact Calendar GET/native observation and retained Home privacy controls; historical uninstrumented cause remains explicitly uncertain.
- [x] 34-workflow Employee permission/source map and viewport/coarse/large-text landscape instrumentation. See final execution results rather than infer passing from this checklist.
- [~] Claude's independent full-diff review; original author-owned findings and Phase2 acceptance checkpoint. Local test outcomes are recorded separately and do not self-close these.
- [ ] Jose's three policy decisions and remote branch/publishing disposition.
- [ ] Actual iPhone/Android/provider/AT/performance/PDF evidence and hosted/native-Linux/staging/release operations after Phase2 exit.

Employee only for first release; Lead deferred. No push, main merge or deployment.

---

## Historical checklist retained verbatim

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
- [x] 2. Own published Pay and protected PDFs — [handoff](../employee-mobile-pay/HANDOFF.md); reviews GO with conditions at `848e9cc5`, conditions fixed at `ec063e5f`/`28ee6a75`, reviewer closure pending
- [~] Phase 2 exit review — combined checks pass at `e65ca90d` (default 9,878/0 failed; deletion 9/9; Pay, Communications browser); remaining exit items and Jose checkpoint in [REMAINING-WORK](REMAINING-WORK.md)

## Open corrections and risks (inherited)

- [~] A. Communications — CR-4, UI-COM-002 and UI-COM-003 fixed (final `bc8a5742`; seam and 200% band pixel-verified in 3 engines; supplementary independent check agrees); original-author closure pending
- [~] B. QA-OWN-3 — fixed at `663377ba`, hardened at `28ee6a75` (bounded multi-generation ledger, unsaved-intent message); RED on `003bbe2c`; two residuals need Jose (storage-wide failure; a restarted worker before the app reopens); QA-author closure pending
- [x] C. Legacy unbound status-cookie race — fixed at `9e261b65` (legacy status joins the lifecycle lock; server contract unchanged; RED with old condition); code review: GO
- [~] D. Default suite — **green at `848e9cc5`** (9,869 passed, 0 failed); 13 deterministic failures were test-fidelity defects (`15bdc3fb`, `13f5d1c0`). Process-observation tests reproduce under CPU saturation; `ps` latency ruled out; cause unresolved
- [ ] E. Calendar QA-CAL-1 Firefox request-monitor anomaly — not started
- [ ] F. Earlier landscape evidence audit/replay — not started (new batches here use viewport captures and media-verified coarse landscape)
- [x] G. Fixture forced-abort / refused-teardown — `owned-next-app-cancellation.integration.ts` 2/2 at `e5965943`

## Findings raised in this continuation

- DEL-1..5, DEL-CR-1..10, DEL-UI-1..22 — see the deletion handoff and reviews.
- HARN-1: `createOwnedNextApp` could not start at `003bbe2c` (tracked list > 1 MiB `execFileSync` default). Fixed in
  `owned-next-app.ts`; same latent limit in `scripts/phase-e-owned.mjs:448`, `scripts/lib/premium-owned-runtime.mts:30`.
- PAY: expired session shown as a generic failure (fixed `7537483f`); URL cleanup lost under Strict Mode (fixed
  `d64fb729`); router round trip cut off by navigation in WebKit (fixed `d72e21eb`).
- TEST-1: `scheduling-inputs.test.ts` mock never observed `executor.transaction` SQL since `4ae859d2` (5 failures).
- TEST-2: request page tests supplied an incomplete session proof since the planning batch (8 failures).
