# Customer data responsibility worksheet

**Working draft v0.1 · READY_FOR_REVIEW.** Complete with references and decisions, not employee records. No new data collection is authorized. VELANI LLC operates NEVORA and processes workplace records on the employer's documented instructions. The employer decides workplace use and remains responsible for employment decisions, payroll accuracy, notices and its recordkeeping. VELANI LLC handles information it controls for its own business purposes, including direct support communications and service administration. These are existing policy allocations, not a newly adopted legal agreement.

## Authority and intake

| Required confirmation | Reference / responsible role / status |
| --- | --- |
| Employer entity, configured company and participating workforce | [ ] / Customer Owner / NOT_STARTED |
| Authorized instruction giver, role and authority evidence | [ ] / Customer Owner / NOT_STARTED |
| NEVORA request coordinator and employer privacy contact | [role/contact reference] / Operations Lead / NOT_STARTED |
| Included workflows and necessary existing data categories | [scope reference] / Onboarding Lead / NOT_STARTED |
| Workplace notices and employer retention obligations | [review reference] / Customer Owner / NOT_STARTED |
| Role/location access and payroll access, where applicable | [approval reference] / Customer Owner / NOT_STARTED |

Employee requests concern their own information; they do not authorize workspace closure or another person's export. Customer administrators act only within verified organizational authority and application permissions. Manager status does not grant Owner authority; Lead status does not grant Manager access. Verify the requester without collecting identity documents in this worksheet or requesting passwords/codes. Record the verification outcome and secure case reference only. Concerns about an administrator may go directly to NEVORA support.

## Provider and lifecycle checks

| Policy-described service | Purpose | Outstanding operational evidence |
| --- | --- | --- |
| Vercel | Application hosting and servers | Active project, deployment, access, logs and region configuration |
| Neon | Database | Active database/branch, access, region and restore/backup lifecycle |
| Transactional email provider; identity to confirm internally | Recovery codes and account email | Actual provider, enabled delivery, processing locations, retention and removal route |
| Browser push service, such as Apple, Google or Mozilla | Opt-in notifications | Actual device/provider path, subscriptions, retention and removal route |

Runtime verification is pending. Record evidence [ ], owner [ ], date [ ], result [ ]. This worksheet authorizes no provider additions or purchases.

Use `POLICY_FACTS.RETENTION_SCHEDULE`, `HOSTING_TRANSFER_DETAILS`, `BACKUP_EXPIRY` and the Privacy/Account deletion sections in `src/lib/legal/policies.ts` as authority. Current wording places database/application servers in Northern Virginia, United States, with possible processing elsewhere by email, push, logs and support. Its six-hour restore-history statement is historical policy wording with maximum backup/export-copy lifetime still being verified; it is not verified configuration or a recovery guarantee. Do not replace those commitments with guessed periods or residency claims. Confirm employer obligations and longer applicable requirements through appropriate review.

## Requests and offboarding

Log only case reference [ ], requester/authority result [ ], scope [ ], workplace versus VELANI-controlled category [ ], assigned owner [ ], policy version [ ], review/response evidence [ ] and status [ ]. Coordinate workplace record requests with the employer; VELANI assists with locating, correcting, exporting or deleting information where appropriate. Employer coordination must not silently remove existing individual privacy routes or protections.

For exports, verify authority, supported format and scope with Engineering; agree recipient, secure delivery and acknowledgment. No comprehensive export capability or delivery deadline is presumed. For deletion, use existing Profile/account-deletion and support routes. Policy aims to complete eligible requests within 30 calendar days after receipt, with identity confirmation and explanations of retained information or permitted additional time. `docs/compliance/README.md` describes operator completion through the runbook rather than a verified automatic purge. Confirm current deployment prerequisites before promising execution.

For customer closure, confirm authorized instruction, ownership handover, final export/reconciliation, access cutoff and remaining records; coordinate copies held by relevant providers. Individual deletion leaves the company workspace open. Document legal holds, retention justification, restricted access, disposition evidence and final customer communication through the controlled case process. Do not equate disabled access with deletion or delete retained workplace records automatically.

Use [service responsibilities](SERVICE-RESPONSIBILITIES-DRAFT.md) and [support procedures](../support-training/SUPPORT-PROCEDURES.md). Operations Lead escalates authority conflicts, policy changes and missing provider evidence to Jose and legal/commercial review. Exit: completed references and assigned open actions. Baseline: SHA `8e9073974b52053e557382ec5199dbce9d5aa32c`; reconcile policy and runtime evidence before onboarding.
