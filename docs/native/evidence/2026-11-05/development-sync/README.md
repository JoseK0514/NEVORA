# Native development synchronization — November 5, 2026

Owner: Codex/root. Jose authorized updating the native project with the latest development code. Local update is complete; Phase 3 and shared release gates remain open.

## Source custody and reconciliation

- Previous native checkpoint: `1ea6e798c522ddcff96d6f315a9feb77d96b0500`; local plan commit: `d0452748deabd57f04b97628e9180fd2a0a2b613`.
- Fetched development: `e9c3a66da330959738100884f87cb76fd2af8296`. A final remote read confirmed this was still the development head.
- Local merge and tested application commit: `cf4fff066f3bba83c83a0a034786f544db3cb936`, with both histories retained. The later handoff changes only documentation/evidence and one README command.
- All **96 active native files** retain their checkpoint blobs and modes. Development's **199 non-native changed files** retain its exact contents, with two intentional reconciliation exceptions: `src/components/app-shell.tsx` combines native device setup with the development sidebar/root chrome, and `.github/workflows/native-spike.yml` follows the prototype relocation.
- All **81 prototype files** are preserved under `native/capacitor-spike/`. Its README has two path corrections: `cd native/capacitor-spike` and the evidence link. All other prototype bytes are unchanged. Its existing CI keeps both SDK jobs, pins, identity checks and artifact retention with corrected working/cache/artifact/tool paths. Root `native/README.md` distinguishes the two implementations. Prototype SDK compilation/hosted CI was not rerun locally; its 19 policy checks passed.

The source inventory now classifies the current heads from actual ancestry. AI-owner and the Employee branch are already included through development. Three unmerged Owner Direction B commits remain held on the collaboration line; the one unique database-rehearsal documentation commit remains reference only. Neither was imported or executed. The limit remains three active branches, while the remote still has six. The post-update inventory check fails **only** on that count. No remote ref was changed or deleted; existing worktrees and private signing material were preserved.

## Checks actually run

See [verification.json](verification.json) for exact commands, exits, code SHA, private log hashes and named browser scenarios.

| Check | Result |
| --- | --- |
| Pre-update native unit baseline | 278 passed |
| Full root Vitest suite | 10,978 passed; 801 skipped under existing configuration; exit 0 |
| Typecheck and full ESLint | Passed |
| Android JVM tests | 26 passed, zero failures/errors/skips |
| Android Debug/test APK, unsigned Release, lint | Passed |
| Swift core tests | 29 passed |
| Unsigned iOS Release simulator build | Passed |
| Python native/tool tests | 22 passed |
| Node native ownership/build tests | 14 passed, including two actual independent local PostgreSQL invocations |
| Association tool | 17 passed |
| Relocated prototype policy checks | 19 passed |
| Native/web-push SQL regressions | 211 passed across six files; disposable cluster stopped |
| Actual Next.js/PostgreSQL/browser contract | 17 named scenarios passed; source verified and ownership closed |
| Shared source inventory | **Failed:** six active remote heads exceed three |

The browser matrix exercised ordinary fictional sign-in/activation, Employee/Owner actions, unsupported Manager/Lead native presentation with preserved web access, session denial/expiry/revocation and database outage/recovery. It used invocation-owned data and local SMTP capture. No real user message, provider send or production database connection occurred. Platform UI/device journeys were not rerun; earlier platform evidence remains tied to its earlier code. The 801 default-suite skips are not promoted to passes or release acceptance.

Two initial command-selection mistakes were corrected without application changes: an absent PostgreSQL path, then a mistyped expected commit. Their guards failed closed; the subsequent exact-input checks passed. Logs retain those failures. Unfiltered merge whitespace checks also report inherited whitespace in raw historical evidence; the novel synchronization delta is clean and the old artifacts were preserved.

## Review and remaining gates

The [fresh read-only code review](code-review.md) approved the local update with no blocking findings. Its one LOW finding was the stale prototype `cd native` command. The executor changed it to `cd native/capacitor-spike` and verified that directory's actual npm package and `android:debug` script. Custody verification now permits exactly those two README path fixes. No second reviewer approval or independent QA certification is implied.

Executor rulings on the review's declined scope: unchanged parent features remain inherited, not independently recertified; hosted prototype CI and platform hardware need their own evidence; signing/distribution/deployment remain separately authorized future steps; and the remote branch count remains a mandatory shared release blocker. None is silently closed by local success.

Engineering retains the approved direct-shell architecture and current development application. Security retains exact-origin/session controls, private signing custody and default-off delivery. Governance accepts this isolated preparation under the approved design and retains the failed shared release gate. Delivery reports the local code update complete, not Phase 3 complete. No policy waiver or production authority was requested or inferred.

Next: resolve shared branch policy through the authorized source owners, establish approved isolated native-development HTTPS/database custody and signing recovery backup, then qualify signed builds and actual devices. Apple organization signing still awaits verified enrollment approval. No push, main/development merge, hosted deployment, upload-key-signed APK/AAB, Play upload or distribution occurred in this task. The checkout remains detached.

Private full logs/build outputs: `/Users/josek0514/.codex/native-runtime/nevora-development-sync-20261105`. Owned browser evidence: `/private/var/folders/4b/9tfty_tx1vdg9pg02qrgnr2r0000gn/T/nevora-native-owned-em2qaF`. These paths do not contain a production credential binding for reuse.
