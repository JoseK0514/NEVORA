# Android runtime baseline extension review

Range: d820ea6abe5d01d73d258e51d8a867da98002160..2d3c92cea83f7f441cd6b6d454532845c2517eb8. Detached HEAD; clean at review start. Reviewed approved spec, implementation plan, SDD progress/rulings, actual Git diff and review package. No SDK tests rerun, no source/index/HEAD changes. This report is the sole artifact written under the reviewer role's required reporting rule. ULW status returned ULW_LOOP_PLAN_MISSING, so the fallback report location applies.

## Strengths

- Strict numeric provider parsing is bounded before integer conversion; absent, malformed, oversized and older versions fail closed. Validation is required at this platform boundary, not unnecessary normalization.
- PortalActivity activation suspends existing content and checks runtime before capabilities refresh and SessionProbe. Initial/resumed/focus/incoming-intent/retry entry routes converge on activation; load checks again before WebView construction. Generation cancellation and existing outage/retry handling remain intact.
- Native fallback uses the configured protected /app URL, a separate browser package, and an actual foreground user click. No cookie, header, token, selector or ClipData transfer is introduced. Missing provider avoids CookieManager initialization unless a browser actually existed; actual RED log establishes the prior crash.
- minSdk is 29. No production origin, signing, delivery activation or deployment configuration was added.
- Backend selector changes match the unchanged web's declared aria-labels and retained actual Button/Switch accessibility nodes. Exact draft, closed editor and server-action assertions remain. Original foundation cases/polling are unchanged.

## Evidence inspected

Under docs/native/evidence/2026-11-04/runtime-baseline: core log/receipt; supported-api32-matrix and supported-api37-matrix results and all ten individual instrumentation logs plus cold logs; backend-green parent/backend/native results and raw instrumentation; both backend RED logs and missing_touch_target XML; old/missing/large-text results; missing-provider RED stack; continuity/cleanup and ownership receipts. All 100 qualification-artifacts entries matched decompressed SHA256 and byte count. Existing external JVM XML reports contain 26 tests, zero failures/errors/skips. Git diff --check passed. No test execution is claimed by this reviewer.

Independently compared prior 0231524b against HEAD for native/ios, src, db, scripts, package manifests, fixture and Android runner: unchanged. Since ad9f38fa, only BackendInstrumentedTest changed under Android app. Retained results support two 10+1 SDK fixture matrices and 18 exact backend checks with 3+1 native journeys, sourceVerified/ownershipClosed true. SDK qualification remains expressly distinct from retail/physical/store qualification.

## Skill-perspective check

Loaded remove-ai-slops and programming from the installed omo skills, plus requesting-code-review and applicable executive operating skills. No deletion-only, tautological, prompt-pinning or implementation-constant-mirroring tests found. Policy examples exercise public admission outcomes; native tests exercise real UI and external-intent boundaries. No untyped escape hatch or needless production parser was added. The module-size perspective identifies the following nonblocking maintainability issue; no new functional violation was found.

## Issues

### Critical / CRITICAL
None.

### Important / HIGH
None.

### Important / MEDIUM
1. Existing oversized modules grew further. native/android/app/src/main/java/com/velani/nevora/development/PortalActivity.java:140 adds native update-screen presentation to a controller already owning lifecycle, routing and WebView policy; it grows from approximately 293 to 341 nonblank/non-line-comment lines. native/android/app/src/androidTest/java/com/velani/nevora/development/ShellInstrumentedTest.java:333 adds three mutually exclusive runtime diagnostics to the existing foundation class, growing approximately 324 to 419 lines. Both exceed the skills' 250-line perspective. Effect: additional review/maintenance coupling, not a demonstrated runtime regression. Recommendation: track a bounded follow-up extracting runtime fallback presentation and the diagnostic test profile, preserving lifecycle ownership and explicit runner selection. This does not justify a broad late refactor or block this approved extension.

### Minor / LOW
None.

## Recommendations

Accept the narrowly justified ledger rulings: missing-provider evidence is a diagnostic, never full qualification; accessible Monday labels replace obsolete text-field assumptions without changing asserted outcomes. Archive this review and the executor's explicit rulings. Keep physical Android10/current retail WebView and external release gates open.

## Declined to judge

- Retail Google Play/provider certification and physical Android10 behavior: SDK149 emulator evidence cannot establish these; approved Phase3 external qualification remains required.
- Prior unchanged Phase2 server/iOS feature certification: explicitly outside this extension seat; exact-source continuity was checked, without recertifying those features.

## Assessment

codeQualityStatus: WATCH
recommendation: APPROVE
blockers: []

The approved extension is technically acceptable based on source inspection and retained local evidence, with the nonblocking module-size debt above. This is not authorization to merge, push, release or deploy, and does not close external qualification gates.
