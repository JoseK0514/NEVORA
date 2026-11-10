# Renewal and on-call handoff

Prepared November 10, 2026 for non-native web closeout. Jose is the initial responder and release decision maker; `support@thevelani.com` is the selected future failure-alert inbox. Mailbox access, backup responder, coverage hours and response target remain unverified/unassigned. The public two-business-day support aim in `src/lib/legal/policies.ts` is not a worker-incident response SLA. No schedule, subscription, paid service or alert is enabled by this handoff.

## Incident actions

1. Jose checks the authenticated independent observer's last tick/source, then the selected host health and private command receipts/queue health. An empty inbox cannot establish health. The observer's database/schedule/mail provider can fail independently.
2. Keep a restricted incident record: UTC time plus local timezone, environment, source/deployment, opaque company/incident/reference, aggregate queue age/counts, last successful tick and accepted/unknown/definite-failure classification. Exclude employee data, raw mail, model content, keys, endpoints and session hashes.
3. If authority/source/custody is uncertain, pause the selected observer schedule and the exact workforce processing scope through the coordinator's approved controls. Do not reset queue rows, expired leases, attempts, credentials, company incarnations or private lock files to make health green. Use [managed pause/drain/recovery](../../ops/workforce/MANAGED-RUNBOOK.md#pause-drain-and-rollback).
4. Reconcile canonical job and provider outcomes before recovery. `unknown` mail/push is not proof of non-delivery; never automatically resend it. A recovered health response does not repair failed payroll/jobs or prove all notices delivered.
5. Resume only the same approved source/scope after cleanup and principal identity are established. Observe a fresh successful tick and inspect remaining failed work. Close the incident only after recording cause/evidence, recovery and any open follow-up; management cannot self-close independent findings.

For missed monitor ticks, inspect the selected Neon schedule state, last invocation, closed flags, control quota and restricted principal without invoking a business worker as a diagnostic. Do not raise the exhausted control quota or activate Render from this track: the coordinator owns both. No new real email, push or SMS is allowed without the finite exercise approval in [web notification acceptance](web-notification-acceptance.md).

## Renewal register

Exact expiry dates, provider invoices, plan limits and private store references must be filled by the owning operator from current authenticated records. This table deliberately does not invent them. Existing closed schedules and finite pilot budgets remain closed; a renewal proposal is not approval.

| Dependency | Operator evidence to record privately | Failure/renewal action |
|---|---|---|
| Render web workforce | Selected service/source, current plan/disk/actual cost, payment owner, closed flags, monthly review date | Coordinator validates the approved ceiling and current quote before activation/renewal; no auto-upgrade or additional service |
| Neon control/company targets | Project/branch/database IDs, quota/cap/usage window, paused schedules, backup/restore and principal admission evidence | Stop before limits; coordinator obtains any quota/plan approval; no retry loop against a known exhausted cap |
| Vercel staging/web | Project/deployment/source, Node version, SSO, domains/certificates, environment target metadata | Confirm source and isolated data targets; a Preview label cannot authorize writes; rotate/migrate only through a reviewed plan |
| SMTP and support mailbox | Provider/account/sender custody reference, verified sending domain, mailbox sign-in and actual receiving proof, expiry/revocation notices | Validate credential recovery and inbox access separately; approved real outage/recovery exercise closes delivery acceptance |
| Web Push | VAPID/encryption custody references and approved environment/contact, expiry/revocation advisories | Review compatibility before rotation; drain and preserve encrypted records; re-enrollment may be needed; never silently reset enrolled identities |
| Domain/DNS/TLS | Registrar/provider ownership, renewal/auto-renew status, expiry, billing owner, certificate status | Jose decides renewal spending; record current evidence before any cutover; this task made no registration/route change |
| Payroll 2027 | Actual first payday, private input register, applicable source manifest and independent qualification | Block native 2027 use until [input/readiness gates](../operations/payroll-2027-input-readiness.md) pass |
| Retention/backup | Actual restore-history configuration, separate snapshot purpose/owner/review/delete date, request/hold register | Follow the approved policy and [deletion runbook](../compliance/account-deletion-runbook.md); no unattended purge or blanket retention extension |
| Operations monitor journal | Incident/notice/attempt inventory, proposed retention/archival and abuse-retry counters | Keep existing durable dedupe records; policy remains an explicit Production decision; do not purge as part of the pilot |

Suggested initial operating review: inspect monitor/worker freshness at each authorized pilot window and after any source/configuration change; review provider renewals before their actual expiry and costs before each bill; review deletion deadlines daily while requests exist. These are proposals for Jose's coverage decision, not a staffed service promise or a newly created automation.

## First responder checklist and remaining decisions

Before unattended activation, establish Jose's working access to the private provider dashboards, approved secret store and selected inbox without exporting credentials into chat. Rehearse stop/drain and unknown-outcome handling on the owned local fixtures; obtain the separately authorized finite hosted acceptance. Record the recovery path if Jose is unavailable and the chosen coverage/response target. Until those are confirmed, describe operations as an attended finite pilot.

Bundled owner decisions: backup responder/coverage/response target; actual renewal/expiry/billing register; private pre-request contact source for deletion withdrawal; any monitor journal retention policy. Existing deletion periods and the selected alert inbox are already policy/owner inputs and should not be asked again as undecided choices.
