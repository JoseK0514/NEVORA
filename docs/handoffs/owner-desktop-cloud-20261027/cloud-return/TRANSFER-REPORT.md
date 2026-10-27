# G11 Cloud → local Owner desktop transfer

Status: **INCOMPLETE / feature work stopped at Jose’s explicit takeover request.**
Recorded 2026-10-27T17:06:29.126992-04:00 (Puerto Rico). Receiving local chat:
`01a17932-07ee-72d0-8ea7-d16a118d8dcb`. Do not create another chat.

## Exact identities and scope

- Repository: JoseK0514/NEVORA. Feature branch: `codex/owner-desktop-cloud-return-g11-20261027`.
- Transport base: `b16302978be01bb0e288bfc3e785c7e13a9a2c11`, original branch `codex/owner-desktop-cloud-handoff-20261027`.
- Original frozen G10 runtime: `f6e3f5b3b332a61f12a2607c9a9728d7086a77747472f5217badc786ad543a3f`.
- Current built G11 runtime SHA-256: `0a9ceef3365888aac4be34f7ceede8cc3c6fb7272d4e77d450cad7f8bf720c05`.
- Source contract remains pinned to `46e202786863279302026ee03a0e225c359fa55c`; the transport’s newer development base is not a replacement contract.
- Prototype source: `/workspace/nevora-owner-prototype`; app transport checkout `/workspace/NEVORA`; clean pinned reference `/workspace/nevora-pinned-reference`. These are Cloud paths, not assumed Mac paths.
- Authorized group: G11 P-17/P-18/F-04 only. G12 remains unstarted. No actual-app/mobile integration, main/development merge, deployment, real payroll/payment/message action or new paid service.
- Plan: `outputs/owner-desktop/group-11-statements-plan.md`; brief: `work/owner-desktop/g11-brief.md`; ordered ledger: `work/owner-desktop/evidence/g11/progress.md`.

The Git delta’s `bundle/manifest.json` and PATH-MANIFEST.json identify every
new/modified path, preimage SHA and current SHA. Deleted paths are explicitly
reported. The original400MB history is reused from the existing Git branch.
All authored source/evidence remains preserved locally. Derived Python caches and
live-server-log names are excluded by the existing packager; stopped server logs
are preserved byte-for-byte under `evidence/g11/transfer-server-logs` with their
original-path/SHA map. No credential store, browser binaries, OS library archives,
process environment dump or real customer/payroll data is included.

## Implemented, but not a completed G11 milestone

The accepted vanilla HTML/CSS/JS prototype and Jose’s design foundation are
preserved. New modules:

- `payroll-document-artifacts.js`: valid local fictional sample PDFs, whole-cent
  source values, WinAnsi English/Spanish punctuation, SHA-256 bytes; neutral
  provider JSON labelled UNVERIFIED / NOT_SUBMITTED / UNVERIFIED.
- `payroll-document-jobs.js`: explicit fictional saved PREPARE/REMINDER examples,
  retry/earlier-attempt history and an unsent notice stub. PREPARE reconciles an
  existing run; a notice is never described as sent/delivered.
- `payroll-document-store.js`: child document/job boundary separate from immutable
  G10 approval; exact-set/hash native verification and automatic publication;
  deliberate provider publication; capability, source/revision, original-operation
  and actor-bound private-byte guards.
- `payroll-document-views.js`, `payroll-document-controller.js`,
  `payroll-documents.css`: Statements/jobs full task with run/history/jobs tabs,
  verified private View/Download, publish/retry/instructions review and outcome,
  private lifecycle, pending locks, focus, search and contextual Back/deep links.
- My pay is own-published-only, separate from management reads, with saved-calendar
  payday and truthful empty/unavailable states. Owner My time remains excluded.
- Narrow integration seams: `app.js`, `build.py`, `payroll-run-details.js`,
  `payroll-run-controller.js`; G10 post-approval links current Statements/jobs.

Task1 domain work and Task2 implementation, initial RED→GREEN flows and the one
original review/correction pass are done. Task3 final exact-build verification,
canonical output publication, coverage closure, final G11 artifact audit and
milestone certification are **not done**. Draft finalize/audit/close-metadata
scripts exist and were syntax-compiled; they were not successfully executed to
publish a G11 milestone. Do not run close-metadata.py or finalize-g11.py until
complete same-build gates are actually green.

The output README/coverage/roadmap and deliverable manifest still carry historical
G10 status. The built index is currentG11. That pending canonical-publication gap
is deliberate and must not be relabelled as a current G10/G11 PASS. After real
G11 closure, planned coverage is75interactive /3partial /18pending +4exclusions;
that update has not yet been applied. The source-backed roadmap still owns all96
Owner workflows exactly once.

## Original review and executor corrections

ONE fresh combined independent code/UI review ran on immutable candidate
`1bc181a1c478bda4652f1f2ece62b5504ad26362e5a4f2fc5685dcadeb9205a1`.
Original verdict remains **FIX**. The281 original files are bound by
`original-review-identity.json`; `reviewer/independent-review.md`, findings,
probes, candidate source, navigation and raw images are unchanged. No second
independent review or post-fix certification is claimed.

- I1 Important: PDF View → Download revoked/nullified active view state, causing
  a null-filename render failure. Executor reproduced RED and fixed temporary
  download URL cleanup while preserving the viewed document; browser GREEN.
- I2 Important: document() captured actor binding after its first await, allowing
  old-actor bytes at the model boundary. The controller’s extra guard prevented
  the demonstrated on-screen disclosure. Executor reproduced RED and bound
  authority/source before the first await, rechecking after awaits; model GREEN.
- M3 originally Minor, executor regraded Important completeness: required
  PREPARE/REMINDER outcomes were unreachable. Added labelled fictional examples,
  existing-run reconciliation and NOT_SENT_STUB outcome, with RED→GREEN models/UI.
- M1 remains Minor: Payroll search query was lost on Statements Back. Bounded
  in-memory handoff retention is fixed, and cleared on interruption; it was not
  added to unrelated exports/timecards/settings contexts.
- M2 Minor deferred: employee-history search resets on reload; ordinary healthy
  refresh/View/Back preserves it. Private search is not serialized into a URL.
- E1 executor Important: WebKit native select caused root397px overflow at320px.
  Dedicated RED→GREEN at320/16 and320/32 led to the current0a9 runtime and a full
  matrix restart. Original partial f44 evidence remains under pre-webkit-layout-correction.
- Inherited deferred G08 plural-copy minor remains (“1 people” / “1 original batches”);
  no value/operation error was established.

`review-disposition.json` records corrected review findings and final runtime
identity. Its material_findings_open=0 refers to that correction disposition,
**not completion of the remaining full matrices**. Its independent_post_fix_certified
is false. Production templates/tax arithmetic, server authorization, durability,
worker/bank/provider delivery, physical devices and assistive technology remain
outside this prototype’s certification.

## Commands and results actually run

- Restored/verified the full original G10 bundle; all original11343 file hashes
  passed in Cloud. Separate pinned reference checkout stayed clean.
- `python3 work/owner-desktop/build.py` produced current0a9 after the narrow-select
  fix; no runtime edits occurred during the current matrix.
- `python3 work/owner-desktop/g11-models.py`: **461 cases /13 runners PASS**,
  **114 authored JS syntax checks PASS**, zero failures on0a9.
  See final-models.log, models.json, syntax.json and individual logs.
- `node work/owner-desktop/g11-model-check.cjs`:37G11 domain cases are part of
  that gate. Dedicated executor RED/GREEN logs and focused reviewer-fix browser
  flows are retained, including prepare-retry-red/green and context regression.
- `NEVORA_REFERENCE_ROOT=/workspace/nevora-pinned-reference python3 handoff/codex-cloud-owner-desktop/cloud-g11/refresh-documentation.py`: PASS;132build inputs
  reconstruct byte-identical0a9,13 incumbent files unchanged,0 unresolved new CSS
  variables, included mobile snapshot hashes unchanged. It does not prove fresh
  separate-chat/Mac mobile approval or application parity.
- Ownership comparison:310 separately owned/shared files unchanged; proof is
  ownership-check.json. Mobile/access/shared-root design were not edited.
- `node work/owner-desktop/g11-native-capture.cjs`:4raw local Chromium PNGs,
  viewport589×853/full-page, PASS with no page errors/warnings/external requests.
  This is not a Mac in-app, physical-device or screen-reader certification.
- `python3 handoff/codex-cloud-owner-desktop/cloud-g11/transport-guard-check.py`:
  4synthetic refusal cases PASS (existing destination, inside app checkout,
  corrupt part, unsafe archive path). A real transfer archive restore/build
  check is recorded separately by the transport’s TRANSFER-VERIFICATION.json.
- Python finalize-g11.py/audit-g11.py/package/closure helpers py_compile PASS only.
  No full G11 finalizer/audit PASS is claimed.

### Current browser attempt on0a9

`node work/owner-desktop/g11-verify.cjs --engine=<engine>` schedules G11 plus all20
inherited suites. Intended completed target is21suites/engine,2694 executions total,
plus35G11 responsive renders/engine. **That target has not passed.**

Chromium completed21suite attempts; **five failed suites**:
G10 46/48 (22s healthy-wait callback and15s confirm-click timeout), G09 48/49
(private entries cleared before opening control), G08 98/103 (navigation/click
timeouts), G07 89/90 (one dispatch/click timeout during isolated execution), and
G04 aborted on a15s failure-screenshot timeout before a terminal native report.
The stale G04 f6e3 native report is explicitly not current proof. Chromium’s
original complete matrix, native/log snapshots, all57runner files, source runtime
and hashes are frozen under first-complete-matrices/. No page errors/external
requests were reported in the completed current suites. Current complete PASS
suites include G11 31/31 with35responsive renders, G06 40, G05 48, warning surfaces35,
G03 50, G02 42, catalog34, Team37, foundation103, warnings51, feedback30, focus4,
request spacing11, published-warning spacing11, dates15 and select contexts5.

WebKit: G11 29/31; one receipt assertion read the legitimate async “Recording…”
screen before the result, plus the responsive child had two transport waits
(33/35 scenes). All33 measured scenes had clean layout/icon/date/target measures;
missing two scenes still means FAIL. G10 43/48 (five navigation timeouts), G09
49/49 PASS. G08 was deliberately stopped for takeover at last-started case43/103;
its partial log is not a completed PASS or full current native report. G07 onward
were not run in this current attempt.

Firefox: G11 30/31; responsive child had two navigation timeouts (33/35 scenes,
all measured scenes clean). G10 native report45/48 (three navigation timeouts)
finished while the wrapper was held; its native result exists, but checkpoint
remains at G11 and there is no complete matrix. G09 onward not run in this attempt.

Older interrupted/failed attempts are retained in pre-webkit-layout-correction,
pre-cloud-budget-final, interrupted-clean-attempt and first-complete-suite-failures.
They are not final proof. A blank-page clock probe showed Date.now/timeOrigin
elapsed agreeing with performance.now; no clock assertion change was justified.
Do not declare every timeout an application defect or every timeout merely
infrastructure. One isolated click timeout remains unresolved.

### Cloud tooling and exact stop

24 legacy Playwright module paths were adapted with dry run/backups. Actual
Chromium/Firefox/WebKit binaries were installed using existing Playwright1.62.1.
Root dependency installation failed on su authentication;12 standard Debian
archives were extracted under the task-specific scratch tree, with selective
WebKit library links. The supported PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1
skips the system library catalogue check only; actual engines/rendering/assertions
ran. browser-tooling.json and BROWSER-SETUP.md record the setup; binaries/libraries
are not payload dependencies assumed installed on Mac.

Short harness budgets were raised to15s after concrete Cloud transport failures;
all original sources/hashes are retained. G11 capture navigation is30s. No runtime
private lease, behavior assertion, page-error listener or source guard was weakened.
Engines initially overlapped; only next-suite wrapper parents were later held,
while current browser suites finished normally. Browser timers were never paused.
The scheduler resumed WebKit after Chromium completed. Jose then explicitly
requested immediate takeover: scheduler, owned wrappers, current browser subtree
and local server were stopped. transfer-stop.json records11 stopped owned
processes and exact partial stage. **No checks remain intentionally running.**

No LSP tool exists in the current exposed inventory; no reference-centrality/LSP
PASS is claimed. Copied Mac Impeccable launcher was unavailable; accepted local
design/craft guidance and real browser captures were used. Do not infer tooling
installation/authentication from copied instructions.

## Exact next steps for receiving local chat

1. Read this transfer, TRANSFER-STATUS.json, the original working agreements,
   G11 brief/plan, ordered ledger and immutable original review. Preserve the
   accepted foundation; no fresh review is required merely to transfer.
2. Apply the checksum-bound delta only to a **fresh exact G10 restore**, outside
   the real app checkout. apply-cloud-return.py can restore G10 then apply/verify
   every preimage and final file. Or use the precise PATH-MANIFEST against the
   already verified unchanged local G10 files; never blindly overwrite divergent
   local work. Keep all original evidence. Read the transport README first.
3. Compare build/source hashes and adapt only tooling paths to actual Mac
   Playwright module using dry run/backups; do not copy unavailable Cloud libs.
   Use a local static server on18763 for the existing runners.
4. Before further QA, fix the **harness** receipt race: wait for the terminal
   Statements result before the unchanged “Job queued”/no-delivery assertions.
   Keep the separate pending-control test. No runtime change is required for this
   observed assertion race, but validate it locally rather than assuming green.
5. G04 catch-path screenshot can itself throw and mask the original failed case.
   Preserve/record the original case failure and screenshot error so a full61case
   run writes its actual report. Do not drop errors to obtain green.
6. Known checkpoint-tool edge: resume currently requires current native.html for
   failed rows too. Aborted G04 has a stalef6 native, so strict tail-resume can be
   blocked. Bind failed log/native SHAs but require current-build success only
   for successful rows; keep the failed row failed until a full-matrix continuation.
   Do not erase continuation metadata by resuming an already completed matrix.
   These tool fixes were identified but **not implemented** before takeover.
7. Investigate unresolved timeouts locally. A standard30s harness budget may be
   appropriate after evidence, but no30s default adaptation has been applied.
   Preserve all old identities and assertions, actual read leases and pending
   behavior. Do not assume one isolated timeout is fixed by serial execution.
8. Run all21suites per engine and13domain runners against one frozen final build.
   New runtime edits require a fresh full exact-build matrix. The existing
   --retry-failed supports complete same-build failed-suite continuations and
   preserves original attempts. WebKit/Firefox matrices here are incomplete;
   starting clean locally is safer than treating partial checkpoints as approval.
9. Require all35unique scene/width/font captures per engine, verify bytes/hashes,
   inspect the bounded final confirmation, and keep raw native capture provenance.
10. Only after gates actually pass, run finalize-g11.py then audit-g11.py against
    a clean pinned reference. Draft scripts may still need execution fixes.
    They now require310ownershipfiles and exact visual sets; they have only been
    syntax-compiled. Publish75/3/18+4coverage and G12next only after valid closure.
    Do not run close-metadata.py early; it would falsely mark pending work closed.

The transfer-specific checksum/restore/build check does **not** certify these
feature gates. Local chat now owns verification and continuation. Cloud must not
restart feature work after this handoff.

## Ordered rulings and costs (complete ledger carry-forward)

Ruling: Continue inline from the accepted foundation and source-defined roadmap without new design approval — Jose authorized this bounded group and the handoff explicitly preserves the execution method — cost if wrong: alternate compositions are not explored.

Ruling: Keep projectless prototype baselines/evidence; do not use Git cleanup or application release scripts — source lives outside the application checkout — cost if wrong: modified prototype must be packaged separately for durable review.

Ruling: Use an explicit fictional document/job boundary with locally rendered sample PDFs, not real payroll workers or provider/bank services — this is an in-memory prototype — cost if wrong: real document templates, server guards and financial delivery remain separate integration work.

Ruling: Use the documented path adapter and user-local open-source browser libraries — root installation is unavailable; actual Chromium/Firefox/WebKit launches/rendering are required — cost if wrong: Cloud browser tooling differs from the original Mac and needs its own recorded setup. WebKit's catalogue-only ldconfig check cannot see user-local libraries; verified ctypes loading, linked only missing libraries in the downloaded browser's sys/lib, and use supported PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 for actual execution. Engine/test/runtime assertions are unchanged.

Ruling: Re-grade M3 Important completeness because PREPARE/REMINDER outcomes are source-backed required G11 jobs but have no reachable representative states — add explicitly fictional saved source-job fixtures, source-shaped existing-run preparation reconciliation and notice-stub outcome, with domain/browser regressions — cost if wrong: one narrow fixture responsibility and extra full-matrix obligations, without real workers/messages or delivery claims.

Ruling: Fix M1 bounded in-memory Payroll query return under Jose's exact-context/full-standards foundation; retain reviewer Minor grade and clear that private query on interruption — cost if wrong: one added Back/privacy regression, no financial mutation.

Ruling: Accept the review's Declined-to-judge limits for production tax/PDF content, server authorization, worker leases/durability, banks/messages, physical/accessibility devices, global correction certification and three-engine/final packaging evidence pending this executor — the bounded prototype does not establish those claims — cost if wrong: each remains separate authorized integration/platform verification. PREPARE/REMINDER completeness is handled as M3, not dismissed as a limit.

Ruling: Correct E1 before delivery and restart the entire exact-build matrix — the actual required engine reveals a user-visible layout regression — cost if wrong: all final reports/captures and documentation must be refreshed on the new hash. Source/UI review remains the original immutable FIX; no second independent certification.

Ruling: Run final engines sequentially after concurrent captures exhausted the 6-second navigation budget — preserve the two load-timeout failures, give new G11 capture navigation 30 seconds and keep all behavior/error/layout assertions — cost if wrong: verification takes longer; timeouts are not silently retried or counted as PASS.

Ruling: Raise short Playwright default operation/navigation budgets to 15 seconds in top-level prototype runners — Cloud G10 reported a 3.5-second page-load timeout and a click timeout after its receipt was already visible, without page errors or external requests — cost if wrong: a genuinely stuck UI can take longer to fail; every behavior/layout/private-source assertion and runtime lease remains unchanged. Exact pre-adaptation runners and before/after hashes are retained. The full current matrix will complete; only complete same-build failed suites may be rerun, with original failures archived.

Ruling: Start a clean concurrent three-engine attempt after the Cloud timing adaptation — long inherited suites spend significant time in explicit healthy-read/lifecycle waits, and all new runner budgets are now loaded consistently from the start — cost if wrong: a transport failure must remain recorded and only complete same-build failed suites may be rerun. The earlier sequential partial attempt is archived under pre-cloud-budget-final; no runtime/assertion/source-authority rule changed.

Ruling: Persist a per-suite checkpoint bound to the exact runtime and all current runner hashes; resume only untouched completed native reports/logs, and rerun interrupted suites in full — process-session loss otherwise repeats completed work — cost if wrong: checkpoint custody adds a verification-tool responsibility; failed complete suites still require the documented complete-matrix continuation and no assertion is weakened.

Ruling: Preserve G11 in the managed project workspace plus a verified restore artifact, and prepare transport files without commit/push — nearest prototype AGENTS explicitly says no integration/commit/push/deploy and working agreements distinguish handoff from code-publication authority — cost if wrong: GitHub remains at the frozen G10 handoff until Jose authorizes publication of the G11 transport branch/artifact. No extra approval is needed to finish the reversible local implementation and verified artifact.

Ruling: Hold only WebKit/Firefox next-suite wrapper parents after observed 15/30-second transport failures under three-engine load; let their current browser suites finish without pausing any browser or timer, finish Chromium, then resume each held wrapper in order — the prior sequential attempt had old budgets loaded, so isolated execution with the adapted budgets remains untested — cost if wrong: longer gate execution. Runtime read leases, assertions, browser clocks and every complete-matrix requirement remain unchanged; no current child suite is killed or interrupted. Wrapper PIDs/signals are recorded in sequential-wrapper-hold.json.

Ruling: Stop feature work and all owned verification subtrees at Jose’s explicit local takeover request; publish this partial checkpoint as a checksum-bound delta on a feature branch — the receiving Owner desktop chat is authorized to verify and continue — cost if wrong: unfinished/failed QA remains the receiver’s responsibility; no G11 milestone PASS, fresh review, main/development merge or deployment is claimed. This later explicit publication authorization supersedes the earlier local-only/no-push decision for this transfer only.
