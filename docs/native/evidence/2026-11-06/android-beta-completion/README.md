# Android beta continuation — November 6, 2026

Status: **replacement upload identity active; cloud/vault restore opens the key; source policy reconciled; Free database and private deployment source created. Hosted/device/release gates remain open**.
Owner: Codex/root. Starting candidate `bc6b739750562716283d57b821ca6ef4aca72370`.
Fresh development `e9c3a66da330959738100884f87cb76fd2af8296` is included.
The [Android 10–12 qualification](../android-supported-os/README.md) remains the
existing platform evidence; no application code changed in this continuation.

## Source reconciliation — verified

The collaboration head is recorded as held at `cb53bb42ed6de75c1e5f52a905b208ee921aaa3a`.
Its three commits beyond the prior `1808fcf7` snapshot change only DESIGN.MD and
Owner desktop CSS (271 additions/12 deletions). Exact source scope was inspected;
UI claims were not independently verified and none of that work was imported.
Draft production PR37 remains untouched.

After clarification, Jose explicitly approved archiving only the older extra
remote copy `claude/youthful-mendel-9mg8hu` at
`28c98b79aca42f5796bb68a4984cab6dbc38bc30`. Its one unique commit changes five
schedule week-state React keys/comment (6 additions/5 deletions); the underlying
held Owner mobile work stays recoverable. No open PR used that branch.
The exact remote archive was created atomically with guarded retirement and then
read back. All three protected remote heads, all local branches and all 135
worktree heads/paths were unchanged. See [the actual receipt](branch-retirement-receipt.json).
This is not import/acceptance of Claude's newer UI or a push of native code.

The unchanged production checker now **passes: 73 classified sources, 3 active
branches**, with exact archive verification. All 14 inventory unit checks pass.
The earlier proposal and RED logs remain as history; final compressed logs are
`final-source-inventory-unit.log.gz` and `final-source-inventory-live.log.gz`.
Shared native application integration/CI has not yet been performed.

## Replacement signing identity and recovery

A native file-picker's Columns preview exposed the **old unused development-key
password** in automation output. No private-key bytes were displayed. The transfer
was canceled and its temporary encrypted image/file removed. The exposure is real;
earlier no-output receipts describe their individual operations, not the whole
session. [Incident and containment](credential-preview-incident.json).

Jose explicitly approved “Activate the replacement and update the backups.” The
new active upload certificate SHA256 is
`FCE29B057557198C9FD73B458C28A59DBA713F8C26619DBB9B5B262CF08C749E`.
The private active manifest is
`~/.codex/native-signing/nevora-development/active-development-upload-key.json`.
Old files are preserved in retired custody and marked DO NOT USE. Play freshly
showed no releases/bundles. Google's managed app-signing key was unchanged; this
is a development upload identity, not an installed Play app's certificate.
New-key creation passed strict dummy-JAR signing, wrong-password and tamper
rejection. [Creation proof](replacement-candidate-create.json),
[preflight](replacement-candidate-preflight.json),
[activation and recovery](replacement-key-activation-and-recovery.json).

The new encrypted PKCS12 is in the approved existing iCloud Drive, in the dated
November 6 recovery folder, with SHA256
`5095fe44a71b91cfe2b1852a793f2c56b1abe84753dcb161767a6f69df5f2208`.
Upload was confirmed. Actual eviction/download observed NotDownloaded → Current
and restored the matching bytes. The new password was imported into the approved
Bitwarden vault; “Data successfully imported” and the saved item were observed.
The encrypted interchange image/file was closed and removed immediately.
The replacement password was not printed.

Bitwarden's recovered password opened that restored PKCS12 in Android Studio's
Choose Key dialog and listed `nevora-development-upload`. Remember passwords was
off; the wizard was canceled without building/signing an Android app, and the
clipboard was replaced with the public alias. This proves recovered-password
keystore access. A dummy-JAR signature using the **vault-recovered** password was
not performed; do not substitute the new key's creation proof for that step.
Terminal UI automation was unavailable; no alternate UI was used to bypass it.
Jose is unsure he can access iCloud and Bitwarden without this Mac, so
**full independent recovery remains false** until that owner recovery check.

The single [fresh review](fresh-review.md) returned HOLD on two private transfer
helper defects. The executor reproduced them with fictional data and corrected
them in one pass: verified encrypted-directory FD before credential retrieval,
relative FD writes/readback, durable atomic ownership, atomic progress and
retryable owned cleanup. All six [fictional regressions](vault-transfer-review-green.json)
passed, including forced mount loss and interruption after payload/detach; all
fixture images closed, no host plaintext. Current helper SHA256 is
`837d6ae02f09c2771f46b4364652b8d2bc8260784f3129dfb471e170a04bf52c`.
The file picker was switched to List and a [fictional preview regression](file-picker-preview-regression.json)
confirmed no JSON/password contents in AX output. Actual sensitive reads used
emit:false and metadata allowlists. These are executor corrections; no second
review approval or independent finding closure is claimed.

## Staging preparation — local verification and free account

Jose accepted the Render signup terms and creation under `support@furbrandpr.com`.
Native Chrome verified workspace `tea-dbmr3t6c6qcc73cbf0jg`: Hobby, no card,
no services and no pending charges. [Account receipt](render-account.json).
No server secret, Render service or deployment was created.
Paid hosting and the existing Vercel/Neon cost proposal remain ON HOLD.

The new [free alternative](../../../../../native/staging/free-environment-plan.json)
uses Render Free plus a **separate new Neon Free organization**, now verified:
`org-wild-heart-93376487` / VELANI Native Development. Project
`noisy-fog-17044568`, root `br-still-haze-bb6qa2a2` / native-fictional-only,
database `nevora_native_staging`, endpoint `ep-jolly-dream-bbqd82uj`, PostgreSQL17,
0.25CU min/max and quotas were read back. Empty table inventory returned `[]`.
No schema setup, credential retrieval, runtime role or secret binding occurred.
The owned endpoint was explicitly suspended and read back **idle**. Its reported
suspend_timeout_seconds is **0**; five-minute automatic suspension was not
established. The first create request rejected an unsupported interval; a zero
project inventory was confirmed before retry, and exactly one project was created.
Both existing Launch organizations remain unchanged.
[Resource receipt](neon-free-resource.json).
Ordinary Render Postgres is not a drop-in for the application's Neon HTTP transport.
Render Free sleeps after 15 idle minutes and can display a startup page; usage is
finite and workspace-scoped. Keep the no-card state and verify enforcing limits
before service creation. Public origin/exposure and hosted runtime acceptance
remain open.
Sources: [Render limits](https://render.com/docs/free),
[Neon organization creation](https://neon.com/docs/manage/orgs-manage),
[Neon plans](https://neon.com/docs/introduction/plans).

The current allowlisted source export contains **2777 files / 50,068,440 bytes**,
all byte-matched to frozen `bc6b7397`. Only an inventory unit-test file differs from
the November 5 export; source selection excludes native projects, authoring/history,
.env and key files. Fresh `npm ci --ignore-scripts --no-audit --no-fund` and production
build passed on Node 24.19.0, with no database/provider credentials or configured
portal origin. Five actual loopback production-server checks passed: credential-free
401 probe, selector 400, foreign-origin 403, cross-site 403, private-route login
redirect 307; JSON/privacy headers were asserted. The owned Node/listener closed.
All selected sources and the archive remained unchanged after build/start.
These are **local** results, not an isolated HTTPS/backend/device qualification.

A private filtered deployment repository was created and pushed:
`JoseK0514/nevora-native-staging-source`, mirror commit
`59c78f7b71bfa75e3788c845e8ad04225d705103`. Its 2777 unchanged source files plus one
public provenance receipt contain no authoring history or native SDK project.
Private visibility and exact remote commit were verified. Authoritative NEVORA
branches were not pushed/changed. [Mirror receipt](deployment-mirror-receipt.json).
The scanner retained exit1 and ten findings, each inspected as schema identifiers,
source digests or test fixtures; zero deployed credentials were identified by
this static check. [Adjudication and limits](mirror-secret-scan-adjudication.json).
Eleven pre-existing whitespace findings in the frozen source were preserved and
[recorded](mirror-baseline-whitespace.json); no source bytes/assertions were changed.

Chrome sign-in was confirmed as JoseK0514. Render reused an existing September12
GitHub installation, ID161173039, already set to all repositories. The executor
did not expand or narrow that existing setting. Only the filtered repository was
selected in the new-service draft. Name `nevora-native-staging-20261106`, Free
$0/month, Virginia and exact build/start commands were read back. Manual-deploy
and runtime selection could not be conclusively verified because native Chrome
rendered blank content while retaining AX controls. A reload returned to source selection and still rendered blank; the proposed
settings are retained in [the receipt](render-service-draft.json) and must be
re-entered/verified. No service was submitted; no new security grant or public
deployment approval was inferred.

## Remaining gates and authority

Independent key recovery still requires owner access independent of this Mac and
the outstanding recovered-credential signing rehearsal. A usable signed beta requires a qualified
isolated HTTPS origin, exact source integration/CI, artifact/certificate/origin
checks and controlled internal distribution. Jose confirms no physical Android
phone/tablet is available; emulator results do not close that gate. Firebase client
config is privately downloaded/identity-verified; server credential, enrollment,
real delivery and Play installed signing identity are not yet qualified.

Engineering retains the current container/backend. Security retains approved
credential destinations, least privilege and disabled external delivery. Governance
retains the three-branch ceiling and mandatory release gates. Delivery marks only
demonstrated steps complete. No policy exception, independent audit closure,
production deployment or public store release is claimed.
