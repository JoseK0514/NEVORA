# Final code consistency and acceptance addendum

Author: original whole-change code reviewer `/root/communications_code_review`.
Date: 2026-10-27.
Frozen candidate: `8435c3d81734b1fc4bb8ac574368b331a9e99b9d`.
Compared with reviewed application correction: `8ec15116c1ee37b8b46304d1cbcca439c7778dc7`.

**Code acceptance: GO WITH CONDITIONS.** CR-1, CR-2 and CR-3 remain author-closed; CR-4 remains open, Minor and nonblocking. No additional material issue was identified in the bounded final test/configuration consistency check. Full batch acceptance remains conditional on the separately owned final combined, QA/UI and custody gates. The full 20-file/176-case run was still in progress when this addendum was written; this document does not mark it GREEN or close any QA/UI finding.

## Scope and preserved reports

This is the original author's final consistency addendum, not another whole-change review. I inspected the exact final Git delta, the actual lookup-race boundary, explicit project serialization and namespace helper, the changed desktop/mobile test transitions, and available independent execution/custody records. I launched no runtime or test suite and changed no application/test/configuration/index/HEAD/branch input.

The prior reports remain byte-for-byte unchanged:

- `FINAL_CODE_REVIEW.md`: SHA256 `ee9c70a90b96c0106da82e13a73f506a774012fb817e618e006337c9bd83ea1f`.
- `CODE_FINDING_CLOSURE.md`: SHA256 `8cb053f513f7e62bfc4f1488329ef857b08569dcfd0536bb00b42c0b5f1811ce`.

## Application equivalence

The complete diff from `8ec15116` to `8435c3d8` contains exactly four files, 18 insertions and 11 deletions:

1. `src/test/integration/employee-mobile-communications-review.integration.ts`
2. `src/test/integration/employee-mobile-planning.integration.ts`
3. `src/test/integration/employee-mobile-requests.integration.ts`
4. `vitest.employee-mobile-communications.config.mts`

No application, component, business service, transport, schema, package, or script changed in that interval. I also independently checked that `git diff --quiet 8ec15116 8435c3d8 -- src/app src/components src/lib scripts package.json package-lock.json` succeeds. The reviewed product corrections and their authorization/activation behavior are therefore byte-identical at the final candidate. This supports carrying forward author-owned CR-1 through CR-3 closure; it does not waive final-candidate test gates.

## Final test and configuration deltas

**Lookup race and cleanup.** The review test retains the strict actual HTTP 403 assertion, the real Owner settings writer, original-operation recovery and database receipt checks. Its barrier is before the main lookup transaction's exported `communicationDevelopmentGuard` statement: workspace bootstrap has completed, and the main workspace FOR SHARE lock has not yet been acquired. This is the boundary verified in the successful `e9b9ff7d` three-engine targeted run described in `CODE_FINDING_CLOSURE.md`; it is unchanged at `8435c3d8`. The three earlier unsuccessful oracle attempts remain preserved and are not reclassified. The additional request tracking waits for outstanding `/api/` and `/app` requests before disposal; page errors remain fatal. It adds no cancellation/error allowlist. Enlarged-field capture/focus checks add evidence without changing product behavior.

**Serial project namespaces.** The final configuration explicitly sets `fileParallelism:false` and `maxWorkers:1` inside each `extends:false` project. This corrects the inheritance mistake that allowed competing tests within the same namespace; it does not weaken the existing database admission checks. All 20 selected files remain present across the three fixed employee, canonical-communications and canonical-notifications projects. The existing helper accepts only the strict owned loopback `nevora_exchange_test_c1_<12 hex>` input and maps it to one of the three required prefixes, preserving host, port and credentials; query/hash/remote/unmarked targets are rejected. Each factory retains its own absence, ownership marker and OID checks. Per-file and hook timeouts remain 600000 and 30000 milliseconds. Separate namespaces do not create production access or satisfy the application activation hold outside the owned fixtures.

**Planning and Requests navigation.** The final tests use the actual desktop back/list links instead of forcing document navigation while outgoing reads may still be active. Planning changes viewport on the existing Availability route, confirms the incumbent desktop surface, then follows Availability → Requests hub → Time off. Requests follows its existing desktop shift-request back link to the hub, asserts the original desktop hub, then changes viewport and waits for the same mobile hub to become ready. Existing desktop-isolation, current-record and authority-loss checks remain intact; page errors and timeouts remain strict. These tests cover settled task navigation and responsive transitions. They do not establish that abrupt hard reload/navigation cancellation behavior is fixed, and this addendum makes no such claim.

## Evidence observed and pending

I read the independent Requests result and custody audit at:

- `/workspace/nevora-evidence/independent-qa-remediation/8435c3d8/requests/result.json`
- `/workspace/nevora-evidence/independent-qa-remediation/8435c3d8/requests/mobile/results.json`
- `/workspace/nevora-evidence/independent-qa-remediation/8435c3d8/requests/custody-audit.json`

The actual candidate-specific run passed its single three-engine orchestration case: 28 checkpoints, 36 captures, no page errors; 49.96 seconds Vitest / 51.305 seconds recorder. Its audit reports 2007 source inputs matched, exactly the approved two mirror substitutions, unchanged source/index/branch, and closed Next/PostgreSQL processes and ports. I inspected these records; I did not run the browsers or claim personal inspection of every capture.

The ledger reports the prior affected Responses/Planning run on `1ada3f1c` passed in all three engines. That historical run is supporting evidence, not a replacement for the final frozen combined gate. The current selector-free combined invocation under `/workspace/nevora-evidence/independent-qa-remediation/8435c3d8/combined` had completed the canonical suites and the main communications case when I inspected its live log, but had not produced a final combined result/custody disposition. Partial progress is not full acceptance. QA owns the final 20-file/176-case verdict, full required unit/type/lint evidence and end-of-run custody; UI owns its independent acceptance and any remaining UI findings.

## Remaining conditions and declined scope

- **CR-4 remains OPEN / Minor / nonblocking:** partial zero-item pages still include a confirmed-empty sentence alongside a warning that sources could not all be checked. It has not been corrected or silently closed.
- All original Declined to judge boundaries remain: production/hosted/activation/assembly/release authority; physical-device/assistive-technology acceptance and every captured pixel; historical evidence as fresh execution; broad verification owned by its actual runner; non-authoritative partial-page cursor behavior; canonical rejection of stale audience previews; and wholesale formatting preferences. See the unchanged original review for the exact reasoning.
- Abrupt document reload/navigation cancellation is explicitly outside the settled-navigation evidence described here. Replacing those test transitions does not prove the prior forced-navigation page errors were repaired in application code.
- Other authors' QA/UI findings remain theirs to close. This report neither self-closes them nor accepts risk on Jose's behalf.

**Final position:** the reviewed communications application correction is unchanged and the final test/configuration deltas are technically consistent with its bounded local acceptance plan. Proceed with the existing independent final gates. No code-review Important finding remains open; batch/release readiness remains conditional until those gates are actually completed and independently reported. No production or live activation authorization is granted.
