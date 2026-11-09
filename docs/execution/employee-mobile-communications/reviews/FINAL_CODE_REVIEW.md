# Final communications code review

Author: independent whole-change code reviewer (`/root/communications_code_review`).
Review date: 2026-10-27.
Base: `564c71371e16f528a94aa242e42bf906d5890314`.
Candidate: `f7e331a7859ef55400eb1ce1e6420d4b5a9fdff9`.

**Verdict: NO-GO for completion/acceptance of this communications batch.** Three Important findings remain open. No Critical finding was identified. This verdict is not production or activation authorization. The implementation owner can make corrections after owned runtimes close; this review author owns material finding closure through targeted verification, rather than a new whole-change review.

## Scope and method

Read the repository instructions, executive operating model, CTO, CISO, Governance & Risk, technical executive assurance and release governance skills; the immutable Cloud handoff; approved communications plan; Employee teal spec; and active execution ledger, including inherited and Cloud rulings. Reviewed the 38-file communications application/service/transport/UI/test/config diff and surrounding canonical authority, notification, presentation, recovery and desktop code. The immutable handoff bundle was treated as provenance.

No application/test/index/branch/HEAD changes, Next processes, PostgreSQL clusters, browser instances, or test suites were started by this reviewer. Two small direct Node/tsx probes imported the candidate's actual recovery controller and statically rendered its actual view component. These probes did not use a database or network. Their observed outputs are recorded below. Notification-open lifetime finding CR-2 is source-traced, not claimed as a personally executed browser reproduction.

Root reports the original module-fence RED personally reproduced on `e06eeff3` and the affected three-engine browser suite GREEN on this candidate (69 checkpoints, 210 captures, 90 contrast samples, minimum 6.08945, no page errors). This reviewer inspected the test source but does not claim to have personally executed those runs or inspected every image. Full combined/SQL/unit/type/lint and independent QA/UI evidence were still being assembled when this review was authored; their passing results cannot close the findings below.

## Strengths

- Own authority remains server-derived. Paged selectors and return hints do not become identity or grants; notification projection retains its finite final MVCC manifest and exact current-source checks.
- Employee Updates transactions now recheck the module inside the canonical transaction, preserving rollback when the module is disabled. The development activation hold remains intact.
- The mobile owner keeps drafts and the exact original uncertain operation above disposable private content, keyed to the mounted session authority, without persistent private browser storage. The new ready/off or unavailable-module pause correctly addresses the handoff's immediate pending-operation fence.
- Publication retains current TodayTeam assignment/day/audience checks, optional-only employee acknowledgement authoring, explicit preview, immutable operation identity and canonical withdrawal. Opening a notification does not itself mark read or acknowledge it.
- The shared command transport now has a finite deadline and receipt identity checks. Tests meaningfully exercise lost publication and withdrawal responses, original not-found replay, source loss, module revocation, actual account isolation, native labels, contrast and desktop separation.

## Critical

None identified in the reviewed scope.

## Important

### CR-1 — A refused lookup destroys an already-unknown original operation

**Location:** `src/lib/communications/recovery.ts:38–39`; new integration at `src/lib/communications/http.server.ts:20–26` and `src/lib/data/employee-message-module.server.ts:13–18`.

`run(..., true)` treats a blocked/403 lookup like a definite refusal of a first submission: it clears both `command` and `operationId`. A lookup refusal says nothing about whether the earlier publication committed. After this clear, module restoration cannot recover the original operation and the retained compose draft can be sent again under a fresh UUID, potentially creating a duplicate publication.

**Concrete reproduction:** publish an update with its response lost after commit; the mounted controller is now unknown. Start Check submission status while the fresh mobile read still says Updates on. Disable Updates after the HTTP `moduleEnabled` preflight but before the canonical lookup's guarded transaction. The new executor's module tail throws `management_authorization`; `findCommunicationOperation` returns blocked, HTTP maps that to 403, and `communicationRequest` maps it to unauthorized. Deliver that response before a fresh private read observes off. The recovery branch clears the original ID. Re-enable Updates and refresh: the original lookup is no longer available, despite the same session still owning the original committed operation.

**Personally observed controller probe on candidate:** `authorize(true)`; `send(original)` returning `outcome_unknown`; then `lookup()` returning `{state:'unauthorized', reason:'access_denied', httpStatus:403}`. State changed from `{notice:'unknown',hasUnknown:true}` to `{notice:'blocked',hasUnknown:false}`. After `authorize(false)`, `authorize(true)` and another lookup with a committed response available, no third request was made; state was `{notice:null,hasUnknown:false}`. The original payload/ID had been lost.

**Provenance:** the generic clear-on-refusal branch predates this batch. The new transaction-level employee module wrapper exposes this reversible-module refusal path, and the new mounted mobile recovery workflow relies on that branch. This is an integration defect in this batch, not a claim that the clear statement itself was newly authored. Existing tests for definite first-send 401/403 refusal do not establish the correctness of clearing an already-unknown lookup.

**Required outcome:** retain an existing uncertain original operation across an inconclusive lookup refusal, fence further action while authority is unavailable, and recover only through deliberate current-authority lookup after restoration. Continue clearing/resetting private ownership on actual account/session-owner replacement or unmount. Do not solve this by weakening the module guard or asserting that a refused lookup proves non-commit. Verify the lookup-specific race, a committed original after restoration, and no new UUID/duplicate publication.

### CR-2 — A hung notification open blocks every later open through refresh and pause/resume

**Location:** `src/components/employee-mobile/messages.tsx:19,24,27–28`.

The notification-open fetch/body read has no client deadline. Its abort controller is only cancelled on view/selection cleanup. `opening` is set before the await and cleared only in its finally block; all subsequent normal clicks prevent native navigation and return while `opening` is truthy. Private pause, read expiry, Refresh, and a successful fresh same-page read do not cancel/reset this independent request.

**Reproduction paths from the source:** (a) On a ready Notifications page, hold `/api/employee/messages/open/<id>` indefinitely (including the case where headers arrive but the body never completes), then click a notice. Without blur or refresh, there is no deadline to leave the opening state and every later ordinary notice click is intercepted and ignored. (b) Repeat, but blur/focus or refresh the private page read while leaving the open request held. The list becomes current again, but clicking that or another notice remains a no-op and the footer keeps “Opening current details…”. The current-source API's database timeout cannot bound a stalled browser transport/body. The user must navigate out to dispose the component, change pages, or reload; the visible Refresh recovery does not recover opening.

**Required outcome:** bound the entire open operation, cancel/fence it when its private lifetime is released, and ensure only the matching request clears busy state. A delayed old response must not navigate after cancellation or a new open. Verify a held open across pause/resume and refresh, then successful opening of another notice without leaving the page. This finding is a new mobile path; the canonical redirect opener does not own this client busy state.

### CR-3 — OPTIONAL updates lose the independently permitted Mark as read action

**Location:** `src/components/employee-mobile/messages-view.tsx:28`.

The ternary offers ACKNOWLEDGE for every acknowledgement mode except NONE. For an unread OPTIONAL update it consequently removes MARK_READ entirely. Users can only leave it unread or create an acknowledgement receipt, although the canonical service permits marking OPTIONAL content read and the incumbent desktop detail exposes that action (`src/lib/communications/service.server.ts:275`; `src/components/communication-detail.tsx:110,146`). These are distinct user facts and commands. This also affects every employee-authored TodayTeam message, since this composer always publishes OPTIONAL.

**Personally observed render reproduction:** statically rendered the actual `MessageDetail` with `acknowledgement:'OPTIONAL'`, `ownReadAt:null`, `ownAcknowledgedAt:null`. Its only reading-action button was `Acknowledge update`; `Mark as read` was absent. The existing browser scenario verifies NONE for Mark as read and REQUIRED for acknowledgement, so it misses the OPTIONAL parity case.

**Required outcome:** preserve the separately permitted own Mark as read action for OPTIONAL content without making acknowledgement compulsory to organize unread items. Keep REQUIRED content on its explicit acknowledgement path and NONE content free of acknowledgement actions. Verify all three modes and that OPTIONAL Mark as read does not create an acknowledgement receipt.

## Minor

### CR-4 — A partial zero-item page also asserts that no current items exist

**Location:** `src/components/employee-mobile/messages-view.tsx:19–20`.

With `partial:true`, `items:[]`, empty search and All filter, the view displays both “Some current notices couldn’t be checked” and “There are no current items on this page.” The latter claims a confirmed absence from an incomplete observation. This is page-scoped, not an all-history claim, and the preceding warning reduces the severity, but it still contradicts the source state.

**Personally observed render reproduction:** the actual component's static output included both sentences above and the heading “No matches on this page.” Use unavailable/unchecked wording when a partial observation has no verified matches; reserve the confirmed-empty sentence for a complete page.

## Declined to judge

- Production readiness, hosted environment custody, deployment, activation, assembly with current development, and release authorization: excluded by the authorized scope; local evidence cannot satisfy them.
- Physical-device behavior, assistive-technology acceptance, and every captured pixel: no personal device/AT run or exhaustive image inspection was performed. Independent UI/QA remains separately authoritative.
- Pending broad verification results: root/independent QA own those runs; this report does not infer their outcome from the affected browser result.
- Historical handoff application hashes, old screenshots and previous completed Employee batches as newly verified results: read as provenance, not freshly reproduced acceptance.
- A source/index change that produces a partial update page with an initial keyset boundary: inspected and consciously not promoted to a material finding here. Current item permission is rechecked and the result is labelled partial; a cursor alone does not authorize content. This does not certify every possible pagination interleaving.
- Stale compose audience preview after source changes: consciously not treated as an authorization bypass. Publication re-observes and compares the canonical fingerprint/day under guards; changed audience is refused and the user must review again. A separate hung preview has an edit-to-cancel recovery path and is not included as another material finding in this report.
- Wholesale reformatting of compressed source and generic style preferences: not a release finding. Findings above concern actual behavior, not style or specification silence.

## Readiness and ownership

Engineering recommendation: correct CR-1 through CR-3 and obtain this author's targeted closure. Security position: retain all current role/session/workspace/source/module and activation controls; CR-1 is a recovery-integrity defect, not justification to bypass those controls. Governance recommendation: **NO-GO for batch acceptance while Important findings remain open**; no policy exception or risk acceptance is inferred. Implementation owner is the active communications root agent; next gate is corrections after owned runtime teardown, then frozen affected evidence and independent author verification. Remaining mandatory broad/QA/UI gates still apply.

No changes were made to application/tests, index, HEAD or branch during this review. HEAD was rechecked as `f7e331a7859ef55400eb1ce1e6420d4b5a9fdff9`. An untracked `docs/execution/employee-mobile-communications/` directory appeared from concurrent work and was not touched by this reviewer.
