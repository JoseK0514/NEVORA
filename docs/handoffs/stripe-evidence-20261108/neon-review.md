# Staging hosting review and executor dispositions

Reviewed range: c3a64722d8cb3825bb2a198d90c0fff3a374724d..c3335c804739bf27d3e589f29fbc81f7df43e832. Fresh read-only reviewer neon_hosting_final_review reported eight Important findings, no Critical findings. It independently inspected the four current ZIPs: their 70 files, including 62 SQL files, matched this time. Actual closed probes did not exercise enabled runtime paths.

All eight Important findings enter one executor fix pass; no second review or independent certification is claimed:

1. Worker signing-secret exposure: separate worker Stripe configuration omits and rejects the receiver signing credential; explicit webhook invocation fails closed without it.
2. Cross-role capabilities: explicit per-role name policies reject unapproved NEVORA/Stripe/Neon/Postgres/AWS and credential variables, including automatically injected AI/storage secrets and retained user-defined values. Deployment checks must compare environment names before activation, not assume omission deletes them. Hosted billing requires restricted test keys, Tax off and onboarding provisioning mode.
3. Provisioner control DSN: validate effective PostgreSQL URL query keys, verified TLS, Neon endpoint, generated provisioner principal and explicit app identity before preparing the existing runtime. The hosted provisioner never receives an app password; a passwordless same-target identity URL serves the existing identity comparison.
4. Staging email: check exact support@thevelani.com recipient immediately before the mail transport. Unauthorized queued jobs retain durable retry state; no real mail was sent during regression tests.
5. Reconciliation: hosted ticks select one business. Transactional audit attempt ordering persists before provider work, so failures/crashes do not restart every tick at the first account. Existing storage is reused; no migration or new queue. Worker pools and SQL waits are bounded. Recovery scans retain chronological recording order within the newest 100 unresolved checkout intents.
6. Signed malformed events: validate envelope, event identity, mode and supported object IDs/discriminators before database initialization. Unsupported valid event types are acknowledged without opening enqueue capabilities.
7. Raw-body integrity: fatal UTF-8 decoding rejects lossy byte substitutions and preserves BOM bytes for signature verification. Both regressions reproduced prior acceptance, then passed.
8. Deployment ZIP custody: remove ambient ZIPOPT, validate exact ZIP inventory, regular-file type and safe names, extract to an owned temporary directory, hash and execute that extraction, and prove SQL tampering refusal. Loose files no longer stand in for uploaded archives.

The parent-symlink path finding was regraded Important: a redirected output parent can defeat the required source-tree boundary and leave ignored, unaudited build files in the checkout. Compare real parent/source paths before mkdir; the real-script regression first created a source child, then passed without writes after the fix.

## Rulings on reviewer limits

- Hosted role-specific authentication and genuine Stripe/worker effects remain unverified. Closed adapters receive no secrets and all schedules stay off. Cost if treated as passed: payment state could fail to update or use wrong credentials.
- Actual SMTP/provider delivery, protected application ingress and the two-Owner journey remain separate required acceptance gates. Local recordings and SQL fixtures do not prove remote delivery, provisioning or Vercel SSO reachability. Cost if treated as passed: owners cannot complete signup or an unverified integration can affect the wrong workspace.
- Claude UI, independent certification and production readiness/authorization remain outside this adapter review. Cost if treated as passed: an unaccepted interface or unapproved deployment could be represented as launch-ready.

## Evidence

Reproduction and regression logs are retained in this plan's evidence archive. Initial focused review tests failed 19/61 against the previous implementation; malformed/overprivileged inputs and missing worker signing config were reproduced. Additional BOM and worker-capability tests also failed first. Archive/path regressions and actual extracted bundles are verified separately. The owned PostgreSQL commerce suite covers exact approved/rejected queued recipients and durable reconciliation advancement with a fresh billing object. Final complete counts and hosted candidate IDs are in neon-hosting.json. No reviewer is asked to self-close these findings or any independent gate.
