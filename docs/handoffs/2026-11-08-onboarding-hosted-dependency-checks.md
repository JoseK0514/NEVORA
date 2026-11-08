# Onboarding hosted-service and dependency checks

2026-11-08, America/Puerto_Rico. Follow-up to SCRUM-166 and local onboarding candidate6b4af1cf2. Codex owns logic/infrastructure verification; Claude owns UI. Existing companies/production and the Shopify store were not modified.

## Current disposition

Dependency remediation and provider-delivery checks are complete locally. Hosted application readiness remains BLOCKED by deployment access and the absence of an onboarding staging environment. Domain/provider connection metadata is not an application deployment, runtime permission test, or end-to-end activation result. Keep SCRUM-166 In Progress.

## Dependencies

The initial full audit reported9 moderate findings, including production Nodemailer. Nodemailer is now pinned10.4.0. A real in-memory send regression demonstrated the old parser selected another recipient from nested comments; the patched mailer preserves the approved envelope address. No network send is used in this regression.

The existing local Next ESLint dependency seam now uses glob14.0.4 and typescript-eslint8.72.1. Root pins `@typescript-eslint/typescript-estree`8.72.1 and scopes a minimatch11.0.5 override to that parser. Without the root anchor, npm's linked local package graph retained minimatch10.2.6 and ignored the override. This explicit parser dependency makes the override reproducible through `npm ci`. The unrelated minimatch3.1.5 consumers remain on their supported API. No upstream lint rule body, recommended severity or global ignore was weakened.

`npm ci --ignore-scripts --no-fund` completed successfully. Full and production `npm audit --json` report0 findings. All36 lint-chain assertions and115 focused onboarding/mail tests pass after clean install. Full candidate/root/PostgreSQL/type/lint/build evidence is stored alongside the final report under `.omo/evidence/onboarding-hosted/2026-11-08/`; do not substitute these intermediate counts for its final source-specific result.

Security references: [Nodemailer nested-comment advisory](https://github.com/nodemailer/nodemailer/security/advisories/GHSA-8c8m-p3m8-cjg8), [glob cancellation advisory](https://github.com/isaacs/node-glob/security/advisories/GHSA-3g3m-2fjr-6pw4), [minimatch amplification advisory](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249). Audits are findings at their observation time, not a security certification.

## Hosted evidence and gaps

| Area | Observed evidence | Remaining requirement |
|---|---|---|
| Sender domain | Resend `nevora.team` verified; DKIM/SPF provider verification and public DNS agree. Sending enabled; open/click tracking off. | Actual app SMTP secret/configuration and bound signup/company origins. |
| Delivery | Jose approved support@thevelani.com. Exactly2 clearly labeled fictional test messages were sent with stable idempotency keys; Resend subsequently reports delivered for both. IDs01a1bb40-01ed-71b3-8d32-451aca246feb and01a1bb40-051a-79c6-8ed7-1c1dc209ef49. Neither contains a credential, activation link or real account/employee. | User-confirmed inbox placement and genuine application-generated signup/invitation/activation flow. Provider tests do not establish those. |
| Mail allowance | Before the2 tests:98 daily/2798 monthly sends remained;3/3 sender domains used. | Recheck live allowance before another run; no new sending domain/subscription is assumed. |
| Public network | `nevora.team` A records resolve; HTTPS HEAD200, authorized TLS1.3 and valid peer certificate. | Approved signup origin and wildcard company domain with verified host/project binding. `/api/onboarding/config` returned404 at the apex; it does not prove the backend candidate is deployed. |
| Vercel | Connector lists `nevora`, projectprj_gGWZI2AJQoCXuvxCZhU67JHeToCK, teamteam_Lzbw410WwXGWHTuUXuamRI1N. Correct ID/name/team/slug detail requests return404; deployment history returns403. | Authorized project details/env-key metadata/deployments/domain access. No Vercel CLI is installed. Never infer current values or reuse production credentials. |
| Render | Connector reports reauthentication required, including after Jose reported reconnection complete. Existing native staging is identified in historical repo evidence only. | Refresh/reconnect the actual connector and verify live service/workspace/source/configuration. Browser fallback had no authenticated tab and the Mac was locked. No access controls were bypassed. |
| Neon account | VELANI Native Development/org-wild-heart-93376487 reports Free; native staging noisy-fog-17044568 has PG17.11, aws-us-east-1 and ADMIN metadata access. | A dedicated onboarding control plus two isolated company projects and reviewed resource/cost policy. No paid capacity or production project is used. |
| Existing native DB | Metadata-only SELECT on nevora_native_staging/br-still-haze-bb6qa2a2 confirms no `nevora_onboarding` schema and no company identity anchor. Its installer has CREATEROLE/CREATEDB/BYPASSRLS. | It is not an onboarding test environment. Do not reuse its installer as APP/WORKER or repurpose native staging. Actual restricted runtime logins must be tested on the deployed onboarding source. |
| Backup | Existing native project's history retention0 and snapshot schedule empty. | Dedicated onboarding backup policy and actual hosted backup/restore/retirement rehearsal. Local pg_dump/restore remains separate evidence. |
| Transport | The MCP-side SQL observation reported pg_stat_ssl=false. | This internal SQL-path result neither proves nor disproves the app's external HTTPS/TLS path. Validate the actual application driver/endpoint and certificate. |
| Source | Development-source inventory reports collaboration branch drift. Changes remain detached/local. | Review/reconcile development integration, deploy exact accepted source to dedicated staging, verify remote CI/required gates and deployed SHA. |

## Recommended sequence after access is restored

1. Verify the actual Vercel/Render account/workspace and select one application host. Read only environment key names/targets initially; do not decrypt production secrets. Pin source and preserve the rollback/default-off state.
2. Select reviewed non-production signup and company-domain bindings. Provision only dedicated fictional onboarding control and two company projects in the existing Free development organization after confirming current entitlement/quotas. Bound compute0.25CU, auto-suspend300seconds and per-project test quotas; no upgrade or new subscription. Do not alter the existing native or production projects.
3. Store separate non-production control APP/provisioner, company APP/WORKER, provider and mail credentials through approved secret stores. Never use the owner/operator credential as a web/runtime login. Verify catalog privileges and actual driver connections, not metadata alone.
4. Deploy the exact accepted backend to staging; verify DNS/TLS/origin binding, provider creation intent/quota/unknown-result reconciliation, two-company isolation, Owner activation, normal login, employee invitations and changed-fact/replay/partial-failure behavior. Only the approved support inbox receives mail.
5. Exercise hosted backup/restore/retirement while suspended and verify old credentials/envelopes/jobs remain unusable. Record independent release/security/QA/UI disposition and Jose's actual production authorization before public enablement.

No hosted resources, DNS, production data, store products, purchases, billing plans or application access grants were created/changed during these checks. Exactly2 explicitly approved synthetic emails were sent.

## Shopify decision

The connected store is The Velani at www.thevelani.com. Recommendation: retain Shopify for the public website and commercial checkout when required. NEVORA owns company registration, Owner/employee authorization, private workforce data and operational logic. A future Shopify purchase integration uses verified, idempotent webhooks and server-side product/entitlement mapping; a store customer or checkout redirect alone grants no company access. No Shopify authentication replacement, checkout/subscription or webhook integration is implied by the present task.

References: [Shopify customer accounts](https://shopify.dev/docs/api/customer/latest), [Shopify webhooks](https://shopify.dev/docs/apps/build/webhooks). Recurring billing still requires a separate product/subscription decision and implementation.
