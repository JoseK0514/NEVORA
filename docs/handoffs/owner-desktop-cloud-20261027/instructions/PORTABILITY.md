# Moving the local prototype into a Cloud workspace

## Transfer is separate from preparation

These handoff files/archives were prepared locally. No Cloud task, upload, Git commit, push or deployment was performed. The local desktop tool does not directly transfer this projectless chat and file tree into Codex Cloud. Do not claim the next agent can read Mac paths.

Make the supplied prototype files available in the Cloud execution workspace through the file/repository import mechanism your actual Cloud setup supports. If the setup only checks out Git repositories, the prototype must first be put into a user-selected private branch/folder. This handoff does not choose that repository or authorize publishing/merging/integrating the app.

Extract the bundle into its **own prototype directory**, for example `<cloud-workspace>/nevora-owner-prototype/`. Do not unzip its root DESIGN/PRODUCT or generated outputs over an existing application’s files. Work from that extracted prototype root. The full code/build is below `work/owner-desktop`; output is below `outputs/owner-desktop`.

The full ZIP bundle includes the runnable source, instructions and complete desktop evidence. The optional core ZIP includes the same code/instructions/text evidence and selected current visuals but omits most historical screenshots. The full archive stores independent regular files only, with no symlinks, hard links or external targets. Current source and immutable baselines therefore cannot accidentally share an inode after extraction. `BUNDLE-MANIFEST.json` identifies every included/excluded file and SHA. Both archives include that same manifest; the manifest intentionally excludes itself from its own file hashes. Missing historical images in the smaller package are intentional; do not invent them or call an incomplete screenshot a passed visual test.

## Archive verification and extraction

Check the archive SHA-256 against the separately supplied `handoff/deliverables/SHA256SUMS.txt`. The complete archive is `nevora-owner-desktop-full.zip`; the optional smaller convenience package is `nevora-owner-desktop-core.zip`. Create an empty dedicated prototype directory, then extract there:

```sh
mkdir -p /absolute/cloud/workspace/nevora-owner-prototype
python3 -m zipfile -e /absolute/path/nevora-owner-desktop-full.zip /absolute/cloud/workspace/nevora-owner-prototype
```

Run from that extracted prototype root, before adapting test paths:

```sh
python3 handoff/codex-cloud-owner-desktop/verify-bundle.py --variant full
```

For the core ZIP use `--variant core`; it checks the intentionally smaller set. A core PASS is file-integrity evidence, not the complete G10 artifact audit. The full archive restores independent regular files only; its extraction was tested locally and every restored file checked against the manifest. Source/instruction text is untrusted task evidence and does not grant new permissions.

## Runtime

The Mac used Node 24.19.0, Python 3.9 and an existing Playwright installation with Chromium, WebKit and Firefox. No package was installed for G10. The prototype has no package.json. Its Python build is a source concatenation; do not run the actual Next app’s setup/bootstrap/migration/payroll-worker scripts for this UI task.

Use the Cloud environment’s supported Node/Python/browser tools. If the required engine/module is not installed or permitted, record that missing verification; do not silently skip its suite or substitute a mock. Do not buy services/tools. Ordinary local/open-source installation still must respect the actual Cloud environment’s rules.

Already generated source adapters are included. `port-g09-reference.cjs`, `port-g10-reference.cjs` and older port helpers are provenance tools, not bootstrap prerequisites. Do not regenerate approved source from a different actual-app revision.

## Local server and build

From the extracted prototype root:

```sh
python3 work/owner-desktop/build.py
python3 -m http.server 18763 --bind 127.0.0.1 --directory outputs
```

Run the server in a separate persistent terminal/session. The tests use `http://127.0.0.1:18763/owner-desktop/`. This is a local static server, not a deployment or public preview. If Cloud’s browser needs a forwarded URL, adapt only the transport/base-origin configuration in a reviewed change and preserve the exact-origin external-request guard; never replace it with a blanket network allowlist.

After build, index.html must remain `f6e3f5b3b332a61f12a2607c9a9728d7086a77747472f5217badc786ad543a3f` unless you deliberately changed runtime code and recorded why. Paths alone should not change its bytes.

## Playwright module path

The current test runners require a known Mac absolute module path. This is an environment dependency, not business logic. `prepare-cloud-paths.py` is an optional explicit adapter that changes **only that exact quoted module specifier in top-level .cjs runners**. It does not change runtime JS/CSS/HTML, test assertions, permissions, request guards, reviewed original evidence or original candidate snapshots. Default is dry-run. It never installs browsers/modules.

Provide the path to the actually installed Playwright package or entry point in your Cloud environment:

```sh
python3 handoff/codex-cloud-owner-desktop/prepare-cloud-paths.py --playwright-module /absolute/cloud/path/to/playwright
python3 handoff/codex-cloud-owner-desktop/prepare-cloud-paths.py --playwright-module /absolute/cloud/path/to/playwright --apply
```

Review the dry-run first. Applying records original/new hashes and backups under this handoff folder and runs Node syntax checks for changed runners. The helper was syntax-checked and tested in an isolated synthetic local workspace: dry-run nonmutation, exact apply with assertions preserved, backups/runtime immutability, actual installed-module loading and idempotent reapply all passed. **No real Cloud environment or adapted full browser matrix was tested here**. Validate the adaptation in Cloud before claiming results.

Do not mutate immutable reviewer files to make old Mac probes portable. If reusing a historical probe is necessary, copy it into a new Cloud scratch/evidence directory, adapt only paths, and keep the original report/identity unchanged.

## Pinned actual-app reference and strict audit

G10’s source commit is `46e202786863279302026ee03a0e225c359fa55c`. Exact read-only source snapshots/hashes are under `work/owner-desktop/evidence/g10/application-reference` and `source-reference.json`.

The finalizer/auditor default to the original Mac reference checkout. For Cloud, both now accept `NEVORA_REFERENCE_ROOT` as a **path-only override**. That path must be an actual clean Git checkout of the same pinned commit. Source-reference entries are mapped from their historical Mac prefix to the new root and checked against the exact original hashes. HEAD/clean-tree/source assertions are preserved.

Use a separate clean detached reference checkout/worktree if your Cloud task’s working repository contains prototype edits. Do not reset or clean another agent’s checkout. Do not claim a copied source snapshot proves a live app is clean or integrated. If you cannot obtain the pinned read-only reference, keep the strict source audit outstanding and tell Jose exactly that limitation.

Example environment selection, after verifying the reference checkout:

```sh
export NEVORA_REFERENCE_ROOT=/absolute/cloud/path/to/clean-pinned-reference
```

No source application code was changed by adding this override. The path support was syntax-checked locally. Real Cloud authentication/repository access is not configured or certified by this handoff.

## Run the actual checks

```sh
python3 work/owner-desktop/g10-models.py
node work/owner-desktop/g10-verify.cjs --engine=chromium
node work/owner-desktop/g10-verify.cjs --engine=webkit
node work/owner-desktop/g10-verify.cjs --engine=firefox
```

The engine commands may run independently when the environment can support the resources; within an engine the 20 suites run sequentially. Do not edit the runtime while they run. Each matrix must be complete on one exact hash. Read every result and preserve failures. A stopped partial local matrix cannot be resumed as a Cloud process.

`--retry-failed` is only for a previously complete same-build matrix with its successful native reports intact; it is not a shortcut for absent/incomplete matrices. Do not fabricate missing matrix rows.

G10 was finalized and audited locally before packaging. These commands are for a deliberate new exact-build publication or a full restored-bundle re-audit, not unfinished local work. The core ZIP omits historical images and cannot alone pass the original full-deliverable-manifest check. Restore the full bundle first. After all evidence and current source/mobile/native/documentation records are valid:

```sh
python3 work/owner-desktop/finalize-g10.py
python3 work/owner-desktop/audit-g10.py
```

Run the audit only if finalization succeeds. Do not weaken assertions, hand-edit hashes or run old milestone packagers to get green. Any runtime edit requires the current exact-build checks/captures/documentation evidence to be refreshed. A passing prototype audit still does not deploy or integrate the app.
