# SCRUM-187 — conversations backend / Claude UI handoff

## Status and ownership

Codex owns this additive backend; Claude owns all presentation. Detached checkout:
`/Users/josek0514/.codex/worktrees/nevora-communications-20261111`, based on fresh
`origin/development` `0317598ae6886bc964bbd6bb5c1bbbd3add46069` from `JoseK0514/NEVORA`.
The implementation is local, not deployed or merged. No UI branch was imported.

**D04 / SCRUM-58 remains a release blocker.** Every read/write requires the existing
invocation-owned loopback PostgreSQL name AND disposable ownership comment. A flag
cannot enable this on staging or production. No conversation retention interval,
automatic purge, export policy, legal-hold implementation or policy approval is
invented here. Existing attendance/payroll retention does not approve chat retention.
The schema may be provisioned additively; that does not activate conversations.

CPO: explicit direct/scoped groups, bounded text, readable history and unread/mute.
CTO: separate storage and transactional operation receipts; no dependency/provider added.
CISO: current sign-in, Company Access, employee lifecycle, location and explicit
membership on every request. Owners have no implicit access to private conversations.
Governance/Program: backend qualification is separate from D04 approval, Claude UI,
combined owned acceptance, hosted integration and production authorization.

## Client integration

Use `src/lib/conversations/client.ts` and types in `types.ts` rather than inventing
response shapes. `model.ts` is browser compatible; `*.server.ts` stays server only.
`wire.ts` validates exact response fields, identities, pagination, bounds and lifetime.
The Next handlers are thin and contain no company/actor selectors.

All endpoints require normal NEVORA sign-in, `X-Nevora-Conversation: 1`, current
company Updates module, same-origin fetch metadata and no URL query parameters.
POST requires same-origin `Origin` and JSON, with **16 KiB actual streamed bytes**.
Responses are `Cache-Control: no-store, private`, `Vary: Cookie`, no-referrer, nosniff.
Never put employee/company/session identity in an admission payload.

| Method | Endpoint | Body / purpose |
| --- | --- | --- |
| GET | `/api/conversations/context` | First context/authority, no body |
| POST | `/api/conversations/query` | `{kind:"CONTEXT",employeeCursor:null,locationCursor:null}` or `{kind:"INBOX",cursor:null,archived:false}` |
| POST | `/api/conversations/[conversationId]` | `{kind:"DETAIL",conversationId,membershipEpoch}`; exact path/body identity |
| POST | `/api/conversations/history` | `{kind:"HISTORY",conversationId,membershipEpoch,cursor:null}` |
| POST | `/api/conversations/commands` | One canonical command below |
| POST | `/api/conversations/operations/[operationId]` | **Original unchanged canonical command**, matching path operation ID; lookup only |

The client uses POST context for bootstrap too. `queryConversations(context,null)`
gets current `authority`; pass it to subsequent private reads. Ready resources
contain `state:"ready"`, matching `kind`, `authority`, `observedAt`, `validForMs`.
Clear private data, cursors and prepared commands on account/company/session changes;
discard expired/mismatched responses and re-bootstrap. Keep receipts separate from
private resources. Use a monotonic TTL; the transport subtracts elapsed request time.
Resource TTL is at most 15 seconds, limited by session/Company Access admission.
A `blocked` result clears private presentation. `unavailable` is retryable read
failure, never an empty inbox. `invalid_cursor` requires a fresh first page.

Context returns management capability, whether actual staff-task storage is installed,
100 locations and **up to four people** per page, each with eligible location IDs. Fetch both
cursor streams until exhausted; do not restart a finished stream while paginating
the other. IDs are at most 200 UTF-8 bytes and eligibility is bounded at 1000 locations.
Larger/unsupported catalogs fail closed. Context is a contact selector within current
shared locations, including self (exclude self from peers in UI). It is not a global
directory. People pages shrink further against actual serialized UTF-8 bytes, including JSON
escaping, while preserving exact IDs and resumable cursors. Responses exceeding that ceiling return 503.

Inbox returns at most 25 conversations, `nextCursor`. Default `archived:false`;
query `archived:true` separately. History returns at most 25 messages in **descending
sequence order** (newest first), plus `nextCursor` for older messages. Reverse each
page as needed to render chronological bubbles; deduplicate by message ID. Sequences
are decimal bigint **strings**, never JS numbers. Cursors are encrypted, authenticated,
opaque, five-minute tokens bound to workspace, actor/current authority, resource and
membership epoch. A database-owned key supports different server instances. Do not
decode/rebuild them or include them in links, telemetry or local persistent caches.
Inbox cursors freeze a committed workspace stream watermark; new activity cannot skip
an older conversation during pagination. History freezes its initial message head.
Refresh the first page to see new activity. Membership/scope changes can remove
otherwise paginated results immediately; cursors confer no authority.

## Commands and recovery

Each command has `kind`, a client UUID `operationId`, the context `authority`, and
client UUID `conversationId`. Normalize with `parseCommand` before retaining/sending.
A new `operationId` means a new user intent. Retain the normalized original command
in memory until its outcome is resolved; avoid browser persistence of message bodies.

Creation fields:

- `CREATE_DIRECT`: `locationId`, `peerId`, `context:null | {kind:"SHIFT"|"STAFF_TASK",id}`.
- `CREATE_GROUP`: `locationId`, nonblank `title` (120 code points), `memberIds` (1–19
  distinct peers, excluding the actor), same optional context.

All remaining commands require returned `membershipEpoch` plus `expectedRevision`:

- `SEND`: UUID `messageId`, plain-text nonblank `body` (2000 Unicode code points).
- `ADD_MEMBER` / `REMOVE_MEMBER`: `employeeId`.
- `RENAME_GROUP`: `title`.
- `SET_ARCHIVED`: `archived:boolean` (conversation-wide group archive).
- `MARK_READ`: decimal string `throughSequence` (not beyond persisted latest).
- `SET_MUTED`: `muted:boolean` (only the actor's current membership).
- `LEAVE`: no extra fields.

Any active allowed role may start a direct conversation. Only current Owners/Managers
create/manage groups; ordinary members can leave. Removing self uses `LEAVE`.
The last current group manager cannot explicitly leave. External departure may orphan
a group: no hidden Owner takeover; use a replacement group. Direct conversations have
no group membership/admin/archive controls. No edits, deletes, attachments, provider
push, SMS/email, scheduling or rich text are in this version.

Group revisions change for audience/title/archive commands, not ordinary sends.
A send prepared for a changed audience conflicts and must be reviewed after refresh.
A group with a stale/ineligible member also rejects sending until management removes
or replaces that membership. Direct deduplication includes location, both employee
lifecycle generations and optional context. The returned direct ID may differ from
the proposed ID: use the receipt's canonical `conversationId`.

A committed receipt includes only `status`, `operationId`, `kind`, canonical
`conversationId`, `requestedConversationId`, `revision`, actor `membershipEpoch`;
SEND additionally returns `messageId` and `sequence`. No body, roster, cursor key,
session hash or policy acknowledgement appears in receipts.

`submitConversation` submits exactly once. Lost/malformed responses produce
`{status:"outcome_unknown",operationId}`. Keep the original intent pending and call
`recoverConversation(originalCommand)` explicitly. Recovery never inserts. Absence of
a receipt is still unknown; never silently resubmit with a new UUID or show success.
Same actor/session + same operation + same normalized payload recovers one receipt;
changed payload conflicts. If an explicit retry is chosen after recovery, resend the
same original command/UUID, not a new operation. Revoked sessions/membership cannot
recover private results. Successful LEAVE alone allows its still-current actor/session
in the same company/location to recover its own identity receipt after leaving.

HTTP: committed/unknown=200, invalid=400, unauthenticated=401, blocked=403,
module-off=404, conflict=409, unavailable=503. Unknown is a business state, not success.
Do not infer commit absence from any transport failure.

## History, unread and source privacy

Current explicit membership is mandatory even for Owners. An employee's role/active
lifecycle generation is stored on each membership; removal/deactivation or role change
revokes old access. Re-add starts a new membership UUID and exposes only messages after
joining. Location eligibility restoration may restore a still-current membership;
explicit membership removal cannot. Context badges never grant message access.

Unread excludes own messages and pre-join history, and viewing never marks read.
After the visible messages are actually presented, explicitly issue `MARK_READ` to
the highest visible sequence. Progress is monotonic. `SET_MUTED` suppresses the UI's
attention indicator only; unread/history still exist. Show attention when `unread>0`
and not muted/archived. There is no global bell/provider enqueue in this implementation.

Messages expose `persistedAt` and current eligible members' explicit `readBy` progress.
Display **persisted/sent in NEVORA** and **read** only. There is no evidence of device
or provider delivery, queued delivery, employee policy acceptance or required
acknowledgement. Never label these as delivered/acknowledged. Existing structured
updates, required acknowledgements and notification contracts remain independent.

Root topic is immutable. Creator must currently access the same-location source.
Per reader, context is null, `{kind,available:false}`, or `{kind,available:true,id,label}`.
Unavailable context contains no source ID/title. Source reassignment/revocation is
rechecked; conversation membership does not override source permissions. Route using
typed IDs and real integrated UI destinations; no task href is invented.

SCRUM-185 is not merged into this checkout. Missing task storage yields
`taskContextAvailable:false` and refuses task attachment while ordinary chat works.
The integration tests use its **actual pinned migration as fixture only**; provenance
is in `src/test/integration/fixtures/conversations/README.md`. When assembling both
features, use actual SCRUM-185 source, regenerate the combined canonical manifest and
repeat qualification; this fixture does not authorize/replace that integration.

## Database and release controls

`0062_conversations.sql` is FINAL, after Company Access. It adds conversation roots,
membership episodes, immutable messages/events/operation receipts and per-workspace
stream/key storage. No existing announcement table changes. Existing recorded APP
gets only SELECT/INSERT/necessary UPDATE plus the invoker lifecycle function. Fresh
bootstrap grants the same function and removes DELETE and append-only UPDATE. WORKER
gets no new relations/functions; no SECURITY DEFINER or role ownership broadening.

Transactions serialize on workspace, sorted employees/catalog/source locks, root,
then session, followed by fresh authority and a response fence. Conservative table
locks bound authorization races for small teams; 1.5 s lock, 2.5 s statement and 8 s
whole-request deadlines bound contention. No throughput/load claim is made. A response
fence can suppress a committed write: recover its durable operation rather than infer
rollback. Receipts/events/content stay immutable. No destructive rollback/purge path.
Rollback application routing/use additively; retain all durable data pending approved
retention/hold policy. Do not DROP or truncate these tables as a rollback.

Evidence and remaining gates are recorded below after final qualification. Backend
readiness does not make the entire Jira issue Done: Claude UI, combined acceptance,
SCRUM-58/D04 policy disposition, actual hosted integration and authorized release remain.

## Qualification (November 11)

Local evidence directory outside source: `/Users/josek0514/.codex/conversations-evidence-20261111`.
Initial default baseline: 11,941 passing +857 configured skips. Feature-focused model,
transport/client/cursor/schema plus migration authority: 21 passing. Actual owned
PostgreSQL conversation suite: 26 passing after review regressions. Actual owned new-company provisioning
suite: 21 passing. TypeScript passes. Repository lint passes with the pre-existing
anonymous default-export warning in `services/hosted/neon/workforcemonitor.entry.ts`;
changed-file lint is clean. Canonical manifest and development inventory checks pass.
Release engineering is separately rechecked after adding the mandatory conversation
SQL step to the existing `release-postgres` CI job; it retains JSON evidence. No gate
is skipped or weakened. Hosted CI has not run for this detached source.

An initial provisioning run failed because the generated manifest was stale after
SQL edits; regenerating from the final SQL restored all 21.
The owned guard negative case restores its original database ownership comment in
`finally`, allowing custody-checked teardown; no existing database was used.
Final source-bound build, regression count and review disposition follow in the
qualification record committed with this handoff. No live activation is implied.

## Review disposition

Fresh whole-change review of `238597cb134f4fce1507606aa3101477b45299f1` identified
four Important findings. All five new owned-SQL scenarios failed on that source,
then the fixes made all 26 conversation SQL scenarios pass:

1. R1: fresh exact location-footprint comparison at every authority check rejects
   employee/lead eligibility revocation both before projection and at response fence.
2. R2: recovery verifies the original command authority against the current employee
   lifecycle before any receipt lookup, and the LEAVE fence binds the stored membership
   generation too, preventing rebinding an old intent to a fresh authority. The valid
   same-lifecycle LEAVE exception stays.
3. R3: prior-operation membership authorization precedes payload comparison. Exact and
   altered former-member replays are blocked, including after a fresh rejoin episode.
4. R4: people pages shrink according to actual serialized UTF-8 JSON, preserving exact
   quoted/backslashed identifiers and a cursor after the last returned person.

Deferred minor: complex existing-style one-line SQL/service/test formatting remains;
no runtime defect was attributed to that style. No second reviewer seat was used.
The reviewer did not certify UI/mobile/accessibility, live policy/hosted readiness,
combined staff-task deployment, high-volume throughput or the documented orphan-group
product choice. These are retained gates/limits, not omitted acceptance claims.

Read-request authority is deliberately server-derived rather than a second browser
credential. Commands/recovery require the context token; supported clients bind all
subsequent private response authority. Current sign-in, original admission, explicit
membership and location/source authority remain mandatory on the server.

## Final qualified source

Runtime checkpoint `75498984c367784185a2b84abbc9c69f860703b4` passes 11,958 default tests +857 configured skips
with two workers,26 owned conversation SQL tests,21 provisioning SQL tests,21
focused/migration checks and229 release-engineering checks. TypeScript and changed-file
lint pass; exact-source production build is clean and unchanged. The standard parallel
run's unrelated migration timeout and successful isolation/full bounded rerun are
retained in [the qualification record](../qa/2026-11-11-conversations-backend.md),
along with all review corrections, decisions and the formatting minor. Final subsequent
commits contain documentation only; runtime hashes stay identical. No hosted CI, UI
acceptance, live activation or production result is claimed.

## Actions / development integration follow-up

Jose authorized Actions qualification and development integration, then explicitly
approved coordination with “Fix GitHub Actions setup failures” for one combined
candidate. That chat owns candidate publication, Actions and the protected dev update;
this chat owns SCRUM-187 verification and Jira. Main, production, and D04 activation
remain outside that authorization.

`511921caf19ba0d16f4cc6072850fe8da2574403` fixes the six missing conversation entries
in the explicit onboarding runtime inventory. The source-bound complete backend
acceptance passes all seven stages: inventory contract, manifest,209 owned onboarding
cases,514 Company Access foundation cases,36 Company Access exchange cases, worker
enrollment and managed-workforce receipts. Evidence lives under
`/Users/josek0514/.codex/conversations-evidence-20261111/actions/onboarding/`.
A first local run failed because the chosen runtime lacked pg_dump; selecting existing
PG16.15 client tools resolved the tool prerequisite, with no test/source relaxation.

The conversation SQL suite now runs all26 cases twice: optional task storage absent
and installed (**52 passing, zero skips**). The installed path prefers the actual
canonical BASE staff schema and only loads the pinned fixture when absent. Absence is
explicitly simulated by temporary table rename in invocation-owned fictional databases;
no application activation flag or migration classification is added. The source-topic
test reuses installed schema instead of attempting to create its tables again. The
matrix first reproduced two failures against the earlier fixtures, then passed52/52;
TypeScript and fixture lint pass. Combined-source Actions must still rerun on the final
assembly; these local results are not hosted acceptance.
