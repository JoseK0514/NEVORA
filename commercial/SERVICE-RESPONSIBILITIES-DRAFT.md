# Service responsibilities — draft schedule

**Nonbinding working draft v0.1 · READY_FOR_REVIEW.** This worksheet is not an agreement, activation or production approval. New terms need Jose and appropriate commercial/legal review before being sent as binding terms. Existing public-policy commitments constrain this draft; resolve conflicts through review.

Company/customer entity: [ ]; authorized Customer Owner: [ ]; NEVORA Onboarding Lead: [ ]; Operations Lead: [ ]; quote/version: [ ]; selected release and environment evidence: [ ].

## Scope to agree

One configured company per database, with locations [ ], people [ ] and roles Owner, Manager, Lead and Employee. There is no assumed parent account administering separate businesses. Confirm each separate company's scope and architecture before quoting it.

| Scope item | Include / exclude / release evidence |
| --- | --- |
| Scheduling, attendance, Clocker and approvals | [ ] |
| Optional modules: time off; shift swaps/cover; updates; breaks on Clocker | [ ] |
| Payroll preparation, exports or pay statements, if applicable | [specific deliverable and verification] |
| Setup, configuration, training and supported devices | [deliverables, customer dependencies, acceptance] |
| Commercial seat/unit definition | [counting rule; roles, inactive people, invitations, measurement date] |

Modules are configuration choices, not verified paid-plan entitlements. Verify each included workflow before activation. Payroll-related scope must identify actual outputs and customer review; this draft does not offer payroll payment execution or tax filing. SaaS signup, billing automation, SSO, employee CSV import and multi-company switching are not established deliverables.

## Responsibility allocation

| Owner role | Working responsibility |
| --- | --- |
| NEVORA Onboarding Lead | Coordinate agreed setup and training, document configuration, acceptance evidence and customer handoff. |
| NEVORA Operations Lead | Coordinate technical/support intake, incident escalation and privacy/export/deletion requests under existing procedures. Track provider and operational verification gaps. |
| Claude / Engineering Lead | Supply release capability and hosted-verification evidence; resolve engineering dependencies through the application workstream. |
| Customer Owner | Authorize workplace use and administrators; validate company, location and employee details; assign appropriate access; approve configuration and completed onboarding. |
| Customer Manager | Operate within granted permissions, review workplace corrections and escalate access or operational issues. A commercial contact title grants no additional application permission. |
| Customer employer | Own employment decisions, payroll accuracy, required workplace notices and recordkeeping obligations. Validate records and exports before downstream use. |
| Employee | Use personal credentials and authorized access; raise workplace questions through the employer and technical/privacy concerns through appropriate channels. |

Use [DATA-RESPONSIBILITY-WORKSHEET.md](DATA-RESPONSIBILITY-WORKSHEET.md) for authority and data coordination. Customer sign-off records acceptance evidence; it does not certify legal compliance or release readiness.

## Support and changes

Follow [SUPPORT-PROCEDURES.md](../support-training/SUPPORT-PROCEDURES.md), the application's `/support` and `support@thevelani.com`. Preserve the policy wording: “We aim to respond to support and privacy inquiries within two business days. Business days are Monday through Friday, excluding public holidays observed in Puerto Rico. Requests that need investigation may take longer to resolve.” This is an aim, not a guaranteed response or resolution deadline. No uptime, recovery or breach-free guarantee is created.

Workplace schedules, pay decisions and record corrections go to the employer. Send technical support only necessary context and redacted screenshots; never passwords, verification codes, bank details or payroll documents by email.

For a scope, module, count or commercial change, record request [ ], requester/authority [ ], impact on capability, cost/price, data and training [ ], review owners [ ], approval reference [ ], effective date [ ]. Do not assume automatic metering, proration, upgrade or billing enforcement. Reconcile documented scope and actual release before accepting the change.

## Unresolved service terms

| Decision | Fillable term requiring review |
| --- | --- |
| Start and acceptance | [activation prerequisites, evidence and authorized sign-off] |
| Term and renewal | [duration and renewal mechanism, if any] |
| Cancellation and notice | [authorized requester, channel, notice and effective date] |
| Charges, disputes, refunds and overdue handling | [approved quote and reviewed process] |
| Export and transition | [authorized recipient, available format/scope, timing, access and any agreed assistance] |
| Workspace closure | [handover, final export, access cutoff, retained records and confirmation] |

Closing an organization differs from an individual's account deletion and from employment termination. Do not promise immediate destruction of records subject to retention. Reference: `src/lib/legal/policies.ts`, `docs/compliance/README.md`, `src/lib/workspace-presentation/modules.ts` and `docs/execution/single-company-20261012.md` at SHA `8e9073974b52053e557382ec5199dbce9d5aa32c`. Current deployment and provider behavior require separate evidence. Exit is a complete reviewable schedule; unresolved decisions remain open.
