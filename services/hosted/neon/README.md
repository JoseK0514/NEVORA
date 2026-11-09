# NEVORA Neon staging adapters

These adapters run the existing backend on the existing Neon staging account. They do not enable live billing, Tax, public signup, provider provisioning or mail. Claude retains UI ownership. No Render subscription is needed for this arrangement.

## Exact staging target

Project damp-haze-17022523, branch br-hidden-mud-bbnc2fxk, aws-us-east-1, org org-wild-heart-93376487, Free plan, verified through current provider APIs. The Functions and Triggers APIs are available. Free quotas apply; no claim of permanently free production operation is made. The existing database also has short explicit active/compute quotas, so schedules must start disabled and only run during bounded acceptance until a sustainable policy is reviewed.

Vercel continues to host the protected Next.js app. Do not change its SSO ALL setting or add provisioner credentials there. A native Neon function is reachable from the internet; caller verification is mandatory before database/provider work. For production public ingress, review edge rate/abuse controls separately.

## Four isolated functions

| Slug | Accepted traffic | Capabilities |
| --- | --- | --- |
| stripewebhook | POST /webhooks/stripe; exact Stripe endpoint signature, test-mode only | Explicit catalog API DSN and catalog encryption key; endpoint signing secret. No Stripe API key, provider management, control/app credentials, enrollment or SMTP. |
| commercequeue | POST /run from native Neon schedule nevora-staging-commercequeue | Existing catalog/API worker capability, restricted sandbox Stripe config and approved SMTP only if needed. One durable job per invocation. |
| commercereconcile | POST /run from native schedule nevora-staging-commercereconcile | Catalog/API worker capability and restricted sandbox Stripe config; one-business reconciliation with a durable admission cursor. |
| provisioner | POST /run from native schedule nevora-staging-provisioner | Separate control provisioner principal and a passwordless app identity, provider policy/API credential, private enrollment capability and necessary onboarding crypto configuration. Never public receiver or Vercel. |

Every deployment must explicitly set DATABASE_URL and DATABASE_URL_UNPOOLED to postgresql://disabled.invalid/disabled. Neon otherwise injects default database credentials; no adapter is allowed to inherit that implicit capability. Also apply every exact INERT_HOST_CAPABILITIES override from capabilities.ts: PGDATABASE/PGHOST/PGHOST_UNPOOLED/PGPASSWORD/PGUSER, AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY/AWS_REGION/AWS_ENDPOINT_URL_S3 and NEON_AI_GATEWAY_TOKEN/BASE_URL. Hosted evidence showed these service credentials are injected even though they were absent from deployment user-variable names. Empty values restore injection; use the unusable sentinels. Use only the named runtime DSNs and preserve API/enrollment/control role separation. Never use the database owner login. The provisioner requires a generated nv_control_provision_ principal, verify-full TLS, a strict URL without libpq query overrides, and NEVORA_PROVISIONER_CONTROL_APP_PRINCIPAL (the nv_control_app_ name only). It does not receive a usable application DSN/password.

Every deployment also sets NEVORA_NEON_BRANCH_ID to the exact target branch, NEVORA_NEON_HOST_ENABLED=false initially, NEVORA_COMMERCE_ENVIRONMENT=staging, NEVORA_ONBOARDING_ENVIRONMENT=test and NEVORA_WORKSPACE_MODE=isolated. Native NEON_BRANCH_ID must match. Do not copy entire environment snapshots between roles; only the approved capability allowlist. The exact name allowlists live in capabilities.ts. Deployment snapshots must pass deploymentCapabilitiesAllowed: every name must belong to approvedCapabilityNames for that role. All provider-owned branch/execution/logging names are excluded from this user policy. Runtime validation separately accepts those injected names plus explicit ordinary process metadata; every other name fails closed, including unknown PostgreSQL aliases and empty variables. Every inert override must be present with its exact value. At deployment compare current_deployment.environment names against that role policy; Neon preserves omitted user variables, so omission does not remove old access. Resolve unwanted retained names explicitly before activation; never read values to perform a name check.

## Authentication and retries

The receiver checks method/path, configuration, raw-body size (262144 bytes), a five-second body-read deadline, Stripe signature age and test mode before constructing a database pool. Fatal UTF-8 decoding preserves signed bytes (including any BOM); malformed event envelopes and supported object IDs fail before enqueue. Only verified event identities enter existing durable receipt/job processing. Valid unsupported events are acknowledged without opening enqueue capabilities. Provider signing verification uses the SDK static webhooks utility and needs no API credential. Checkout return URLs never grant access.

Scheduled handlers use @neon/functions parseTriggerDelivery, enforce schedule type/name and bounded16384-byte envelopes, and reduce errors to bounded codes. This is valid only behind the native Neon proxy, which strips caller-supplied x-neon-* headers. An equivalent local request can set such a header, so local parser acceptance alone is not authentication evidence. Hosted forged-header rejection must pass before adding secrets/enabling work.

A trigger tick is a wakeup, not a new authority or a new queue. Existing database job claims, dedupe receipts, operation provenance and leases retain retry ownership. A retryable/partial state returns503; Neon can redeliver it, and the next durable claim still applies its own backoff. Billing workers use the worker runtime and must not receive STRIPE_WEBHOOK_SECRET; the receiver alone owns it. Hosted billing permits restricted rk_test_ keys, Tax off and onboarding mode only. The staging queue checks the exact support@thevelani.com recipient immediately before mail delivery. Reconciliation selects one business per tick, commits one namespaced admission cursor before provider calls and rotates across new runtimes even after failures; audit remains write-only; no schema or grant change is needed. Worker SQL waits are bounded. All short-lived commerce pools close in finally. No sleeping daemon or untracked post-response job is introduced.

## Packaging

From a clean source checkout run node scripts/build-neon-onboarding.mjs /absolute/new/output-directory. The directory must be unused and outside the repository. --allow-dirty is local-only and marks the receipt non-deployable. No migration, seeding or database connection runs during build.

Each ZIP has index.mjs at its root and a bundled ESM module at src/lib/company-bootstrap/bundle.mjs. That path preserves the canonical bootstrap loader's relative SQL location. Only the provisioner ZIP contains the canonical db/migrations assets. The artifact's verifyProvisionerBundle() checks their hash before claiming private work. Missing or changed SQL fails closed. Run node scripts/verify-neon-onboarding.mjs against the output: it validates and freshly extracts each actual ZIP, checks exact inventories and hashes, then exercises those extracted handlers and the SQL guard. Symlinks, traversal, duplicate/extra entries and ambient ZIPOPT exclusions cannot silently substitute loose files. The builder resolves the real output parent before creating it. The receipt records source commit/tree/dirty state, unchanged-source check, output hashes and input paths; it excludes environment values.

## Remaining hosted gates and rollback

Deploy closed code without secrets first; verify 404 for other routes,401 for forged/unsigned scheduled calls and503 for disabled webhook processing on the actual native URLs. Create all three schedule triggers with enabled=false; read back next_run_at=null. No ongoing recurrence against staging quotas is authorized by a successful build.

Then securely configure role-specific secrets, verify actual runtime Stripe account/permissions, and bind the endpoint-specific signing secret. A browser credential transfer to a new Neon store or creation of another persistent credential requires the tool's specific action-time confirmation. No keys in chat, source, Jira, commands or logs.

Prove a genuine Stripe-signed sandbox delivery and durable duplicate/reordered processing, controlled worker execution/recovery, private provisioning/mail dependencies and actual A/B Owner isolation. Some existing company-to-company private probes also require staging ingress accommodation; do not bypass Vercel protection or invent that acceptance. Claude's real browser/mobile UI acceptance remains separate.

On failure keep signup/provider/checkout creation off, disable new trigger dispatch safely, retain durable receipts and uncertain job identity, and restore a verified matching code/configuration. Never delete/recreate company data as retry compensation. Keep the previous Vercel aliases/deployment until the new complete configuration is verified. Production still requires Jose's authorization and existing independent gates.

Sources: https://neon.com/docs/compute/functions/overview ; https://neon.com/docs/compute/functions/triggers/overview ; https://neon.com/docs/compute/functions/environment-variables ; https://neon.com/pricing .

## Provider runtime observations

Native execution additionally injects NEON_DATA_PORT, NEON_LOAD_PORT, NEON_MOUNT_POINT, NEON_SIGINT_DRAIN and NEON_TELEMETRY_ENDPOINT/TOKEN. These are provider-owned execution/logging controls; leave them injected, never copy them into user environment snapshots or expose their values. The existing native function logging transport is part of the hosting trust boundary. Its internal token scope is not independently attested here; provider assurance remains a production gate. Optional NEVORA_NEON_DIAGNOSTICS=true emits only bounded rejected-variable names and binding booleans at receiver startup. No request fields, environment values, credentials or IDs are emitted. Turn this operator diagnostic off after acceptance.

The reconciliation cursor is one reconcile-cursor:<business UUID> admission row in commerce.rate_limits, refreshed to seven-day expiry. The locked read ignores an expired position even when its row remains present or malformed; the next sweep starts at the first eligible business and overwrites that same row. No separate cleanup consumer is required. A cursor is committed before provider calls, so a failure cannot starve later businesses. The scheduler reads/writes no audit rows beyond appending the existing fixed attempt/retry events; no audit SELECT grant is added. Billing/webhook receipts retain their original meaning.

The `commerceauthority` process uses machine-only routing. Before activation, an
operator runs `configureCommerceControlReader()` from `control-reader.ts` with the
existing setup principal and a validated `nv_control_commerce_` role. It creates
an owner-controlled `security_barrier` view containing only current, active test
APP records, revokes that reader's base-table access and grants view/registry
SELECT. Ordinary web/provisioner grants remain unchanged. Never grant the reader
`workspace_secrets` SELECT, membership, ownership, schema CREATE or TEMPORARY.
Verify actual42501 on base/column reads and zero WORKER records through the view.
Do not put `NEVORA_WORKSPACE_TOKEN_SECRET` in the authority environment: its three
original machine handlers need no browser envelope capability.

Every clean ZIP now embeds its build commit. Native processing compares it to
`NEVORA_NEON_SOURCE_SHA`; missing/different labels fail closed. Dirty local bundles
embed no usable source identity and cannot process even a correctly shaped native
schedule. Rebuild and deploy all affected ZIPs when the source changes; changing
an environment label cannot relabel older code. The archive verifier checks the
compiled identity and missing/wrong/matching labels on extracted worker artifacts.
