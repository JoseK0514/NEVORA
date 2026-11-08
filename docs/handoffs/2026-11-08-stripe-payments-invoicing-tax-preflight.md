# Stripe setup and pre-planner inventory

**Superseded setup status:** The connector now works and official planner guide iguide_61ViylNn83ZdXlB0f41HT1nhEuOJ2 was accepted for the verified Velani LLC sandbox. Runtime/account and conditional Tax implementation, provider sandbox receipts and remaining hosted gates are recorded in [Stripe integration readiness](2026-11-08-stripe-integration-readiness.md). Jose is unsure of tax registrations; collection stays disabled. The historical diagnostics below are preserved, not current blockers.

2026-11-08. Jira: [SCRUM-174](https://thevelani-team.atlassian.net/browse/SCRUM-174). This is an evidence inventory and input for the requested Stripe MCP planner. It is not a planner-generated integration plan or a completed implementation.

## Authorized scope and order

Jose provided business `thevelani.com`, description “Design web and native applications and websites,” and requested Payments, Invoicing and Tax. He confirmed **both Velani client projects and NEVORA subscriptions**. Follow: install CLI -> `stripe agent setup` -> call `stripe_implementation_planner` -> review the existing integration against its returned plan -> build/test with securely configured API keys.

This request resumes Stripe planning/setup; the earlier protected Safari runtime check remains user-deferred. Claude owns UI. No other chat was contacted.

## Actual setup state

| Step | Observed state |
|---|---|
| `npm install -g @stripe/cli` | Completed; `stripe version` verifies1.55.8. The npm log has a script-policy warning, but the installed CLI executes successfully; no script policy was broadened. |
| `stripe agent setup` | Completed:1 installed,0 errors. Codex CLI plugin `stripe@openai-curated`, marketplace version82fd64bc, user scope; vendor manifest1.0.0. Claude plugin was not installed/modified. |
| Desktop/chat Stripe plugin | Official plugin discovery now confirms installed/ENABLED; Jose reports authorization completed. Documentation search succeeds. Account discovery/management return MCP -32001 Unknown tool; a sandbox/account context is not verified. A CLI plugin, installed chat plugin and authenticated account access are distinct states. |
| `stripe_implementation_planner` | Now advertised in this chat's tool inventory but **not called**: its required stripe_context/livemode must come from account discovery, which fails. Do not invent the account context or present a manual document as planner output. |
| API-key readiness | No `STRIPE_*` process key names or API-key fields in the CLI config were observed. No secret values were printed or copied. MCP OAuth access and application runtime keys are separate configuration steps. |

Setup evidence is retained locally at `.omo/evidence/stripe-velani/2026-11-08/`: CLI install/version, agent setup status and `planner-input.json` with the exact business context and source inventory. `stripe agent setup --status --json` is read-only; do not rerun an unscoped setup that might change another client.

## Current source evidence

NEVORA candidate before this documentation:8538baaaee44aa6103c963d1129728f514ce5ff0, application source81d3d1d0723d99ce534f7b16a992642d6755b3be. Read `services/commerce/runtime.ts`, `checkout.ts`, `stripe.ts`, `service.ts`, `owner-authority.ts` and the integrated onboarding handoff. Existing SDK23.1.0 and its installed API constant match the explicit2026-10-28.endive pin. The installed skill's older “latest API” header is not grounds to downgrade this integration; verify any upgrade against current official guidance and tests.

| Area | Existing source / gap for planner |
|---|---|
| NEVORA subscriptions | Checkout Sessions with setup/subscription modes, original trial receipt, genuine current Owner authority, immutable business/customer mapping, subscription reconciliation and Customer Portal. Preserve these contracts. |
| Reliability | Durable checkout intents, idempotency keys, raw-body signature verification, test/live rejection, event deduplication, queued retry/reconciliation and successor-subscription checks exist. Source inspection is not live provider acceptance. |
| Velani project payments | No project quote/payment or invoice-create implementation was found in the inspected NEVORA commerce service. Keep service-project billing separate from workforce company provisioning. |
| Invoicing | NEVORA consumes subscription invoice events. This is not a standalone Velani client invoice workflow. Planner must select Dashboard/hosted-invoice versus authenticated application automation and identify client/project ownership and approved amounts. |
| Tax | No `automatic_tax`, customer tax-location/tax-ID collection or product tax classification configuration was found in inspected commerce code. Both immediate subscriptions and setup-then-subscription paths need review. |
| Least-privilege keys | Runtime accepts only `sk_test_`/`sk_live_` prefixes. Stripe recommends restricted runtime keys; assess scoped `rk_test_` support with explicit environment/account validation and capability checks, rather than broadening to arbitrary credentials. |
| Hosted gates | Staging source81d3d1d07 is deployed behind SSO. Protected runtime, private workers/provider/SMTP, actual sandbox checkout/webhook/invoices/Tax and full A/B journey remain unverified. Keep them separate from local fixture evidence. |

Read-only Velani candidate: `/Users/josek0514/Documents/Codex/2026-11-04/https-www-thevelani-com-preview-theme-2/work/velani-client-hub`, clean at e4f9d74065511b2c36824aeae013581426813565 when inspected. Its `services/velani-ai` is a separate Fastify inquiry/AI service; its package has no Stripe SDK. The runtime-source search found no Stripe/Checkout/invoice API or automatic-tax implementation. `src/client-hub/app.ts` accepts explicitly consented inquiries; an inquiry or chat session must not become invoice/payment authority. No Velani files were edited and no service was run.

## Inputs to resolve with the planner and account owner

- Confirm legal merchant/account ownership for Velani services and NEVORA before sharing a Stripe account or assuming tax settings are interchangeable.
- Preserve the existing NEVORA plan/Owner/trial rules. Do not invent project prices, deposits, milestones, cancellation terms, tax-inclusive/exclusive policy, tax codes or tax registrations.
- Prefer hosted Checkout/invoices where suitable. Keep approved client/project amounts server-controlled; add durable operation/receipt, signed-event, retry and reconciliation rules if application automation is selected.
- Configure automatic tax only with the correct merchant settings, approved product classifications, customer location and applicable registrations. Tax setup does not itself determine legal collection obligations.
- Use sandbox credentials from an approved secret store. Do not paste keys into chat, commit env files, expose secret keys to Shopify themes/native apps, extract connector credentials or reuse production secrets.
- Do not enable live billing, send real invoices/email, register tax jurisdictions, start a paid plan or deploy production as part of this preflight. Existing staging and Claude UI remain unchanged.

## Resume

Once official account discovery returns a verified sandbox stripe_context/livemode, pass the retained business context and both scopes to the advertised planner, save the exact planner output, then write one implementation plan with concrete tests and compare it with this inventory. The planner/tool and runtime credentials remain required; no application change or new integration test is claimed by this packet.

Official references: [agent setup](https://docs.stripe.com/cli/agent/setup), [Stripe MCP and planner](https://docs.stripe.com/mcp), [Checkout](https://docs.stripe.com/payments/checkout), [Invoicing](https://docs.stripe.com/invoicing/integration), [Tax setup](https://docs.stripe.com/tax/set-up), [Tax in Checkout](https://docs.stripe.com/tax/checkout/page), [Tax in invoices](https://docs.stripe.com/tax/invoicing), [key handling](https://docs.stripe.com/keys-best-practices).

## Connector diagnostic after reported authorization

Jose reported the Stripe setup completed. Fresh official plugin metadata confirms installed/ENABLED. `search_stripe_documentation` works, while `list_available_accounts_or_orgs` and `manage_stripe_accounts` return `MCP -32001: Unknown tool`. This establishes a partial tool-availability failure; it does not establish invalid credentials, failed authorization or its underlying cause. No more reconnect/key requests were made. The error is in the assistant's tool response, not a message the user should find in Stripe. Account-bound API/planner operations remain unexecuted until a real sandbox context can be discovered. CLI config/process metadata still has no Stripe API-key/account field names and read-only `codex mcp list` has no separate Stripe server; no connector token was extracted and no manual duplicate configuration was added.
