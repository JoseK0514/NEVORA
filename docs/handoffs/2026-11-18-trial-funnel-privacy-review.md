# Trial funnel proposal for privacy review

Status on November 18, 2026. The aggregate reader is implemented for synthetic verification. Collection and live reporting are disabled. The change adds no instrumentation, route, event table, destination, provider integration or scheduled job.

## Cohort and source contracts

Each row covers one completed Monday–Sunday UTC request cohort and one environment. The denominator is one admitted self-service registration per durable registration record. Resends, quiet duplicates and operation retries follow the existing registration identity. Imported or legacy slot trials sit outside this cohort. Re-registrations that create a distinct record count as new attempts, so the denominator measures registrations rather than unique people.

| Metric | Existing evidence |
| --- | --- |
| Requested | A row created in `nevora_onboarding.registrations` during the cohort. |
| Verified | `registrations.verified_at` is recorded. |
| Workspace reserved | The environment-matching `workspace_registry` link exists. |
| Trial started | Commerce has an onboarding enrollment and `businesses.trial_started_at` for the linked workspace. |
| Owner activated | The matching `provisioning_operations.state` is `ACTIVATED`. This is an onboarding diagnostic and may differ from Commerce enrollment. |
| Checkout created | At least one linked `commerce.checkout_intents` row contains a provider session reference. This measures a created session. |
| Paid conversion | A linked trial has Commerce `paid_through` evidence. Existing reconciliation requires a positive paid invoice and a matching plan, with tax validation where configured. Repeated invoices still contribute one conversion. |

Request-to-paid is paid / requested. Trial-to-paid is paid / trial started and is unavailable when zero trials started. Rates are fractions. A valid zero count stays zero. Source failure yields `unavailable`; suppression yields `suppressed` without totals or rates. `observedOn` is the UTC date of the read. Commerce retains the paid-through marker, but the first invoice timestamp is absent from this read contract. Time-to-pay, conversion within a fixed number of days and a historical as-of query require a separately reviewed source. Recent cohorts can continue to convert. Control and Commerce have independent read times and enrollment or invoice reconciliation can lag.

## Review and enablement

- **Purpose and access** — Measure onboarding and conversion at the product level. Approve who can execute the report and receive aggregates. Use dedicated read-only principals scoped to the two projections and confirm the environment and workspace identity mapping. Customer-facing portal users have no reporting surface.
- **Fields and handling** — Input projections carry the workspace UUID only for a server-side in-memory join and boolean milestones. Output is limited to cohort bounds, observation day, aggregate counts and rates. Keep query arguments, row payloads and join IDs out of logs, exports and reporting storage. Approve purpose, notices, retention, deletion handling and any destination before wiring a live source.
- **Disclosure** — The proposal suppresses a cohort below 10 requests or any nonempty combination of milestone values below 10. Release only fixed, non-overlapping weekly cohorts without filters or breakdowns. Review repeated-release and maturity policy before publication because counts from the same cohort on different days can reveal individual changes. The threshold and publication cadence require privacy approval.
- **Acceptance** — Run with restricted fixtures that include duplicate checkout rows, zero-dollar or unconfirmed billing upstream, missing links, an environment mismatch, suppressed cohorts and source failure. Test the existing Commerce paid-evidence rules alongside the report. Confirm an approved retention and withdrawal process and a way to turn off the job before enabling any live reporting.

Read contracts are in `src/lib/activation/trial-funnel.server.ts`. The operational sources are `src/lib/onboarding/registration.server.ts`, `src/lib/onboarding/owner-activation.server.ts`, and `services/commerce/{store,checkout,stripe}.ts`.
