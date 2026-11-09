# Backend source completion code review

**Code quality status** BLOCK  
**Recommendation** REQUEST_CHANGES  
**Reviewed source** e9c3b60f5de31a96f637ba039749c9075b77eb7e through 6ce8212acf69cf7dc72bdd537367381d2d1bfaa1. The integration source is af49ea4592491a10e7d4f7abbb414d9694023581. Later commits in scope change docs only. The reviewed worktree is /Users/josek0514/.codex/worktrees/nevora-web-backend-completion-20261109. The review artifact is in the separate requesting workspace.

## Findings

### CRITICAL

None.

### HIGH — Important, blocking

1. **Successful existing Owner questions fail in the shipped client.** /Users/josek0514/.codex/worktrees/nevora-web-backend-completion-20261109/src/lib/owner-advisor/service.server.ts:168 writes four keys into every new answer's context, including ordinary ask and ask_task. Line 144 returns persisted answers in the same shape on replay. /Users/josek0514/.codex/worktrees/nevora-web-backend-completion-20261109/src/components/owner-advisor/public-response.ts:140 checks for exactly notebookRevision and taskId. The route serializes the service output directly and controller.ts:238 applies that parser before displaying the answer. The investigation can consume allowance and write history while the user sees a failed operation. I loaded the pinned parser with esbuild in memory. A valid answered response with text, no sources, authority, observedAt, a 1,000 ms lease and context {notebookRevision:0,taskId:null} returned answered. Adding precisely {profileRevision:0,memoryRevision:0} threw “Invalid advisor response.” Keep the revision guards and stored receipts. Give existing clients their supported answer projection for fresh and replayed ask and ask_task, and expose extended behavior explicitly to compatible clients. Preserve forgetting semantics when choosing which memory-derived content legacy clients may receive. Exercise returned HTTP payloads with the actual unchanged consumer parser for fresh and replayed answers using an offline provider.

2. **Isolated commerce can authorize a write after the entitlement expires.** /Users/josek0514/.codex/worktrees/nevora-web-backend-completion-20261109/src/lib/commerce/access.ts:43 evaluates validUntil before awaiting an asynchronous registry check on cache hits. Lines 60–66 have the same ordering on cache misses. The isolated callback performs real database work in isolated-connection.server.ts:17. A grant that passes the initial check can expire while the registry is read, and commerceGate at access.ts:97 will admit the operation. I bundled the actual access module in memory with only connection resolution replaced by a fixture. A fake /internal/access returned operational=true, validUntil=1100, businessId=installationId=abc. With Date.now() at 1000 and the final assertCurrent advancing it by 200, readCommerceAuthority returned operational=true at 1200. After populating a live cache at 1000, starting the next read at 1099 and advancing by two in assertCurrent returned the cached true at 1101 without fetching. Check the deadline after the last awaited binding check on both branches, immediately before caching or returning the decision. Assert the public gate denies an operational POST in both scenarios.

### MEDIUM — Important

3. **The held client now scans 28 days of operational history every lease renewal.** /Users/josek0514/.codex/worktrees/nevora-web-backend-completion-20261109/src/components/owner-advisor/controller.ts:111 polls at 60% of a lease capped at 15 seconds. Line 123 always calls the unqualified endpoint, including for renewal. /Users/josek0514/.codex/worktrees/nevora-web-backend-completion-20261109/src/lib/owner-advisor/service.server.ts:79 runs readOperationalInsights for every such call. The unchanged UI has no use for this field. The SQL at operational-insights.server.ts:46 serializes and hashes every qualifying source row even though the projected record lists are bounded. An idle Owner tab issues this expensive query roughly 400 times an hour under a steady 15-second lease. The new lease selector is exercised by the server test, but the shipping client never requests it. Use the legacy lightweight projection for unqualified requests. Give capable clients an explicit selector for fresh detailed reads, and retain current Owner checks on every projection. In http.integration.ts:97 the test counts SQL spelling (“AS fingerprint”), which couples it to the implementation. Exercise the historical-read boundary through the actual legacy request and explicit detailed request.

### LOW — Minor

None.

## Checks and scope

- Verified the review package diff body against git diff -U10 of the pinned endpoints. Both SHA-256 hashes were 10db3bcbbfa706601ade7c8f500749d5be269e5bee6da2e721cd93eb4ba173a4. Reviewed integration paths in passes against the plan, spec, adoption manifest and all ledger rulings. The base-to-head diff under native, src/components, all TSX and the manifest's held paths was empty.
- Recomputed all 22 SHA-256 hashes from docs/handoffs/backend-completion-evidence-20261109/index.json. The owned logs show 136 onboarding, 88 commerce and 111 offline partner tests passed. The root receipt reports 11,479 passed and 857 skipped out of 12,391, leaving 55 outside those two counts. Reviewed archived build/type/lint and 73-source/three-active-branch inventory receipts. No broad suite was repeated. The 4,439-artifact count and absence of development markers are historical build-audit results.
- Ran the canonical onboarding manifest comparison, which matched 5ab65c15a384c0f2f08e0f9954d61ded8c2622a9d8763110c3684b21927a23a3. db/migrations/order.ts:53 retains native push and line 63 appends Owner memory after 0055. Company bootstrap enumerates app relations after migration and installs explicit worker relation/column grants. The real APP provisioning test selects from the memory table and resolves the function signature. That catalog assertion proves installation only. It does not execute the function as APP. The function runs with invoker permissions.
- Inspected Owner admission, transactions bracketing reads, current-context and request lease guards during settlement, private receipt invalidation, isolated identity/role/incarnation checks, and the commerce registry recheck. The local reproductions used an in-memory bundle, fixture clock and synthetic response. No email, model, Stripe, provider, shared database or deployment operation ran.
- Checked that the inventory describes collaboration 47c9782e as held, the protected main head separately and frozen Release 1 as a distinct selection. Adopting server capabilities never establishes hosted or production authority.
- Consulted the installed remove-ai-slops and programming skills before assessing tests or maintainability. Findings 1–2 expose missing behavioral coverage across real boundaries. Finding 3 violates both perspectives through unconsumed repeated production extraction and a test tied to SQL text. Reviewed the seven invalid-evidence parser cases and the canonical-source manifest comparison as meaningful boundary checks. Neither asserts a removal as its sole objective.

## Declined to judge

- Claude’s as-yet-unintegrated frontend and new isolated token-entry interfaces, plus native device/signing/store behavior. The source plan explicitly holds these changes. Compatibility with the currently shipped client was reviewed.
- Live model quality, legal applicability, and independent QA/UI certification. The offline fixture and code review cannot establish those results.
- Existing hosted tenant migration, deployment acceptance, supervision rehearsals and production authorization. This pinned source phase and its archived local runs do not execute those operations.

**Ready to merge? No.** Fix the two HIGH defects and address the recurring legacy history scan before integration. The reproduced failures occur through supported paths despite the passing suites.
