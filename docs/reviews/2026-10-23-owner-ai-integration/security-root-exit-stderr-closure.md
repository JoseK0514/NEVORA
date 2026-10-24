# Initial root exit: stderr-proof closure review

codeQualityStatus: WATCH
recommendation: APPROVE
blockers: No material code issue remains in the reviewed three-file patch. Focused/full verification and mandatory CI remain pending release requirements.

Read-only review of the frozen working patch above RED9cf3799038ddd979da9324a9987370c9f55139b4. No runtime, source edit or HEAD movement. This supplements security-root-exit-initial-fix-review.md without changing it.

## Findings by severity

CRITICAL: none. HIGH: none. MEDIUM: prior M1 addressed in source and discriminating regression. LOW: none.

observedProcessExit now rejects either observation.error or nonempty trimmed stderr before accepting either absent or zombie evidence. The two additional controls discriminate status1/empty-output diagnostic stderr with no error property, and actual native zombie output carrying diagnostic stderr. The persisted RED log engineering/root-exit-observer-stderr-red.log records both failing before hardening (unexpected preserved23), with four other cases unselected. The final controls require the initialRootExit enum only for clean actual exits, and explicitly forbid it for marker/observer failures.

The remaining constraints are unchanged: initial capture only, independent disappearance observation plus actual spawn-handle outcome, positive nonzero status, zero leases and no cleanup failure. Error/observation metadata remains failed; zero and live violations remain1. No root identity, resource registration or signalling authority is created. Original runner expected23 remains unchanged with stderr context. No timeout expansion or observer-error suppression was introduced.

At inspection engineering/root-exit-final-focused-green.log showed six root-exit tests passed, but the combined119-test run was still active. This report does not claim final combined success. No independent runtime was run while those timing controls were active. Historical cloud causality remains unconfirmed; deterministic local RED proves the supported race and these additional tests prove the rejected observation classes.

The previously loaded remove-ai-slops/programming perspectives were applied: tests exercise actual process exit and declared observer failures, rather than merely reflecting a new condition. No additional production abstraction or needless parsing was introduced. Prior limitations about exit-event delivery and unobserved descendants remain; this failed-outcome preservation is not successful ownership acceptance.

## Reviewed file custody

- scripts/phase-e-owned.mjs: f4242e9d765667a0938d87967ab21134fc8fd9e0a44066772fb49df8c324aca9
- src/test/phase-e-root-exit.test.ts: 37656f582e8492e250c82662742eff0c8a8432855b72cfc8c378391c58ba542b
- src/test/phase-e-runner.test.ts: 2ceed23b82f9b7cce748b221e50f508e636a33b3f44806a919cf828f3024f70c

Complete the active focused suite, required fresh full validation and immutable-candidate review/transfer before publication or release claims. Existing cloud findings, six-branch policy and hosted/spend/production gates remain unchanged.
