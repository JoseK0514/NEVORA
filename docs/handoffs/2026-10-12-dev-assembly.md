# NEVORA development assembly

Status: LOCAL ASSEMBLY COMPLETE. Runtime checkpoint: `ab211e0bd420b4152843550613a63b92d93763a4`. The final documentation commit, tree and artifact hashes are recorded in `NEVORA_DEV_ASSEMBLY_MANIFEST.json`.

Requested outcome: assemble the completed NEVORA single-company parts into one reviewable local candidate before promotion to hosted dev. Hosted dev inspection follows promotion.

The candidate is in `work/master`, branch `codex/nevora-dev-assembly-20261012`. The original Fuel Scheduler checkout remains clean on `development` at `0516b7d`; verified remote development remains `b58496b84b21690f7be22474f7570da2d81af6c3`. No shared development/main merge, push, pull request or hosted deployment occurred during assembly. `vercel.json` retains the global Git deployment hold.

## Source assembly

- Retained portal `ba5ed01716745ae4abad29fe63693a3be7f6cbfd`: completed auth/Home, employee/profile/communications/calendar services and reviewed manager, privacy, report, selection and lifecycle corrections.
- Single-company findings and setup through `a00fa63`/`10277b9`, plus payroll engineering `4392463`, are merged in `0932c51` with the retained portal as the other parent.
- Reviewed tooling `f194203` is adopted as `007be1c`: 75 tooling paths, licensed provenance and guarded rules, patched Next 16.3.8 and existing runtime dependencies preserved.
- Payroll catch-up/private notices `ed7d2c2` are adopted as `d39f80e` with retained communication authority. The all-in-period schedule-transition correction `76610d7`, review docs `275319f` and finance UI `68c1887` are integrated as `0999f50`.
- All 38 finished UI input packages are assembled in `e8ea9f5`. Frozen combined input tree: `e3fd908b3d535336fa47a070658a6f29f1a46a2f`; patch SHA-256: `5fa18ed34d04e121a49d6a11a1881bde81fe84bed8330d8124d2145bd80ddacc`. Each original package patch hash and source head is recorded in the custody manifest.
- Final payroll UI `a5886d221dabceceb6ceb3148af833500358ecb4` is adopted exactly as `a39cf51`: missed-period review, queued notices, valid correction approval/publication, actor-scoped opaque references and explicit same-UUID reconstruction after an absent receipt.
- Final notice-copy correction `ea2d8ec47096dcca7ebba27bc252c82bd3389b14` is adopted exactly as `ab211e0`. The persisted disabled outcome describes queue-time readiness and does not promise permanent non-delivery. The owner's frozen recheck approved this bounded correction with no blockers; prior review reports and the M3 exception remain preserved.
- The owner's final committed plan and engineering disposition `9cdac621449182fb38b3bd579da43a021e673f26` are adopted exactly as `95ff96b`. The evidence archive also preserves and independently hashes all 36 artifacts in the owner's final evidence index, its command receipts and its original review reports. These owner-source checks remain separate from this master's combined verification.
- Assembly regressions retain rooted local notification redirects, adapt browser selectors to actual retained labels, and split two independent ten-subprocess custody cases under the unchanged default timeout. No behavioral assertion, database guard or timeout was removed or weakened.

The UI input comparison records 252 exact paths, ten explained source/config/test reconciliations, and one generated hook cache excluded. The manifest gives per-file expected/observed hashes and reasons. Reconciliations retain canonical copy proofs/recovery, generic employee IDs, company policies, capability-gated finance entries, payroll period custody and private export lifetime/selection/download behavior.

## Validation

Completed local checks:

- Full unit suite passed at `7d71866`: 401 test files, 7,012 passed, zero failed. There are 801 existing prerequisite-guarded skipped and 55 existing pending assertion records; these are not executed acceptance evidence. The subsequent three-file notice-copy/test/browser-assertion delta passed 36 focused checks and the complete 63-case browser workflow. All other source bytes are unchanged by that delta.
- Typecheck and optimized Next production build passed after the final notice-copy adoption. Full lint reports zero errors and one pre-existing EmployeeWeeklyConfirmation cleanup warning.
- All 737 owned release PostgreSQL scenarios passed: foundation 275, authority 46, generation 176, exchanges 163 and notifications 77. All 36 owned payroll SQL scenarios passed. The fresh/upgrade migration parity check passed.
- Nineteen real company setup/browser checks passed: generic company identity, hashed owner, rollback/concurrent setup, persisted employee contacts/roles/positions, duplicate/stale-tab protection, activation, Owner/Manager/Lead/Employee boundaries and session revocation/expiry. Desktop and mobile used fictional records in a disposable loopback database.
- Sixty-three real payroll Chromium/WebKit workflow checks passed at final runtime checkpoint `ab211e0`, across 320-1440px widths, including correction publication, lost-response/absent-receipt recovery, same-browser actor switching, source conflicts, oldest missing periods, ambiguous schedule acknowledgment, private self-only statements and PDF bytes/hash. Empty/error/loading/overflow presentation fixtures are identified in the report. All 1,239 application hashes matched, and owned app/database runtimes closed.
- Thirty-six final focused contract, money, navigation and settings checks passed; 83 separately executed process-custody checks passed after scenario isolation. The full suite also executed all 83 custody cases successfully.
- The UI owner's final unchanged packet reports 6,908 tests and 50 desktop/mobile layout checks passed, with build/typecheck passing and the same existing lint warning. Its source hashes/patch/tree match the original assembly input. These are owner-source checks, separate from this master's combined verification.
- Exact locked installation passed with lifecycle scripts disabled. Full dependency audit reported zero vulnerabilities; package/lock/tooling bytes remain unchanged from the audited tooling checkpoint. Thirty-six tooling provenance/rule regressions passed.

Earlier failed checks remain in the evidence archive: the combined custody case exceeded 5 seconds; a mismatched notification database prefix was refused; a relative evidence path was refused; older browser label selectors timed out; the pre-reconciliation payroll redirect assertion expected an absolute URL. Successful reruns are identified separately. Failures were corrected through contract/harness reconciliation and scenario isolation, without disabling guards or changing default test timeouts.

## Held sources and acceptance limits

- Clocker photo `ecd06408dbc36cace68eebb68c5fcff07c66ecfe` and operations `477672b0f18deb07db6605f045306b0a6453c405` are preserved in the held-source bundle. Consumer adoption, policy/privacy facts and acceptance remain open; their new runtime/migrations are not activated.
- Later SaaS/Phase F successors, including current scheduling/employee-core/import-policy and F10 work, remain paused by the single-company directive. Pre-existing dormant foundation source is retained. Historical source custody is distinct from enabling a runtime.
- Payroll provider/account/native formats, bank compatibility/enrollment/submission, internal statutory calculation and real notice delivery remain separate acceptance states. Payroll stays default-off; queue/PDF/browser evidence does not prove payment submission or actual delivery.
- Backend M3 is the owner's documented bounded module-maintenance exception. PAR-FORK-REVIEW-001 remains open for custom Next `settings.next.rootDir`; that override is absent in the current configuration. Independent finding closure and hosted release assurance remain separate.
- Design detection has no primary findings on the reconciled targets. Fourteen advisory typography/radius/color findings in supplied New Employee/Settings styles remain recorded for dev design inspection. The design sidecar is stale and retained. The existing scoped Inter exceptions and one narrowly justified local Inter-alias exception are disclosed; no rule/file-wide suppression was introduced.

## Migration and dev handoff

Use the exact ordered migration filenames recorded in the manifest and generic setup runner. Phase E and single-company histories have duplicate numeric prefixes at 0023-0025; each full filename is preserved. Do not reconstruct the sequence by ordinal alone or activate dormant tenant/journal migrations.

Before promotion, confirm the intended dev environment and existing migration ledger, review the frozen branch against `development`, and run required CI on its exact SHA. Retain the global deployment hold until the authorized dev deployment step. After deployment, inspect the actual hosted dev flows on desktop/mobile, including payroll default-off/on capabilities and the recorded recovery/privacy scenarios. Keep production, real sends and bank submissions outside that inspection.

The final manifest records the exact candidate SHA/tree, all tracked source hashes, 38 UI input heads, original engineering custody refs, held/paused dispositions and artifact SHA-256 values. The portable bundle preserves the candidate and archived source histories; the evidence archive retains executed checks and owned-runtime receipts.

To recover the candidate locally without touching an existing checkout:

```sh
git clone --branch codex/nevora-dev-assembly-20261012 NEVORA_DEV_ASSEMBLY.bundle nevora-dev-assembly
```

Compare the recovered `HEAD` and tree to the manifest before preparing a development-targeted PR. The bundle is complete and needs no remote history prerequisite. Original engineering snapshots and UI source heads are custody refs, not shared branches to merge indiscriminately. No further user action is needed to finish assembly; selection/authorization of the dev promotion and subsequent hosted inspection is the next work stage.
