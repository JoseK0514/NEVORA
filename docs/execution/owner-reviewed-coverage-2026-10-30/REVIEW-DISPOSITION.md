# Review disposition — author, not an independent re-review

Original fresh review at d7b2a6e4: **Ready to merge: No — fixes required.** Preserve [the unchanged original](FRESH-REVIEW-ORIGINAL.md), including its severities, proof limits, four declined judgments and verdict. No second reviewer or independent PASS is requested or claimed. This is one bounded author repair pass; full post-repair gates are pending.

## Findings and regrade

- I1 remains Important: silently suppressed receipt DML could commit assignments without recoverable custody. A new real PostgreSQL return-NULL trigger regression observed2 shifts/2 schedules instead of0 (RED). The repair asserts the matching operation/hash, receipt IDs/count and complete created assignment set inside the business transaction after receipt DML. The same regression is GREEN with zero business inserts/receipt. Raising-trigger rollback, normal publication and identical concurrent confirmations remain covered.
- I2 remains Important: saved parent location/week is part of exact assignment identity. Two new real PostgreSQL regressions move a parent location or week while retaining child IDs/episodes; both falsely returned current before repair (RED). The repair reconstructs parent terms from the immutable reviewed assignment and checks current location/week before counting presence/publication. Both regressions are GREEN; publication-only revision changes remain legitimately present.
- M1 remains Minor by effect (source fencing protects writes), and is fixed in this same pass under Jose's detail/consistency foundation. New controller/render regressions observed lost save observation and false stale labels for a fresh comparison (RED). The controller retains a volatile lastSavedAt independently of the currently visible receipt/review and clears it on private retirement; rendering compares actual observation time with that save. The comparison text describes its read-only action, and old reasoning is qualified. Both tests are GREEN. Native keyboard ack/save/recovery/progress and a real fresh-comparison-after-save assertion are added to the browser journey; final browser run remains pending.

Initial targeted repair results: SQL5/5 including all3 new real failure cases plus concurrency/publication; focused Owner168/168; TypeScript and targeted lint clean. No assertion was suppressed and no snapshot was auto-updated.

## Every declined judgment — executor rulings and costs

1. Entire inherited AI-owner lineage: remains outside the bounded base-to-head slice, as explicitly scoped. Do not claim full-branch certification; seven-source shared development reconciliation and inherited review remain required. Cost if wrong: inherited defects can survive local feature verification.
2. Hosted CI/Preview, production migration/rollback, real provider/operational behavior and performance beyond bounded limits: remain unverified and unauthorized. Local passing evidence does not imply these outcomes. Cost: integration, deployment, scale or delivery can fail later; separate release gates remain mandatory.
3. Physical-device/screen-reader certification: remains excluded from accepted local acceptance. Browser native keyboard, viewport/text scaling and axe evidence are narrower proof. Cost: device or assistive-technology behavior remains unverified; no such certification is claimed.
4. Long-term review-row retention: no policy target is approved. Keep bounded rows/receipts and authority isolation; do not invent destructive cleanup that could erase recovery. Define/verify retention before operational rollout. Cost: storage and private-data retention require a later operational policy. This local run uses fictional disposable data only.

Deferred minors: none from this review. Operational/release exclusions above are separate conditions, not silently closed findings.
