# R16 managed-worker keyring propagation follow-up

Baseline: `bd807c6c350a92c2b9868a3cb3de5f4b6228a714`, the detached R12/R13/R16
and bounded R15 checkout. This is a separate local follow-up for the integration
review finding; it does not independently close R16.

## Cause and bounded correction

The managed profile allowlist admitted the original subscription encryption key
but refused all four rotation fields. The notification runtime therefore could
not receive a valid labelled ring through an enrolled managed host. Separately,
a mixed payroll/notification profile copied its notification credentials into
the payroll child.

`managed-host.ts` now admits exactly these additional profile fields:

- `PUSH_SUBSCRIPTION_ENCRYPTION_KEY_ID`
- `PUSH_SUBSCRIPTION_PREVIOUS_KEY`
- `PUSH_SUBSCRIPTION_PREVIOUS_KEY_ID`
- `PUSH_SUBSCRIPTION_LEGACY_KEY_ID`

The existing real notification runtime parser validates the entire ring before
admission. Missing pairs, invalid key material, duplicate IDs/material, missing
active IDs and unknown legacy IDs fail closed. Enrolled hosts continue to reject
top-level `PUSH_` fields. There is no wildcard secret admission or ambient key
fallback.

Child environments now select a command admitted by the profile. The sole runtime
invocation passes its selected command explicitly. A single-command caller can
omit the selector; an ambiguous mixed profile or unadmitted command is refused.
Payroll children drop every `PUSH_` field and `NOTIFICATION_WORKER_SECRET`.
Payroll-only profiles containing those unused fields are refused at admission;
operators must remove them. Mixed profiles remain supported, with notification
custody passed only to their notification commands. Existing scoped database,
enrollment, destination and source-pinning controls remain in force.

## Entrypoint audit and evidence

The notification worker loads `loadWorkspaceNotificationConfig`, which passes
through workspace runtime environment assembly and the full ring parser.
`createWorkerDeps` consumes `subscriptionProtection(config)`. Logout/recovery
factories, account preparation and `auth/session.ts` session destruction also
consume the full ring. Workspace runtime assembly retains the admitted fields;
no other propagation correction was needed in these entrypoints.

Evidence directory:
`/Users/josek0514/.codex/release-completion-20261111/r16-managed-keyring/`.

- `managed-keyring-red.json/log`: 5 expected failures and 20 passes. Real profile
  parsing rejected valid rotation rings; an existing mixed legacy profile leaked
  notification custody to payroll; payroll-only profiles admitted unused keys.
- `managed-keyring-final-focused.json/log`: 101 passed in seven files, no skips.
  Includes 18 new real parser/child/runtime tests; dispatch and reminders decrypt
  old subscription material, read old installation proofs and use the actual
  lazy recovery factory to read old receipts and write the active v2 format.
  Explicit old-key retirement cannot borrow an ambient previous key. Existing
  routing, host, runtime, key rotation, installation and logout checks pass,
  including the canonical CLI invocation with payroll disabled and no database.
- `managed-keyring-final-typecheck.json/log`: full TypeScript passed.
- `managed-keyring-lint.json/log`: scoped ESLint passed for both application files
  and the new test. `git diff --check` passed before commit.

Fixtures use fictional keys and ephemeral enrollment material. No test invokes
provider delivery, recovery database operations or hosted credential access.
The recovery factory is exercised only through its local sealing/opening methods.

## Controls and next gate

CTO/CISO position: preserve the real parser boundary and command-specific secret
custody; do not widen host or ambient credential permissions. Governance position:
retain meaningful RED/GREEN receipts and let independent review disposition the
integration finding. Delivery owner: this implementation chat supplies the local
commit; the main integration owner imports it and qualifies the frozen combined
source with independent review and final release gates.

No heavy SQL/build, Actions, remote push, hosted migration, key rotation,
notification delivery, native application or production work was performed in
this follow-up. Compiled managed-host preflight and combined release evidence
remain integration gates. No Jose policy exception or new decision is required
for this bounded fix.
