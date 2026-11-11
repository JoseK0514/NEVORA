# Enrollment review remediation candidate

Original independent report is preserved unchanged beside this file. Its NO-GO
at fdd83020 is not replaced by the implementation team's notes. Required findings
remain independently unclosed until a separate named-source replay/addendum.

| Finding | Implementation and executor regression evidence |
|---|---|
|F1 Critical: overprivileged company WORKER|Effective relation/column/grant-option policy derives from canonical bootstrap declarations and includes PUBLIC/default/native privilege checks. The issuer proves it before sealing; enrolled transactions enforce it before/after their bodies. PUBLIC and direct credential-column grants deny cold issuance and warmed use. A newly created native-looking callable function also denies admission. Correct original worker grants remain positive.|
|F2 Critical: colliding Worker/Owner hash|Proof and enrolled commerce require worker_secret_hash distinct from instance_secret_hash as well as the positive Worker digest. Both wrong-root issuance and later colliding company state deny use. Original hashes are restored only in disposable test data.|
|F3 Important: in-flight revoked entitlement|An enrolled commerce handle rechecks current receipt/material and company authority after fetch and on cache returns. Real revocation and deadline crossing during the fixture fetch reject; valid fetch/cache remain positive.|
|F4 Important: excess issuer rights|Setup and issuance inspect effective table/column/grant options, forced RLS and immutable-trigger state. Only SELECT and four result-column UPDATE privileges are admitted. Audit runs before custody, after asynchronous company proof and before COMMIT. PUBLIC TRUNCATE, direct DELETE, request-column UPDATE, grant option, disabled force-RLS/trigger and late drift stay unissued.|
|F5 Important: mixed parent custody|Enrolled hosts reject a legacy-root sibling in either order and privileged ambient application/provider fields. All-legacy hosts retain their separate behavior. Both actual compiled offline preflight and parser regressions cover the boundary.|
|F6 Important: split setup transaction|The issuer setup requires a checked-out client before any write; a Pool is refused. A real server-side CREATE POLICY failure rolls back the original policy and privileges on the same client.|

All six findings first failed executor regressions before their production fixes.
Logs remain in /Users/josek0514/.codex/worker-enrollment-20261109/ as fix-*-red.log
and fix-*-green.log/qualified.log. The first worker ACL implementation rejected a
legitimate native catalog column ACL; owned boolean-only diagnostics identified
that missing pg_init_privs column allowance. The final policy retains native
initial privileges; the temporary diagnostic code was removed. No real credential
value, Owner password hash or root was printed.

The first full default suite at fdd83020 had11655pass/15fail/857skip. Seven-step
acceptance then had192/192 onboarding but504/505 Company Access and stopped. Its
failing availability-budget fixture set deadline=wall-clock+6h, which can expire
before quiet hours end at07:00. The test now chooses its eligible deadline six
hours after nextRoutineTime using the existing real policy and fixes its scanner
clock. The one-notification and unchanged-repeat assertions are preserved; no
quiet-hour production rule was changed. Focused real Company Access27/27 passed.
Full serial/default and complete exact-source acceptance remain required.

Minor deferred: an owner-supplied0600 FIFO can hang the local private-file helper
while opening before fstat. It emits no output and creates no directory. The
independent report tracks the exact reproducer; do not claim that edge case fixed.

Operational boundary: Neon CLI9.3.0 was installed only in an external private
qualification directory with install scripts disabled. Its actual help supports
single-function --no-bundle and repeatable --env. Official docs describe merge and
delete semantics. Local profile metadata exists, but an actual selected-control
project read failed invalid_grant; fresh sign-in is required before any hosted
CLI step. No credential file was opened/copied and no deploy command was run.
Do not replace that gate with an environment snapshot that would discard unknown
write-only roots. Render, hosted migrations/credentials/schedules and delivery
remain unactivated.
