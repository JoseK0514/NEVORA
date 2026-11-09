# Fresh Clocker candidate review

Reviewer: `/root/clocker_final_review`, fresh context, GPT-6 Astra High. Read-only range `dfdcefa0..1f442576`. No subagents, edits, heavy-suite reruns or database connection by the reviewer. This report records the pre-fix review; implementation fixes and current verification follow in implementation-evidence.md. This is not a physical-iPad or production certification.

## Reviewer verdict

**Local candidate: changes required. Release: not ready.** Two Important findings; no Critical or additional Minor findings established.

## Strengths

- Exact-command recovery saves the original payload before transmission, rejects conflicting saves and keeps tombstones against legacy resurrection.
- Owner photo operations use current Company authority, transaction guards, post-transaction disclosure checks, forced RLS and private responses. Photo expectations share the canonical punch transaction.
- Capture is explicitly unavailable without a real lifecycle provider; saved preferences do not activate collection.
- Five inspected application screenshots preserve the pale rail, system typography, teal actions, regular icons and clear task hierarchy. Enlarged portrait prioritizes PIN entry.
- The36-check browser artifact exists and matches the inspected driver. Physical-iPad rows remain separately NOT RUN.

## Important1 — wall-clock rollback extends the verified shared screen

Pre-fix `src/components/clocker-pin-gate.tsx:68`: both the interval and nominal hard timeout calculate remaining privacy time through Date.now. Moving the wall clock backward prevents the hard callback from clearing an already visible private identity.

Reviewer reproduction executed the extracted actual timer effect: scheduled timeout30000ms, simulated wall rollback120000ms, remaining reported120000ms, reset calls0 (expected1). This was extracted logic, not a browser run. Fix recommendation: monotonic elapsed-time bound, conservatively bounded by server validity, and unconditional hard expiry; add browser rollback regression.

## Important2 — photo return reopens another private receipt screen

Pre-fix `src/components/clocker-punch-panel.tsx:160`, `clocker-photo/punch-photo-flow.tsx:35` and `clocker-punch-panel.tsx:85`: after five seconds, photo completion calls the parent confirmed(), opens ordinary success and starts another eight-second timer. Explicit Return to PIN follows that path when a receipt exists; expired unsent photo returns to ready.

Reviewer executed the extracted actual onExit callback: receipt produced onDone0, confirmed1, mode success; expired unsent produced onDone0, mode ready. Parsed timers total13000ms. This was extracted logic, not a browser run. Fix recommendation: separate journal reconciliation from receipt presentation; explicit return must clear identity, automatic completion must have one receipt deadline, and unresolved commands must survive cancellation.

## Rulings assessed

The worktree fallback, task numbering, dependency copy, scoped palette literals and held-source classifications are reasonable bounded decisions. Locator updates and modal/hit-target measurement preserve assertions, but cannot establish physical-iPad behavior. Selective photo adoption, direct decoder declaration and unavailable capture runtime preserve current Company semantics and avoid fabricated readiness. Obsolete Manager-positive expectations were properly aligned with Owner-only control. Serialization does not justify hiding initial failures. Keeping the branch ceiling unchanged and documenting inherited mail advisories are appropriate scope boundaries.

## Evidence limits

The reviewer inspected source/tests, the browser result artifact and five screenshots. Both reviewer reproductions extracted implementation logic; neither mounted a browser. The requested recovery screenshot was absent from the supplied app-final-ipad batch at review time. Later full-suite completion was reported by the primary, not independently rerun by the reviewer. Integrated RED/GREEN evidence is the primary's separate responsibility.

## Declined to judge — exhaustive

1. Physical Safari camera, permission, lock/sleep, rotation and Home Screen behavior: no named iPad/approved HTTPS environment.
2. Actual scheduled cleanup, backup deletion/restoration and lifecycle disclosures: no deployed provider evidence.
3. Hosted migration permissions, decoder deployment compatibility and production rollback execution: no deployment authorized/exercised.
4. Guaranteed survival after OS eviction or explicit site-data clearing: browser storage cannot establish it.
5. Unrelated theme-branch content and inherited mail-advisory remediation: outside Clocker scope; existing gates retained.
6. Unchanged payroll, scheduling, notifications and portal behavior beyond touched authorization entry points: outside this bounded review.

Reviewer requested both Important findings be resolved with integrated regressions before local acceptance. Physical acceptance, lifecycle/deployment readiness and unchanged source-hygiene gate still block release. No re-review was dispatched; the execution workflow verifies the combined fix pass through RED/GREEN and the complete suite.
