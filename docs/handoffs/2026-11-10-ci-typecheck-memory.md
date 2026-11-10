# Standalone CI TypeScript heap closeout — 2026-11-10

Owner: parallel closeout chat `01a1c4f5-f593-7cc0-ba7c-0e207305519b`. Base: freshly fetched development `36811bfdee54dec46f5a8e3ed912cd70094e541a`. Implementation is isolated in a detached worktree; no main/production/cloud/credential/provider changes are included.

## Observed failure and bounded repair

The first-attempt exact-source [CI42804367637](https://github.com/JoseK0514/NEVORA/actions/runs/42804367637) completed with 15 successful jobs and two failures. `validate` ran 11,738 passing default tests and 199 release controls before bare `tsc --noEmit` aborted with V8 heap exhaustion near 2 GiB, exit134. Lint/build/audits were skipped. The mandatory evidence gate rejected `validate.result=failure`; its own log confirms this dependency. All browser jobs, including D2/Clocker, passed. [Mobile42804367665](https://github.com/JoseK0514/NEVORA/actions/runs/42804367665) passed; this is web access coverage, not native store certification. Original logs/terminal metadata/assessments remain in `/Users/josek0514/.codex/d2-focus-repair-20261110/ci-36811bfd-*`.

Give only the existing CI `Type check` step the fixed literal `NODE_OPTIONS: --max-old-space-size=4096`. The existing `npm run typecheck`, tsconfig, strictness, includes/excludes, noEmit, lint, source custody, audits, mandatory jobs and failure propagation are preserved. The release build already has its own fixed 4 GiB limit; it did not cover this separate earlier compiler process. No global environment or runtime code changed.

The regression executes the real npm typecheck script and actual installed TypeScript compiler in an owned temporary fixture using the workflow step's environment. It models a 2GiB inherited default even on Macs, observes the actual compiler heap with an owned test-only preload, verifies bounded 4 GiB, then verifies valid compilation emits no JS and an invalid assignment still fails with TS2322/exit2 and no JS. It is included in `test:release-engineering`. The retained old-setting red failed on the actual observed compiler heap of2150629376bytes; the new setting passes.

## Evidence and limits

Local Darwin/arm64 Node 24.19.0 / TypeScript 5.9.3 cold input inventory has2481root files and6694resolved files. The cold compiler also passed locally with a 2048 MiB old-space cap, including a 1 MiB semi-space control. This does not reproduce the original Linux abort and is not called a Linux fix proof. Cold 4 GiB execution with incremental reuse disabled passes and reports2439030K memory,947619instantiations,24.54s. No source-level compiler error or deeper allocation regression is claimed. A fresh successful hosted run remains mandatory.

Machine-readable verification and raw logs: `/Users/josek0514/.codex/typecheck-closeout-20261110/qualification.json`, `compiler-inputs.json`, `cold-2048*.log`, `regression-{red,green}.log`, `cold-typecheck.log`, `release-engineering.log`, `lint.log`, `default.log`, `source-inventory.log`.

Local qualification: cold typecheck exit0; 200 release controls passed; full lint exit0 with one pre-existing anonymous-default-export warning; 14 source-inventory controls passed; inventory passed 73 classified sources/three active branches; full default suite passed 11,738 tests across 794 files, with 32 files/857 tests skipped and 55 additional pending assertion records (12,650 total records). No test failed. These are local precommit code/configuration-byte results; they do not certify hosted CI. Independent review found no interim code blockers; final exact-commit confirmation is tracked in `/Users/josek0514/.codex/typecheck-closeout-20261110/verification.json` and `review-final.md`.

## Source reconciliation

The first inventory check detected Claude collaboration drift from00560614 to`d0412b4f401e7ec579a665968f45fdac5d41ec2d`: three B1/B3/B4 commits affecting151paths. Exact changed paths/commit metadata are retained in `collaboration-drift.json`. The source inventory records the new head as HELD under Claude/native ownership, without adopting or certifying it. The reconciled inventory passed73classified sources/three active branches. Development remains36811bfd and main46d6dc76. This inventory update is documentation; none of the new UI changes enters this candidate. Re-fetch/check again immediately before coordinator integration if either source advances.

## Leadership/control positions

- CTO: smallest configuration repair at the actual failing process; no broad source/type-system refactor.
- CISO: literal bounded step value; no new secret reader, credential, preload, cloud or product execution path. The preload exists only in an owned test fixture.
- Technical assurance: evidence distinguishes hosted failure from Mac success. Heap headroom is the selected mitigation; new hosted qualification is still required.
- Governance: GO WITH CONDITIONS for development review/integration after required local checks; no control waived or independent closure self-issued. Release impact CONDITION until fresh exact-source CI passes. No Jose exception is requested for the local repair.
- Program Delivery: parallel chat owns this candidate; release coordinator owns combined-source publication, exact-source package/activation rebinding and hosted rollout decisions. Claude retains UI ownership and native remains separate.

## Next gates and rollback

Review the exact candidate and reconcile freshly fetched source inventory before ordinary development fast-forward. Qualify the resulting source in fresh first-attempt mandatory CI. Preserve368's failure, rather than rerunning it unchanged. Rebind/rebuild source-embedded staging artifacts and the reviewed activation packet to the qualified source before any separately authorized hosted action;368's packet is not silently promoted to a new commit.

Rollback this scoped candidate to restore the previous CI step/script/test configuration; the old hosted heap failure risk returns. No database or customer data rollback is involved.

Staging quota/0007/grants/reader credentials/private enrollment/finite Render pilot, real email/push/reminder receipt, Claude's isolated hosted journey, VELANI isolation, actual2027 payroll inputs, deletion/backup/on-call evidence and eventual main/production authorization remain separate gates. No earlier model-call budget is reopened.
