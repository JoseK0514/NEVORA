# Employee mobile Pay statements

Implemented in the isolated Employee React prototype. Review example: [Pay](index.html?page=pay&pay=enabled). Final HTML SHA-256: `68aad106fa42dd4bcdf7dafb2e521561e15868e4cf607d810906244c7f9ff0ab`.

## Behavior and authority

Pay replaces the fourth Hours tab only when both payroll and the payStatements module are enabled. Recorded time and Timecards remain accessible within Pay, with contextual return. More provides a gated alternate entry. The base fixture stays off because live workplace configuration is unknown; `pay=enabled` explicitly selects fictional enabled configuration.

The date-led list contains only the employee's own published EMPLOYEE_STATEMENT documents. The frozen source joins publication to a currently Approved run, rechecks current session/workspace/authority for every file read and validates document bytes against the stored SHA-256. Fifteen source snapshots at application commit `46e202786863279302026ee03a0e225c359fa55c` are preserved in work/employee-mobile/references/pay-source/manifest.json. The prototype models these rules locally; it does not enforce or certify a real server boundary.

Next payday appears only when schedule context is supplied. View PDF is optional per document; Download remains deliberate. The preview presents accessible text of the same marked fictional PDF, including sample identity, payday and period. No earnings, taxes, bank details, YTD amounts or payment claims are invented. The sample PDF is not a production paystub template. Browser feedback says the PDF was requested and asks the employee to check downloads; it does not claim a file was saved or delivered.

Current own actor/workspace/proof/access, module gates, publication, metadata, document identity, generation and hash govern local reads/actions. Foreign/draft/company/unsafe/malformed responses fail as a whole. Missing/withdrawn/corrupt documents, optional-view refusal, loading, empty, failed read, offline, paused and revoked-on-resume have distinct behavior. Hidden/pagehide/offline/navigation clear private Pay state and download URLs; sign-out clears state and fences late callbacks. A five-second callback also releases Blob URLs. Files already saved by a browser cannot be revoked by the application.

No manager payroll operations, employee selector, publishing/approval, bank editing, real pay records, protected provider PDFs, API requests or native permissions are introduced. Existing sessionStorage contains only the anonymous ended-sample boolean; no pay/identity/document content is persisted. Existing inbox types were preserved: a Pay notification is not fabricated from document availability. Source-specific Pay notice destinations remain integration/audit work.

## Checks actually run

- **419 grouped browser checks per engine passed** in Chromium, WebKit and Firefox:383 prior groups plus36 focused Pay groups. Exact final-hash records are aggregated in [checks.json](checks.json).
-20 pure Pay model groups passed, plus all existing deletion/passkey/device/calendar/policy/profile/communications model suites. TypeScript strict checks and source-built/saved/served byte comparison passed.81 source modules remain below250 nonblank/noncomment lines, maximum199.
-Each engine emitted five intentional download requests covering two unique fictional PDFs. Six saved-file parser/integrity cases verified exact expected SHA-256, one-page structure and fictional metadata/text with pypdf; pypdfium2 produced a separate document-render artifact, also visually inspected. These files remain work evidence, not publicly linked protected documents.
-35 current screenshots cover list/document, download notice, unavailable/empty/paused, Light/Dark at320/390/430/884 and200% text scroll segments.884 captures are430px app-element crops from that viewport; no whole-browser capture claim.97 public PNGs carry origin metadata and verified byte hashes.
-The missing-feature check failed on the archived383-group baseline, then passed on final bytes. A reproduced WebKit immediate-pagehide listener race was corrected by attaching lifecycle listeners before paint; four repeated reproductions and the full regression suite passed afterward. Firefox expiry verification advances an installed browser clock by5100ms, avoiding background timer throttling while checking the real5000ms callback.
-No page errors, native credential/notification permission calls or external/mutation requests were captured by the focused runner. Keyboard/focus, exact-opener return, enlarged text, layout bounds, stale operations, navigation/sign-out, URL release and current-scope refusal were exercised. Native devices, screen readers and production services were not certified.
-21st catalog metadata search informed component selection; existing project primitives fit. No retrieved component, installation or paid generation. Final21st review:7 files,0 findings,0 fixed. Six automatic post-edit hook records have no findings; no second detector was run.

## Review and handoff

The [independent full source/screenshot review](pay-ui-review.md) returned **ship / APPROVE**, with no required fixes. Its execution scope is image/hash/source/build inspection; it inspected the separate browser test evidence without rerunning those suites. The [design comparison](pay-design-record.md) records the ordinary extension. Substitute reviewer/documenter roles were used because the skill's named roles are unavailable. Existing context/metadata drift was reported without repair; shared tokens, primitives and system records were preserved.

New source: Pay.tsx, PayDocument.tsx, pay-model.ts, usePayRuntime.ts, sample-pay-pdf.ts and Pay.css. Integration is confined to Employee App/Hours/More/model/session/build, scoped tests and documentation. Source is in work/employee-mobile; output is in outputs/employee-mobile. The preceding383-group HTML/source/published bundle is archived in evidence/pay-pass/before. The actual application checkout remained read-only, clean and detached at the inspected commit. No Git branch/commit, PR or deployment was created.

Next user action: review the local Pay journey. Next project step: full Employee desktop-to-mobile capability and UX audit before live integration; real authority, protected document delivery and Pay notifications remain separate work. See [coverage ledger](desktop-parity-audit.md).
