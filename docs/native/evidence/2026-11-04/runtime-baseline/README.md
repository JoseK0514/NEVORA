# Approved Android runtime baseline verification

Jose approved Android10+/WebView149+ on November4. This folder contains executor evidence, not independent release or retail/physical-provider certification.

- `old-provider-red-*`: original app lacked the required native update screen on actual Google120, before implementation, with an owned unavailable backend.
- `outdated-provider-green`: update/native-only/recreation case and intercepted user browser intent passed; exact configured protected `/app`, separate browser package, no credential/header extras, ClipData or selector.
- `missing-provider-red`: actual provider disabled only on owned API32. Source stayed fixed and provider/default enabled state restored. App crashed in CookieManager initialization during suspend before admission.
- `missing-provider-green`: same actual negative case passed after flushing cookies only when retiring an existing browser. Its logcat buffer retains earlier crashes and is not a fresh-error pass signal; use its exact instrumentation result and source/provider receipt.
- `large-text-landscape-keyboard`: fontScale2, Activity-owned landscape request, reachable48dp action and keyboard navigation passed. PNGs draw only the public native view after asserting no WebView exists; they do not bypass private snapshot controls in shipped code. Initial font restoration was normalized by Android to explicit1.0; after configuration settled, a second delete restored the exact original absence, verified twice in the owner receipt.

The canonical runner still rejects an absent provider. The separately archived missing-provider diagnostic has explicit absence, serial lock, source and enabled-state custody; it cannot qualify full foundation/backend acceptance. Raw logs/XML are gzip-preserved. Supported-runtime matrices and current-candidate backend/build receipts will be added after completion.
