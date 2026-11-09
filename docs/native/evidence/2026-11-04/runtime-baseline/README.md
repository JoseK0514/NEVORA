# Approved Android runtime baseline verification

Jose approved Android10+/WebView149+ on November4. This folder contains executor evidence, not independent release or retail/physical-provider certification.

- `old-provider-red-*`: original app lacked the required native update screen on actual Google120, before implementation, with an owned unavailable backend.
- `outdated-provider-green`: update/native-only/recreation case and intercepted user browser intent passed; exact configured protected `/app`, separate browser package, no credential/header extras, ClipData or selector.
- `missing-provider-red`: actual provider disabled only on owned API32. Source stayed fixed and provider/default enabled state restored. App crashed in CookieManager initialization during suspend before admission.
- `missing-provider-green`: same actual negative case passed after flushing cookies only when retiring an existing browser. Its logcat buffer retains earlier crashes and is not a fresh-error pass signal; use its exact instrumentation result and source/provider receipt.
- `large-text-landscape-keyboard`: fontScale2, Activity-owned landscape request, reachable48dp action and keyboard navigation passed. PNGs draw only the public native view after asserting no WebView exists; they do not bypass private snapshot controls in shipped code. Initial font restoration was normalized by Android to explicit1.0; after configuration settled, a second delete restored the exact original absence, verified twice in the owner receipt.

The canonical runner still rejects an absent provider. The separately archived missing-provider diagnostic has explicit absence, serial lock, source and enabled-state custody; it cannot qualify full foundation/backend acceptance. Raw logs/XML are gzip-preserved. Supported-runtime and backend evidence follows below.


## Supported-runtime qualification

Application implementation: `ad9f38fa0becc47aa37e4b7c45f8dba78cc72856`. Final backend test candidate: `79f2d9cbf746009add1be757858664cda0873780`. The only intervening source changes are the backend test selectors; application bytes and all ten original foundation cases are identical.

| Executor check | Actual result |
| --- | --- |
| Core |26JVM, zero failures/errors/skips; Debug/test/unsignedRelease/lint; built APK minSdk29 |
| API32 + Google SDK149 |10foundation cases +1separate cold restart passed, source116db8f9 |
| API37.2 + factory Google SDK149 |10foundation cases +1separate cold restart passed, source2f09ca70 |
| Real local Android backend |18exact named checks;3native Employee/Owner/activation cases +1cold restart; candidate79f2d9cb; ownershipClosed/sourceVerified true |
| iOS/server/shared web continuity |Exact paths match prior0231524b qualification; no broad rerun or expanded claim |

Both full foundation runs use platform-default accessibility, no renderer flags or observer, original100ms polling and original ten-recreation assertions. These are local SDK149 checks, not retail GooglePlay/minimum physical-device/store certification.

The backend run first failed at an old `By.textStartsWith("Monday,")` assumption. The retained actual XML exposes a visible enabled clickable Button with empty text and `content-desc="Monday, All day"`; the unchanged DOM declares that aria-label. Correcting it advanced into the editor, whose actual Switch likewise has empty text and `content-desc="Available on Monday"`. The test now uses each declared label and role, keeps the exact Not available draft expectation, closed-editor absence assertion,20second wait and server-side Monday save verification. Both RED runs are retained separately; both closed resources and verified source. No native renderer workaround or assertion outcome was weakened.

`qualification-artifacts.json` indexes raw byte counts/hashes and lossless gzip logs/XML. `backend-green` contains exact parent/backend/native results; separate RED folders preserve failures. `source-continuity.json` preserves the unchanged iOS/server/frontend and original ten pending source files. `cleanup.json` and owned-device/provider receipts document restoration/shutdown. Installed SDK/AVD disks and private raw data remain outside Git for reproduction. The fresh extension review approved it with no functional/security blockers.


## Review and completion

The [single fresh extension review](extension-code-review.md) recommends APPROVE/WATCH with no blockers. It reviewed code/evidence and verified100artifact hashes; it did not rerun SDK tests or provide independent release certification. The executor grades its nonblocking module-size finding as Minor by effect: maintainability coupling in the existing controller/test modules, with no demonstrated runtime/security defect. Bounded extraction is deferred; no correction pass was needed. Earlier Phase2 coordinator formatting and ordinary iOS exact-count deferrals remain in the prior handoff.

Rulings: separate missing-provider diagnostics cannot qualify foundation/backend; modern Monday controls use their declared accessible labels/roles while exact behavior/server assertions stay intact; retail/minimum physical behavior stays Phase3; unchanged prior iOS/server results are retained through source custody, without a new certification. Costs and reasoning are preserved in `progress.md`. No compatibility waiver, production authorization or source-inventory exception was granted. Local Phases1–2 are complete; the next gate is Phase3 external qualification and development source reconciliation before integration.
