# R3 publication builder, prepared version

BLOCK / REQUEST_CHANGES. Read-only review of external refresh-publication.py. It was not executed. CRITICAL: none.

HIGH — Line 63 updates the canonical contract index's application SHA but leaves sourceBinding.developmentPublicationRef (existing index line 364) pointing to failed R2. Rebind it to R3. Compare the four contract groups and twelve complete original snapshot objects to R2 and assert the counts before writing. Current code prints the counts after writing.

HIGH — Lines 11–12 admit a cohort solely by folder label and command exit code. They do not verify expected command/suite, clean source, result completeness, or equivalence of its relevant inputs to frozen HEAD. Require the actual source and result for each claimed validation and compare its relevant inputs to the freeze. A navigation pass before the last focus assertions would otherwise qualify. Keep the distinct CI and PDF gates conditional.

HIGH — Lines 54–59 check filenames for the two authorized CSS paths but never their contents against the four approved edits. Additional edits in either path would produce the same four-exception assertion. Verify the exact committed production blobs against the four individual authorized patch deltas, including the focus patch's recorded authorization digest. The existing exact gated-link byte comparison is sound. Check changed application/locked inputs from all tracked roots; the current named production prefixes omit native, among others.

MEDIUM — Lines 27–39 skip mobile-landscape-corrected-1/landscape/results.json, whose actual fields are complete, measurements, rotations and failures. Navigation 7's browser-failure-report.json and navigation-chromium-768-report.json are skipped as well. The authorization at line 51 refers to a summary that would omit the actual focus ratio. Include hashes and safe selected fields; avoid copying whole browser reports.

MEDIUM — Lines 21–25 and 43 copy every discovered command receipt/raw argv and every development review by glob to the repository. This is wider than the reviewed selection and permits future artifacts to be copied unchecked. Restrict to an explicit manifest of intended paths and accepted fields, with raw hashes for originals. No credential disclosure was established in inspected receipts. The R2 ca40-ci-failed-jobs.json only records three early failures while verification-status-current.json contains ten failed jobs across the two workflows. Preserve both and label the earlier three-job list as an interim observation.

LOW — Lines 16–53 mutate tracked evidence before later assertions at 54–58. A validation failure leaves partial writes and the clean-tree precondition then rejects retry. Precompute/validate all intended outputs before replacing the records. Immutable R2 history references should resolve to the original tagged files where active review paths are later refreshed.

The programming and remove-ai-slops perspectives identified source assertions that cannot currently detect the changes they purport to exclude. No browser or SQL suite was run, no publication files were changed, and no candidate CI conclusion was inferred.

### Revised external builder and publication-preflight.py

WATCH / REQUEST_CHANGES. The earlier HIGH defects in contract forward reference, unrestricted production path contents and exit-code-only acceptance have been addressed in the proposed source. Pinned patches reconstruct the three production blobs. The original R2 index sourceBinding now forwards to R3, and exact argv, ancestry and completed browser matrix checks precede mutation. The Mobile results and 768px failure packet are now selected for digest and summary. Existing focused receipt field shapes and argv inspected.

MEDIUM — publication-preflight.py lines 30–35, 43–45 and 51–52. Empty ownership globs and empty Home engine arrays satisfy the current tests. Assert the expected presence and matching ownership identity/closure of the owned Next and PostgreSQL packets, assert actual Chromium and WebKit in the controlled Home receipt, and require the suite value on every matrix execution to equal the specific suite being qualified. Real Attention receipts contain both resource packets and per-cell suite fields.

MEDIUM — Lines 34–36 compare only selected helpers while asserting all relevant tracked browser inputs are identical. Direct dependencies such as browser-held-response.mjs, phase-e-navigation-request.mjs and browser-response-deadline.mjs are omitted. Compare the entire tracked cohort-to-freeze delta, allowing only explicitly unrelated changes for that specific cohort, or include the complete dependency set.

MEDIUM — refresh-publication.py line 75 changes the correct forward ref, but the claimed unchanged four original groups and twelve snapshots still lack a prewrite assertion. Compare both complete arrays with the immutable R2 git blob, including their four/twelve counts. No edits to the original group or snapshot records are required.

LOW — The R2 early three-job failure list is copied beside the final two-run result without an interim label. Preserve the early record with a clear name or index explanation. Additional artifact/metadata reads and assertions still follow initial evidence writes; stage outputs or validate all mandatory inputs before mutation to keep failures retryable.

No current CRITICAL or HIGH findings. The scripts were inspected, not run. Pending mandatory cohorts and future exact-source CI retain their original gate status. Earlier review retained above.

### Final prepared-script rereview

CLEAR / APPROVE for the bounded publication preparation once the remaining preflight evidence passes. No CRITICAL, HIGH or MEDIUM findings remain. The previous LOW interim-status ambiguity is resolved. The existing operational limitation remains: a filesystem error during multi-file output could leave a partial local worktree and requires inspection before retry.

Verified the per-cell suite identity, exact matrix and custody packet counts, manifest/PG checkpoints, two distinct passing control engines, and full tracked source-delta validation with suite-specific unrelated modules. The canonical R2 four groups and twelve snapshots are compared before any repository writes and before index output. The prewrite check additionally validates each original snapshot's size, SHA-256, and exact Git blob bytes. Named historic command receipts must match expected argv. The early three-job snapshot has an explicit interim label and the final two-run status is recorded separately.

Navigation's retained d6af305afc3fe64f84562ad23899c3ba53b754af browser report showed 14 completed cells, errors empty and ownership closed. Neither publication script was executed in this review. Home completion, generated records, six regenerated PDFs, the actual immutable final commit and its mandatory CI results are distinct pending verifications. Programming and remove-ai-slops perspectives found no remaining blocking issue in these revisions. Earlier findings remain recorded above.
