# Managed web workforce operations

Scope: NEVORA payroll, web-notification dispatch and reminders through the existing one-shot commands and durable PostgreSQL queues. Native apps/push are excluded. Claude owns product UI. This runbook describes the prepared runtime; provider creation, secret installation, processing activation and delivery acceptance are distinct gates.

## Source, ownership and cost

Use `ops/workforce/render.workforce.yaml` in Jose's selected Render workspace `tea-dbmr3t6c6qcc73cbf0jg`. Create a separate service with `create_new`; never adopt or change native service `srv-dbmsjuui0phs73co1oq0`. One `0.5c-512mb` instance and a 1 GB disk have a published baseline of $7.25/month. Obtain the actual planned quote and keep the incremental monthly total within Jose's $10 ceiling. No database, Redis, workspace upgrade, autoscaling or preview stack is included. The Blueprint and service auto-deployment settings both stay off.

The build refuses dirty source and compiles its Git SHA into the host. Runtime requires that SHA to equal Render's documented `RENDER_GIT_COMMIT`. An optional `NEVORA_WORKFORCE_SOURCE_SHA` must also match. The monitor ZIP independently embeds its own clean SHA and checks both source labels; deploy matching host/monitor builds as one reviewed candidate. The closed host can answer `/ready` without a database or any secret. This proves process readiness only.

Alert destination is **support@thevelani.com**. A staffed responder and response target have not been confirmed. Jose remains the release decision maker; do not describe that address as a staffed on-call service until ownership is assigned.

## Credentials and profiles

Do not paste keys into chat, source, commands, build logs or checked-in files. Do not copy a Vercel/browser environment into this service. Obtain existing worker roots through their approved secure store and install only the required managed secret values. A credential existing only in a write-only provider store is not a recoverable handoff; report that limitation instead of adding an export endpoint or resetting enrolled identities.

`NEVORA_WORKFORCE_ENABLED=false` is the initial state. Activation additionally requires:

- `NEVORA_WORKFORCE_HEALTH_KEY`: independently generated canonical 32-byte base64url key, shared only with the independent monitor.
- `NEVORA_WORKFORCE_PROFILES`: JSON array of 1–16 strict profiles; no arbitrary executable, arguments, state path or extra environment field is accepted. Each entry has `scopeId` (canonical workspace UUID), `environment` (`test` or `production`), `commands` (unique subset of `payroll`, `notifications-dispatch`, `notifications-reminders`), exact canonical company `origin`, `portalBaseDomain` and `env`.
- Every profile's `env` contains its own company/environment-specific `nv_control_worker_[tp]_<scopehex>` DSN with verify-full TLS; existing `NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY`, `NEVORA_COMMERCE_WORKER_BINDING_KEY`, fixed Neon `NEVORA_COMMERCE_API_ORIGIN`, and `NEVORA_COMMERCE_ENABLED=true`. No owner/APP, provisioning, Stripe, SMTP or model credentials belong on the worker.
- Payroll commands require `NEVORA_PAYROLL_ENABLED=true`. Notification commands must pass the canonical web-push runtime configuration, including feature/delivery gates, VAPID pair, encrypted-subscription key, worker secret and (for test) explicit fictional account allowlist/test delivery gate. A disabled notification command is refused rather than represented as processing. Installation or preparation does not authorize sending real push messages.

The host derives isolated state namespaces and routing/expected-scope variables. Children inherit only PATH, HOME, TMPDIR, LANG and NODE_ENV plus the curated profile. No host health key, ambient proxy, NODE_OPTIONS or unrelated credential reaches a worker. The existing registry, company incarnation, WORKER role, commerce, lease and operation checks remain inside the canonical CLI.

## Independent monitor

Apply `db/control-migrations/0006_workforce_monitor.sql` only to the explicitly selected control database after review/authorization. It creates aggregate-only incident/notice/attempt tables, forced session-user RLS and no PUBLIC access. It is deliberately not part of company bootstrap. Set up a fresh restricted `nv_ops_monitor_<24hex>` LOGIN role using `configureMonitorPrincipal` through the approved operator client; the monitor cannot create its own role. Do not give it membership, ownership, schema CREATE, TEMP, company, employee or onboarding grants.

Build the separate archive from clean source:

```
node scripts/build-neon-onboarding.mjs --workforce-monitor-only /absolute/new/private-output
node scripts/verify-neon-onboarding.mjs --workforce-monitor-only /absolute/new/private-output
```

Deploy `workforcemonitor` closed on the selected staging Neon branch. Preserve all inert provider-capability overrides and the exact monitor allowlist in `services/hosted/neon/capabilities.ts`. Do not reuse the provisioner/catalog DSN or inherit Neon's injected default owner credentials. The only processing route is authenticated native schedule `nevora-staging-workforcemonitor`; local SDK-envelope tests are not hosted authentication proof. Verify real forged-header rejection before adding secrets. Start its trigger disabled and verify `next_run_at=null`.

When authorized, install the fixed Render HTTPS origin, expected command count, source labels, shared health key and restricted journal DSN under the named `NEVORA_OPERATIONS_MONITOR_*` keys. The monitor requests only `/private/health`, refuses redirects, bounds response size/time, and rejects stale, wrong-source or malformed aggregates. Host health never accepts commands/selectors and reveals no company data or credentials. The observer itself and the hosting provider still need operational supervision; this is not a self-monitoring guarantee for every dependency.

`NEVORA_OPERATIONS_ALERT_MAIL_ENABLED=false` initially. SMTP stays only on the monitor, using the existing `NEVORA_RECOVERY_SMTP_*`, `NEVORA_RECOVERY_FROM`, HTTPS `FUEL_PORTAL_ORIGIN`, `NEVORA_ONBOARDING_ENVIRONMENT=test`, and `NEVORA_STAGING_EMAIL_RECIPIENT=support@thevelani.com` transport fence. No real alert test has yet been approved. An authorized exercise must identify the source, fictional scope, exact recipient and finite outage/recovery sends before enabling it. SMTP accepted, delivered and inbox-observed are separate outcomes.

One session advisory lock serializes observations through each bounded send. The journal commits sending intent before SMTP. Repeated outages do not generate repeated notices; each incident has at most an outage and recovery notice, with at most 3 definite-failure attempts per notice and 4 total attempts per UTC day. SMTP or database acknowledgement loss is marked unknown and never automatically resent. Review unknown attempts manually at the approved sink. Do not reset them just to produce another email. Journal rows contain enum states and opaque incident IDs, not employee data, chat content or addresses. Retention/archival policy for this small operations journal remains a production decision; no automatic deletion is installed.

## Pause, drain and rollback

Disable observer scheduling before a planned drain to avoid a planned-outage alert. Pause workforce dispatch through `NEVORA_WORKFORCE_ENABLED=false` and a controlled deployment, or send SIGTERM through the hosting platform. Stop new dispatch immediately and forward cancellation to the canonical CLI. The disk-backed Render shutdown allowance is the default 30 seconds and cannot be extended; this host bounds cancellation to less than that allowance. Native staging remains untouched.

There is one host lock and separate command locks on the private disk. Private state must be canonical, owned by the process user and mode 0700/0600; symlinks or public directories fail closed. Confirmed cleanup releases only the host's own marker. Missing/uncertain cleanup leaves locks in place. A provider restart after a hard kill may therefore require manual recovery; automatic stale-lock deletion would risk overlapping business processing.

For manual recovery: suspend the service and observer; prove the old process/group has stopped; inspect private invocation receipts, database job status, leases and source/environment/incarnation; retain a private evidence copy of the exact stale marker; remove only the reviewed invocation/host marker after cleanup is established. Never delete a durable job, reset an uncertain lease, recreate a company or retry a payment as compensation. Drain before changing profiles, source or keys. Do not restore older disk snapshots over newer job/receipt identities.

Rollback selects a previously verified matching host/monitor source and configuration, with processing/delivery closed first. Keep the current source, durable queues and ambiguous outcome records for diagnosis. Rolling back application code does not reverse an accepted email, payroll document or business mutation. No main/production deployment is authorized by this runbook.

## Qualification

The required onboarding-backend CI now also runs `scripts/managed-workforce-acceptance.mjs`: clean compiled source, actual disabled HTTP service, absent public execution, protected health, graceful shutdown, wrong-source rejection, and actual extracted monitor ZIP checks. The owned workforce SQL suite exercises restricted roles, queue reads, concurrency, retry caps and a real killed database connection after a committed sending intent. Unit tests cover profile isolation, HMAC freshness and real child cancellation. These local checks do not attest provider uptime, hosted delivery, tax correctness or all possible Rondo answers.

Current platform references: [Blueprint specification](https://render.com/docs/blueprint-spec), [default environment variables](https://render.com/docs/environment-variables), [web services](https://render.com/docs/web-services), [persistent disks](https://render.com/docs/disks), [compute plans](https://render.com/docs/compute-plans).
