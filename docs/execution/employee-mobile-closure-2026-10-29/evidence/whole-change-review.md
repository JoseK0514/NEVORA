# Employee mobile closure — whole-change review

Date: 2026-10-29. Scope: `2f87e03881cba54ad685d0460266f23594e0c108..cc89df19ae259725e5553d145847b915e16f089a`.

**Verdict: NEEDS FIX.** Three P2 findings concern verification correctness. No additional material product-code defect was established in the deletion, worker suppression or process-supervisor changes. This is a whole-change code/spec review, not a production approval or independent device certification. The exact-candidate verification runs are not yet complete and are not certified here.

## Findings

### R1 — P2: the Calendar read exception also exempts aborted mutations

Locations: `src/test/integration/calendar-request-monitor.ts:4`, `:13`, `:39`; related server filter `src/test/integration/owned-calendar-diagnostics.mjs:13`.

The browser wrapper adds the diagnostic ID and records AbortError for every request to the Calendar path, regardless of method. `PendingRead` and `pendingReads` likewise do not require GET. However, the independent server observer deliberately ignores non-GET requests. The actual Calendar client uses the same path for POST mutations (`src/lib/calendar/client.ts:23`). After a successful GET positive control, an aborted POST with no browser terminal event and no observed response therefore meets every exemption condition even if the server received and is still processing that mutation. Its missing server receipt is guaranteed by the observer's method filter, not evidence that it never reached the server.

Impact: the Firefox idle check can remove a pending mutation and report idle despite server activity. This violates the plan's narrow read-accounting exception and its requirement to retain unknown/live requests. It is a defect in the new diagnostic machinery, not a claim that the current Profile replay actually exercised this failure.

Required repair: restrict observation and classification to GET, using the effective Request/init method, and retain all non-GET pending requests. Add a negative control containing a POST on the exact Calendar path with an abort ID and a valid positive GET control; it must remain pending. A real received POST control should also prove the server method exclusion cannot become no-receipt authority.

### R2 — P2: observer saturation silently converts unobserved requests into “no receipt” evidence

Locations: `src/test/integration/owned-calendar-diagnostics.mjs:14`; `src/test/integration/calendar-request-monitor.ts:10` and `:14`.

The server observer stops recording after 1,024 matching requests without emitting an unavailable/saturated state. The classifier continues trusting any prior matched successful control indefinitely. A later GET that reaches the server, is aborted in the page and lacks a browser terminal event can consequently be dropped as an orphan because its receipt was intentionally omitted. The browser's separate limit does not close this gap: it counts aborted fetches, whereas the server limit counts all matching requests. Many successful reads followed by a first abort are sufficient to create the mismatch.

Impact: under repeated requests or a request loop, accounting can hide a received/hung request at the precise point where complete observation is no longer available. Current short-run success does not validate this boundary.

Required repair: make the cap fail closed. Preserve an explicit saturation/observation-unavailable signal and refuse every no-receipt exception after it, or use equivalent bounded accounting that never treats omitted receipt data as absence. Add deterministic negative coverage across the actual cap and retain the existing not-aborted, server-started, response-seen, unmatched-control and unrelated-path controls. Do not solve this by increasing an idle timeout or merely increasing the cap.

### R3 — P2: the retained-Home fix narrows privacy assertions to visible content

Locations: `src/test/integration/employee-mobile-phase1.integration.ts:88`–`:91` and `:160`–`:163`.

The replacement for the strict single-root locator checks that exactly one Home is visible and additional roots have a `display:none` ancestor, then checks `Main Office` only in `.q-home:visible`. The saved diagnostic likewise contains visibility booleans only. This resolves duplicate-locator mechanics but no longer checks private assignment content in retained roots. A hidden old Home containing the previous assignment would pass the new checks after offline/session loss. The global OFF_CLOCK badge-count assertion remains useful but cannot prove assignment/name/attention content was cleared.

Impact: the changed test can report that private Home facts were cleared while hidden DOM still retains them. This is a confirmed reduction in test coverage, not a demonstrated production data leak. The six current `cc89df19` geometry artifacts inspected each contain only one visible root, so they do not establish the content of the historical duplicate-root case either.

Required repair: preserve multi-root handling, but inspect/assert private content across every retained root (including hidden text/attributes as appropriate), at both privacy checkpoints. Record non-sensitive booleans/counts for those checks. If the framework retains private content, reproduce and resolve that lifecycle behavior rather than exempting it on visibility alone. Retain the visible-root and global clock assertions.

## Assessment of the complete change

### Deletion authorization and concurrency

`src/lib/account-deletion/requests.server.ts` now receives the server-derived session-token hash, verifies the password, then locks employee → credential → session and performs a separate current-state check before insertion/revocation. Current active employee, unchanged password hash/version and either a live exact session or an already-open request are required. The open-request exception preserves concurrent legitimate confirmations after the winning transaction removes both sessions; it does not authorize creation of a first request without a current session. The action continues deriving employee identity from server proof and rejecting a mismatched form account.

The implemented recovery path in `src/lib/auth/recovery.server.ts:95`–`:104` locks employee then credential before updating credentials and deleting sessions, consistent with the new order. The sign-in issuance guard also locks employee before credential. I found no new reversed-order cycle in these paths. This is source analysis; the new four boundary tests finish their authority-changing operation before acceptance and are not a full two-transaction reset-lock race test.

The real SQL fixture tests signed-out, expired, reset and inactive boundaries after actual password verification; they assert no request and no additional feed/session consequences. Comparing post-reset/deactivation feed state is appropriate because those lifecycle actions themselves revoke feeds. The explicit two-arrival barrier gives meaningful coverage of simultaneous legitimate confirmations. Lost-COMMIT-response and stale sign-in fencing remain present. No schema or operational deletion/withdrawal policy is silently introduced.

### Worker suppression and failure behavior

`public/fuel-portal-sw.js` adds an independent CacheStorage store containing opaque generation keys and constant `1` marker bodies. Public navigation responses, private application data, credentials and subscription material are not added to that cache. Suppression writes are independent via `Promise.allSettled`; either durable success yields suppressed, both rejected yields unavailable. Restarted `SET_OWNER`, push and click paths consult the fallback. The per-worker failed-storage flag remains fail closed.

Exact-generation suppression does not block an unrelated fresh generation until deliberate saturation. At the cap, a persistent blocked marker replaces eviction; no old generation is evicted. The queue serializes worker operations. Public-cache upgrade/RETIRE cleanup excludes the suppression cache, and the tested retirement/reactivation uses the new suppression-aware worker. I found no new authority expansion or passive opt-in path in this change.

Limits: the tests use actual worker source with browser API doubles, not physical CacheStorage/IndexedDB/provider execution. The retirement test is not a test of reverting to pre-fix worker bytes; a historical worker cannot be assumed to consult the new cache. Rollback must preserve the suppression-aware worker or retire delivery as documented, and this compatibility boundary should remain explicit in release instructions. Total durable-storage plus native/server cleanup failure cannot be claimed solved. The user-facing error remains pending and the new recovery-reminder failure copy gives the actual device/browser settings action; the policy document correctly retains the residual release gate.

### Process supervision and release allocation

`scripts/phase-e-owned.mjs` now rejects observer errors/stderr before interpreting absence. The changed-title retirement branch requires both leader and sampled member positively retired and returns before lease replacement. The root retirement check skips new discovery and leaves cleanup to already-proven leases. Existing identity, lifetime, group-anchor and individual signaling checks remain. I found no new process-cleanup authority created by these observation changes.

The startup IPC gate pins the main process before entry/import execution. The `isMainThread` repair prevents inherited Worker preloads from repeating process IPC or restoring stale environment options. Tests cover real default/nested Workers, fork/argv/import ordering, missing main-thread IPC, immediate entry, retired/live/ambiguous members and observer errors. The prior Worker finding is supported as addressed by source and preserved scoped review evidence. CommonJS/native preloads and non-Node aliases remain outside the entry/import guarantee; native Linux and Windows behavior are not certified by Darwin fixtures.

The Clocker inventory adds the seven omitted suites to all four groups without removing negative controls. The preserved allocation test reports 90 passing assertions. This is allocation evidence, not proof that all 42 SQL suites were executed in this review.

### Mobile evidence, permission boundaries and scope

The new landscape fixture seeds fictional records through the owned PostgreSQL/canonical workflow seams, uses actual coarse-pointer capability, and explicitly verifies mobile activation. It covers 26 route/workflow cases across three engines, three landscape sizes, both themes and 100/200% root text. It checks overflow, teal tokens, action geometry, sampled semantic contrast and scroll reachability above navigation. Failures accumulate into a final failing assertion; no product CSS is altered to make the matrix pass. Root font scaling and browser emulation are appropriately distinct from OS text scaling and physical-device acceptance.

Viewport-only screenshots avoid full-page capture changing capability-sensitive layout. They do not by themselves establish whole-page visual acceptance; actual geometry and journey assertions carry that evidence. Contrast is sampled, not exhaustive. The landscape fixture mostly checks rendered/readied forms; existing full journeys must still establish save/error/retry semantics.

The production diff is confined to deletion, suppression and error copy; it introduces no new role routing, management permission or Lead release flag. Existing Owner/Manager/Lead compatibility regressions remain. The parity manifest has exactly 34 entries, every release role is EMPLOYEE, and every mapped source/config path exists. These are source mappings, not 34 independently certified workflow passes. Policy recommendations, device acceptance, hosted evidence and Jose's production authority remain explicitly separate. No fake production UI or private persistent application cache was added.

## Evidence and custody

- Read the repository AGENTS, package configuration, plan/progress, full saved diff, commit list, relevant source/tests, repository engineering/security/assurance/governance skills, Superpowers review guidance and previous scoped review artifacts. No subagents were spawned.
- Read-only comparison confirmed the saved diff equals `git diff --unified=5 2f87e038..cc89df19` byte for byte. HEAD remained `cc89df19ae259725e5553d145847b915e16f089a`; tracked status was clean before this report.
- Preserved evidence inspected: deletion RED four failures, subsequent SQL 12/12 and focused 32/32; worker restart RED two failures and expanded 142/142; monitor/observer units 9/9; allocation 90/90; Profile three-engine integration 1/1; supervisor boundary/startup reports and explicit startup/typecheck/lint exit-code record. These are implementer execution artifacts, not reviewer reruns.
- At the inspected in-progress `combined-closure-1/summary.json` snapshot, `cc89df19` Phase1 and Requests exited 0, Responses exited 1. The remaining exact-head run and landscape matrix were unfinished. No complete-candidate all-green claim follows from this snapshot; parent owns diagnosis and the final result summary.
- Current retained-Home geometry evidence was read from `outputs/employee-mobile-closure-20261029/combined-closure-1/phase1/*retained-home-roots*.json` under the parent workspace. It cannot resolve R3 because it records no private-content predicates and this replay did not reproduce a second root.
- I ran no tests, browser interactions, database commands, process cleanup, source edits, commits, branch operations, pushes, merges, deployment or external messages. Only this requested review report was written.

## Handoff and next gate

Engineering recommendation: parent fixes R1–R3 in one bounded pass, records meaningful negative/positive evidence, commits the new candidate and reruns affected checks plus the required frozen final verification. The report findings should be resolved against the resulting exact revision; unrelated green suites cannot waive them.

Security position: no additional product authorization/signal-authority defect established; privacy-clearance and observation evidence need the corrections above. Governance recommendation: NO-GO for final closure on this candidate while these findings and incomplete/failing verification remain. This is not a policy exception request. Physical-device/provider, hosted/production, rollback and Support-policy gates remain as documented. Parent owns implementation and the final evidence handoff to Jose/Claude; no new Jose decision is needed to make these bounded repairs.
