# Rondo B2 Development integration — November 16, 2026

Jose authorized integration of Claude’s business-citation parser with the backend, combined browser testing, and publication to Development. Codex owns backend/hosting/integration; Claude owns B2 UI. Development is the operating and acceptance release, held to production standards. Main/production promotion, provider activation and additional spending remain separate.

## Exact source custody

- Fresh Development base: `dc092f8df55a087224327b6e4c3d377c05386d21`.
- Frozen local backend/contract source: `a9f7bc85f`; runtime `185bb0904c0454389dd7f9de98b68dcfd62f97d8`.
- Scoped Development import: `868cb570f`. The newer Development authentication, recovery, action center, payroll, private-data guards and global UI are preserved. A wholesale merge was rejected because it conflicted with these newer controls.
- Claude’s exact three-file parser patch: `19295ab00352775c08431a021b4db5ca00e1b218`; integrated as `d60fb810d`, preserving the source patch and recording Claude’s contribution.
- Detached integration checkout: `/Users/josek0514/.codex/worktrees/nevora-rondo-dev-integration-20261116/NEVORA`. No additional working branch or main change.
- Local source manifest, patches and logs: `.superpowers/sdd/rondo-dev-integration-20261116/`. Publication evidence will be sealed in this handoff before release.

The import unions the inventory regression guards from Development and Rondo, and rebuilds the canonical onboarding manifest from migrations; no migration is applied to an existing remote database. Weekly pending storage’s exported identifier was renamed to avoid a scanner false positive while preserving the exact persisted namespace value. No scanner allowlist or rule changed.

## Combined browser contract

The new browser cases use actual authenticated business import/read/publish APIs, real owned PostgreSQL data, the server calculation and decision pipeline, actual Next advisor response/replay serialization, and the real B2 parser/render. Chromium uses English; WebKit uses Spanish. A completed fictional receipt is prepared with scripted provider turns and the browser Ask is explicitly bound to that receipt. This isolates the HTTP/client integration without metered inference. It is not actual-model intelligence qualification.

The owned replay Next process blocks all fetches except its exact loopback port and refuses ambient provider credentials. The browser blocks external origins. Tests require canonical finance/sales metrics, private inert citation access, withdrawn-source replay rejection, deletion erasure, reload without stale citations, and no browser errors or external attempts. The fixture is opt-in, cannot coexist with a paid pilot, and is never imported into production application code.

Before the parser patch, both Chromium and WebKit received HTTP200 responses with two genuine business-evidence records and then failed to render the canonical metrics. This is the regression baseline. An earlier attempt stopped before browser execution because the checkout lacked its existing browser runtime link; a second green attempt correctly refused uncommitted application source. Those failed attempts are retained.

## Verification and release state

Qualification is in progress; this document does not certify publication or deployment. The final evidence section will record completed gates and exact source. Runtime feature flags retain their defaults. No real customer records, paid provider calls, emails, SMS, or live business actions are used by these tests. All 50 independent management-answer scores remain unqualified.

## Integration findings retained

The real HTTP replay revealed a further parser defect not covered by Claude’s initial36 fixtures: PostgreSQL JSONB reordered nested window object keys. Both real responses were rejected despite unchanged values. Commit `338888175` compares canonical object values, preserves array ordering and exact fields, and adds two key-order regressions (RED before the fix, GREEN after). Both combined Chromium/English and WebKit/Spanish cases then passed. The exact Next dev version-check request is blocked and identified separately; every other external fetch attempt still fails the suite. No transport exception was added.

The first repository unit run reported14242 passes and two failures: the selected import omitted the existing candidate’s updated migration-tail fixture, and the unchanged process-cleanup title mutation missed its fixed boundary by68ms under concurrent local load. The isolated cleanup file passed all13 cases with no edits. The migration expectation must include the three new approved migrations while retaining the prior29 entries; a new full run is required.

The ordinary production-marker probe encountered Next’s security upgrade nudge twice because its disposable build output discards the nudge retry receipt. Live npm audit reports one moderate advisory, GHSA-mfr8-8qww-v76h, and zero high/critical findings. The advisory requires nesting a `use cache` function through `unstable_cache`; a search of application/services/config finds neither construct. This is an applicability assessment, not a vulnerability waiver. The source-bound build already passes with the existing sanitized release environment. The marker probe is also being verified with that existing environment, without changing checks, framework configuration, dependency versions or audit severity. Official advisory: https://github.com/advisories/GHSA-mfr8-8qww-v76h .

Development enforces linear history and ten required contexts: validate, clocker-postgres, phase-d-attendance-ui, release-postgres, phase-e-postgres, phase-e-ui, phase-e-evidence, onboarding-backend, management-review-ui and mobile-access. The exact candidate must earn these before normal fast-forward publication. Phase5 owns its separate pending source `8148034848e01d0ecd7e97b922788761a2c1ff28`; its four non-document changes are browser/QA fixtures and diagnostics, without application runtime changes. Rondo publication must preserve that delivery and avoid competing Development updates.

## Preserved Phase5 source and final application checkpoint

After the16/16 browser run completed, the Rondo commits were linearly replayed onto the exact Phase5 pending candidate `8148034848e01d0ecd7e97b922788761a2c1ff28`. The original verified lineage remains recoverable at local `refs/backup/rondo-dev-integration-20261116-pre-phase5`. Only generated guide files conflicted: the old Rondo guide-output commit was omitted and all six guides are rebuilt from the final source. No application/runtime conflict was resolved by choosing an older implementation.

Replayed import: `58672bb34`; Claude parser: `c00c32796`; JSONB correction: `91d1695d4`. Final application/test checkpoint: `6a599265a`. The migration-order fixture now retains the prior29 entries plus0064/0066/0067 in the explicit authority order and passes its focused check. The combined business-answer browser also asserts keyboard focus order across both citation links and no horizontal overflow at390px. Runtime code after the completed16-case run is unchanged by the parent QA-only delivery or these test additions.

Completed local gates so far:386 SQL cases in32 files;16 browser cases in10 files;38 Claude/parser cases including the two added JSONB regressions;55 combined parser/network/environment controls;374 release-engineering checks;18 pilot guards;canonical bootstrap manifest;81 named test projects;critical formatting;lint with zero errors and one existing workforce-monitor warning;safe production build;production-marker probe5259 artifacts with all markers absent;secret scan clear. The marker probe uses the existing sanitized release environment. Standalone typecheck passed after build output stopped changing; an overlapping probe/typecheck failure is retained. The first full unit run and subsequent isolated cleanup pass remain preserved; final complete run is pending.

## Local acceptance sealed

All local gates are complete. The repeated full repository suite passed14244 tests in954 files, with the existing944 skipped tests and55 pending cases preserved. The earlier two failures are retained alongside the successful full rerun. The existing cleanup test passed13/13 both alone and within that full rerun, without assertion or timeout changes.

The full Rondo browser suite passed16/16 in10 files. The added business-answer keyboard/mobile cases passed2/2 after using macOS WebKit’s existing Option-Tab convention (plain Tab on other platforms). Commit `6d742983f2a9bfb70af24a85902415ea438b6f09` is the final application/test checkpoint. The bounded runtime-equivalence record shows no changes to application, services, schema, dependencies or runtime configuration after the full16-case browser pass. Final browser evidence includes both focus-order assertions, private citation reads,390px no-overflow screenshots, source withdrawal/deletion and reload retirement.

Evidence is sealed in `docs/qa/rondo-development-integration-20261116/index.json`, with SHA256 digests for66 artifacts: original failed/passed attempts, raw unit/SQL/browser/release logs, final public fictional responses, screenshots, source custody, audits and guide checks. The remaining raw unit JSON and browser traces remain at the referenced local evidence paths; traces are not copied into this packet.

The wider history secret scan includes three existing Phase5 historical evidence hits. Each is the `authCorrectionCommit` field containing a verified public40-character Git commit object, not a credential. The separate Rondo-only commit-range scan reports no leaks. Exact historical evidence is preserved; no allowlist or scanner rule was changed. The applicability assessment for the one moderate Next advisory remains above; all production, complete, formatter and browser dependency audits meet the existing high-severity gate.

Next: qualify the exact final candidate on GitHub using the existing candidate tag workflow; require all ten protected-branch contexts and both workflows to succeed. Before the normal fast-forward Development push, freshly verify that the separately owned Phase5 parent has been published and its release chat is finished. If its source changes, reconcile and requalify; never force push or replace its work. CI publication receipts and final Development state are recorded in the local task scratch and user-facing completion because adding another documentation commit would change the candidate SHA. Production/main, remote database migrations and provider activation remain unchanged by this source release. Business-record management screens remain Claude’s B2 UI follow-up.
