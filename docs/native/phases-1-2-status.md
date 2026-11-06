# Native phases 1–2 handoff — November 4, 2026

**November5 qualification update:** the later default-WebView149 run failed the original repeated-Employee-recreation case, and an immutable pre-resource APK reproduced it. Repeated-recreation acceptance is reopened as a release blocker; the approved API29+/WebView149+ minimum itself is unchanged. Prior passing results below remain historical evidence. See [reproduction and follow-up](android-recreation-accessibility-followup.md).

Phases1–2 implementation and local executor verification are complete for the approved Employee/Owner scope, under Jose's Android10+/WebView149+ decision. The fresh runtime-extension review approved the change with no functional/security blockers. Native update/browser fallback, supported-runtime matrices and current Android real-backend acceptance passed. The native program is not ready for release.

Current Android application checkpoint: `ad9f38fa0becc47aa37e4b7c45f8dba78cc72856`; final backend-test candidate: `79f2d9cbf746009add1be757858664cda0873780`. Prior iOS/server/shared web checkpoint: `0231524bc7ea9f385fcc5249535e75e6e03f3d60`, retained by exact source comparison. Local detached worktree: `/Users/josek0514/.codex/worktrees/nevora-native-phases-one-two/nevora-native-employee-owner-20261101`. Earlier implementation commits: `9a46ccf7` dispatch, `59bcdf9f` platform capabilities, `5c816e8f` Android document browser visibility. No merge, push, hosted deployment, production signing or release.

| Verification | Result and scope |
| --- | --- |
| Default repository unit suite | 10,897 passed; 801 existing skips in 27 files |
| Real PostgreSQL regressions | 211 passed in 6 files; disposable owned data |
| Real local backend | 18 named checks passed independently on iOS and Android; three native Employee/Owner/activation UI cases each; Android cold restart also passed |
| Native policies/proof/IO | Swift29 and JVM26 passed; actual URLSession/URLConnection timeout, redirect, cookie, size and cancellation tests |
| Platform checks | AndroidDebug/test/unsignedRelease/lint and iOSDebug/unsignedRelease builds passed; TypeScript/ESLint passed |
| Runtime fallback | Actual Google120 update/native-only/browser-intent/recreation, missing provider and fontScale2/landscape/keyboard cases passed; Android minSdk29 verified |
| Permissions/channel | Actual Android36 grant/deny and WebView listener/frame/replay/retirement checks passed, push disabled |
| Documents | iOS native review/cancel/blob/Safari/page/cookie-control1/1passed; Android browser query RED→GREEN and actual manual review/cancel/blob/Chrome handoff passed functionally |
| Harness protection | Python 19 and Node 13 passed; document-only fixture cannot qualify backend/foundation |
| Production compilation | Next build passed with 4070 artifacts and unchanged source; frontend inputs unchanged through 0231524b |
| Foundation | Final iOS seven-case fixture retained on unchanged app code; Android32 and37.2 each passed original10default-mode cases and separate cold restart on Google SDK149 |

Native changes include durable default-off notification dispatch, constrained origin/main-frame/lifecycle messaging, installation-key proof, explicit enrollment/reconciliation, permission/token/receipt handling, generic taps, protected incoming links and deliberate browser document reauthentication. Browser Web Push stays separate. Association and entitlement files are templates with placeholders. Native file preview/share is not implemented; browser sign-in and document reselection are the approved fallback.

Local tests do not establish real APNs/FCM enrollment/delivery, hardware key protection, minimum-version/physical-device behavior, hosted HTTPS associations/passkeys, publisher identity, or store readiness. Those remain Phase3/4 gates. Android Chrome first-run setup was not completed, so Android browser-page/cookie isolation is unqualified; iOS exercised those controls with fictional data. Real backend fixtures use the approved local SQL transport, not a production Neon connection.

The single fresh platform review returned BLOCK; H1–H5 and its document/transport findings were corrected in one executor pass. No second reviewer approval is implied. Remaining low-priority deferrals: compressed coordinator formatting, and the ordinary iOS fixture runner still accepting a positive count instead of requiring exactly seven. This run independently retained all seven actual case identifiers. Full provider/device runtime assurance is not a waived minor. All rulings and costs are in [review corrections](evidence/2026-11-04/phases-1-2/platform-review-corrections.md).

Failed Android matrices, unsuccessful hypotheses, the combined backend `ANCESTRY_UNAVAILABLE` interruption and the initial dependency-symlink production build failure remain retained. The exact OS observation error was not recorded; no ownership check was relaxed. The final independent platform runs closed their owned resources with source verified. Prior phase2 runs closed their owned resources. The owned API32/36/37.2 emulators and owned iOS simulator are stopped; API32 original provider bytes/default selection/enabled state and font-setting absence are restored. SDK installation and reproduction data remain. All ten inherited pending source files in the original checkout are unchanged. Dependencies were copied into this worktree at the same versions for Turbopack; the original symlink is retained outside source.

Source inventory remains red (six origin heads versus the permitted three, plus a separate remote ref); no branch was deleted or integrated to bypass it. The recorded development comparison was08d713d4: sharedsrc/db/package/lock matched the native base; its separate Capacitor feasibility spike was not adopted.

Owner: Codex/root. Director positions: CTO retains the shared WebView architecture with a strict native admission gate; CISO retains closed private entry, lifecycle retirement and browser-owned cookies; CPO compatibility scope was explicitly approved by Jose; technical assurance limits SDK evidence to local qualification; governance retains failed experiments and external release gates; delivery separates completed local phases from release readiness.

Next gate: Phase3 physical/minimum-version and retail-provider checks, real APNs/FCM/device qualification and hosted HTTPS associations/passkeys, followed by Phase4 signing/store/release work. Development integration first requires reconciling the red source inventory under the existing branch policy. No further Jose decision is pending for the approved Phases1–2 scope. See the [decision packet](android-foundation-decision.md), [approved proposal](android-runtime-compatibility-proposal.md) and [current runtime implementation evidence](evidence/2026-11-04/runtime-baseline/README.md).

The runtime-extension backend tests required label corrections: modern WebView exposes the Monday button and switch through their declared accessible descriptions. Exact state, closed-dialog,20second wait and server mutation assertions remain. Both failed runs are retained; final18checks/3native cases/cold1 passed with source verification and owned cleanup.

[Final verification](evidence/2026-11-04/phases-1-2/final-verification.json) · [Complete artifact index](evidence/2026-11-04/phases-1-2/platform-artifacts.json) · [Document QA](documents-qa.md) · [Detailed ledger](evidence/2026-11-04/phases-1-2/progress.md)
