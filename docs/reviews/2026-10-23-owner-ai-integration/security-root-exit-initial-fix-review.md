# Initial fast-root-exit fix: independent review

codeQualityStatus: WATCH
recommendation: REQUEST_CHANGES
blockers: Complete strict independent disappearance classification and its negative regression before approval.

Reviewed uncommitted scripts/phase-e-owned.mjs delta atop persisted RED9cf3799038ddd979da9324a9987370c9f55139b4 in /Users/josek0514/.codex/worktrees/owner-ai-root-exit-20261023. No source edits, runtime or HEAD movement. This report covers the observed working diff; it is not an immutable candidate approval.

## Findings by severity

CRITICAL: none. HIGH: none.
MEDIUM M1 — observedProcessExit at scripts/phase-e-owned.mjs:104-112 checks observation.error but ignores stderr. status1 with empty stdout and nonempty diagnostic stderr is accepted as absent. The exception requires positive disappearance proof, not an observer diagnostic. Reject nonempty stderr for both absent and zombie outcomes. Add a negative where ps returns status1/empty stdout/nonempty stderr WITHOUT an error property; current failed-observer injects error and therefore does not discriminate this gap. The parent independently identified the same hardening requirement; it remains unresolved in the inspected diff.
LOW: none.

## Accepted design properties

Initial capture alone can set initialRootExit. Wrong marker and observed wrong PGID/parent remain ineligible. The independent pid/stat observation prevents the previous helper's empty-output ambiguity from being sufficient by itself, subject to M1. No root lease is manufactured. The code waits for the actual child exit event; only a positive integer nonzero outcome, zero resource leases and clear cleanup can preserve that status. Original error and observationFailure remain, with a bounded initialRootExit enum. A zero outcome remains failure1; live ownership failures remain failure1. No individual/group signalling authority is added.

The original runner expected23 assertion remains unchanged, with stderr context added. The persisted four-case regression uses an actual child and actual exit/zombie observation rather than invented identities; it distinguishes23, zero, failed observer and an actual live marker omission. Retaining failure metadata and an empty resource list prevents treating this narrow propagation fix as ownership acceptance. Add assertions that initialRootExit exists only for positively proven exit cases and not observer/marker failures.

The code sets stopping=true in the disappearance path, so the existing deadline's stop callback becomes a no-op while awaiting the actual exit event. For a positively gone invocation-created child, its handle should promptly deliver that event. Do not describe this as an independently enforced additional exit-event wait budget or apply the path to uncertain liveness. No-resource-leases is not proof that an exited process never created unobserved descendants; the outcome remains failed and grants no cleanup authority from that assumption.

## Evidence and limits

This review inspected the persisted regression source and proposed code; the parent's active focused run was not duplicated. The reported external deterministic RED is additional evidence of the initial-read race, not proof of the exact historical cloud trigger because that run omitted its child stderr. Fresh failure messages should preserve bounded useful context. Earlier cloud failure and raw reports remain unchanged.

Previously loaded remove-ai-slops/programming perspectives applied: real lifecycle regression is relevant; no need for blanket identity exceptions, test expectation relaxation or a new abstraction. After M1 correction, inspect the bounded diff and complete focused controls plus original runner/process cases before full required CI. No hosted, production, paid inference or branch-policy action is authorized by this review.
