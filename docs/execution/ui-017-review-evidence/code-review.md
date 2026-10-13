# UI-017 whole-branch code review

codeQualityStatus: WATCH
recommendation: APPROVE
blockers: []

Approval is for this UI-only candidate to enter independent combined QA. It is not release, merge, deployment, or final Finance/privacy acceptance.

## Scope and source

Reviewed repository `ui-own-pay-notices`, branch `codex/nevora-own-pay-notices-ui-20261012`, base a44fce7c3b0470aa9250f983d64d79c22f5371ef through bf91d4058328e74c1613927f6e25c50956b8d5c1. Full git diff inspected: production adapter, new payroll test, one carry-forward fixture matcher, execution plan. Untracked execution report preserved. No application/index/HEAD/ref edits made.

Requirements: `docs/execution/ui-017-own-pay-notices.md` and canonical Business Analyst `outputs/UI_017_OWN_PAYROLL_NOTICE_QUEUE.md`. Ledger/notepad consulted: `ui-own-pay-notices/.superpowers/sdd/ui-017-own-pay-notices/` markdown ledger and task brief. Exact supplied review focus applied.

`omo-agent-toolkit ulw-loop status --json` was attempted and returned command not found. No attempt directory was obtained; this report uses the fallback `.omo/evidence/ui-017-code-review.md` in the containing workspace, outside the read-only application checkout.

## Strengths

- Production diff is small and reuses imported Finance metadata authority. Both SQL parameters are registered in the common finite manifest; the final observation rebuilds canonical SQL with parameter positions and replay has no executor fallback.
- Employee/Lead expose only PAYROLL_STATEMENT metadata after canonical authorization. PAYROLL_PREPARATION remains unsupported. No fabricated payroll SourceSnapshot, financial payload projection, custom destination, new write/read control, or Finance policy change.
- Read timestamp comes from candidate metadata in the final observation. Source unavailability fails unavailable. Owner/Manager registration remains available via the common manifest.
- Supported source handling, query budget, protected guards and final role/session observation remain intact. UI grouping already sorts timestamps, so the adapter's payroll-first insertion does not reorder the displayed chronological groups incorrectly.

## Findings by severity

### CRITICAL / Critical
None.

### HIGH / Important blocking
None.

### MEDIUM / Important nonblocking

1. **Final SQL contract is not asserted by the new transport fixture.** `ui-own-pay-notices/src/lib/data/employee-notification-list.payroll.test.ts:24` accepts any SQL beginning with `WITH facts AS MATERIALIZED` and synthesizes reads from discovery. Its final source-loss/version tests exercise replay decisions, but would still pass if final SQL were accidentally changed to use the wrong Finance predicate or recipient binding while retaining observation count. This is a gap in the stated final-observation contract coverage, not evidence the current production query is wrong: inspected production assembly is correct and real browser evidence supplements it. Add a focused assertion for the imported two-argument query rebased to its final parameter slots and the document/recipient values, or cover the same race through real SQL. Do not treat this fixture as Finance authorization certification.

2. **Unnecessary untyped escape in the fixture.** `ui-own-pay-notices/src/lib/data/employee-notification-list.payroll.test.ts:41` casts the transaction result to `never`, disabling type checking where `SqlExecutor.transaction` already accepts `Promise<unknown[][]>` and `result` is `unknown[]`. Remove that cast and let the existing interface check the returned row arrays. This is a programming-perspective violation without a demonstrated production failure; severity remains MEDIUM.

### LOW / Minor
None separately. The `foreign` test case at line 62 supplies a foreign owner during discovery as well as final observation; its title should not be interpreted as proving post-discovery intent reassignment. The independent combined gate should cover actual revocation timing.

## Skill-perspective check

Loaded and consulted `remove-ai-slops/SKILL.md` and `programming/SKILL.md` from `/Users/josek0514/.codex/plugins/cache/sisyphuslabs/omo/5.1.30/skills/`. Also read Superpowers requesting-code-review/code-reviewer.md, repository AGENTS, executive operating model, CTO and CISO perspectives.

Ran the overfit/slop pass over all changed production/test code. No deletion-only tests, removal-verification tests, prose/prompt pins, or production data-extraction/normalization machinery was added. Output label/privacy assertions cover the actual metadata-only contract; finite SQL allowlisting is machine-consumed behavior, not a prose assertion. Read metadata validation occurs at the unknown SQL-row boundary, where missing metadata must not silently become unread; it is justified. No new needless production abstraction found. Production file measured 196 nonblank/non-line-comment lines. Programming violation is the test type escape above; the final fixture also has limited protection against SQL-assembly regression. These do not justify broad production refactoring.

## Verification and artifact audit

Independently ran the plan's affected Vitest command from bf91d405: 7 files, 73 tests passed, exit 0, 523 ms (review run at 20:19:24 local). No browser, full suite, typecheck or lint rerun was claimed.

Inspected actual artifacts in `ui017-evidence/`:

- `RED-adapter.log`: 8 expected failures / 8 passes; `GREEN-affected.log`: 73 passes.
- `FULL-unit.log`: 409 files passed / 27 skipped; 7421 tests passed / 801 console-skipped, total 8277. The console arithmetic leaves 55 tests outside those reported categories; the parent identifies these as held. This review did not independently classify those 55.
- `TYPECHECK-final.log`: tsc invocation with no diagnostics; `LINT-final.log`: empty. These log contents alone do not independently establish process exit codes. Parent-reported exit success should be retained with the execution receipt.
- `browser-red/report.json`: actual Employee/Lead baseline inbox/bell omitted own notice (zero unread).
- `browser-final/report.json`: 48 role × engine × width positive surfaces plus 3 other checks passed; 2 negative harness errors are retained. This is not a zero-error run.
- `browser-negative-02/report.json`: 5 passes / 0 errors, including normal generated unpublished-to-published statement and account-deactivation denial. This corrects the earlier invalid publication-deletion/role-transition assumptions without weakening application controls.
- `preserved-contracts.json`: independently recomputed all 8 hashes and compared file bytes against base; all match.
- Final and negative-02 source manifests: independently compared the reviewed adapter hash with both manifest and runtime mirror; both match bf91d405 content. Reported owned PostgreSQL teardown flags are true; this review did not independently inspect process state.

## Declined to judge

- Final assembled Finance predicate at separately identified Finance/root revisions: not adopted in this branch; mandatory independent coupled privacy/authorization gate remains open.
- Final native Finance generation coverage across the coupled acceptance matrix: a local normal-generation scenario does not certify that complete matrix.
- Adding generic Employee/Lead Mark read controls: explicitly ruled outside this bounded adapter increment; existing read/ack controls are preserved.
- Hosted or production readiness and deployment: no deployment authorization or hosted evidence in scope.
- Pixel fidelity across all 48 captures: browser reports and capture inventory were inspected, but this code reviewer did not visually certify every image.

## Assessment

No Critical/High defect in the bounded production change was found. Proceed to independent combined QA with the two test-quality observations recorded. Finance/source authority remains a coupled acceptance dependency; no local mock, legacy backend test, or this approval closes that gate. No user action is required to approve this review candidate, and no merge or deployment is authorized.
