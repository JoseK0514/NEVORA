# Staging webhook and private scheduling decision

Status: the Render proposal below is superseded by Jose's direction to finish using the existing accounts. No paid hosting budget was approved. Neon Functions/Triggers are now verified available on the existing Free staging project; bounded adapters are being implemented under docs/superpowers/plans/2026-11-08-neon-staging-hosting.md. Actual hosted effects remain unverified.

Historical Render proposal, retained for decision provenance: Codex owns backend and hosting; Claude owns UI. Jira SCRUM-174 / SCRUM-166 remain open. User approved the sandbox runtime key and its sensitive Vercel Preview destination; that approval does not authorize a new paid hosting plan or copying it into another service.

## Verified constraints

- Existing Vercel staging retains SSO on all deployments. Stripe cannot sign in, so its deliveries cannot reach the application webhook route.
- Vercel deployment protection exceptions expose an entire preview domain, not only the webhook path. No exception or bypass secret is proposed for the existing application.
- Jose confirmed Render workspace tea-dbmr3t6c6qcc73cbf0jg. Its native staging service is unrelated and must remain unchanged.
- Existing commerce and provisioner CLIs perform bounded private invocations. No daemon, scheduler, public worker endpoint or production enrollment is assumed.
- Render Free web services sleep after 15 minutes, share 750 workspace hours and block SMTP ports 465/587. Private background/cron services have no Free compute tier. Free sleeping web services are unsuitable as the durable worker host.
- Vercel Schedules has just entered public beta with included Hobby usage; it remains an alternative to investigate, not a verified private-worker integration or reason to add provisioner credentials to the public application project.

## Recommended bounded hosted arrangement

Use a new isolated Render staging deployment with one webhook-only web service and three private scheduled jobs. No changes to the existing native staging service, real production, Shopify, Claude UI or Vercel SSO.

| Service | Entry point / responsibility | Credentials |
| --- | --- | --- |
| Signed webhook receiver | New minimal HTTP entry point: POST /webhooks/stripe and GET /health only; all other paths denied. Existing raw-body signature/mode validation and durable receipt/enqueue logic. | Dedicated catalog API principal and catalog encryption key, sandbox-only Stripe config; no Neon management/enrollment or SMTP credentials. |
| Commerce queue | npm run commerce:worker -- once, scheduled bounded invocation with explicit timeout and observed failure sink. | Catalog worker capability and sandbox billing/mail configuration only. |
| Billing reconciliation | npm run commerce:worker -- reconcile, every 15 minutes, bounded timeout, nonzero on partial failure. | Catalog worker capability and sandbox billing config only. |
| Provisioner | npm run onboarding:worker, isolated worker manifest, bounded invocation/creation quotas/lease recovery. | Separate provisioner control principal, scoped provider management and private enrollment capability. Never public app or receiver. |

Each service uses Node 24, the exact reviewed source snapshot, no application build/migration startup side effects, no automatic deploy on unrelated commits, no autoscaling, no paid datastore and no Redis. The existing PostgreSQL durable queues remain the source of truth. The receiver must be implemented and regression-tested before any external exposure. Configure fresh endpoint-specific signing secret and approved service-specific secret destinations securely; keep no keys in source/logs. Key creation or materially broader access through browser still needs the action-time confirmation required by that tool.

## Cost decision

Current Render pricing lists 0.5c-512mb at USD7/month for a continuously running web service. Each cron has a USD1/month minimum and bills for active execution. Expected minimum is about USD10/month for the four services, before applicable tax or excess bandwidth/build usage. This is not a USD10 hard cap. Four fixed smallest plans bound continuous compute to approximately USD28/month; actual cron compute should be much lower. A proposed additional staging budget is USD30/month. Verify workspace included usage, spend controls, command timeouts and pricing again before activation; do not enable paid extras or continue past the approved budget. No resource or charge has been created by this proposal.

Alternative: keep automated hosted acceptance pending while investigating an included/free private scheduling arrangement. This avoids a new paid resource, but does not establish the completed hosted flow. Do not reuse or wake native staging as a worker workaround.

## Activation evidence and rollback

1. Implement/test the isolated receiver's path/method/body/signature/mode controls and signed idempotent enqueue. Preserve original API behavior.
2. Bind exact sandbox account/prices and endpoint secret; verify actual restricted-key permissions. Tax/live flags stay false.
3. Deploy exact source and secret snapshots; verify protected application readiness and unsigned receiver rejection without bypassing SSO.
4. Observe a genuine Stripe-signed sandbox delivery, duplicate/reordered delivery, queue processing, reconciliation failure/recovery and retry evidence.
5. Run the fictional two-business Owner signup/setup/invite and billing journey with only the approved test email recipient support@thevelani.com. UI/browser acceptance remains Claude-dependent.
6. On failure, disable new signup/checkout/provider creation, preserve durable receipts and uncertain jobs, suspend new schedules safely, and retain the prior verified alias/deployment. Never delete a business/database as retry compensation. No live launch is implied.

Sources checked 2026-11-08: https://render.com/pricing ; https://render.com/docs/cronjobs.md ; https://render.com/docs/free.md ; https://render.com/docs/service-types.md ; https://render.com/docs/compute-plans.md ; https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/deployment-protection-exceptions .
