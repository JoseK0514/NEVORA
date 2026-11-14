# R13 correction payment export refusal

Baseline `4efc4011a`; local implementation only. No supported provider delta or
replacement semantics were established. The conservative contract is refusal:
`CORRECTION_PAYMENT_EXPORT_UNAVAILABLE` (409) for a correction run's payment
command, including exact historical-operation replay and receipt lookup. The pure
document builder enforces the same rule. Existing stored correction payment
documents cannot be downloaded through the authorized document endpoint (404).
Immutable historical documents/receipts remain intact for controlled audit.

Original approved provider-import payroll still exports its exact unverified
payment-instruction artifact and replays the same operation. Native recorded-time
payroll retains `NATIVE_PAYMENT_EXPORT_UNAVAILABLE`; neither path proves provider
acceptance, payment submission or money movement. Correction statements and
publication/replacement links remain available under their existing controls.

Evidence in `/Users/josek0514/.codex/release-completion-20261111/r12-r13-r16/`:
`r13-doc-red`, `r13-sql-red`, `r13-historical-red` reproduce the unsafe generation
and recovery behavior. `r13-doc-green`: 6 focused checks. `r13-sql-green`: all 39
existing/new configurable payroll SQL checks passed in fresh owned local PG17.10,
including original exact replay, PDFs/person scope, grants/revocation, corrections
and historical artifact quarantine. No skipped checks in that complete SQL run.
Combined full static/default/build and independent review remain the coordinator's
gate; this handoff does not claim them.

Engineering/security: one shared policy, applied before recovery as well as fresh
generation; current role/object guards retained. Product/governance: refusal
instead of invented accounting rules. No migration, provider call, notification,
customer data, hosted/native/production change or Actions/push. No new Jose
policy decision required for the approved conservative refusal.

Claude/operator integration: show this 409 as an unsupported correction payment
export, never as a retryable pending payment. Reconcile any previously downloaded
correction instructions with the existing payment system and accountant; NEVORA
does not replace, cancel or submit those files. Do not synthesize deltas from these
full-net artifacts. No actual provider/accountant acceptance is claimed.
