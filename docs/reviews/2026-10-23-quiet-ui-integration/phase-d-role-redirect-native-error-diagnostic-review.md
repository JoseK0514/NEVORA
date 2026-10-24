# Phase D role-redirect native-error diagnostic review

codeQualityStatus: WATCH
recommendation: APPROVE (bounded diagnostic next step only)
blockers: Both retained runtime errors remain release blockers; no classification, exemption or application fix approved.

## Scope and evidence
Read-only source inspection at HEAD 48c52fe450c7a0c55cfa3f63a5675f6eae79bd1d and attempt7/phase-d/nevora-phase-d-browser-evidence/report.json under /Users/josek0514/.codex/quiet-ui-pr30-evidence-20261023. Raw report checkpoint is clean test merge 46678584161659e605173249baafdf88eac217be. It records 207 checks, eight reportNavigation and eight scopedNavigation functional passes, plus two retained WebKit runtime errors. Both are attributed to actual-role-redirect / role-changed-destination-release at +146 and +156 ms; current route is /app/reports. Resources are /app RSC and the Next original-stack-frames endpoint. This is temporal attribution, not causal proof. Existing reportNavigation traces do not encompass the separate role-redirect control's full document/network lifecycle.

## Findings by severity
CRITICAL: None newly established.
HIGH: No new application defect established. Existing two runtime errors remain unresolved/fatal despite functional passes.
MEDIUM: None in a proposed code diff (no diagnostic patch reviewed).
LOW / diagnostic limitation: scripts/browser-navigation-diagnostic.mjs:17 explicitly returns phase same-url without retaining pending request when source equals destination. Thus pending() alone cannot exclude a same-URL reload. The observer's different-destination pending logic must not be silently broadened for classification.

## Source-backed hypothesis
scripts/scoped-navigation-browser-check.mjs:108-111 awaits fictional role UPDATE, marks the phase, dispatches storage, then releases the intercepted Reports RSC. src/components/company-access/use-operational-navigation.ts:27-28 calls identityChanged for access denial or changed employee/role; line41 listens to storage. src/components/app-shell.tsx:80 calls window.location.reload on identity change. A hard navigation concurrent with client redirect/RSC work is therefore plausible, but the report has no document-request state at error time or window exception observations to establish that sequence. Neither endpoint's text proves it is harmless.

## Smallest next diagnostic step
Keep the entire existing role mutation + storage + actual Reports request case, deadlines, cleanup, private-content retirement and destination assertions unchanged. Install observeWindowExceptions once per context before first navigation, retaining bounded error/unhandledrejection kinds, time and page/control attribution. Snapshot existing observeDocumentNavigation state at each pageerror and at role-control boundaries. Keep both pageerrors in report.errors regardless of observation.

Add a small diagnostic-only, bounded main-frame document request ledger for this case, keyed by request object/sequence and recording request/response/finished/failed/commit, same-URL boolean, static destination category, elapsed time, status and dropped count. It must include same-URL requests even though the existing classification observer intentionally does not mark them pending. Correlate bounded authority-read, Reports RSC, /app RSC and framework diagnostic request lifecycle metadata on the same clock. Do not retain query strings, headers, payloads, body text or arbitrary URLs; do not await additional network completion or change response timing to obtain diagnostics. Do not infer a document commit from same-source history events.

The existing native control in browser-navigation-diagnostic.mjs:45 onward provides a useful observer/mechanism baseline, with explicit positive window exception checks. It tests ordinary fetch profiles during a held different-document navigation. It does not prove this same-URL reload/Next RSC/framework request case, and navigationFetchDiagnostic's current resource allowlist does not include these two resources. Do not expand that predicate. Run the existing control in the owned cloud browser environment as calibration, alongside the unchanged failing scenario. If the new trace supports the reload hypothesis, a separate additive controlled same-URL reload/native fetch case can test that mechanism; a generic fetch reproduction still would not alone certify Next's two endpoints. Preserve the original scenario as the release gate.

## Review perspectives and limits
remove-ai-slops and programming perspectives applied from previously consulted skills: reuse existing observation utilities, bounded test diagnostics only, no application abstraction, no deletion-only or implementation-mirroring tests. No additional application/CSS change follows from a static unauthenticated phone probe. No tests, browser, network or external mutation performed. This approves evidence collection, not runtime correctness or release. Prior reports preserved; no-ULW-plan fallback path used.
