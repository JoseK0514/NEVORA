# Company-specific staging worker enrollment

Status: local implementation/qualification; not hosted activation approval. Native
apps, Production, new companies, payment movement and real delivery are excluded.
This extends the existing private provisioner; it adds no public credential route.
Shared encryption and commerce roots remain inside its existing write-only custody.

## What runs where

The private provisioner opens the original active WORKER connection, proves the
company's restricted login/identity and stored WORKER commerce hash, and seals only
that connection plus the company's derived WORKER secret to a fresh RSA3072 key.
One immutable public request and independently pinned hash select the recipient.
The host holds a per-company control reader and recipient private key, no shared
root or Owner token. Each canonical operation checks the actual reader's effective
permissions, current registry/secret, recipient, envelope and expiry. Original
company-side transaction and business authorization guards remain in force.

The initial operator profile prepares payroll only. Notifications/reminders retain
all existing provider keys, delivery feature gates and explicit test-recipient
approval; this enrollment change does not turn them on or prove actual delivery.
Payroll calculates pay and creates documents; the existing payment system pays.

## Offline operator preparation

Use Node24.19 and the repository's existing server context. Supply paths only,
never passwords, PEMs or JSON values as CLI arguments. Inputs are regular,
non-symlink, single-link files owned by the current user with0600 permissions in
an owned0700 directory. Paths must be canonical absolute paths. Output directories
must be new; use a private parent. Tools print only prepared/unavailable.

```
node --conditions=react-server --import ./scripts/node-server-context.mjs --import tsx scripts/worker-enrollment-operator.mts request /PRIVATE/scope.json /PRIVATE/new-request
node --conditions=react-server --import ./scripts/node-server-context.mjs --import tsx scripts/worker-enrollment-operator.mts profile /PRIVATE/profile-input.json /PRIVATE/new-profile
```

The public scope file contains exactly workspaceId,environment(test),incarnation,
registryRevision,sourceSecretRef,loginRole,canonicalOrigin,providerProjectId,
issuerSourceSha,requestExpiresAt and expiresAt. A request lasts at most30minutes;
runtime admission lasts at most24hours. Generate fresh keys per operation.
Outputs: request.json(public metadata/key),binding.json(ID/hash),recipient.private.pem.
Keep the private key out of the public request and control database.

The profile input is `{profiles:[{request,recipientPrivateKeyFile,
controlDatabaseUrl,commands:["payroll"]}]}` for one or two companies. Its
profiles.json contains private machine credentials: keep0600 and transfer only
through the approved secure handoff. Never place it in git, chat or CI artifacts.
After the separately approved reader setup, preflight the actual clean build with
`node build/workforce/host.mjs --validate-config` using the protected environment
and exact RENDER_GIT_COMMIT. This opens no listener, state lease or worker process.
Preflight is configuration evidence, not successful database access or operation.

## Hosted activation boundary

No step below has run for enrollment. Re-read current public A/B metadata and
capture exact source/manifest/migration hashes before execution. The finite scope
and historical source are in docs/handoffs/2026-11-09-company-worker-enrollment.md.

1. Pause/drain existing relevant schedules and host; record disabled state and
   exact versions. Back up the current control schema/data and original A/B
   ciphertext/role/hash/receipt fingerprints; confirm restore custody and expiry.
   Earlier Nov9 snapshots are historical and may expire; never reuse them blindly.
2. Apply only db/control-migrations/0007_worker_enrollments.sql to the selected
   staging control database. Configure the existing restricted issuer with
   configureWorkerEnrollmentIssuer; grant only SELECT/new result UPDATE columns.
   Create the two exact scoped reader logins with new private passwords and
   configureEnrolledWorkerControlReader. Do not grant legacy ciphertext views or
   APP credentials; the existing machine-principal audit must pass.
3. Generate fresh recipient requests and insert them with createWorkerEnrollmentRequest.
   Compare canonical IDs/hashes out of band before assigning the two non-secret
   deployment variables. A changed hash or metadata needs a fresh review; no silent
   request replacement or key reuse. Keep all original secret references intact.
4. Qualify the authenticated Neon CLI's documented merge behavior for --env.
   Deploy only the provisioner ZIP and changed non-secret settings, preserving all
   unmentioned write-only roots. Do not substitute full-replacement MCP semantics.
   Match compiled source and existing branch. Keep normal provisioning/onboarding/
   provider/commerce flags explicitly false. Enable the enrollment gate with only
   the two exact IDs/hashes for a bounded native issuance, then close it and remove
   the temporary request selector. Record actual invocation count and results.
   Each invocation seals at most one request; two companies require at most two
   effective issuance invocations plus safe exact-receipt recovery after lost ACK.
5. Confirm each actual reader sees only its unexpired sealed result. Assemble and
   privately transfer host profiles; validate actual company payroll/queue-health
   access and foreign-company/Owner denial before host activation. Keep delivery
   off. Apply the separately reviewed Render plan only with Jose's authorization.
6. Recheck exact version/flags/source and original fingerprint equality. Alert
   recipient support@thevelani.com; initial responder Jose. A real alert email or
   push smoke test needs separate explicit recipient/content approval.

## Stop and rollback

Stop on any source/branch/scope/hash/role drift, missing backup, unexpectedly broad
permission, output disclosure, unexpected provider action or deadline. Disable the
host and enrollment mode, pause the schedule, drain active operations and preserve
receipts. Revoke a result by setting revoked_at once. Readers then stop admitting
normal calls, including cached transports; revoke/drop only newly created scoped
readers after drain. Do not delete original secret rows or reset shared keys.
Restore prior code only while the schedule remains disabled; never re-enable an
older normal provisioner as an automatic rollback side effect. Keep encrypted
results for audit; schema removal needs a separate reviewed rollback.

Enrollment expiry/revocation is normal runtime admission. It cannot recall a
PostgreSQL password already recovered by a compromised recipient. Original WORKER
passwords are deliberately unchanged; compromise requires a separately approved
rotation of that company's login and dependent catalog binding, not a claim that
revoking an envelope erased the underlying capability.
