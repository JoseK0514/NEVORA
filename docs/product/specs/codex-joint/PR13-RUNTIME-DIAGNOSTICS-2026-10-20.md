# PR13 original runtime diagnostics — 2026-10-20

Owner: Task 2 implementation executor. Base: `946b2e764462f0038ed919a4ffad9fbb1d405226`.
Branch: `codex/verify-preview-33`.
Evidence root (`E`): `/Users/josek0514/.codex/visualizations/2026/10/20/01a15962-cdee-7dd0-8a92-023551b076fb/pr13-runtime-diagnostics`.

The two archived exact-base hosted Attention reports each contain two unclassified WebKit320 page errors, with no original text or stage. Their application cause remains unknown. This bounded harness change captures original diagnostic information before normalization; it does not fix or exempt the unresolved hosted error.

## Scope and privacy contract

`scripts/phase-e-browser-qa.mjs` adds a `diagnostic` object to each existing page-runtime-error entry. `nativeName` is the observed error name in a finite JavaScript/DOMException enum, or `Unknown`; it is not proof of an error's producer or authenticity. `canonicalMessage` is one of the two exact standard ResizeObserver messages, a reconstructed `Minified React error #N` prefix, or null. `reactInvariant` is an integer 1–999 only when the original message begins with the exact anchored minified React prefix and semicolon; otherwise null. These strings are observations, not a cause/harmlessness classification. All errors remain fatal.

The installed React DOM 19.3.0 `node_modules/react-dom/cjs/react-dom-client.production.js` formatter at lines 18–33 confirms the prefix, numeric code, semicolon and private URL arguments. Only the prefix/code is reconstructed; the URL, arguments and arbitrary suffix never survive. Exact ResizeObserver matching rejects suffixes/newlines. Invalid codes, unknown names, private strings and unreadable accessors produce bounded unknown metadata. No original text, URL, stack, private payload or hash of private text is added to reports.

`route` is only an exact parsed pathname from `/login`, `/app`, `/app/schedule`, `/app/communications`, `/app/calendar`, `/app/settings`, otherwise null. No hostname, port, query, hash, dynamic path or identifier survives. The pre-existing scrubbed failure object and error counts remain. `scripts/phase-e-attention-browser-scenarios.mjs` connects its stage reader and labels the existing steps with static stages: login, full-review, native-focus, revision-conflict, confirmation, republish, response-loss, leave-and-revoke, unavailable-retry, empty, layout. Stage labels change diagnostics only, with no extra browser action/wait/retry or acceptance change.

Both primary and manager observers, post-close rejection, final error assertions, five suites / 70 cells, source/mirror/resource guards, native keyboard checks, budgets and no-retry policy remain. Existing uploaded `browser-report.json` and `browser-failure-report.json` carry the additive diagnostic object. Private `*-checks.json` files are not newly uploaded; no workflow changed.

## Verification

Regression RED: `npm test -- src/test/phase-e-browser-runtime.test.ts` produced 19 new failures / 8 existing passes before implementation (`E/regression-red.log`). Initial GREEN: 27 passed (`E/regression-green.log`). DOM/stage expansion RED: 15 failed / 35 passed (`E/dom-stage-red.log`); GREEN: 50 passed (`E/dom-stage-green.log`). Tests exercise the real observer through EventEmitter boundaries, including recognized formats, malformed codes, private URL arguments/suffixes, spoofed names/stages/routes, throwing accessors, both roles and teardown. Subsequent checks use the existing `safeEnvironment` allowlist.

Executable source was frozen at `b7af3c141c2f218a51a7ff9fa4e7854c5104eee2` (`SHA` below). All source guards completed before this documentation-only result update. All commands ran from the worktree. `run-check.mjs` and the existing local-gate runner pass only `safeEnvironment`; the controlled probe was launched with the same allowlist plus `PHASE_E_EXPECTED_SHA=SHA`.

| Scenario | Invocation | Binary observable | Captured artifact |
| --- | --- | --- | --- |
| Final focused privacy/fatal behavior | `node E/run-check.mjs SHA E final-focused npm test -- src/test/phase-e-browser-runtime.test.ts` | Exit 0; 50 passed, source unchanged | `E/final-focused.log`, `.receipt.json` |
| Chromium + WebKit actual exceptions | `PHASE_E_EXPECTED_SHA=SHA node E/runtime-observer-probe.mjs E` through the allowlisted launcher | Exit 0; each engine runs 5 cases, 2 actual events/case; all 20 events reject before/after context close; serialized reports omit private sentinel/URL/arguments | `E/runtime-observer-probe.log`, `E/runtime-observer-probe-report.json`, ten `E/<engine>-<case>-report.json` files |
| Types, lint, full default units | `node E/../final-gates/run-local-gates.mjs <worktree> SHA E/gates` | All exit 0; 7,501 passed, 801 existing skipped; 452 passed files, 27 skipped; source unchanged | `E/gates/local-summary.json`, `types.log`, `lint.log`, `unit.log` and their hashed receipts |
| Release contracts | `npm run test:release-engineering` through the allowlisted source-guarded launcher | Exit 0; 62 passed, zero failed/skipped | `E/release-checks.log`, `.receipt.json` |
| Owned resource closure | Probe finally block closes both browsers, contexts, static server, then checks observed PIDs and loopback port | All 34 observed descendants absent; port 54667 closed; both browsers and server closed | `E/probe-closure.json` |
| Final source/artifact integrity | `node E/audit-evidence.mjs E` after documentation commit | Clean tree, executable/test hashes match frozen source, only documentation differs, every listed artifact nonempty and hashed | `E/probe-source-custody.json`, `E/final-custody.json`, `E/artifact-manifest.json` |

The probe uses owned fictional static HTML and deliberately raised standard/unknown exceptions, with no application database or credentials. Each case covers primary/scenario and manager/context-close observers. The manager exception is deliberately raised during the teardown phase before closing its context; it is not represented as an error caused by browser closure. Existing asynchronous teardown regression also remains. Probe results demonstrate persisted diagnostics and strict rejection, not reproduction of the unknown hosted application error.

Previous local 70-cell success belongs to earlier source and is not new acceptance for this patch. Success-path browser actions and assertions are unchanged; local coverage here deliberately exercises the changed error path. Root owns the fresh hosted all-70 gate and must inspect any actual Linux diagnostic before an application correction or exemption is considered. Build and PostgreSQL/browser acceptance for the final candidate remain the controller's next gate, not claimed here.

## Positions and open gates

Engineering: smallest additive diagnostic change, no application correction inferred. Security: finite output, no arbitrary payload persistence, every event fatal. Governance: GO WITH CONDITIONS for independent review and hosted verification; release remains blocked. No material exception requested or accepted. Seven independent UI findings, Schedule performance HOLD, migration preparation/application authorization and production gates remain open. No production operation, real messaging, payroll/legal wording, migration, authorization, deployment, main merge or push occurred. Next owner is the root controller for scoped independent review, candidate build and hosted verification.
