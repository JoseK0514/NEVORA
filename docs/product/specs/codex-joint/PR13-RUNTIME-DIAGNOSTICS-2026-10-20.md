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

Immutable-source full gates and the controlled two-engine exception probe are recorded in the final evidence handoff. Previous local 70-cell success belongs to earlier source and is not new acceptance for this patch. Success-path browser actions and assertions are unchanged; local coverage here deliberately exercises the changed error path. Root owns the fresh hosted all-70 gate and must inspect any actual Linux diagnostic before an application correction or exemption is considered.

## Positions and open gates

Engineering: smallest additive diagnostic change, no application correction inferred. Security: finite output, no arbitrary payload persistence, every event fatal. Governance: GO WITH CONDITIONS for independent review and hosted verification; release remains blocked. No material exception requested or accepted. Seven independent UI findings, Schedule performance HOLD, migration preparation/application authorization and production gates remain open. No production operation, real messaging, payroll/legal wording, migration, authorization, deployment, main merge or push occurred. Next owner is the root controller for scoped independent review, candidate build and hosted verification.
