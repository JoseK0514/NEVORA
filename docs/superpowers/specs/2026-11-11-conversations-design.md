# SCRUM-187 — web conversation backend

## Intent and source

Implement the backend/data/auth/client contract for direct and group workforce
conversations. Claude owns the UI. Jose's November 11 request authorizes this
implementation; it does not supply the missing D-04 retention approval or
authorize activation, hosted migrations, provider sends, or production.

Source: fresh `origin/development` 0317598ae in the NEVORA repository, detached
worktree `nevora-communications-20261111`. SCRUM-185 is separately implemented
in `/Users/josek0514/.codex/worktrees/nevora-staff-tasks-20261111`, repository
`https://github.com/JoseK0514/Fuel-Scheduler-.git`, immutable commit
`21a9008f51091f711a96ad52e56eefdd90ac1f44`. Its fixture source is
`db/migrations/0061_staff_tasks.sql`, SHA-256
`ebe9e46d3519fe0bf7ab25eaf380524273e4297e836332d2a4efcc2fd5664f17`.
Read it with `git -C <staff-worktree> show <full-sha>:db/migrations/0061_staff_tasks.sql`;
do not import implementation commits or modify that checkout.

## Approach and boundaries

Use an additive conversation domain alongside structured communications. Reusing
announcement revisions as chat messages would change acknowledgement/audience
semantics. A third-party chat service adds a provider and privacy dependency not
requested here. Keep the existing SQL executor, Company Access, session guards,
HTTP admission, owned PostgreSQL harness and private-response lifetime conventions.

The implementation remains subject to the existing
`communicationDevelopmentAllowedSql()` guard: real PostgreSQL loopback, the
approved disposable database prefix and the invocation-owned database comment.
An environment flag alone cannot enable it. Recheck in business transactions,
not only HTTP. No purge, edit-message or destructive delete API; immutable message,
event and receipt storage. SCRUM-58 remains an activation blocker. Approved public
attendance/payroll retention facts do not establish conversation retention.

No UI/native work, attachments, SMS/email/push, background delivery worker,
automatic Rondo writes, or provider-delivered claims. SQL is applied only to
new isolated fictional databases during verification.

## First-version product decisions (implementation choices, not policy approval)

- Each conversation belongs to one current active workspace and location.
- Active Owners, Managers, Leads and Employees may start a direct conversation
  with another currently eligible person at that location. Manager eligibility
  uses current Company Access, not a Manager title alone. Employee/Lead eligibility
  uses current home/eligible locations. Owners remain subject to explicit membership.
- Owners/Managers create and manage groups. Creator plus 1–19 selected peers;
  at most 20 current members. No implicit Owner access to unjoined conversations.
- Group managers may add/remove people, rename, archive/reopen. A current member
  may leave a group; the last current management member cannot explicitly leave.
  External departure can leave a group without a manager. Remaining members retain
  authorized history; posting pauses while stale members remain. Create a replacement
  group rather than granting an Owner implicit private access.
- Direct membership is the original pair. Deduplicate direct creation by current
  participant lifecycle generations, location and optional topic reference. Repeated
  creation returns the canonical conversation identity, not a duplicate thread.
- Membership has a UUID episode and employee lifecycle generation. Removal or
  employee deactivation/role-generation change prevents reads/sends immediately.
  Re-adding a person creates a fresh episode starting after the current last
  sequence; it does not disclose pre-join history. Direct creation after a lifecycle
  change creates a fresh thread. Restored ordinary location/scope eligibility may
  restore a still-current explicit membership; explicit removal never does.
- Messages are immutable, plain text, 1–2000 Unicode code points. Group titles are
  1–120 code points. There is no HTML execution or automatic acknowledgement.
- In-app status is persisted plus explicit read-through progress. Queued/provider
  delivered/acknowledged are unsupported, not inferred from a history read.
- Per-member mute suppresses the in-app attention indicator, not unread counting
  or history. No global notification preferences or external channels are changed.

## Data and concurrency

Migration 0062 adds roots, memberships, messages, immutable membership/change
events, actor/session operation receipts and a workspace stream counter. Reserve
0061 for the separate staff-tasks work. Append 0062 to the canonical FINAL order
after Company Access, so its authority dependencies exist. Bootstrap manifest and
migration-order evidence must reflect the addition.

Use an invoker transaction function for atomic lifecycle changes. Existing APP
roles receive only required new-relation privileges; no WORKER grants, DELETE,
ownership, grant option or role-attribute changes. Triggers preserve messages,
events, receipts, immutable identity/topic/location, and membership history.

Follow workspace → sorted employees → location/eligibility/source → conversation
→ session lock order, with 1.5-second lock, 2.5-second statement and 8-second
request bounds. Workspace write serialization makes source/membership changes
and the stream watermark atomic. Recheck current role, company, location,
membership episode, settings revision and session after all blocking waits.
Revalidate private responses after database work; suppress results after authority
loss without pretending an already committed action rolled back.

Each deliberate command has one UUID operation ID and canonical normalized payload
hash. The actor/session/workspace receipt is unique. Same command retry recovers
the committed identity; changed payload conflicts. Send uses a client-generated
message UUID as well. Membership/settings revision changes invalidate a prepared
send so a changed audience cannot silently receive it; other sends do not change
that revision. Read/mute affect only the current membership episode.

## Pagination and display lifetime

Messages use monotonically increasing per-conversation decimal-string sequences,
25 rows per older-history page; never convert PostgreSQL bigint to JS Number.
The cursor binds conversation and membership episode. New messages cannot move
older sequence boundaries. Unread excludes own messages and pre-join history;
explicit read-through is monotonic and cannot exceed persisted history.

Inbox pages use a committed workspace stream watermark, and rank each conversation
by its last message/create order at that watermark. Subsequent sends cannot cause
duplicate/missing pages. Encrypt authenticated cursors with a random 32-byte
per-workspace database key (APP-only, not returned), AES-256-GCM and a five-minute
expiry; bind workspace, actor, authority and resource/episode. Restarting a server
does not invalidate pagination; no new environment secret is required.

People context uses up to four-person pages, trimmed to actual serialized bytes, and locations 100-row pages, preserving
exact legacy text IDs. All public resources have authority, server observedAt,
at most 15 seconds validForMs, no-store/private headers, and a 1 MB wire ceiling.
Claude must clear private content on expiry, offline/lost focus/logout and cannot
append pages from different authorities, conversation episodes or inbox snapshots.

## Workforce context

An optional immutable conversation topic is a typed SHIFT or STAFF_TASK reference.
Its location must match the conversation and the creator must currently be allowed
to see the source. Each reader receives source details only under their own current
source permission; otherwise a non-disclosing unavailable context. Shift assignment,
publication/release and task assignment changes are checked against current state.
No task/shift mutations or private Owner-note imports occur.

Staff-task reads use the reviewed SCRUM-185 table contract when installed; when
0061 is absent, context advertises unavailable and attaching a task is refused.
Tests use a source-pinned copy of the actual 0061 migration as an optional dependency
fixture, not invented task storage and not an automatic runtime import. Combined
task/UI/development assembly remains a separate integration gate.

## HTTP and client handoff

Provide `/api/conversations/context`, `/query`, `/commands`, `/history`,
`/[conversationId]`, and `/operations/[operationId]`. Normal current session and
proof required. `X-Nevora-Conversation: 1`. Commands and recovery carry context
authority. Reads derive authority from the current server proof; the supported
client checks returned authority against its current context, except context bootstrap. POSTs require same origin and JSON, actual UTF-8 ≤16 KiB;
queries and caller-selected employee/company/session authority are refused.

Typed results distinguish ready/committed, invalid, blocked, conflict, unavailable
and outcome_unknown. Post-dispatch transport/malformed response is unknown.
Recovery keeps the original operation UUID/payload and returns identity only under
current authority/membership; missing receipt is still unknown. No automatic retry
that generates a new action. Strict wire parsing binds the expected target and
disallows private server proof/key fields.

A successful LEAVE is the narrow membership exception: the same still-current
actor/session/company/location authority may receive/recover its own matching
LEAVE receipt after its membership ended. It contains only the requested identity,
kind and committed revision/episode, never message/member data. All other receipts
require current membership. A changed recovery payload conflicts, no receipt is
unknown, and lost actor/session/location authority still denies recovery. This
also governs the immediate successful LEAVE response fence; tests must cover both
normal completion and a lost commit response. REMOVE_MEMBER cannot target self;
use LEAVE so there is one explicit exception.

## Acceptance and remaining gates

Local tests must cover real PostgreSQL authorization, concurrent duplicate send,
membership removal/rejoin, deactivation, manager scope revocation across real lock
waits, unread/history/inbox pagination, mixed Unicode capacity, invalid/expired
cursors, module/policy hold, recovery after lost commit response, optional real
staff-task schema, and restricted APP upgrade/unchanged WORKER privileges.

Run baseline and final full default suites, typecheck, lint, actual owned SQL,
bootstrap/onboarding manifest, release-engineering regressions, source inventory
and a source-bound build where the existing harness permits it. Record failures
and source identity; do not substitute local results for hosted evidence.

Deliver a committed backend and Claude handoff. This does not complete Claude UI,
joint staging acceptance, D-04 policy approval, hosted migration, exact-SHA remote
CI or production authorization. Rollback disables new routes/UI while retaining
immutable records; do not drop tables as application rollback.
