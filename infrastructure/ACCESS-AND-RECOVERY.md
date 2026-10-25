# Access and recovery

Working draft v0.1 · 2026-10-25 · Owner: NEVORA Operations Lead · Engineering: Claude / Engineering Lead. Preparation: READY_FOR_REVIEW; operational checks: NOT_STARTED. See the [infrastructure plan](INFRASTRUCTURE-PLAN.md), [inventory](SERVICE-INVENTORY.csv) and [launch checklist](../acceptance/LAUNCH-CHECKLIST.md).

Record requirements and custody, never credential values. No usable database/Vercel credentials were available; earlier deployment/API access was blocked403 before a draft permission request. Saved draft settings and provider grants remain unverified. No live operation occurred here.

## Proposed least-privilege responsibilities

These operating responsibilities add no application permission levels. Name people and verify provider permissions before enrollment.

| Responsibility | Proposed scope | Boundary |
| --- | --- | --- |
| Jose / Business Owner | Legal account ownership, billing decisions, final production authorization, recovery custodians | Do not share the primary owner login |
| NEVORA Operations Lead | Inventory, approved support routing, redacted monitoring and recovery coordination | Read-only provider visibility by default; no routine database writes |
| Claude / Engineering Lead | Candidate, configuration requirements, migration/rollback review, isolated technical verification | Production execution only within explicit authorization and target custody |
| Authorized deployment/migration operator | Temporary permissions for one approved release/environment | Distinct from routine runtime access; revoke elevated access afterwards |
| Customer Owner / Customer Manager | Application access within the company's documented authorization scope | No provider-console, infrastructure-secret or cross-company access by default |

Use named accounts, provider-supported MFA/passkeys, scoped delegation and audit trails. Give independent reviewers access for their assigned checks. Jose appoints a recovery delegate; avoid reliance on one mailbox/device. Provider support for these divisions remains pending.

## Credential requirement metadata

Record environment, account ID, custodian, consumers, secret-store record ID, creation/review date, expiry, rotation dependency and evidence reference. Record IDs must contain no token or sharing link. Keep credential values, connection strings, MFA seeds, recovery codes and proofs outside this pack.

| Requirement | Allowed consumer / review point |
| --- | --- |
| Provider human access and recovery factors | Named owner/delegate; verify recovery custody and organizational ownership |
| `DATABASE_URL` | Approved application runtime for exactly one company/environment; inspect grants privately |
| `NEVORA_SETUP_ENVIRONMENT`, setup database name and URL | Authorized fresh-install operator; exact explicit empty target, no runtime-URL fallback; production setup requires certificate verification |
| `BOOTSTRAP_*` private Owner fields | Canonical installer or reviewed existing-company Owner bootstrap only; restrict and remove temporary copies after the authorized operation |
| Shared invitation/recovery SMTP credentials and sender | Independently verified approved provider/sender, TLS, DNS and canonical origin |
| `NEVORA_INVITATION_DELIVERY_ENABLED` | Approved exact `true` setting plus valid transport; required for first-activation cohorts; absence is BLOCKED |
| Push VAPID, subscription encryption, worker authentication | Separately authorized environment/worker; no test subscriptions or allowlists in Production |
| Clocker PIN key and origin | Approved Clocker runtime; key identity is continuity-sensitive and must not be casually rotated |
| Passkey RP/origin and build flag, portal origin | Approved exact hostname/origin; these are configuration metadata, not secret values; activation remains separately gated |

Reconcile setting names across `.env.example`, invitation delivery source and the runbook. Inventory names/status without values. Never put secrets in `NEXT_PUBLIC_*`. Exclude test capture, forced-error and owned-test transport settings from Production; source cannot prove live absence. Deferred tenant principals cannot replace the single-company runtime. Email provider acceptance is not mailbox receipt, activation or first sign-in; evidence each separately. Assisted recovery does not replace first activation.

## Enrollment, review and offboarding

Entry: Jose confirms account holder, environment, named role and custodian. Identify the provider account/domain before accepting invitations. Use provider-native invitations and a separately verified communication channel; never request passwords or verification/recovery codes by email. Keep recovery factors in controlled custody with an approved delegate and a documented lost-device path.

After enrollment, verify permission scope/MFA and update inventory verifier/date/evidence fields with a sanitized receipt. Review before release, on duty changes and at an agreed interval. Keep NOT_STARTED until evidenced.

On departure or suspected compromise, Jose and Operations identify all accounts, sessions, integration grants and secrets the person could access. Revoke named access, cancel pending invitations, transfer ownership/billing custody and rotate exposed material under Claude's continuity review. Check app accounts separately from provider accounts. Preserve necessary audit evidence without copying personal records. Record owner, completed actions, remaining exposure and evidence; escalate inability to revoke or recover an owner account to Jose. No blanket key rotation or destructive cleanup is implied by this draft.

## Tabletop recovery procedure — NOT_RUN

Operations coordinates isolated recovery planning; Claude validates schema/application compatibility; Jose decides live-data, risk and cutover questions. This tabletop contains no executable commands.

1. **Define the exercise.** Agree the incident scenario, company, candidate/schema, objectives, participants, evidence custodian and stop conditions. RPO/RTO are undecided. Record the provider's actual recoverable range and copy expiry; the historical six-hour policy statement proves neither.
2. **Prove isolation before any future execution.** Coordinate a new disposable target with Claude so his UI/backend work is unaffected. Establish project/branch/database identity, ownership, credentials, region, restricted connectivity and disposal responsibility. Use fictional data for rehearsal. Live-data recovery needs its own authorized handling plan. Stop if identity or isolation is uncertain; never reuse or reset a friend's existing database.
3. **Select recovery material.** Privately identify the restore point or logical backup, integrity evidence, encryption/key dependencies and expiry. Preserve the previous app artifact and environment metadata. Do not place backups, payroll records or connection strings in this pack. The PR16 local rehearsal is historical evidence for its candidate only; hosted Neon recovery still needs proof.
4. **Walk through restoration.** The future authorized operator follows reviewed provider instructions into the isolated target, records timing and failures, and verifies schema against the frozen canonical `db/migrations/order.ts`. For a new empty installation, use `scripts/setup-company.mts` / `scripts/company-setup.ts`; this is never an existing-database upgrade or reset method. Never derive order from filenames or apply held Phase F files.
5. **Evaluate recovery behavior.** Claude reviews application compatibility, record integrity, role boundaries, revoked sessions/passkeys, deletion restrictions, notification preferences and delivery suppression using synthetic cases. Keep workers/outbound delivery disabled in the isolated target. Identify legitimate writes after the restore point that would need reconciliation. Restoration must not silently reactivate deleted access or resend old jobs.
6. **Decide and close.** Record actual recovery time, measured loss window, failures, retention/disposal receipt and sanitized evidence. A tabletop discussion does not earn PASS or VERIFIED. Cutover, production environment changes, schema reversal and real delivery remain separate authorized actions. Jose decides material data-loss/risk acceptance; independent reviewers close their own findings.

Exit conditions for operational readiness: verified access custody, approved objectives, a successful coordinated isolated recovery with compatible frozen application, documented reconciliation/rollback boundaries, completed evidence and [launch-checklist acceptance](../acceptance/LAUNCH-CHECKLIST.md). If any mandatory item is missing, readiness remains BLOCKED. Preferred rollback preserves additive schema, revocations, choices and audit history under the repository runbook rather than improvising destructive reversal.

Sources: reference SHA `8e9073974b52053e557382ec5199dbce9d5aa32c`; `.env.example`, `scripts/company-setup.ts`, `db/migrations/order.ts`, `src/lib/legal/policies.ts`, `src/lib/auth/mail-transport.server.ts`, `src/lib/auth/invitations/delivery.server.ts`, the deployment runbook and October 21 PR16 rehearsal record. No new uptime, response, backup-expiry or delivery guarantee is created.
