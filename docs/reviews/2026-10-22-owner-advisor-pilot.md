# Task 4 code review

codeQualityStatus: BLOCK
recommendation: REQUEST_CHANGES

Scope: committed Task 4 diff `2f4e1a49..6c3e1dfb` on `codex/owner-advisor-20261022`; owned Next helper, pilot/preload and tests only. Tasks 1–3 are outside review. No implementation edits, provider calls, paid inference, deployment or publishing performed. Root's uncommitted plan was preserved.

## Findings

### CRITICAL
None.

### HIGH — Loopback redirect bypasses the egress guard
`src/test/integration/owner-advisor-pilot.mts:137`–138 forwards loopback requests directly to the original transport, including its default `redirect: follow`. Native fetch follows redirects internally, without calling this wrapper again. Thus a local 307/308 can send the request body to a destination which the guard would reject directly. Endpoint/model/body/reservation checks are not applied to that redirected request. This violates the explicit fail-closed host/route and redirect requirement.

Independent local-only reproduction: started two ephemeral HTTP servers on 127.0.0.1; destination expressed as IPv4-mapped IPv6 `[::ffff:127.0.0.1]` (a destination the guard rejects directly); first server returned 307 to it. Called guardedFetch first directly, then through first server with POST fictional body. Observed:

```json
{"directBlocked":true,"redirectSucceeded":true,"body":"escaped","hits":1,"attempts":0}
```

This proves destination-validation bypass using native fetch, without any remote service. It does not prove a charged gateway call: native fetch strips authorization on cross-origin redirects. Nevertheless, remote egress/body escape is real under the same redirect mechanics. Reject redirect-follow for loopback or implement bounded per-hop validation before transport; preserve the legitimate Next loopback behavior with a regression using actual local HTTP redirect responses. No production architecture expansion needed.

### MEDIUM — Preload smoke test accepts unrelated transport errors
`src/test/integration/owner-advisor-pilot.check.mts:116` (test beginning “known Node preload installs before application code”; catch in child script) catches every fetch exception and prints BLOCKED_BEFORE_TRANSPORT. If preload assignment is removed and DNS/TLS/network fails, this test still passes; its label does not prove rejection before transport. It also unnecessarily addresses a real external host in this purportedly isolated test.

Use a deterministic failing/sentinel transport installed before the tested preload, or another observable transport seam, and assert the guard-specific rejection plus zero transport calls. Demonstrate removing the preload installation makes the test fail even when upstream transport would also reject. This is false confidence in a required control, rated MEDIUM rather than HIGH because the preload code is present and the root still owns actual Next proof.

### LOW
None requiring action. Test/source formatting is unusually dense, with multiple operations and scenarios on single lines; splitting future edits by scenario would improve failure localization. Existing large owned-next helper is pre-existing scope, so this review does not require unrelated refactoring.

## Skill-perspective check
Loaded and consulted `/Users/josek0514/.codex/plugins/cache/sisyphuslabs/omo/5.1.30/skills/remove-ai-slops/SKILL.md` and adjacent `programming/SKILL.md`. Also read repository AGENTS, executive operating model, CTO, CISO and governance skills. Applied read-only perspectives; did not execute cleanup/delegation workflows.

The preload test violates the programming requirement that a test fail for the behavior it names, and remove-ai-slops behavior-coverage perspective. No deletion-only tests, prose/prompt pins, tautological constant-only tests or requested-removal tests found. Budget/model/environment literal assertions exercise required contracts rather than incidental constants. Parsing/validation is justified at this guard's network and persistent-state boundaries; no needless production extraction/normalization or abstraction found. Dense multi-scenario tests depart from programming's preferred one-behavior structure but are meaningful and the output-cap RED demonstrates a real rejection regression. JSON.parse returns implicitly untyped data; validation narrows the request body, while ledger properties are checked dynamically. This does not establish a separate correctness blocker in the reviewed paths.

## Evidence inspected and independently run
- Read task-4-brief.md, task-4-report.md, Task 4 plan section, complete scoped code diff via git, all changed helper/preload/guard/tests, actual caller `src/lib/owner-advisor/loop.server.ts:125` request settings, helper env/spawn/metadata/custody code, package scripts, and working-tree status.
- Read `.omo/evidence/owner-advisor-task-4/guard-green.log`, `guard-red-output-cap.log`, `owned-runtime.log`, `typecheck.log`, `lint.log`. Captured reports show 17 green guard tests, meaningful output-cap mutation failure, 36 affected owned-runtime tests, and type/lint exits 0. The last two logs contain only exit status, so they are weaker evidence than full captured command/results and were not independently rerun here.
- Independently ran Node v24.19.0 `node --test src/test/integration/owner-advisor-pilot.check.mts`: 17 passed, zero failed, exit 0.
- Independently ran `npx vitest run src/test/integration/owned-next-advisor.test.ts`: 2 passed, exit 0.
- Ran local-only native-fetch redirect reproduction described above: exit 0. Earlier proof drafts failed before requests (syntax error, then unavailable 127.0.0.2 bind); successful proof used supported 127.0.0.1 plus mapped IPv6 target. No real credentials used.
- `omo-agent-toolkit ulw-loop status --json` returned ULW_LOOP_PLAN_MISSING; fallback report path applies. Parent additionally requested SDD report copy.

Ledger reservation ordering, exclusive locking, no automatic refunds/recovery, fixed identity, receipts, twenty lifetime reservations and exact 24-hour expiry are supported by inspection and passing tests for the approved single externally retained ledger path. Owned child environment is explicitly assembled; ambient provider secrets are not forwarded. Guard/preload live in captured source and mirror hashes. Same-OS-user malicious rewriting of all ledger files or starting another path is outside the documented pilot boundary; root must retain the approved fixed path.

## Blockers and next gate
1. Close loopback redirect escape and add local HTTP regression proving disallowed destinations receive no request.
2. Make preload test distinguish installed enforcement from unrelated fetch failure.

Engineering/security/governance position: REQUEST_CHANGES for this bounded pilot. Root owns real Next wrapper/child inheritance, browser/live evidence, fixed ledger custody and actual credit reporting after fixes. Current Request-shaped unit tests do not certify Next/browser/live behavior. The handoff acknowledges that limit and contains artifact paths; no misleading completed-live success claim found. No new Jose permission is required to fix these scoped issues. Production/publishing remain unauthorized.


## Superseding disposition — f9591e5ee87aefb82c8428ddce7c8198cf153e65

codeQualityStatus: CLEAR
recommendation: APPROVE
blockers: []

This disposition supersedes the two findings above for final commit f9591e5e, including fix commit f6bb440b. Historical findings remain intact for traceability. Recheck was confined to those fixes and their evidence; no broad re-review or live-provider request.

- HIGH redirect escape: CLOSED. Guard lines 137–142 now force `redirect: error` on loopback transport and reject unexpected redirected/3xx responses. Native fetch cannot follow the redirect internally. The actual implementation uses `error`, not manual redirect handling. New real two-server test exercises both 307/308, caller default/follow/manual modes, POST-string and Request inputs, verifies zero destination requests and no reservations, and preserves ordinary readiness GET.
- MEDIUM preload false positive: CLOSED. A deterministic rejecting sentinel transport loads before the known preload. Installed preload must produce the specific guard refusal and zero sentinel calls. Omitted preload must exit 3 with one sentinel call, so unrelated fetch failure no longer masquerades as enforcement. All transport remains local/fake.

Evidence: inspected scoped final fix diff, `.omo/evidence/owner-advisor-task-4/redirect-red.log` (real redirect regression failed before fix), `redirect-green.log` (18 pass with sentinel test), `redirect-checks.log`, and `verification-receipt.log` (the latter records the earlier 6c3e1dfb baseline, not final fix verification). Independently ran `node --test src/test/integration/owner-advisor-pilot.check.mts` at final SHA: 18 passed, 0 failed, exit 0, Node v24.19.0. Git status showed only root's existing plan edit before report append. Neither source nor tests edited by reviewer.

Previously loaded remove-ai-slops/programming perspectives were applied to these fixes: tests now observe actual redirect and preload behavior, no new useless tests or unnecessary production complexity found. The narrow code review is approved. Root still owns actual final Next/browser/live proof, fixed ledger custody and credit reporting; this approval does not claim those completed or authorize production/publishing.
