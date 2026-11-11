# Web notification and independent alert acceptance

Prepared November 10, 2026 against development `baf26fc4861a21bc7ddd634f058c8d8f470293d7` plus the notification/operations closeout candidate. This is an operator proposal, not activation authority. Native delivery is separate. The coordinator owns credentials, cloud changes and publication. Claude owns product UI.

## Admission before hosted work

1. Qualify the combined source, required exact-head CI and clean matching host/monitor archives. Never relabel an older source's delivery or UI evidence.
2. Select the dedicated `nevora-onboarding-staging` project (`prj_4In3h5qWpIKwdFWD2S8Ur2YdZZ9P`), the existing approved isolated control/company targets and fictional accounts. Verify provider project/branch/database IDs and actual runtime company/environment/incarnation through the authorized operator. Keep SSO ALL. Its Vercel environment named Production is still a staging target, not authority to deploy there.
3. Never use `velani-ai` Preview for mutation: the November 10 metadata read found a single sensitive `DATABASE_URL` entry (`EG9ch4r43fMYlpzs`) targeting both Production and Preview. Branch labels, encrypted value comparisons and a READY build cannot prove isolation. No value was decrypted. A separate project/database/role and runtime identity receipt must precede any signup, notification, deletion, payroll or billing test there.
4. The coordinator must separately resolve control quota, approved schema/grants, private custody, host activation and a fresh backup. This document performs none of those steps.
5. Obtain an explicit finite delivery exercise authorization: exact source, fictional company/account IDs, owned device/browser, destination, time window, maximum provider attempts and rollback owner. Proposed first exercise: one explicit web self-test and one monitor outage/recovery pair to `support@thevelani.com`, with automatic SMTP retries disabled operationally by pausing the schedule on first failure/unknown. Approval must cover the possible finite attempts, not just inbox messages. Reminder delivery is a separate follow-up authorization. No real delivery is authorized by this packet.

## Exact configuration contract (names and gates only)

Use approved stores; never copy browser/Production environment dumps or put secrets in chat, arguments or receipts. The public VAPID key is public, but the private VAPID/encryption/worker/health/SMTP keys are not. Reuse existing approved material only after recoverability and environment binding are established. New generation/rotation is a coordinator gate.

| Setting | Closed preparation | Authorized isolated delivery |
|---|---|---|
| `PUSH_ENVIRONMENT` | `test` on web and worker | `test`; must match the current company/worker environment |
| `FUEL_PORTAL_ORIGIN` | Exact canonical selected company origin | Same HTTPS origin; no credentials, query, fragment or path |
| `PUSH_FEATURE_ENABLED` | `false`; may become `true` for separately approved subscription-only UI qualification | `true` |
| `PUSH_DELIVERY_ENABLED` | `false` | `true` only for the finite exercise |
| `PUSH_TEST_DELIVERY_ENABLED` | `false` | `true` only for the finite exercise |
| `PUSH_TEST_ACCOUNT_IDS` | No invented account identifiers | Exact pre-approved fictional employee IDs, comma separated; no customer IDs |
| `PUSH_VAPID_PUBLIC_KEY` / `PUSH_VAPID_PRIVATE_KEY` | Approved canonical unpadded base64url P-256 pair (65/32 bytes); private key stays in server-side stores | Same environment-specific pair as the subscription origin; the current web parser also needs valid private material to expose self-test readiness, though the browser receives only the public key |
| `PUSH_VAPID_SUBJECT` | Approved `mailto:` or HTTPS contact | Valid contact under the approved operator's control |
| `PUSH_SUBSCRIPTION_ENCRYPTION_KEY` | Approved canonical 32-byte base64url custody | Same encryption custody required by existing records; rotation needs a separate retention/re-enrollment plan |
| `NOTIFICATION_WORKER_SECRET` | Existing approved secret, at least 32 characters | Same reviewed worker route/CLI custody; never expose to a browser |

The parser separates feature availability from delivery readiness. Invalid origin/key pair/contact/environment disables sending; a Preview cannot send with `PUSH_ENVIRONMENT=production`. In test, dispatch additionally requires the test gate and an exact account allowlist. Workspace active-state/timezone and current access are rebound at runtime. The managed host refuses disabled notification commands; do not add them to its active command set as a way to test a closed feature. Coordinator-owned profiles and restricted readers retain their existing contract.

## Subscription and dispatch acceptance

Record source, deployment ID, selected scope/environment/incarnation, browser/version, permission state, opaque operation/reference and aggregate counts only. Do not record endpoints, subscription auth keys, installation/session hashes, cookies or payload bodies.

1. With outbound gates closed, verify unauthenticated/cross-origin calls are denied; unavailable configuration offers no false opt-in/test success. Permission denied, unsupported browser and install-required paths must offer the existing recovery information without prompting automatically.
2. On an approved device, user gesture -> browser consent -> encrypted current-device enrollment. Test status refresh, concurrent same-owner enrollment, different-account ownership refusal, sign-out cleanup, expiry and lost response. Browser enrollment permission and stored subscription are separate from delivery.
3. Open the finite gates only for the approved account. Queue the explicit self-test once. The existing five-minute cooldown and current installation/generation restrict it to this device. Run only the coordinator-approved canonical dispatch invocation. Inspect its current intent/delivery receipt; do not reset attempts/leases or press Test repeatedly.
4. Record separately: queued; provider accepted; device displayed; click reached an authenticated current destination. A provider 2xx, CLI exit 0, a hidden tab or service-worker registration alone is not device acceptance. Lock-screen text must remain generic, without payroll, names or shift details.
5. Sign out, switch account, revoke consent, invalidate the source and expire a fictional notice in isolated local tests. Hosted revocation should use only the specifically approved fictional fixture. Verify old generations/clicks cannot expose the earlier account. Do not intentionally send to a foreign/expired endpoint as a live test.
6. Close delivery/test flags and pause the selected dispatch trigger after the finite run; verify effective settings and no next automatic processing. Preserve accepted/unknown outcomes. For rollback, close processing first, drain, then select a compatible reviewed source. Code rollback cannot unsend a push.

Reminder acceptance must exercise the existing policy without editing deadlines on customer data: outstanding schedule acknowledgement after 24 hours; availability reminder before the real deadline; current Manager/Owner grouped work; suppression on resolution, access loss and expiry; workspace-local 21:00–07:00 quiet hours. Scanner execution creates/reconciles intents and is not proof of a push. Local SQL/simulated provider evidence precedes a separately bounded real reminder exercise. Existing retry policy remains five attempts, source-expiry bounded; there is no exactly-once display promise.

## Independent SMTP observer

Keep `NEVORA_NEON_HOST_ENABLED=false`, `NEVORA_OPERATIONS_MONITOR_ENABLED=false`, `NEVORA_OPERATIONS_ALERT_MAIL_ENABLED=false` and its native schedule disabled until the coordinator's gates are met. Read back `next_run_at=null`. The observer runs independently of the workforce service, never on the same child process as the worker.

| Monitor setting | Required selected staging value |
|---|---|
| `NEVORA_OPERATIONS_MONITOR_ORIGIN` | Exact selected HTTPS `*.onrender.com` origin, no path; no placeholder may be activated |
| `NEVORA_OPERATIONS_MONITOR_SOURCE_SHA` | Exact compiled matching host/monitor 40-character source SHA |
| `NEVORA_OPERATIONS_MONITOR_EXPECTED_COMMANDS` | Actual enabled profile-command total, 1–48; do not guess from planned modules |
| `NEVORA_WORKFORCE_HEALTH_KEY` | Same approved canonical 32-byte base64url health custody as that host |
| `NEVORA_OPERATIONS_MONITOR_DATABASE_URL` | Dedicated `nv_ops_monitor_<24hex>` direct, unpooled selected control DSN, only `sslmode=verify-full` |
| `NEVORA_ONBOARDING_ENVIRONMENT` | `test` in the hosted adapter |
| `NEVORA_RECOVERY_SMTP_HOST/PORT/USER/PASSWORD`, `NEVORA_RECOVERY_FROM` | Existing approved SMTP custody; TLS required; port 465 implicit TLS or STARTTLS on the selected alternative |
| `FUEL_PORTAL_ORIGIN`, `NEVORA_STAGING_EMAIL_RECIPIENT` | Exact approved HTTPS origin; recipient exactly `support@thevelani.com` |

Use [MANAGED-RUNBOOK.md](../../ops/workforce/MANAGED-RUNBOOK.md) for restricted-role admission and source-bound archive verification. Do not install owner/provisioner/commerce/model keys on the observer. Domain verification is not SMTP authentication: November 10 Resend metadata reports `nevora.team` and `thevelani.com` verified/sending enabled/tracking off, but it does not prove which SMTP sender is installed or that the alert inbox can receive mail. Resend receiving disabled does not establish the state of the separately hosted mailbox.

Authorized exercise: first observe authenticated healthy aggregates with mail off; reject forged/unsigned/replayed/wrong-source health; then enable only the approved monitor/mail window and deliberately stop the *fictional selected* worker through the coordinator. Verify one outage notice, repeated outage deduplication, restart/recovery and one recovery notice. Record SMTP accepted, provider delivered (if available) and Jose's inbox-observed result separately. Immediately pause on failure/unknown; inspect private canonical status before recovery. These actions are prepared, unperformed, and require coordinator activation authorization.

SMTP acknowledgement has a 15-second overall deadline in addition to transport inactivity limits. Expiry becomes `unknown`; late acceptance cannot turn the durable journal into accepted or trigger resend. It is not proof of transport cancellation. Definite rejection alone permits at most three attempts per notice at 15-minute intervals, within four total attempts per UTC day. The independent observer still depends on its provider, database, scheduler and mailbox; Jose must inspect the observer's own last successful tick. No self-monitoring or staffed uptime SLA is implied.

Reference: [Nodemailer SMTP timeouts](https://nodemailer.com/smtp#connection-options) distinguish socket inactivity from a total send deadline. No remote SMTP verification or send was performed.
