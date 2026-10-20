# TC-WA-17 — unavailable retry instruction

P2, open on exact cd764f6. The explicit ROUND unconfirmed Copy receipt route tells the user to “retry this same copy,” while the actual ready page offers zero retry controls and one Back to schedule action. The source cannot supply a retry without a stored original command; the UI correctly withholds that command. Only the instruction should vary.

Measured from the saved unchanged-checker/passive result: QAOWNER, Chromium320/200, actual root32px, attempt00065, source/tree and crop hashes in measurement.json. Both actual viewport crops were visually reviewed. The bottom crop shows the complete What you can do card, its single Back to schedule action and Reference disclosure. No additional browser was opened during the resource hold.

Cause: copy-receipt/page.tsx71 unconditional retry words versus line73 command-dependent retry control. The external one-file patch keeps the existing command-present instruction and uses “Open the schedule to check whether the shifts were copied.” when the command is unavailable. It adds no retry, command, server behavior, payroll or legal wording. Candidatea216 and frozen source have the same file blob. No app branch/index/ref edit, test or fixed-source browser validation was performed.

Uniqueness: not one of the51 prior named IDs; TC-WA-9 covers reference typography and TC-WA-12 covers manager Waiting pills. Historical fixture-contracts41 already records the no-command/no-retry distinction but does not waive this content mismatch. Treat P2 as an explicit content judgment supported by the instruction/control count, not a claim that the guarded absence of Retry is defective.

Evidence is fictional product UI only; no preview password, storage cookie or authority hint is copied. Active whole-matrix logs/private bindings remain outside any publication allowlist.

Scope limit checked before proposing any repair: the exact owned QAOWNER storage state has zero `nevora-copy-pending:*` keys; the unchanged checker opens a fresh context and does not send a copy. A different browser holding the original command locally may retry from Schedule. The proposal does not remove that recovery or its controls; it only avoids telling this null-server-command branch to retry an original that this measured context does not hold.
