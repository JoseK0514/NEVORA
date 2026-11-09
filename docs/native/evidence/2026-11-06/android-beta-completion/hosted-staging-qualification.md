# Free staging qualification — November 6, 2026

The isolated database is connected, bounded fictional Owner/Employee checks
passed, and actual Render service idle wake/retry is verified. Owner: Codex/root. Jose authorized “Connect the database and run
the checks.” Paid hosting remains on hold; no production/Clocker resource or
public store release was changed.

## Exact deployed target

- [Application](https://nevora-native-staging-20261106.onrender.com): Render service
  `srv-dbmsjuui0phs73co1oq0`, company workspace `tea-dbmr3t6c6qcc73cbf0jg`.
- Environment `evm-dbmsjugm7kps73c7u98g` / Native Staging. The provider's initial
  default Production label was renamed within this new one-service project.
- Database-bound deployment `dep-dbmu17vf3r2c73bkv07g` reported **Live**, using
  explicitly selected full mirror commit `59c78f7b71bfa75e3788c845e8ad04225d705103`.
  That private filtered artifact mirrors application source `bc6b7397`; it is
  separate from authoritative NEVORA main/development/collaboration.
- Free, Virginia, Node24.19.0, automatic deployments Off, no card/add-ons.
- Separate Neon Free organization `org-wild-heart-93376487`, project
  `noisy-fog-17044568`, branch `br-still-haze-bb6qa2a2`, database
  `nevora_native_staging`, endpoint `ep-jolly-dream-bbqd82uj`.

The initial deployment without a database remains historical evidence. The
[binding receipt](render-database-binding.json) records the current deployment.
Fresh [workspace billing readback](render-free-billing-current.json) still shows
Hobby, no card, one service,0.97 of750 Free hours,2 of500 pipeline minutes,
0 MB reported bandwidth of5 GB, and $0.00 accrued/projected charges. Usage may
lag; no billing setting or subscription was changed.

## Database and credential custody

The existing authoritative `setupCompany` transaction initialized the verified
empty database. Its [bootstrap receipt](neon-fictional-bootstrap.json) proves
actual client TLS1.3, certificate/hostname checking and required SCRAM channel
binding. Do not rerun setup or reset this nonempty database.

Workspace `602501a9-fb90-4bff-a682-95f6c7ef2053` is NEVORA Native QA (Fictional),
with one location, `NATIVE-QA-OWNER` and `NATIVE-QA-EMPLOYEE`. Only those fictional
identities exist. The Owner created the Employee through the authenticated app
workflow and its committed operation receipt was verified. A separate guarded
QA helper seeded that new Employee's random private login using the existing
password hashing implementation. It required the exact database, workspace,
employee details and Owner receipt, refused an existing different credential,
and subsequently reconciled without reset. This is fixture preparation, **not
invitation delivery or public activation qualification**.

An initial fixture guard refused the phone value before any database write: the
app stores `202-555-0102`, rather than unformatted digits. The exact expected
fixture value was corrected to the observed canonical form; the refusal and
rollback are retained in [the historical receipt](fictional-employee-credential-first-guard-refusal.json).
[Creation/reconciliation](fictional-employee-credential.json).

The web service received only `nevora_native_app`, created initially read-only
and then given the [explicit setup-only grants](../../../../../native/staging/runtime-role-grants.sql).
Actual [runtime qualification](runtime-qualification.json) passed **17 checks**:
verified TLS/channel binding, Neon HTTP authentication, a rolled-back ordinary
write, denied permanent/temporary schema and role creation, nine protected
Clocker photo table denials, and denied worker-only cleanup. The role has no
admin membership, owned relations, grant options or future default grants.
Installer credentials were never entered in Render.

Installer/runtime URLs and both fictional logins are in scoped macOS login
Keychain items under `com.velani.nevora.native-staging.noisy-fog-17044568`.
Private helpers live in the owned runtime directory recorded in the SDD ledger;
[their hashes](staging-operator-helper-hashes.json) permit resumption without
publishing values. Ordinary browser form entry used an encrypted temporary
transfer, verified file descriptor/device/owner/mode before read, and closed the
image/file after each use. The unchanged reviewed transfer core was reused;
the Employee wrapper's fictional round-trip/cleanup also passed.
[Final transfer closure](staging-browser-transfer-closed.json).

No staging password, database URL or replacement-key password was printed in
these operations. The earlier old-key picker exposure is separately retained
in [the incident record](credential-preview-incident.json); that history is not
erased by these clean operations.

## Actual hosted results

Five [HTTPS admission checks](database-hosted-admission.json) passed on the
database-bound deployment: 401 protocol1 JSON/no-store without credentials,
400 selectors, 403 foreign Origin, 403 cross-site, and 307 private-route sign-in
redirect. Default trusted TLS certificate/hostname verification stayed enabled.

The [18 browser checks](hosted-owner-employee-checks.json) passed:

- Normal Owner and Employee sign-in, including clear wrong-password feedback
  followed by successful retry.
- Owner-created Employee and persistent two-person team; Employee management
  navigation absent, direct employee creation redirected home, Owner Settings
  refused with the expected access message.
- Employee Monday 09:00–17:00 availability saved with a confirmed receipt, then
  reviewed and independently matched in `availability_windows`.
- Owner logout removed its server session (one active before, zero after).
  Expiring only the named fictional Employee session through a scoped fixture
  update redirected its protected page to sign-in; the normal native probe then
  returned unauthenticated. No browser cookies/tokens were read or synthesized.
- The authenticated Owner native probe returned only protocol1/authenticated.
- The exact Neon endpoint was suspended and observed idle. The next normal
  Owner sign-in succeeded, and provider metadata showed active afterward.
  This tests **database wake**, not Render's separate service idle wake.
- At 390×844, the settled availability page had document width390 and no
  horizontal document overflow; Tab focused Change one week. The first capture
  during viewport reflow is retained privately alongside the settled image.
- Employee time displayed its genuine empty state; no Clocker punch was made.
- The Owner downloaded an actual CSV through the ordinary Export control.
  The 4,929-byte, 17-row file matched the selected dates; SHA256
  `bc7c3e524ea33259f332012f0d4c4397c42245a13b9d996378dc97d20458396f`.
  [Download receipt](hosted-document-download.json). Native document handoff
  and payroll documents were not tested by this browser result.
- Final Owner logout completed. All fictional sessions are now inactive.

The separate [Render idle-wake check](render-idle-wake.json) also passed. With
all owned app tabs closed, the service received no owned traffic for more than
15 minutes. The provider's standard disallow-all robots response established
spin-down without waking it. The first credential-free API probe used the
unchanged native six-second timeout and timed out after6,103 ms. After15 seconds,
the retry returned401 protocol1 JSON/no-store in3,402 ms; elapsed observation to
compatibility was24,506 ms. No timeout or native assertion was changed. The
ordinary browser visibly displayed Render's startup page, then recovered to
the fictional-company NEVORA login. [Browser observation](render-idle-browser-check.json).
This establishes hosted wake/retry; actual native UI handling remains a device
gate. Free staging can require retry during startup. Provider behavior is
documented in [Render's Free service limits](https://render.com/docs/free).

Screenshots and the fictional CSV remain in the private runtime directory;
no credential-bearing AX tree or login screenshot was published. No application
code/assertion changed. Root application build/tests were not rerun for this
documentation/setup-only continuation; the frozen build and earlier platform
results remain their own evidence.

The fresh fetched [source/metadata checks](database-connected-validation.json)
passed:73 classified sources/3 active branches, valid JSON/local links, no tracked
Android/iOS code difference and a null public DATABASE_URL value. The bounded
[credential/transfer scan](staging-final-secret-and-transfer-scan.json) checked37
public task files/private helpers against five actual credential families in
raw, JSON-escaped and URL-encoded UTF8/UTF16LE forms: zero matches, all 9
helper hashes verified, zero owned transfer mounts/images left.

## Closure and next gate

[Final closure](staging-final-closure.json) records one workspace, two employees,
two credentials, one availability window, zero active sessions, zero invitations
and zero native installations/challenges/deliveries. The exact endpoint was
explicitly suspended again after the idle-wake check and observed **idle** at
14:54:18 UTC. Provider usage reported
402 compute-unit seconds and 1,588 active seconds, within quotas of3,600/14,400;
usage can lag writes. The actual database was14,589,952 bytes.

The Free service remains deployed. Its later requests can wake the database;
idle is an observed closure state. Analytics, mail, native/web push, AI, Clocker
punches, payroll and passkeys remain off. Paid plans were not started.

**Open:** shared native integration/CI; accepted-origin native binding and signed NEVORA artifact checks;
physical Android and native document handoff; controlled Firebase enrollment/
delivery and Play internal distribution/installed signing identity. No physical
Android device is available. No usable NEVORA release was signed/uploaded here.

Engineering retains the tested architecture and exact source; Security retains
restricted runtime/custody and disabled delivery; Governance retains source and
release gates; Delivery closes only demonstrated work. No new Jose decision is
required to preserve this completed setup. Phase3 remains in progress.
