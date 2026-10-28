# Employee mobile Calendar — implemented, local acceptance with conditions

The Calendar continuation is implemented on `codex/employee-mobile-local-resume-20261027`. Accepted **application/test/config candidate: `f58d040b70909fa21dcb97b4f40edcfd5279226c`**, based on the accepted unassembled Profile stack `a1b62ca`. Independent [code](evidence/reviews/code/CODE_FINAL.md), [UI](evidence/reviews/ui/UI_FINAL_F58.md) and [QA](evidence/reviews/qa/QA_REVIEW.md) approve this bounded local continuation with conditions. No merge, deployment, hosted build, real provider connection or native-device certification is claimed.

**QA-CAL-1 remains OPEN RISK, cause unresolved.** An earlier exact-candidate full run passed253/254, failing a Firefox Profile request-idle assertion after switching accounts. The current strict full gate passes254/254, but that does not establish a causal fix or permanent reliability. Preserve the earlier failure and diagnostic history; if it recurs, stop the failing gate and investigate correlated evidence before changing assertions or application behavior. This is local implementation acceptance, not release authorization.

[Review the screenshots](gallery/README.md). [Evidence history](EVIDENCE_HISTORY.md). [Executable plan](calendar-plan.md). [Current Phase2 status](../employee-mobile-phase2/STATUS.md).

## Delivered behavior and source

- The existing own Calendar service still owns ISSUE/ROTATE/REVOKE, generation guards, safe operation receipts and bearer-feed lifecycle. The guarded read now adds a DB-clock/session-bounded lease and current eligible-location issuance capability. No schema, employee selector, scope policy or management capability was added.
- One mounted client validates exact status/receipt shapes, original operation identity, and same-origin feed URL structure. Headers/body waits are bounded. Validity uses the original request deadline without rebasing, subtracting response time; command/retry/copy admission checks it synchronously. Pause, expiry, denial and sign-out clear private facts; late replies are fenced. Account storage ends the owner, while unrelated appearance storage preserves uncertain original intent.
- A created private URL appears only after a fresh canonical read confirms its active identity/generation. Unknown outcomes retry the immutable original request. Replay never reconstructs the plaintext credential. Nothing is persisted in browser storage; copying is explicitly user initiated.
- Calendar remains the optional native Profile disclosure reached from Schedule's fixed fragment, with focus on its summary. The mobile view provides current link status, labelled one-time copy/select, provider-specific native guides, explicit replace/revoke confirmations and truthful privacy/refresh/copied-event limits. The same service owner survives responsive changes; desktop retains its incumbent presentation.
- The scoped teal system uses semantic tokens, rem type, regular Phosphor, native controls, inset carets,48px actions/44px targets and deliberate wrapping. Keyboard activation/cancellation returns exact focus. Pending recovery is revealed above navigation after canonical refresh without scrolling ordinary nonpending polls. The mobile decorative example week was removed; no authorized feature was removed.

Main files: `src/components/employee-mobile/calendar{.tsx,.css}`, `src/components/calendar-subscription-panel.tsx`, `src/lib/calendar/{client,contract,service.server,types}.ts`. Canonical HTTP/command/feed ownership remains in `src/lib/calendar/` and existing data owners. The explicit combined suite is `vitest.employee-mobile-calendar.config.mts`; its project namespaces and disposable-factory admission fences are preserved.

The existing bearer policy intentionally survives portal sign-out. Revocation stops future access, not already copied events. Provider instructions were checked against official [Apple](https://support.apple.com/en-us/102301), [Google](https://support.google.com/calendar/answer/37100?hl=en) and [Microsoft](https://support.microsoft.com/en-us/outlook/import-or-subscribe-to-a-calendar-in-outlook-com-or-outlook-on-the-web) guidance. No real subscription or OS clipboard permission action was performed. Existing native/application components fit this continuation; no paid retrieval, generation, new library or analytics/replay was added.

## Checks actually executed on the accepted application inputs

| Gate | Actual result |
| --- | --- |
| Independent relevant unit corpus |98 files, **799/799 cases** |
| Independent selector-free SQL/browser corpus |26 files, **254/254 cases**,0 pending,799.2s |
| Whole nonincremental TypeScript |exit0 |
| Changed-file ESLint |16 files, exit0 |
| Actual Calendar journey |Chromium/WebKit/Firefox;39 checkpoints,108 captures,54 sampled contrasts, minimum5.0289; no unexpected Calendar messages |
| Source/runtime custody |9×2,024-entry application manifests independently source/mirror/inventory matched;2,266 broad source hashes equal static inputs; every owned Next PID/port absent; owned PG removed/stopped/closed; source/HEAD/index unchanged during execution |

[Actual full results](evidence/local-review/qa/full-context-f58d040b-01/combined/suite-results.json), [custody](evidence/local-review/qa/full-context-f58d040b-01/audit-result.json), [manual QA matrix](evidence/local-review/qa/full-context-f58d040b-01/employee-mobile-calendar-manual-qa.md), [event audit](evidence/local-review/qa/full-context-f58d040b-01/event-audit.json). The matrix has46surface rows/14adversarial rows and125verified artifact references. Static execution was not rerun merely to rename an artifact; exact input-hash equality validates its relationship to the final gate.

Meaningful RED/GREEN includes seven actual-panel lifecycle failures, missing real-SQL lease metadata, five mobile render requirements, delayed-timer side effects, the reopened two-clock deadline extension, and an actual recovery CTA below navigation. Independent original authors closed CR-1/CR-3 and UI-1/2/3. Original failures, rejected hypotheses, setup errors and author-owned closure records remain preserved.

## Conditions and honest evidence limits

- **QA-CAL-1 OPEN RISK:** no cause or fix established for the earlier Firefox pending-request failure. Four Profile diagnostics, ten actual-source account-switch cycles and bounded synthetic probes did not reproduce it. A Chromium navigation-held-body terminal-event gap was reproduced; it is not proof of the Firefox cause. The final full-corpus native-event trace passes the unchanged tests and10second assertion. Its actual file order differs; exact timing replay is not claimed.
- Native trace:1,490unique requests/12,948events include12requests without either native terminal, all Chromium outside Profile. Profile's130requests, including31Calendar GETs, all have both Page and Context terminals. No global observer-completeness or consumer-completion claim is made.
- Marker sampling: all three required namespace families and all nine browser identities were marked. The raw audit retains `markersValid:false` for three fleeting null-marker catalog snapshots not resampled after COMMENT. The canonical factory requires CREATE/OID/COMMENT/assertOwned before exposing an executor, and full cluster cleanup passed. This is an observation limit, not evidence of foreign DB access. Preserve [the supplementary audit](evidence/local-review/qa/full-context-f58d040b-01/marker-sampling-audit.json) and the raw flag.
- LOW, nonblocking review notes: CR-2 transport return-type narrowing could be stronger; UI-4 a few local optical geometry constants remain. Runtime decoders and core semantic design tokens are in place. No material local code/UI finding remains open.
- Physical iOS/Android, actual background behavior, assistive technology, real provider subscription/refresh, native clipboard permissions, hosted build/transport parity and release acceptance remain unexecuted separate gates. Root-font200% is not OS Dynamic Type certification. No production readiness or security certification is implied.

## Applied controls, remaining work and resume

Engineering reuses one canonical service/controller and strict contracts. Security preserves own current session/workspace/role/eligibility, generation/operation binding and secret release. Product/experience uses plain guidance, native deliberate confirmations and readable recovery. Program/governance preserves exact evidence, independent finding ownership and Phase2 sequencing. These are applied repository skill requirements, not claimed executive or production approvals.

Phase2 still requires passkeys, current-device alerts, own deletion-request lifecycles, and own published Pay/protected PDFs. Earlier Communications CR4/UI002/UI003 conditions remain with their authors. Reachable legacy controls alone are not accepted mobile ports. Finish Phase2 before Phase3; Calendar does not complete all employee work.

Current local source: `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-mobile-local-resume`. Preserve this isolated unassembled feature stack. Before later authorized assembly, fetch development, run `npm run check:development-sources`, reconcile inventory and verify integration; do not reset/rebase/merge/deploy as a side effect of mobile work. No new integration choice is needed to deliver this bounded continuation on the existing feature branch.

No migration or production activation occurred. A later rollback should revert the UI/controller/read-contract changes together; it must not delete canonical subscriptions/receipts or revoke customer links merely to roll back presentation.

The [preservation manifest](PRESERVATION_MANIFEST.json) records original paths, portable targets, bytes and SHA256. Scripts are archived as `.txt` data to avoid application/test discovery; original bytes are unchanged. Runtime mirrors, dependencies, DB bytes, environment files and production credentials are excluded. Use the manifest to resolve original absolute author references. Next required user action: none for local implementation; review is available, and any release requires its own explicit authorization and gates.
