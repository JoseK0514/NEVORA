# Onboarding hosted-service and dependency checks

**Current sandbox evidence:** [November8 credential and hosting acceptance](2026-11-08-neon-sandbox-credential-acceptance.md) supersedes the older credential, webhook, worker and Preview checkpoints below. Approved credential storage, genuine signed delivery, bounded native queue/reconciliation and exact-source protected Preview are verified. Full onboarding/Claude UI and private dependencies remain open.

2026-11-08, America/Puerto_Rico. Follow-up to SCRUM-166 and local onboarding candidate6b4af1cf2. Codex owns logic/infrastructure verification; Claude owns UI. Existing companies/production and the Shopify store were not modified.

## Current disposition

The earlier dependency/provider-only packet below is superseded for integration and staging status by [the integrated onboarding/commerce handoff](2026-11-08-integrated-onboarding-commerce.md), application source `81d3d1d0723d99ce534f7b16a992642d6755b3be`. Dedicated Free Neon control/catalog schemas, four restricted roles, private Vercel staging configuration and three exact GoDaddy CNAMEs now exist. Actual external endpoint TLS and role denials pass. Local integration/root/acceptance/build/audits pass. After the CLI identified the new-project first-deployment target requirement and Jose explicitly approved that target only for isolated staging, source81d3d1d07 is deployed READY (dpl_J2tBvYecVC4YVYHaZj8ZFZ8d6Cdu). All3 stage domains have verified HTTPS and redirect to Vercel authentication; Jose elected to leave protected Safari/backend readiness and Stripe sandbox testing pending. No deployed signup/mail/Stripe end-to-end acceptance is claimed. Private worker/provider/SMTP and Stripe sandbox credentials remain outstanding. Keep SCRUM-166 In Progress and Claude responsible for UI.

## Earlier dependency-only check snapshot

The following records the preceding31702fee7 packet, before creation of the dedicated staging resources. Its provider observations and counts are historical where the integrated handoff supersedes them.

## Dependencies

The initial full audit reported9 moderate findings, including production Nodemailer. Nodemailer is now pinned10.4.0. A real in-memory send regression demonstrated the old parser selected another recipient from nested comments; the patched mailer preserves the approved envelope address. No network send is used in this regression.

The existing local Next ESLint dependency seam now uses glob14.0.4 and typescript-eslint8.72.1. Root pins `@typescript-eslint/typescript-estree`8.72.1 and scopes a minimatch11.0.5 override to that parser. Without the root anchor, npm's linked local package graph retained minimatch10.2.6 and ignored the override. This explicit parser dependency makes the override reproducible through `npm ci`. The unrelated minimatch3.1.5 consumers remain on their supported API. No upstream lint rule body, recommended severity or global ignore was weakened.

`npm ci --ignore-scripts --no-fund` completed successfully. Full and production `npm audit --json` report0 findings. All36 lint-chain assertions and115 focused onboarding/mail tests pass after clean install. Full candidate/root/PostgreSQL/type/lint/build evidence is stored alongside the final report under `.omo/evidence/onboarding-hosted/2026-11-08/`; do not substitute these intermediate counts for its final source-specific result.

Security references: [Nodemailer nested-comment advisory](https://github.com/nodemailer/nodemailer/security/advisories/GHSA-8c8m-p3m8-cjg8), [glob cancellation advisory](https://github.com/isaacs/node-glob/security/advisories/GHSA-3g3m-2fjr-6pw4), [minimatch amplification advisory](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249). Audits are findings at their observation time, not a security certification.

## Final local verification

Application/dependency source: commit `31702fee774dc6a7a24f26e019052d34414c4f24`, tree `9e1b520f43332dd72d250a6df4c344fb917f656f`. The subsequent handoff correction changes documentation only; these results apply to the unchanged application bytes.

| Check | Result |
|---|---|
| Root suite | 11,133 passed, 801 existing skips, no failures. |
| Owned PostgreSQL acceptance | 118 onboarding + 496 foundation + 36 exchange checks passed, no skips/failures; inventory contract and manifest passed. |
| Dependency install and audit | Clean `npm ci --ignore-scripts --no-fund`; zero full/production findings. |
| Focused regression and tooling | 115 focused tests and 36 lint-chain checks passed. |
| Typecheck and lint | Both passed. |
| Source-bound production build | Exit0; receipt confirms clean source and source unchanged. |
| Forced-development production check | Build passed; development markers absent across 4,335 artifacts. |
| Development source inventory | Expected collaboration branch drift remains; no assembly performed. |

The local evidence index is `.omo/evidence/onboarding-hosted/2026-11-08/final-report.json`. Source-bound PostgreSQL acceptance is `.omo/evidence/onboarding/31702fee774dc6a7a24f26e019052d34414c4f24-609ba5f1-cd8b-486f-8c9a-ebf18562f53f/report.json`. Build receipt location is recorded in `build-receipt-path.txt`. These ignored local artifacts are preserved for the unfinished hosted/UI gate; no push, remote CI or deployment is implied.

## Hosted evidence and gaps

| Area | Observed evidence | Remaining requirement |
|---|---|---|
| Sender domain | Resend `nevora.team` verified; DKIM/SPF provider verification and public DNS agree. Sending enabled; open/click tracking off. | Actual app SMTP secret/configuration and bound signup/company origins. |
| Delivery | Jose approved support@thevelani.com. Exactly2 clearly labeled fictional test messages were sent with stable idempotency keys; Resend subsequently reports delivered for both. IDs01a1bb40-01ed-71b3-8d32-451aca246feb and01a1bb40-051a-79c6-8ed7-1c1dc209ef49. Neither contains a credential, activation link or real account/employee. | User-confirmed inbox placement and genuine application-generated signup/invitation/activation flow. Provider tests do not establish those. |
| Mail allowance | Before the2 tests:98 daily/2798 monthly sends remained;3/3 sender domains used. | Recheck live allowance before another run; no new sending domain/subscription is assumed. |
| Public network | `nevora.team` A records resolve; HTTPS HEAD200, authorized TLS1.3 and valid peer certificate. | Approved signup origin and wildcard company domain with verified host/project binding. `/api/onboarding/config` returned404 at the apex; it does not prove the backend candidate is deployed. |
| Vercel | Projectprj_gGWZI2AJQoCXuvxCZhU67JHeToCK is accessible by its unique ID when the explicit team/slug parameters are omitted. Returned accountId matches teamteam_Lzbw410WwXGWHTuUXuamRI1N. Next.js/Node24.x; SSO protection all_except_custom_domains; only nevora-alpha.vercel.app attached. No permissions changed; the explicit-team failure cause remains unknown. | Visible development/collaboration preview env-key sets lack onboarding configuration; no values were decrypted and production configuration was not inspected. Latest listed READY preview is ca36510524ee08c90c1587b3185a69bfec9d585e, not candidate31702fee7. Dedicated staging configuration, domains, runtime evidence and exact-source deployment remain required. |
| Render | Connector reports reauthentication required, including after Jose reported reconnection complete. Existing native staging is identified in historical repo evidence only. | Refresh/reconnect the actual connector and verify live service/workspace/source/configuration. Browser fallback had no authenticated tab and the Mac was locked. No access controls were bypassed. |
| Neon account | VELANI Native Development/org-wild-heart-93376487 reports Free; native staging noisy-fog-17044568 has PG17.11, aws-us-east-1 and ADMIN metadata access. | A dedicated onboarding control plus two isolated company projects and reviewed resource/cost policy. No paid capacity or production project is used. |
| Existing native DB | Metadata-only SELECT on nevora_native_staging/br-still-haze-bb6qa2a2 confirms no `nevora_onboarding` schema and no company identity anchor. Its installer has CREATEROLE/CREATEDB/BYPASSRLS. | It is not an onboarding test environment. Do not reuse its installer as APP/WORKER or repurpose native staging. Actual restricted runtime logins must be tested on the deployed onboarding source. |
| Backup | Existing native project's history retention0 and snapshot schedule empty. | Dedicated onboarding backup policy and actual hosted backup/restore/retirement rehearsal. Local pg_dump/restore remains separate evidence. |
| Transport | The MCP-side SQL observation reported pg_stat_ssl=false. | This internal SQL-path result neither proves nor disproves the app's external HTTPS/TLS path. Validate the actual application driver/endpoint and certificate. |
| Source | Development-source inventory reports collaboration branch drift. Changes remain detached/local. | Review/reconcile development integration, deploy exact accepted source to dedicated staging, verify remote CI/required gates and deployed SHA. |

## Remaining staging sequence

1. Use the verified Vercel project metadata to prepare an isolated application preview, and resolve Render authentication before relying on its service/worker configuration. Select the application and worker placement explicitly; avoid duplicating the web application across hosts. Read only environment key names/targets initially; do not decrypt production secrets. Pin source and preserve the rollback/default-off state.
2. Select reviewed non-production signup and company-domain bindings. Provision only dedicated fictional onboarding control and two company projects in the existing Free development organization after confirming current entitlement/quotas. Bound compute0.25CU, auto-suspend300seconds and per-project test quotas; no upgrade or new subscription. Do not alter the existing native or production projects.
3. Store separate non-production control APP/provisioner, company APP/WORKER, provider and mail credentials through approved secret stores. Never use the owner/operator credential as a web/runtime login. Verify catalog privileges and actual driver connections, not metadata alone.
4. Deploy the exact accepted backend to staging; verify DNS/TLS/origin binding, provider creation intent/quota/unknown-result reconciliation, two-company isolation, Owner activation, normal login, employee invitations and changed-fact/replay/partial-failure behavior. Only the approved support inbox receives mail.
5. Exercise hosted backup/restore/retirement while suspended and verify old credentials/envelopes/jobs remain unusable. Record independent release/security/QA/UI disposition and Jose's actual production authorization before public enablement.

No hosted resources, DNS, production data, store products, purchases, billing plans or application access grants were created/changed during these checks. Exactly2 explicitly approved synthetic emails were sent.

## Shopify and subscription architecture

Status reconciliation on November8: the separate commerce handoff was read at `/Users/josek0514/.codex/worktrees/nevora-subscriptions-backend/NEVORA-UI-READINESS/docs/handoffs/2026-11-07-commerce-backend.md`. It records the authorized architecture as Velani/Shopify sales frontend, Stripe subscriptions and isolated NEVORA company installations. This supersedes the earlier Shopify-checkout recommendation in this document. SCRUM-168 is In Review and SCRUM-169 To Do; those are Jira/document observations, not independent verification of the other worktree's tests or current Claude UI.

Retain Shopify for the public website, Stripe for the existing subscription implementation, the Vercel NEVORA application host, Neon databases and Resend mail. Reconcile the two locally implemented registration/provisioning/session paths before assembly; do not ship competing account flows or add a second billing integration. Establish the bounded private worker's scheduling/credential requirements separately and avoid duplicating web hosting. NEVORA retains company/Owner/employee authorization, private workforce data and operational logic. Neither a Shopify customer nor a checkout redirect grants company access.

The commerce handoff, approved commerce spec and SCRUM-168/169 govern subscription details; actual hosted Stripe, SMTP, trial/payment lifecycle and integrated UI acceptance remain open. No store/billing configuration or other worktree was modified by this reconciliation.
