# Employee mobile — Cloud return to Jose's local conversation

Prepared on 2026-10-27 at Jose's explicit transfer instruction. **The original local conversation now owns implementation. Cloud implementation, tests and reviews have stopped.** Import this saved continuation; do not restart visual exploration. The approved teal design, Employee/Lead own permissions, desktop/management separation, activation/authorization/recovery controls and Phase2-before-Phase3 order remain authoritative. No production configuration, real notification, merge, deployment or release was performed or authorized.

## Exact source and transfer state

| Item | Exact state |
| --- | --- |
| Repository | Private `JoseK0514/NEVORA` |
| Original delivery branch | `codex/employee-mobile-cloud-handoff-20261027` |
| Original remote delivery/base | `e06eeff35960336b2c33f1bd1037823d62a8405a` |
| Saved application/test HEAD | `bf2051f74e70682dd71a3fb0fc695a6a284293ad` |
| Return branch | `codex/employee-mobile-cloud-return-20261027` |
| Accepted Communications candidate | `8435c3d81734b1fc4bb8ac574368b331a9e99b9d` |
| Profile implementation commit | `be21663949eee3f5a60f5ffcb7994edc3389d3d5` |
| Last executed Profile browser candidate | `b643a2f8cd0f5f9c68737b84a078397c009ec9ae` |

Before preservation, the original local Cloud branch was clean and 15 commits ahead of its unchanged remote delivery. All 15 commits are ancestors of this return branch. The preservation commit adds documentation/evidence only above `bf2051f7`; it is not a newly tested application candidate. `CONTINUATION_COMMITS.txt`, `FILES_CHANGED.tsv`, `PROFILE_FILES_CHANGED.tsv` and `APPLICATION_INPUTS.json` bind the saved history, paths and candidate input bytes. Obtain the final transfer HEAD and tree from `git rev-parse HEAD HEAD^{tree}` after importing; the sending conversation supplies the verified exact delivery SHA.

No uncommitted application work is being left behind. The ignored active ledgers are copied byte-for-byte under `active-execution/`; their originals remain in Cloud and their history was not cleared. A final coordinator entry records the ownership transfer. Do not overwrite a newer local ledger blindly: reconcile its append-only history and update `plan-path` for the local checkout. The original `docs/handoffs/employee-mobile-cloud-2026-10-27/` submissions remain unchanged.

## What changed

Communications: reproduced the deliberate pending-module-fence RED, immediately fenced pending Updates when its module is no longer on, and retained original unknown-operation recovery. Fresh reviews also led to refused-lookup preservation and stale-admission fencing, bounded notification-open fetch/body/disposal, distinct permitted OPTIONAL Mark as read, canonical custom-field errors/focus, and narrowly corrected owned-fixture mapping/serialization and settled desktop task navigation. Existing authority, activation and recovery controls remain. Full details, original failed submissions and author-owned acceptance are in `docs/execution/employee-mobile-communications/`.

Profile, Help and Session: reused the existing finite private account reader, added a sticky signout-intent fence, and connected scoped mobile own identity/work facts, native device appearance and truthfully labelled sign-in-language preferences. Stable Calendar/Passkey owner slots preserve responsive lifetime. Protected fixed contextual legal routes reuse canonical content/visibility and Profile return focus; original public/desktop/management behavior is retained. Native signout still uses the existing cleanup owner. The implementation and browser/SQL contracts are saved, **but the batch is not accepted**. Existing Calendar/Passkey/alerts/deletion links are not completed mobile ports.

The exact 33 changed application/test/configuration paths since the original delivery are listed in `APPLICATION_FILES_CHANGED.txt`. The full 506-path pre-preservation list also includes prior documentation, immutable review reports, logs and evidence archives. No dependencies or lockfile changes were introduced.

## Tests actually run

| Candidate / gate | Actual result and limits |
| --- | --- |
| Original delivery, pending-module browser regression | RED reproduced before editing; fixed affected orchestration passed in Chromium/WebKit/Firefox at `f7e331a7`. |
| Communications `8435c3d8`, selector-free owned SQL/browser | **20 files, 176/176 passed**, 939.45s; all seven browser fixtures in three engines. Separate affected Requests preflight passed, 49.96s. |
| Communications final units / compiler / lint | **77 files, 609/609 passed**; whole nonincremental TypeScript exit0; 43 changed-file lint exit0. First final compiler tool session disappeared without a result; its inconclusive evidence is retained and the identical fresh invocation passed. |
| Communications final custody and independent acceptance | Eight exact 2007-input mirrors, 2247 monitored inputs/index/branch unchanged, runtime/process/port/database closure verified. Code, UI and QA authors returned GO WITH CONDITIONS and closed their material findings. |
| Profile Task1 controller/view | Meaningful **3 failed/8 passed RED**, then **4 files, 19/19 GREEN**; actual hook/signout/late-reply behavior covered. The RED shell's later log-print exit is not used as the Vitest verdict. |
| Profile actual owned SQL | **6/6 passed**, 7.78s: own minimal/peer-safe data, exact Employee/Lead/current proof, session lease/revocation/expiry, existing eligible-location prerequisite, workspace refusal and actual SQL failure/recovery. |
| Contextual legal regression / Profile focused units | Old ignored context prop **1/1 RED**; corrected composition/context/preference suites **7 files, 26/26 GREEN**, 1.66s. |
| Profile whole TypeScript / scoped lint | Exit0 before the first expanded preflight; subsequent metadata and diagnostic changes had scoped lint exit0. **Current final HEAD has not had whole TypeScript, expanded units or full combined acceptance rerun.** |
| Profile `22927542`, browser privacy RED | **1 failed**, 23.42s: legacy static identity survived actual pause. Source/index/branch and owned runtime closure retained. Only Chromium reached. |
| Profile `be216639`, preflight1 | **1 failed**, 18.03s. Loading/pause/read-failure passed; target oracle wrongly counted a hidden inline Calendar link inside closed native details. Actual failure PNG was inspected; corrected to `checkVisibility`, keeping target threshold/strict diagnostics. |
| Profile `b643a2f8`, preflight2 | **1 failed**, 39.85s (41.308s recorder). Nine Chromium checkpoints passed, then one request remained in the 10s settlement oracle after actual session revocation. No all-engine, signout or new-account pass is claimed. |
| Profile `bf2051f7` | Adds request path/method/start-stage/time metadata for the next failure. **Not executed. Preflight3 was never started.** |

The last Profile run passed held loading/current own privacy, pause and read-failure recovery, light/dark 320/390/430 controls/contrast/targets, 200% text/native Tab, system theme, real Spanish sign-in cookie/reload/theme persistence, canonical Support/privacy/terms/fixed return focus, and retained desktop/stable Calendar ownership. Actual SQL session revocation produced401 and removed private identity correctly. The test then failed waiting for its pending-request count to become zero. All Next log requests appear completed, and no pageerror was recorded; **the cause is unresolved**. Native logout, new account and opaque cleanup-retention stages were not reached. Do not weaken assertions, increase the timeout or suppress pageerrors to obtain a pass.

Raw original Profile logs, JSON, all screenshots and failure HTML for all three attempts are copied under `evidence/profile-*/`. In particular, `evidence/profile-preflight-2/profile/stdout.log`, `result.json`, and `profile/chromium-failure.png` preserve the latest failure. Its stdout SHA256 is `fe5f3997a904911c59a18aecdda5ba417d0aeecc65605966c206738547d0ff00`. The 30s periodic recorder missed the short PostgreSQL lifetime in the first two attempts; those empty observations were retained honestly. The final attempt used5s observation, observed the actual marker/OID, and verified PostgreSQL PID31182/port32889 closed, temporary cluster removed, app closure and unchanged source/index/branch.

## Reviews, open items and stopped partial work

Communications has three authored nonblocking open conditions: CR4 partial-zero wording, UI002 enlarged acknowledgement word breaks, and UI003 a small canvas seam below short dark detail pages. Originals, closure addenda, final reports and personal-inspection records remain immutable in the existing Communications archive and are also copied from the external review directory under `reviews/communications/`. No independent finding has been self-closed.

The Profile independent UI reviewer was stopped at transfer. It read the plan, source map, current source and run metadata, but had not inspected Profile pixels, produced no Profile finding/acceptance report, ran no tests/runtime and made no source/index/HEAD edits. There was **no validated Profile finding and no Profile approval**. `reviews/STOPPED_PROFILE_UI_REVIEW.md` preserves the coordinator's record of that partial work and its limits; it is not a reviewer-authored acceptance. Fresh whole-change code and independent UI/QA acceptance for Profile remain pending.

## Exact next step for the local owner

1. Verify the imported branch contains the exact original delivery and `bf2051f7`, compare `APPLICATION_INPUTS.json`, and reconcile the preserved active ledger. Read the existing Profile plan and source map, discovery drafts and latest raw failure before editing.
2. Run the saved newly instrumented Profile orchestration on frozen exact inputs in the local scrubbed owned PostgreSQL/Next/browser environment. Inspect the new `*-pending-requests.json` after the actual session-denial stage to identify the unsettled request. Diagnose before deciding a narrow product fix or justified oracle correction; retain the original failed evidence.
3. Complete Task2 and the actual native signout/new-account/cleanup scenarios, then affected three-engine verification and Task3. The expanded combined configuration is expected to select22 files/183 cases; **it has not been run**. Extend the recorded 77-file unit argv with all justified new preference/legal/policy cases: the saved Cloud diagnostic recorder currently adds only `profile.test.tsx`, so it is not a complete final Profile unit gate. Run whole nonincremental TypeScript, changed-file lint, exact custody and fresh author-owned code/UI/QA acceptance.
4. Finish the remaining Phase2 capability-dependent Calendar/Passkeys/current-device alerts/own deletion lifecycles, then own published Pay/protected PDFs. Prepared discovery is not implementation. Phase3 remains not started; later assembly, actual-device/assistive-technology and release gates remain separate.

The portable intended affected command remains `node scripts/payroll-postgres.mjs vitest.employee-mobile-profile.config.mts src/test/integration/employee-mobile-profile.integration.ts` with the documented scrubbed owned runtime and evidence variables. Do not copy the Cloud recorder's Linux absolute runtime paths to the Mac. No app/test/config/HEAD/index edits while an owned Next process is alive.

## Preservation and environment

Cloud runtime used Debian13, Node24.19.0, PostgreSQL17.9, Playwright1.57.0 (Chromium143/build1200, Firefox144/build1497, WebKit26/build2227), existing locked Next16.4.2/React19.3.0/Vitest5.0.5/TypeScript5.9.3. No owned test runtime or review agent remained at transfer. The local owner uses its own compatible binaries; no dependency folder, source mirror, build cache, environment file, credential or runtime binary is part of this transfer. Raw invocation JSONs are immutable evidence of scrubbed test configuration, not environment files to source.

`PRESERVATION_MANIFEST.json` maps copied original ledger, evidence, review and discovery files to destination paths, byte counts and SHA256. Source mirrors are excluded; recorder/ownership/source-hash/Next-log evidence is retained as metadata only under `custody/`. Dependencies/build output/runtime installation are excluded. Full older repetitive Communications pixels remain in the stopped Cloud evidence directory; the committed compact evidence history, original review records and selected gallery are already available in Git. No claim is made that every older repetitive pixel was transferred or personally inspected.

Preservation verification compared every copied file with its original SHA256 and all2257 candidate input bytes. A whole-archive `git diff --cached --check` reported original trailing blank lines in27 copied historical ledger/log files; those bytes were intentionally retained rather than rewriting evidence. The newly authored handoff and stopped-review record are checked separately. This is an archive-format observation, not a rerun of application tests.

The return uses a new feature branch rather than overwriting the original delivery or the local owner's checkout. Existing `vercel.json` already has Git deployment disabled; existing push workflow filters do not select this branch. No workflow or deployment setting was changed, workflow dispatched, PR opened, merge or deployment performed. Verify the supplied final remote HEAD before import. The Cloud agent stops after recording delivery custody; subsequent implementation belongs to the original local conversation.
