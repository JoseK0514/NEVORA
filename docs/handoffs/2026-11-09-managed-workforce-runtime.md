# Managed web workforce runtime — qualification and activation handoff

November11 source reconciliation: the credential-recovery limitation below is the
dated November9 state, preserved as history. The later [company-specific enrollment
implementation](../../ops/workforce/ENROLLMENT-RUNBOOK.md) now provides a root-free
worker-host custody path. It still requires fresh source/artifact bindings,
restricted issuer/reader admission, private custody and separately authorized hosted
acceptance. This addendum does not relabel the original tests, run the pilot or
approve host/monitor activation.

Jose approved completion of the remaining web backend and excluded native applications/push. This phase adds a dedicated payroll/web-notification host and an independent aggregate monitor. Claude retains product UI ownership. Production remains on hold. It does not add employee bank transfers, tax filing, Manager Rondo, CSV commit authority or universal autonomous Owner replacement.

## Delivered source

Runtime candidate: `4ff2dee0b6908eca45b84bbba57ce1820d1891a2`, descended from development `8ddf3e46`. The added host invokes the existing finite one-shot commands serially, with curated per-company environments, pinned staging destinations, private durable state, singleton/command locks and bounded real-process cancellation. Its public interface offers readiness and HMAC-protected aggregate health; there is no public command route. Clean builds embed and validate source SHA.

The separate monitor requires a direct unpooled journal connection, obtains the session lock before sampling and authenticates response bytes against the request nonce. Forced session-user RLS isolates its aggregate incident/notice/attempt tables. Durable SMTP intent precedes sending; ambiguous acknowledgement never triggers automatic resend. Definite failures have bounded retries and daily limits. SMTP stays off and is fixed to support@thevelani.com.

Monitor and scoped WORKER-reader admission share one fixed metadata policy, including named/PUBLIC privileges, protected catalog routine/table/column baseline checks, normal-object provenance, schema/database rights, membership, ownership, sequences, large objects, grant options, parameter and foreign-resource authority. The check performs no automatic shared revokes. Excessive existing defaults can deliberately block activation until a separately reviewed operator adjustment.

## Qualification and independent findings

The whole-change independent review at `4217a91d` reproduced six Important defects. Its original report is preserved. Findings 1, 2, 4, 5 and 6 were independently closed at `4e8a00a4`. Finding 3 required further owned PostgreSQL adversaries, reproduced before correction. Candidate `4ff2dee0` passes 26/26 real SQL cases, including both legitimate scoped principals and rejected excessive privileges before setup/monitor sampling. Independent closure at `4ff2dee0` confirmed both real logins retained legitimate access and all adversarial admissions were denied. All six Important findings are independently closed. The [completion receipt](workforce-evidence-20261109/completion-receipt.json) and unchanged copied QA addenda preserve exact source and evidence hashes.

Full default suite: **11,602 passed, zero failed**, with 857 skipped and 55 pending assertion records. All six clean-source acceptance steps passed: inventory, manifest, 163 onboarding SQL, 505 Company Access foundation, 36 exchange and actual packaged host/monitor checks. Typecheck and changed lint exited zero; runtime inventory passed 5/5.

Raw evidence root: `/Users/josek0514/.codex/backend-completion-20261109/`. The mandatory onboarding acceptance now has six steps, including actual compiled closed-host HTTP/shutdown and extracted monitor ZIP verification. Current runtime inventory classifies every new transport. Local passing tests do not attest hosted uptime, delivery, business tax facts or production recovery.

The preceding development CI at `8ddf3e46` passed 15/17 jobs; D2 WebKit reported an `/api/notifications` access-control runtime error and the aggregate evidence job consequently failed. The unchanged local D2 replay at `4217a91d` passed 282 checks. That replay is retained as a local result and does not close the hosted failure. Exact integrated-head CI is a separate gate.

## Actual cloud and credential state

No new paid service, database principal, monitor migration, trigger, worker secret, real alert or push delivery has been activated by this phase. Existing native Render service `srv-dbmsjuui0phs73co1oq0` remains excluded. Existing six Neon function deployment IDs and disabled schedules retain their historical source identities.

Jose selected Render workspace `tea-dbmr3t6c6qcc73cbf0jg`, a $10/month incremental ceiling and support@thevelani.com. The reviewed YAML proposes exactly one separate small Node service and 1 GB disk, auto-deployment off, processing initially closed. Actual Render planning/cost and authorization to apply the reviewed plan remain distinct; a cost cap is not deployment approval under the tool contract. Do not buy an idle service while worker custody is unavailable.

The authorized metadata coordination found only write-only copies of the current staging onboarding-encryption and commerce-worker-binding roots; the old transfer directory is empty and no approved recoverable store item was identified. Jose answered “Not sure” about an original backup. Root separately queried the explicit staging control database and observed no exact A/B worker-reader roles or monitor-role pattern. Expected role names are not evidence that credentials exist.

Preserve the older isolated Production-target Vercel root. Do not export/log old keys, install a temporary debug endpoint, borrow APP/Owner credentials or silently reset/rotate an epoch. The [separate credential-recovery proposal](workforce-evidence-20261109/credential-recovery-proposal.md) records the required next engineering gate: a concrete design, reviewed implementation and local rehearsal of per-company enrollment or staged guarded re-encryption/binding rotation, followed by specific hosted authorization. That recovery mechanism is not implemented or approved by this handoff. Metadata handoff: `/Users/josek0514/.codex/visualizations/2026/11/01/01a1996a-6fe1-7600-8e90-09a319655a96/nevora-worker-custody-20261109/README.md`.

## Remaining gates and ownership

| Gate | Owner and closure evidence |
|---|---|
| Current-source qualification | Backend: independent closure and clean compiled/archive acceptance passed at the runtime candidate; exact integrated-head CI remains a separate gate. |
| Recoverable staging worker custody | Backend/security + Jose: approved store/current epoch, or separately reviewed and rehearsed recovery implementation before any hosted key action. |
| Hosted operations | Backend/operator: scoped reader/monitor principals, control migration, approved Render plan, actual trigger/authentication/disk/shutdown and bounded fictional workload qualification. |
| Alerts and response | Jose/operations: assign a staffed responder; authorize the exact finite test to the selected support inbox, distinguish SMTP acceptance from delivery/inbox observation and observe outage/recovery. |
| Combined NEVORA/VELANI acceptance | Claude + backend + independent QA: current combined authenticated UI flows on verified isolated staging. VELANI Preview still shares Production database configuration; do not mutate it as if isolated. |
| Deletion fulfillment | Operations: verified pre-request contact source, staffed manual fulfillment/withdrawal and provider/log/backup evidence. Intake/guarded withdrawal SQL is already tested; automatic erasure is not shipped. |
| Business configuration and 2027 payroll | Jose/advisers + backend: actual merchant/employer facts, qualified year-specific PR rules/YTD/cent policies before the first applicable payday. Unsupported-year guard remains. |
| Production | Jose: final source/environment/recovery release gates and separate explicit authorization. |

The two original A/B test companies already received the separately approved memory migration and actual restored-snapshot verification. Only the two expressly approved temporary restore branches were deleted; original companies and provider-expiring snapshots were preserved. Do not repeat that migration or relabel old bootstrap receipts to the new runtime.

## Deferred minors and decisions

Two Minor findings remain deferred: a deliberately disabled host drops its health key so an active observer classifies it as invalid instead of disabled (planned drains pause the observer first); the monitor entry has one anonymous-default-export ESLint warning, zero errors. They were not folded into the Important fix pass.

Key decisions: use a health-only web host for independent host-down observation; design for Render's disk-backed 30-second shutdown and preserve uncertain locks; reuse the canonical notification readiness parser; keep the monitor migration operator-only; pin test destinations in source; lock before sampling through bounded SMTP; share the corrected machine-principal policy; and reject unrecognized catalog provenance. The cost of the fail-closed choices is explicit operator recovery/requalification or a skipped concurrent tick, rather than silent admission or uncertain concurrent processing. Ledger and source history retain the detailed rulings. This plan's workspace remains preserved because activation and delivery steps are still open.
