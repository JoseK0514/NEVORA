# NEVORA Phase A — Phase 5 completion and stabilization

## Decision

**Local implementation/self-review candidate ready for independent Codex review. Not a production release and not CEO phase acceptance.**

The source is this commit on `codex/nevora-phase-a-stabilization`. Exact parent/checkpoint: `50407eb38e4f60ebb9c50f7bf5b62a13c323244b`. Last approved product base: `6c0f2b77b6186c4cd86db7e97f869ea831ee32b0`.

Original Codex checkpoint remains preserved separately. Phase A implemented no Phase B redesign, Phase C/timekeeping, live migration, push, merge, deployment or provider activation.

## Scope and corrections

1. Reconciled the stopped checkpoint, original review, approved six-task plan and all 98 acceptance scenarios. Tasks 1–4 were not rebuilt; original review/evidence remains historical, not a substitute for fresh integration tests.
2. Retained and validated the three provisional Task 5 fixes: trade navigation independent of coverage; displayed consent bound to current source/target terms; read-only render-time operation lookup separated from action invalidation. Actual Next runtime exercised these in both browser engines. Complete date/start/end/location/position/owner/Lead inter-read variants were tested for both swap sides.
3. Fixed the checkpoint build/typecheck failure: the provisional consent test table inferred an invalid heterogeneous union. Typed the data explicitly and added four material-term variants; no assertions or TypeScript strictness were weakened.
4. Confirmed the stale-pending-callout hypothesis against actual PostgreSQL. An old PENDING report could reserve a materially changed or reassigned slot and block a genuine new report. The existing guarded command now atomically retires only provably stale pending reports, retains immutable original private history, cancels stale notification seeds and transfers the participation to the fresh report. Approved releases and ambiguous same-owner legacy reports are not silently changed. New regression includes actual Manager writes, returning/replacement ownership, current/legacy duplicate protection and late rollback. This is the only Phase A production behavior change.
5. Corrected three old test-fixture assumptions: routine delivery tested during real quiet hours; stale status aliases after a callout revision increments; generic schema comparison with one side at 0009 and the other at 0010. Production quiet-hour, revision and schema validation were retained. The complete foundation and notification suites pass with the current canonical schema.
6. Added reusable owned-PostgreSQL transport/scratch-Next/browser test machinery. Actual login/session/Server Action/render/commit paths execute against canonical disposable SQL. **Only the external scratch copy of `src/lib/db.ts` is substituted**; the production Neon adapter is unchanged. No new dependency or lockfile change.
7. Added exact expiry/rollback, real cancel-versus-accept, invalid-then-valid claimant and cross-location phantom-assignment race coverage. The command/result and history invariants are checked, not merely the final page text.

## Fresh verification

| Check | Result |
|---|---|
| Full unit suite | 1,348 passed / 128 files |
| Phase 5 + Phase A PostgreSQL suite | 128 passed |
| Protected generation PostgreSQL suite | 144 passed |
| Foundation PostgreSQL suite | 71 passed |
| Notification PostgreSQL suite | 77 passed |
| Notification / foundation configuration QA | 6 / 8 passed |
| Build | Passed |
| Typecheck | Passed after restoring only documented Next-generated config changes |
| Lint | Passed |
| Browser runs | 128 full-core/matrix checks plus 20 workflow-policy supplement checks; all passed |
| Responsive coverage | Seven widths in Chromium and WebKit; 98 screen checks across seven surfaces including the supplement |

The browser count includes repeated login/runtime setup checks, not 148 distinct product behaviors. Geometry covers text fragments, 44px actions, overflow, keyboard focus and final-action navigation clearance. Actual workflows include two-person swap, callout/replacement, unknown-result reconciliation and current-policy Owner saves.

Initial test-driver failures are retained. They included a CommonJS loader mismatch, insufficient action-response settling in WebKit, noncanonical gate IDs and a mislabeled Owner-policy route. These were test-driver problems, not silently reclassified as production failures or discarded. The route correction is especially important: original `owner-policy` full-run screenshots are **Workspace identity**. The later supplement opens the actual policy disclosure under Scheduling rules and tests its real save/invalid/stale-revision behavior.

## Evidence attribution

External root: `/Users/josek0514/.codex/visualizations/2026/10/04/nevora-phase-a`.

- `seal-exchange-sql-tests.json`, `candidate-unit-tests.json`, `final-generation-sql-tests.json`, `foundation-repair-tests.json`, `final-notification-sql-tests.json`: exact executed assertion results.
- Command/exit reports and raw logs remain beside each JSON report.
- `runtime-evidence-reuse.json`, each owned scratch `source-manifest.json`: exact unchanged production/UI inputs. No inference of production Neon equivalence.
- `unit-evidence-reuse.json`: unchanged exercised source/fixtures; later integration-only additions have their own sealed run.
- `visual-attribution.json`: original protected 179/182 exact pairs retained. I re-decoded the three original Chromium Schedule pairs at **12 differing pixels each**, bounding box x190–195/y162–201. The separately recorded 30-pixel repeats retain their own baselines. No screenshot baseline was overwritten, and no 182/182 exact claim is made.
- Original Phase 5 screenshots/reviews and its resources were not deleted or repurposed.

`phase-a-acceptance.json` and `phase-a-acceptance.md` map all 98 scenarios / R01–R17 to local evidence with explicit limits. This is a self-review ledger, not 98 independently certified PASS results. Historical Axxx annotations in test titles were not used to guess mappings.

## Performance

Separate local measurements cover 40 and 160 fictional employees across three locations, with 400 and 1,600 historical events plus the same number of operation-history rows. Discovery, command commit and maintenance timing, snapshot size and process memory are recorded in the sealed SQL log as `PHASE_A_PERFORMANCE`.

The earlier controlled run measured about 26/61/49 ms for 40 employees and 164/154/217 ms for 160 employees (discovery/command/maintenance respectively), with approximately 0.54 MB / 2.12 MB private snapshots. These are local samples, not latency guarantees. Growing whole-source/history snapshots remain a documented scaling risk; no unreviewed caching or budget increase was introduced.

## Remaining gates / limitations

- Independent Codex whole-phase review and hardening, then Jose acceptance, are still required. Review the entire Phase 5 range from approved base 6c0f2b77… as well as the focused Phase A diff from checkpoint 50407eb… . Self-review is not independent review.
- No production Neon/hosting transport, real notification/provider delivery, physical iPad/Safari or real screen-reader audit is claimed. Keyboard/ARIA checks do not substitute for assistive-technology testing.
- Canonical upgrade/rollback-at-transaction checks are local. An existing-environment backup/restore/old-application rollback rehearsal remains a separate deployment gate. No destructive schema downgrade is supplied.
- Unclassified mandatory operational rules continue to withhold automatic approval. Customer values/applicability were not guessed. Scheduled projections are not payroll or legal certification.
- A073's exact local proof covers actual request/action/result refresh plus assignment/acknowledgement SQL. Independent integration review should still challenge cross-screen dashboard/acknowledgement presentation.
- Preserved Task 5 Minor M1: compressed policy/display helper source affects maintainability. No unrequested cosmetic whole-component rewrite was mixed into this stabilization.
- Long settings pages and broad Apple-style visual standardization belong to the separately approved Phase B baseline. Phase A contains no product CSS/asset/layout changes.

## Review/ownership boundary

A new local candidate commit is a handoff, not permission to deploy. Codex may verify and correct in-scope bugs, technical invariants, recovery controls, UI/accessibility defects and missing tests on an isolated hardening branch. New customer/labor policy, material architecture changes, destructive data handling, extra features or paid services must be escalated. No push/merge/deploy/migration/provider activation or Phase B/C work without the corresponding authorization.
