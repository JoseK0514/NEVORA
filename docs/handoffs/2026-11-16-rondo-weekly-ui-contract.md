# Rondo weekly management — Claude UI contract

Backend/API source: detached `4d3603607615b20a306365fbd63820a756ec3b4c`
in the Codex NEVORA Rondo worktree. Jose approved the weekly backend design and
retained Claude UI ownership. Development is the acceptance release, held to
production standards; main/production require his separate approval.

This is a local, fictional-data API contract. The new API is implemented/tested;
it is not deployed or enabled. The model tool is the next backend task. Neither
this contract nor deterministic tests establish a50-case business intelligence
score. No paid calls, real records, publication or staff notifications are needed.

## Ownership and page

Claude owns client UI, client DTO parsing/tests, scoped styles and the page route.
Codex owns backend/schema/tool integration/hosting and combined real-API QA. Do
not modify backend, migration order, default flag registry or development/main.
Use the existing collaboration checkout and approved app/Direction B components;
read DESIGN.MD. Preserve company-knowledge UI4e0783ab. No new working branch.

Implement `/app/ai-manager/weekly`, with `?review=<UUIDv4>` opening the exact
private plan through POST below. This is the agreed UI target, NOT an existing
working route yet. Return the actual route commit before Codex qualifies model
citation links. Do not invent another link/path. Add a visible Rondo entry point.
The existing `public-response.ts` Rondo source-link allowlist also needs this
EXACT page/query/UUID shape; reject other paths, extra query fields and fragments.
Codex's forthcoming read-only tool will add optional typed `answer.weeklyPlans`
metadata and those trusted sources. Preserve old answer/context wire forms;
coordinate the new optional parser against the actual backend type when ready.

Gate the page to current Owner/Company and the parent advisor. Reuse the existing
Owner page admission and `withOperationalCompany`/existing workspace/location
read helpers for bootstrap; no new SQL or cross-tenant client identifiers.
The API remains authoritative for every read/action. Parent-off denies recovery.
When only weekly is off, expose minimal authorized historical recovery, not a
new comparison or approval. The flag property is `ownerAdvisorWeekly` and its
name is `NEVORA_OWNER_ADVISOR_WEEKLY_ENABLED`, default false.
Your UI base lacks the new registry property until assembly: read that exact
server environment name as `=== 'true'` for a UI prop without changing the
registry or enabling it. Keep the parent-authorized page reachable for recovery;
disable new weekly controls when the weekly prop is false.

## Exact source of DTOs

Import TYPES only from `src/lib/owner-advisor/weekly-contracts.ts` in the backend
candidate; copy a client-safe contract into your checkout if necessary without
importing server code. Read the actual file, not guessed DTOs. It defines
WeeklyCommand, WeeklyComparison, WeeklyPlanReview, WeeklyReceipt, WeeklyProgress
and WeeklyResult. Internal WeeklyExactTerms/claims/source rows never reach UI.
The real service and route tests are weekly-service.integration.ts and
weekly-http.integration.ts beside that file. They are reproducible fictional
fixtures, not proof of a hosted feature. Do not add new dependencies.

POST `/api/owner/advisor/weekly`; `Content-Type: application/json`, header
`x-nevora-owner-advisor: 1`, same-origin browser Origin/current session. No query
parameters and no caller workspace/Owner/assignment arrays. Actual body max16KiB
UTF-8; one20-second server deadline. JSON is private/no-store, Cookie-varying,
nosniff/no-referrer. No model key is required for this workflow.

Generate UUIDv4 requestId ONCE per deliberate comparison/apply/decline. Preserve
the exact command/ID while uncertain; do not automatically mint another write ID.
Read/check are observations and may use a new requestId. UUIDs are lowercased;
SELECTED location IDs are unique, sorted, active, current workspace IDs, max20.
Monday is canonical YYYY-MM-DD. Mode/scope/week changes require a NEW comparison.

```json
{"op":"compare_week","requestId":"UUIDv4","weekStart":"2026-11-16","mode":"FILL_GAPS_ONLY","locationScope":{"kind":"ALL"}}
```

SELECTED replaces locationScope with `{"kind":"SELECTED","locationIds":["actual-id"]}`.
`BUILD_WEEK` is explicit Owner selection. It can replace only eligible generated
Draft rows. Explain this before requesting it; manual/history-protected work is
preserved. Published/archived/unselected/inactive/setup locations remain visible
and are excluded explicitly. Existing commitments across dates/sites/adjacent
weeks remain eligibility inputs. Compare at most2 DIFFERENT alternatives; never
combine options or call a bounded partial/exhausted search proof of impossibility.

Every success has state, comparison/review/readReceiptId/receipt/progress (nullable),
authority, observedAt ISO instant and validForMs>0<=15000, capped by session/context
validity. Use the existing private-lease behavior: clear private details and disable
actions when validity ends, upon403, or when authority changes. Do not retain old
names/text behind an unavailable/revoked state. Render all source text as text.

## Comparison and full review

state ready + comparison: exact summaries/baseline/scope/location states, immutable
option IDs/digests, original observation, search/time/resource/fairness basis.
Also inspect comparison.state: unavailable has INPUT_LIMIT/RESULT_LIMIT and no
options. A ready request is not necessarily a complete or apply-eligible plan.

Display baseline versus each alternative, additions/removals/preserved count,
remaining gaps and omitted diagnostic totals. Coverage COMPLETE is a coverage
search result; hard-rule clearance also requires applyEligible and no blocking
inspection reasons. Preserve rejection/advisory/retained-assignment provenance;
do not attribute a rejected candidate's failure to a listed valid worker.
Monetary costs are UNAVAILABLE. Minutes are scheduled business WALL minutes, not
worked elapsed time or payroll amounts. Fairness uses canonical targets/preferences
and8-week weekend history; show its known/unknown basis, not universal equity.

Open the COMPLETE exact option via:

```json
{"op":"read_week_plan","requestId":"UUIDv4","reviewId":"actual option id"}
```

state ready + review includes every dated addition and every eligible removal,
full display names/locations/position/lead status, exact row/episode identity for
removals, digest/expiry and complete counts. comparison carries the immutable
parent baseline and ALL location/exclusion metadata. Validate the full response
and count/array agreement; never truncate an approved set to fit the UI.
A readReceiptId is issued ONLY on an apply-eligible full read. Repeated reads give
the same handle. Summaries/model text contain no read handle and cannot approve.
state stale withholds plan details: compare again or decline; no stale approval.

Offer an explicit acknowledgement after the full set/gaps is available, e.g.
"I reviewed all proposed changes and remaining gaps." This proves an explicit
review path/acknowledgement, not that a person understood each row. Empty/no-change,
invalid, worsened-coverage, removal-only and retained-rule-blocked plans have no
apply handle. Inspection reasons are explicit; keep the current baseline visible.

## Apply, decline and recovery

```json
{"op":"apply_week_plan","requestId":"UUIDv4","reviewId":"actual option id","termsDigest":"actual digest","readReceiptId":"actual handle","acknowledged":true}
```

Whole set only. No partial arrays/edits. API saves exactly the reviewed draft in
one transaction, without re-planning. state saved returns original receipt and
fresh progress when permitted. All saved scheduling remains DRAFT; publication
is a separate existing Scheduling action. No staff notification is sent.

```json
{"op":"decline_week_plan","requestId":"UUIDv4","reviewId":"actual option id"}
{"op":"check_week_plan","requestId":"UUIDv4","reviewId":"actual option id"}
```

Decline records private terminal disposition, zero schedule writes. An Owner may
decline an obsolete proposal; current original Owner/session custody is still
required. Another option can be reviewed. Apply-versus-decline has ONE winner.
Identical apply retries return the original receipt; another apply ID conflicts.

Check returns saved/declined/not_saved/unavailable, not a new plan. saved receipt
includes operationId/reviewId/termsDigest/savedAt/counts/created parent IDs. Exact
row/episode custody remains server-side and is checked there. Match receipt
operationId to the pending apply before claiming that specific operation saved.
Progress distinguishes draft/published/mixed/changed/unavailable with observed
coverage/counts. A receipt proves the historical draft save, not attendance,
current coverage, publication or business success. Withdrawn/expired context or
weekly-off may permit only the original content-free historical receipt, with
null progress/review/comparison. Revoked authority denies even receipt metadata.

An interrupted/503 cancelled apply may already have committed. Keep its exact
command and check this same review; NEVER label a failed request not_saved.
Only a successful check can report not_saved. unavailable retains uncertainty.
An explicit retry resends the SAME original apply command/ID. Do not silently
approve, create a new comparison/write ID, or re-plan during recovery.

Persist pending APPLY metadata across reload in sessionStorage (reviewId,
requestId, termsDigest, readReceiptId, acknowledged and authority), without names,
assignment arrays, source text or credentials. Restore it as uncertain and check;
do not automatically repeat a business write. Clear private display on403/session
change and do not reuse foreign-session custody. Test reload and lost responses.
A normal URL review load does not automatically compare/apply/publish/decline.

Errors:400 invalid fix input;403 forbidden clear private content;409 conflict
refetch/review deliberately;429 limit retained capacity;503 disabled/unavailable/
cancelled/busy/prior_attempt_failed preserve possible pending custody. A missing
schema is unavailable, never a successful empty schedule. No background monitoring
or automatic weekly generation/publication is installed by this workflow.

## Required UI evidence and return

Use fictional mocks matching the actual DTOs in your checkout until combined
backend assembly. Label them MOCKED. Root will run real-API combined app QA later.
Cover320/390/430/768/1440, keyboard/focus, loading/error/empty/no-change/partial/
exhausted/inspection-only/stale/full review/acknowledgement, both modes and scopes,
protected removals, source/context revocation, expiry, uncertain-save/reload/check/
same-ID retry, saved-versus-published/changed/unavailable and weekly-off recovery.
Do not claim EN/ES model semantic qualification from scripted UI or mock outputs.

Return an exact local UI commit, clean diff/handoff, route, tests actually run,
mock-versus-real disclosure and screenshots/logs. Do not push, merge/deploy, enable
real flags, read production credentials/customer data, call paid models or send
notifications. Codex will reconcile source and verify combined real API before
any development integration; production still requires Jose.

## Task6 model-answer addition

The current backend adds the client-safe `WeeklyModelComparison` type to
`weekly-contracts.ts` and optional `AdvisorAnswer.weeklyPlans`. It extends the
comparison with `comparisonId` (UUIDv4), server `occurrence` (0–7), `expiresAt`,
`sourceFence` (64 lowercase hexadecimal characters) and each option's trusted
`reviewHref`. It contains summary metadata only. No full terms, readReceiptId,
apply command or new authority is present. `weeklyInspectionRefs` is server-only
cached custody and is stripped from every public answer. Preserve legacy optional
answer fields and context behavior. Claude owns the client parser and citation
allowlists; accept exact private weekly and knowledge-version routes only.

A citation's destination is the complete Owner-only review, whose real freshness
and acknowledgement checks remain authoritative. Task6 scripted-provider tests
exercise response custody, not UI rendering or real-model semantics. Root found
the old source allowlist rejected these new real routes and queued the concrete
client-only follow-up in the existing Claude chat. Final UI/source and combined
browser verification are still required. Canonical day-end gaps can contain
24:00 as an end boundary; preserve valid overnight semantics and reject it as a
start boundary in the UI parser.

## Fresh-review recovery and admission clarifications

Saved progress now optionally includes `coverageScope: { includedLocationIds,
changed }`. Coverage measures only the originally INCLUDED locations; already
published/archived exclusions do not silently enter its denominator. Later scope
changes mark progress `changed`; an unmeasurable original site gives null
coverage. Show the reviewed location count and scope-change meaning. Claude
implemented this additively in0603f723, preserving older responses.

A real source INPUT_LIMIT can precede source/search admission. Its unavailable
comparison has no options or measurements; empty fairness counters are unknown
placeholders and must not be shown as observed counts, nor described as an
exhausted search. The whole cross-location source remains required, so choosing
fewer locations does not necessarily resolve raw source capacity. The original
request ID recovers its historical limit observation for at most five minutes or
an earlier context boundary; a new deliberate request re-evaluates changed
inputs. Its private source_version is NULL; the model cannot use it as current
source-bound weekly evidence. No truncated rows or substitute source hash exist.

Weekly-derived user/assistant turns are omitted from reusable ordinary history
to enforce their session/source/context/time boundary. The original answer
remains available only through its guarded original request, and complete plan
review stays in the private weekly route. Ordinary prior history is preserved.

## Final B2 handoff

Claude UIb92e1bbc is assembled locally with the exact backend;5 real authenticated
browser tests pass, including both engines for knowledge/weekly and Chromium
planning-off recovery. The raw source-bound reports are in the program evidence
manifest. The selected style is B2; historical B1 review labels are not a request
to switch styles. No new UI work or push is requested. Shared integration and
hosted acceptance remain separate; actual-model50-case scores are unrun.
