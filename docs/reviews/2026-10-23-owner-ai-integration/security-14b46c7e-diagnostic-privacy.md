# Independent diagnostic code and privacy review

codeQualityStatus: WATCH
recommendation: APPROVE
blockers: None for publication of this diagnostic-only candidate through existing gates. Historical Owner/COM findings and mandatory fresh CI are not closed by these changes.

Scope: clean14b46c7e2f39621b5cba2af3534eb2d155ec289e versus approvedc0f6397f in the supervision checkout. Independently inspected all six changed files, shared observer helpers and external DOM fixture report. No runtime, source/HEAD change, hosted write or paid call.

## Findings by severity

CRITICAL: none. HIGH: none. MEDIUM: none.
LOW L1 — describe diagnostic bounds precisely. scripts/communication-preview-diagnostics.mjs:13-14 retrieves the complete body before checking1MB; the2s deadline races work without cancelling the underlying Playwright operation. The four-pending cap limits tracked tasks, not all outstanding browser reads after timeout. These are parsing/reporting and wait bounds, not a streaming memory ceiling. This is nonblocking within the finite owned-fixture scope; do not generalize it as safe arbitrary-response processing. The page/browser closure remains the final lifetime boundary.

## Privacy and behavior

Preview response projection retains only normalized HTTP status, completion flag and the enumerated state. DTOs, capabilities, messages, fingerprints, headers and query strings are not serialized. Request paths are used internally for exact same-origin endpoint selection; output is endpoint category, fixed method and ordinal ID. DOM reporting projects booleans plus document/form identity and a compose/other category. Text is inspected only for fixed UI-state predicates, never persisted. Dynamic browser failures use the existing bounded failure classifier rather than raw exception strings.

The window observer and Node event buffer each bound emitted/stored events and report omissions. finish is idempotent, removes Node request listeners, waits with finite per-operation budgets, stops the current document observer and freezes future binding callbacks. New documents can still receive the init script until the owned page closes; that lifetime is explicitly documented. The form ID is correctly described as a node-lifetime proxy, not proof of React generation. The final accessible-role locator independently records Publish update count/visibility rather than substituting the CSS candidate proxy.

Scenario catch captures the preview report/screenshot before the existing general failure screenshots and context teardown. Original exception is rethrown. Diagnostic failure during an already failed scenario records unavailability; on an otherwise successful scenario it fails. Existing publication click, URL/receipt checks, context replacement and runtime-error assertions are unchanged; no extra operation retry or application deadline expansion was added. Diagnostics add bounded failure-capture time, not a new opportunity for a failed action to pass.

The two workflow changes upload existing updates failure/check JSON files alongside already-uploaded screenshots and report files. Inspected details contain named checks, fictional-fixture UI measurements, paths and bounded classified network diagnostics; no new raw preview DTO persistence was introduced. Screenshots necessarily contain visible fictional fixture content; the boolean-only claim applies to projected JSON, not screenshots. These artifacts remain unsuitable as authorization to capture real customer data.

Owner harness adds known-path classification and navigation/window/request-status context. Shared navigation snapshots expose phase/sequence/count/age, not source/destination URLs. The authority header is reduced to a fixed-value presence boolean. observeWindowExceptions neither prevents default handling nor filters errors. Original pageerror recording, errors collection and its empty-array assertion remain unchanged. Existing trace/raw diagnostics are not newly privacy-certified by this scoped review. No fetch wrapper, native-error exclusion or exception classification waiver was added.

## Tests and evidence

Five added unit checks cover enum/DOM projection, omission counts, malformed/oversized/late body failures, exact locator use, idempotent finish/listener removal/frozen callbacks and document-unavailable privacy. They test behavioral boundaries and sentinel exclusion rather than source text or requested deletions. The previously loaded remove-ai-slops/programming perspectives ran; no material violation or needless production abstraction found. This helper is test instrumentation only.

Inspected engineering/preview-dom-control-report.json: both Chromium/WebKit passed, no errors/external traffic, browser and creation handle closed, serverClosed/sourceUnchanged true, fixtureOnly explicitly true. Independently hashed current helper:8703276ec9a50a73f865f7a71b062fefc29981384637a7401eee4b3f26f8c879, exactly matching the report. This supports the static duplicate-label/remount fixture; it does not establish actual Next application acceptance. Independently read engineering/root-group-persisted-green.log now complete: three files70tests passed, completing the previously pending artifact from c0 review. Parent-reported124unit/type/lint and active full-suite status were not independently rerun here.

## Publication scope

Approve this bounded diagnostic diff for continued gated publication. Preserve all original cloud failures and independent findings. Diagnostic presence is neither a cause determination nor a fix for historical Owner/COM failures. Require fresh full validation and mandatory CI, then evidence-based independent finding dispositions. Six existing branches including Claude remain preserved. Hosted custody/migrations, new AI budget and production authorization remain separate; this is not hosted security certification.
