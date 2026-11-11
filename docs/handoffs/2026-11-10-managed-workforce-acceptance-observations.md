# Managed workforce packaged acceptance: startup observations

Owner: delegated packaged-worker diagnosis; coordinator owns integration and independent review. Base is frozen `df665ecc8184d6ee98020c2267840a71c83f676c`. Work is isolated in detached `/Users/josek0514/.codex/worktrees/nevora-packaged-worker-acceptance-20261110`. The coordinator's original checkout, build bytes and failure log were not changed.

## Finding and uncertainty

The original actual acceptance failed at the HTTP readiness assertion with `undefined !== 200` and only `managed_workforce_unavailable`. Retained evidence: `/Users/josek0514/.codex/backend-closeout-final-20261110/artifact-managed-df665ecc.log` and `serial-df665ecc.json`. **Its original cause remains unknown.** The old child entrypoint deliberately sanitizes all startup rejections, and the acceptance script retained no selected port, child exit/signal or server error observation.

One unchanged actual DF66 replay passed from the new clean checkout. Its compiled host SHA256 was exactly the same as the original failed run: `7f4af2ae1ae275592bb9ceed56830aab2fab90abb7cbbacf7a9b51d3633c5bd9`. That passing replay is not a root-cause repair or an unchanged retry-to-green disposition. The initial alternate-interface conflict hypothesis was not established on this Mac; it was discarded, and port selection remains unchanged. The incomplete exploratory probe and its explicit disposition are retained externally rather than offered as causal proof.

## Bounded repair

This change repairs the acceptance evidence gap, **not a claimed worker runtime defect**:

- The actual compiled host starts with an explicit acceptance-only Node preload and private IPC channel. The preload observes native `Server` listening/error emissions, delegates to the original emitter with the original receiver/arguments/return/throw behavior, and adds no error listener. Normal imports do not install it. No production worker module, host entrypoint, binding/profile, credential, HTTP route or archive builder changes.
- At most one listening and one server-error event are projected. Only `EADDRINUSE`, `EACCES`, `EPERM`, `EADDRNOTAVAIL` or `OTHER` can cross IPC. Error messages, stacks, addresses, configuration and secrets are excluded. Parent IPC parsing accepts only the exact bounded schema.
- Readiness now requires the original actual HTTP200/body assertion **and** the owned child's listening observation. A response from an unrelated process cannot replace that observation. The existing15second readiness deadline, no retries, private-health401, absent public execution404, clean shutdown, wrong-source rejection and actual monitor ZIP execution remain mandatory.
- On readiness failure, `startup-failure.json` records source, selected local port/PID, child exit/signal, bounded spawn-error class, HTTP status, output-byte count, generic stderr classification and sanitized server observations. It does not infer a historical cause or log raw exception text. No fallback marks failure successful.

## Verification and evidence custody

Evidence root: `/Users/josek0514/.codex/packaged-worker-acceptance-20261110`. Final commit/tree, commands, results and hashes are recorded in `verification.json` and shared `/Users/josek0514/.codex/backend-completion-20261109/parallel-progress.json`; a source-bound acceptance run must use the clean committed candidate.

- `observer-red.log`: inert observer scaffold, four meaningful assertion failures including a real occupied-port child that still exits1 with the original generic stderr but produces no diagnostic event.
- `focused-green.log`: actual occupied-port error observed without changing the original exit/stdout/stderr; real listening and HTTP body/cleanup; unchanged error listener count; bounded unknown/repeated events with no private strings; unhandled server/pre-listener failures remain nonzero; closed IPC cannot break serving/shutdown; malformed IPC is rejected and normal import leaves the parent untouched. Existing managed host/runtime/compiled-preflight tests also run.
- `typecheck-final.log`: final typecheck result. Earlier test-helper overload/environment typing failures are retained in the initial typecheck logs, corrected without suppressions.
- Final clean actual acceptance must rebuild and execute the compiled host and extract/execute the monitor ZIP. Separately controlled selected-port occupation must still fail the200 assertion and record actual `EADDRINUSE`; a controlled wrong-source child must still fail without inventing a server event. Those controls distinguish actual native bind failure from a pre-listener rejection; neither is evidence of the original DF66 cause.
- Full default-suite results, changed-file lint and source cleanliness are recorded with their actual tested source. No database/browser/cloud/provider/model work is needed for this acceptance-only change. The shared heavy-run slot is used serially.

The controlled faults live outside the repository, do not change the compiled host, and are not installed in the normal candidate. No assertion was weakened, no artifact execution skipped, and no unchanged success was relabeled a fix. Any new unforced failure must retain its new source and `startup-failure.json` for diagnosis.

## Positions and next gate

Engineering recommends the minimal check-only observation repair; runtime behavior and port selection are unchanged. Security keeps secret data out of diagnostics and scopes instrumentation to the explicitly preloaded owned child. Technical assurance retains the historical unknown and requires actual failure controls plus clean package execution. Governance release impact is **CONDITION / Production HOLD**; local success does not supply hosted authorization. The coordinator's independent reviewer decides acceptance of the candidate; this handoff does not self-close that review or the separate CI D2 browser failure.

Integrate only this detached candidate after review/source reconciliation, then rerun required combined-head gates and rebuild packages with that combined SHA. Earlier DF66/D75 evidence keeps its original labels. No push, merge, deployment, cloud change, native work or real delivery occurred in this track.
