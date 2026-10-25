# Infrastructure plan

Working draft v0.1 · 2026-10-25 · Owner: NEVORA Operations Lead · Engineering: Claude / Engineering Lead. Preparation: READY_FOR_REVIEW; hosted verification: NOT_STARTED. Follow the [working agreement](../WORKING-AGREEMENT.md) and [launch checklist](../acceptance/LAUNCH-CHECKLIST.md). Provider enrollment, purchases and live changes remain outside this draft.

## Evidence boundary

Reference checkout: `8e9073974b52053e557382ec5199dbce9d5aa32c`. VERIFIED below means local source inspection only; it does not certify a running service.

| Classification | Finding |
| --- | --- |
| VERIFIED — source | `README.md` documents one company per database and Owner, Manager, Lead, Employee application roles. Next.js uses a Neon/PostgreSQL-ready database layer. SaaS provisioning remains deferred. |
| VERIFIED — source | `vercel.json` disables Git deployment. The deployment runbook states builds/start do not migrate databases and CI does not deploy. |
| HISTORICAL — policy | `src/lib/legal/policies.ts` identifies VELANI LLC, Vercel, Neon, Northern Virginia hosting and a six-hour database restore history. These are existing policy statements, not current account inspection. |
| HISTORICAL — rehearsal | The October 21 PR16 record describes disposable local PostgreSQL recovery checks on its own candidate. It excludes hosted Neon/PITR and production migration; no new drill occurred here. |
| BLOCKED — session | No usable `DATABASE_URL` or Vercel credentials were available. Earlier deployment/API access was observed blocked403 before a draft permission request. Saved draft requirements must not be assumed applied. |
| PROPOSED — operations | Separation, ownership, monitoring, budgets and recovery procedures below need assignment and evidence. All inventory verification remains pending. |

## Company and environment design

Retain one company per production database. One employer with many employees or locations fits; a parent SaaS login managing multiple client businesses is unsupported. Confirm the customer's employer structure before provisioning. A second independent company needs a separately reviewed deployment/database arrangement.

PROPOSED staging has a separate application binding, database and credentials, using fictional data. Production has its own binding, database, canonical HTTPS origin, keys and operator access. Separate Vercel projects are preferred; Jose and Claude must select the arrangement and document limitations. A “Preview” label proves no isolation. Record project, branch, database, region and deployment identity. Do not copy production data, credentials or push subscriptions into staging.

PROPOSED account ownership rests with VELANI LLC under Jose. Record legal holder, organization/team identifier, billing owner, recovery custodian and delegates in [the inventory](SERVICE-INVENTORY.csv). Confirm registrar ownership, renewals, DNS authority, portal hostname and certificates. Domain selection affects portal origins, recovery links and passkey RP/origin settings; approve these together. Reconcile differences from historical Northern Virginia wording with Jose and the policy owner before launch.

## Email, secrets and access

The policy contact is `support@thevelani.com`; routing and access remain unverified. Assign a custodian. Invitations and recovery share `NEVORA_RECOVERY_SMTP_*` / `NEVORA_RECOVERY_FROM` transport. Independently verify approved provider/sender ownership, TLS, DNS authentication and canonical origin. Invitations additionally require approved `NEVORA_INVITATION_DELIVERY_ENABLED=true`. A cohort needing first activation is BLOCKED if delivery is unavailable; assisted recovery does not replace activation. Record `PROVIDER_ACCEPTED` separately from mailbox receipt, completed activation and first sign-in. No delivery or activation is verified here. Policy wording alone proves no automatic email operation.

Use private provider settings and a controlled secret store; never this pack or public variables. Separate runtime, migration and human administration access wherever supported; verify actual grants. Keep staging/production material distinct. Preserve continuity-sensitive Clocker, push-encryption and worker keys; rotation needs Claude's reviewed recovery plan. Optional push, Clocker and passkeys retain their activation gates. See [access and recovery](ACCESS-AND-RECOVERY.md).

## Monitoring and continuity proposal

Operations owns the proposed operational watch; Claude supplies diagnostics and safe thresholds. Inventory provider logs and metrics first. No monitoring agent, alert integration, on-call coverage, uptime target or SLA is verified or promised. Agree recipients, review hours and escalation with Jose. Watch aggregate errors, latency, execution limits, database capacity, certificate/domain expiry and authorized delivery failures; redact employee details and credentials. Follow policy retention, including its up-to-90-day security/access-log statement.

Before migration or launch, capture backup mode, recoverable range, expiry, copy locations, retention, access and deletion behavior. Jose and Claude must set recovery-point/time objectives after impact review. The historical six-hour statement verifies neither RPO nor every copy's expiry. Prove recovery into a newly isolated target. Record restore point, candidate/schema compatibility, elapsed recovery, reconciliation risks and sanitized evidence. Preserve retained/deleted-account restrictions so restoration cannot silently reactivate revoked access or delivery. The [tabletop procedure](ACCESS-AND-RECOVERY.md) is not execution evidence.

## Release coordination and decision gate

Claude owns UI/backend integration and the candidate. Operations supplies inventory, access custody, costs and recovery evidence. Fresh setup must use `scripts/setup-company.mts` / `scripts/company-setup.ts`, an explicit target and canonical `db/migrations/order.ts`. Setup accepts `development` or `production`; staging is an operational label requiring Claude's mode mapping. The installer refuses existing schemas; never reset a friend's or other existing database. Existing databases need reviewed incremental migration. Never sort filenames or apply held Phase F migrations.

The inspected runbook summarizes the base chain through 0035; the manifest includes 0036 and 0037. Claude must reconcile the runbook and complete manifest against the frozen release SHA before an operator proceeds. Later changes reopen affected evidence. Preserve separate staging and Production bindings; do not assume promoting a Preview artifact gives correct Production configuration.

The [launch checklist](../acceptance/LAUNCH-CHECKLIST.md) is the acceptance gate. Required evidence includes exact candidate/CI identity, provider/database/domain bindings, migration/rollback review, hosted behavior, recovery evidence, independent QA/UI acceptance and Jose's production authorization. Draft readiness closes no acceptance case. Production recommendation: NO-GO while mandatory evidence is missing. Policy/control preparation is CONDITIONALLY COMPLIANT; live custody, recovery, release evidence and authorization remain missing.

## Cost worksheet and open decisions

[COST-WORKSHEET.csv](COST-WORKSHEET.csv) models proposed monthly costs. Quantities of 1 are assumptions; blanks need workload estimates. Prices and quote references/dates are blank. Obtain dated terms covering limits, taxes and overages before spending approval. Currency is undecided. Fixed, per-company and usage costs are separate; per-company costing implies no SaaS provisioning. Email covers invitations and recovery. Disabling delivery cannot waive a first-activation cohort's delivery dependency.

Spreadsheet columns: G quantity, H unit price, I currency, J monthly factor, K monthly cost (`G×H×J`). Lines calculate only with numeric quantity/price, positive numeric factor and nonempty currency; otherwise K stays blank. Annual factor is 1/12. Total requires every included line priced in the same currency. Confirm dependencies before removing rows; update ranges. Blanks never mean free service. Preserve assumptions/quotes with exports.

| Decision | Accountable role | Evidence to close |
| --- | --- | --- |
| Employer structure, staging design, account/domain ownership | Jose / Business Owner | Approved scope and completed inventory |
| Region, email provider/sender, invitation flag and optional features | Jose with Claude | Policy consistency, approved configuration and isolated hosted checks |
| Recovery objectives, copy expiry, monitoring coverage | NEVORA Operations Lead with Jose | Provider configuration receipts and isolated recovery evidence |
| Spending envelope and final release | Jose / Business Owner | Dated quotes and checklist acceptance |

Sources at the reference SHA: `README.md`, `.env.example`, `vercel.json`, `src/lib/legal/policies.ts` (`POLICY_FACTS`), `db/migrations/README.md`, `db/migrations/order.ts`, `scripts/company-setup.ts`, `src/lib/auth/mail-transport.server.ts`, `src/lib/auth/invitations/delivery.server.ts`, `src/lib/auth/invitations/service.server.ts`, `docs/product/specs/codex-joint/DEPLOY-RUNBOOK.md`, and `docs/rehearsals/pr16-database-restore-20261021/README.md`. Reconcile Claude's later changes at handoff.
