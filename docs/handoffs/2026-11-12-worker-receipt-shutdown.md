# Worker receipt shutdown and remaining backend acceptance

Owner: Codex backend/hosting. Claude retains UI. SCRUM-190 is the tracking issue.
Baseline: freshly fetched development `32f7c9df67492f2d847b5a64d28de5b3a08b7c91`.
Development is the primary operating and acceptance release under Jose's
November 12 policy. Promote the exact verified combined release to real
main/production only after Jose's approval. Preserve truthful environment and
fictional-data labels. Native applications remain outside this work.

## Proven local defect and repair

The operations CLI wrote its terminal receipt with `console.log`, then removed
its SIGTERM handler before the asynchronous pipe write necessarily completed.
A shutdown in that interval could lose the parent-visible receipt despite a
terminal on-disk receipt and an absent command lock. The parent correctly kept
unknown custody closed, preventing an automatic restart.

The CLI now awaits the write callback before removing shutdown handlers. An
actual-process regression uses an owned PostgreSQL-protocol rejection, the
canonical payroll CLI, a delayed output boundary and an actual SIGTERM. Before
the repair, the worker persisted failed/cleanupConfirmed=true, but the parent
lost the receipt and retained host.lock. Afterward, the same rejection remains
unhealthy, the parent receives the bound receipt and the same state directory
can acquire a new host lease. No job, assertion, receipt-binding or cleanup guard
is bypassed. Other started/unknown work continues to retain custody.

New bounded run/health custody diagnostics distinguish process cleanup,
receipt binding and invocation exceptions. Filesystem release failures have a
separate event. Child stdout/stderr, exception messages and environment values
are never included in these events.

This proves a reproducible race. The earlier hosted source-32 trigger is still
unproven: its generic log did not preserve these boundary flags. Do not describe
the prior retained hosted marker as safely recoverable from this local test.

## Validation and release custody

Regression evidence is retained under
`/Users/josek0514/.codex/nevora-worker-quota-repair-20261112/`:
`receipt-flush-red.log`, `receipt-flush-green.log`,
`custody-diagnostic-red.log`, `operations-regression.log` and the subsequent
source-bound qualification/review/Actions receipts. The focused operations/Neon
run passed 359 tests; typecheck passed. Final local and cloud qualification must
be recorded against the frozen repair SHA before development delivery.

Engineering recommends the bounded receipt-drain repair. Security and
governance require unchanged unknown-custody retention, no raw-output logging,
source-bound release gates and explicit hosted capacity authority. Delivery
must keep implementation, local checks, development publication and hosted
acceptance as separate states. No independent audit finding is self-closed.

## Hosted gate and exact environment

Read-only November 12 provider checks confirmed:

- Control `damp-haze-17022523`: Free; active 21600/21600 seconds,
  compute 5440/5400 seconds. Its configured finite test quota is exhausted.
- Original fictional A `divine-mode-79850636`: active 10332, cap 7200.
- Original fictional B `soft-meadow-67826582`: active 8280, cap 3600.
- Dedicated Render `srv-dbqqnktbedkc73ef2k60` in
  `tea-dbmr3t6c6qcc73cbf0jg`: suspended, auto-deploy off. The retained marker
  `e2049b2c-bb21-41dc-bbe9-fcd2f8835f18` remains untouched.

The previous 30-minute authorization expired. Any new run needs available
approved capacity and fresh explicit finite runtime approval. Prepare the
exact candidate host/monitor artifacts first; recheck quota, current source,
snapshot and actual queue/lease/process custody before any recovery. Close
processing/schedules/mail, restore original caps and suspend before the new
deadline. Do not create replacement companies, change plans or erase locks
to bypass the gate.

## Remaining acceptance

Run the owned PostgreSQL payroll PDF/publication/private-access and retry
suites, notifications delivery/retry/authorization suites, and Stripe
SDK/fictional-transport subscription/payment/risk suites against the repair.
These validate local backend behavior, not hosted providers or real inboxes.
Hosted payroll PDF/share, employee web-push/reminders, Stripe failure/lifecycle,
monitor journal readback and restart remain open until actual bounded evidence.
Normal Owner setup/password entry and combined UI acceptance require Jose and
Claude. Tax remains pending Jose's registration decision.

Velani invoicing remains the approved Owner-reviewed Stripe Dashboard / Hosted
Invoice Page workflow, with drafts `auto_advance=false`, documented in
`2026-11-11-codex-to-claude-payments-billing.md`. There is no approved new
automated invoicing API to implement. Test only fictional sandbox invoices
under the approved hosted scope; real finalization/sends require approved
client/project, quote, currency, due date and Tax treatment.
