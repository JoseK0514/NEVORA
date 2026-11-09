# Batch03 — Approved deletion support path

Local implementation verified at036c7a8e. Jose approved the exact receipt sentence4.3 and verification method4.4. Existing final password/current-session guard stays intact.

RED at3072a5d9: two receipt assertions fail because the sentence is missing; two owned SQL cases fail because the runbook has no guarded withdrawal statement. All original9 UI and12 SQL cases pass. Logs retained externally.

Repair: received and duplicate receipts now say “Changed your mind? Contact support before the request is processed.” They retain the reference-specific support link and offer no in-app withdrawal. No new permission, restored access or deletion endpoint.

The runbook requires control of the account email recorded before the request plus the matching Employee ID. Operators initiate a single-use challenge to that historical destination; From/ID/reference alone is not verification. Engineering control:15-minute expiry and minimal restricted verification record, never a password or copied proof in repository/chat. This expiry is an implementation control, not a newly inferred Jose business-policy answer.

The exactref/workspace/EmployeeID received-only UPDATE RETURNING is rehearsed against disposable PostgreSQL. Wrong account/workspace, repeated attempts and processing state produce no withdrawal. Revoked sessions/calendar feeds stay revoked. Post-verification live transport ambiguity remains unknown until exact-request reconciliation; documentation-only lost-reply guidance added after verification without changing the tested SQL bytes (hash in results).

Operational gate: migration0034 deliberately keeps no historical email snapshot. Support must establish the pre-request address from an authorized trustworthy historical source; it cannot substitute an edited profile/current conversation address. If unavailable, do not withdraw and escalate to Jose. No new personal-data storage, production withdrawal, provider delivery or operational mailbox verification was performed.

GREEN:11 UI tests,14 owned SQL cases and the original3-engine browser journey pass (15 owned tests total).39 journey checks,110 viewport captures,198 contrast samples (minimum5.0289:1). No pageerrors/unexpected console errors; one intentionally aborted lost-reply error and five WebKit preload warnings are preserved. Physical-device/AT, later erasure and original-author finding closures remain separate.

Default10,221 passed/0 failed/801 pending; full nonincremental TypeScript, owned startup and source-bound build exit0. Initial full lint caught three style errors in an ignored future-test draft; corrected JSX and full lint rerun exits0. Tracked application code stayed unchanged. Both original failure and repair logs remain.

Also repaired the new Access workflow after its first hosted run40944082224 failed before creating any jobs. GitHub does not expose runner context at job.env; the external evidence path now lives in the test step. See CI-ATTEMPTS.json. An Actions pass is still required and is not inferred from YAML parsing or local results.

External evidence: outputs/release-1-20261029/{deletion-policy-ui-red.log,deletion-policy-sql-red.log,batch03-deletion,batch03-static,batch03-lint-repair.log}.
