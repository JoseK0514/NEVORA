# 43 Backend Engineer — API contracts behind the Owner and Manager UI

**Verdict.** The read routes are well guarded. They are same-origin with marker headers, send `no-store`, give each read a validity window, and fail closed ("unavailable", never a fake zero). The weak part is the contract itself. The UI has to read names, places and times out of English sentences. Counts are worked out in the browser from several reads that don't always agree. Locations are filtered on some reads and not on others. And at around 250 employees the reads stop working entirely, because no read is paginated. Each item below is a short contract proposal for Codex. Nothing was changed.

## Recommendations

1. **Give each action item structured fields, so the UI stops reading meaning out of English text.**
   *Why:* The UI takes the person, place and time out of server text with regular expressions: `itemPerson` (`src/lib/action-center/present.ts:44-47`), `/\bat (.+)$/` on titles (`premium-home.tsx:192`, `manager-inbox.tsx:193`, `present.ts:85`), `detail.split(" · ")` (`manager-inbox.tsx:189,420`), and title and detail rewrites (`present.ts:73-74`). If Codex changes the wording, or adds Spanish (an English and Spanish product), names quietly disappear and groups merge.
   *Contract:* add these fields to `ActionItem`:
   - `subject?: {employeeId, name}`
   - `place?: {locationId, name}`
   - `window?: {date, startAt?, endAt?}`
   - `submittedAt?`
   - `open?: {positionName, missing}[]`
   - `messageKey` and `params`, for wording the UI writes itself

   Keep `title` and `detail` as a fallback for one release.
   *Impact:* High. *Effort:* M. *Owner:* Backend (the UI then drops `present.ts` parsing).

2. **Apply location scope the same way on every manager read.**
   *Why:*
   - Filtered by the manager's locations: Today (`today.server.ts:16,31`) and Clock monitor (`clock-monitor.server.ts:15,27`).
   - Not filtered, so they cover the whole workspace: the action center's four sources (`attendance-review.server.ts` and `manager-dashboard.ts` don't filter by location at all; `timecards/service.ts:87-89` only filters by workspace), the Finder (`api/manager/finder/route.ts:16`) and Updates (`communications/service.server.ts:229`).
   - The request details for out-of-scope items are dropped without any signal (`action-request-facts.server.ts:40` returns the items unchanged in its `catch`).

   So a manager limited to some locations gets a Needs-you count that mixes "my no-clock-ins" with "everyone's requests". This doesn't show yet only because scope storage is still `legacy`, where every manager can see every location (`manager-location-scope.server.ts:9-10`). It becomes a real bug the day that storage is installed.
   *Contract:* every read in the Owner and Manager app uses `managerLocationsSql`. Every response carries `scope: {kind: 'ALL' | 'LOCATIONS', locationIds}`, so the UI can say "Showing Main Office".
   *Impact:* High. *Effort:* M–L. *Owner:* Backend.

3. **Have the server own the single "Needs you" number and its parts.**
   *Why:* The `counts` the action center returns (total and per category, `action-center/project.ts:7`) are not the Needs-you number. Needs-you is worked out in the browser (`needs-you.ts:23-31`, `inbox.ts:32-43`). The numbers already disagree in three places:
   - **Home vs the badge.** When Today fails, Home still shows a count with no-clock-ins left out (`premium-home.tsx:100-102`), while the badge route returns `unavailable` (`inbox-count.server.ts:16`). Home then says "2 things" and the badge shows nothing.
   - **Older Today tile vs Inbox.** The tile labelled "Started, not clocked in" shows `counts.notClockedIn`, which leaves out finished shifts with no punches (`today/project.ts:79`). It links to `#missed-punches`, which lists all `missed` shifts, including those (`manager-today.tsx:53`).
   - **Today vs payroll period.** Needs-you counts today, but its timecard items follow the selected week, which may not match the pay period.

   *Contract:*
   - The action center (and `inbox-count`) return `needsYou: {count, noClockIn, now, requests, planning, past, today, weekStart}`, built from the same snapshot as Today.
   - Today adds `counts.noClockIn = missed.length`.
   - When one source fails, the response says `partial: ['today']` instead of quietly shrinking the count.

   *Impact:* High. *Effort:* M. *Owner:* Backend, then UI.

4. **Stop a team of about 250 from turning Home and the Inbox into "unavailable".**
   *Why:*
   - Several item types are one per person: `AVAILABILITY_MISSING`, `ACKNOWLEDGEMENT_MISSING`, `TARGET_MISSING`, `HOURS_REVIEW` (`assistance/manager-actions.ts:245-251`) and one `TIMECARD` per employee (`action-center/project.ts:22-23`).
   - Both the server (`project.ts:26`, more than 1000 items throws) and the client (`project.ts:32`) throw past 1000 items. About 250 employees reach that limit.
   - When they do, Home, the Inbox and the badge all go "unavailable" instead of showing less.
   - The same cliff appears in three more places:
     - The Updates list stops at 100 and loads each item one by one (`communications/service.server.ts:232-233`).
     - Updates' members check throws past 1000 (`communications/project.ts:11`).
     - The Finder returns every employee with no limit.

   *Contract:*
   - Group the per-person types on the server into one summary item each: `{type, count, sample: {employeeId, name}[≤5], href}`.
   - Lists return `{items, nextCursor, total}`.
   - The Finder takes `?q=&limit=20`.
   - When a list is cut short, return `truncated: true` instead of throwing.

   *Impact:* High. *Effort:* M. *Owner:* Backend.

5. **Make the Inbox count cheap and cacheable.**
   *Why:* `GET /api/manager/inbox-count` re-runs the full `readToday` and `readActionCenter` reads (`inbox-count.server.ts:15-17`). That includes a workspace-wide `nevora_timecard_source` call per employee (`timecards/service.ts:91`). It runs every 60 s and again on every route change, because `pathname` is a dependency of its effect (`use-inbox-count.ts:37`). Home separately polls the action center, Today and the monitor every 30 s (`private-snapshot-client.ts:11`), and its server render runs `loadManagerDashboardData` once more (`app/app/page.tsx:63`). One open Home tab adds up to about 3 full action-center reads a minute.
   *Contract:*
   - Return an `ETag`, and answer `304` to `If-None-Match`.
   - Keep a short cache per session, bounded by `validForMs`.
   - Send `Retry-After` on 503 so the clients back off.

   The UI side: refetch on visibility only, not on every route change, and reuse Home's read while on Home.
   *Impact:* Medium–High. *Effort:* M. *Owner:* Backend, plus a small UI change.

6. **Make additive changes safe during a rolling deploy.**
   *Why:* The browser parsers reject anything they don't recognise:
   - unknown keys in request facts (`action-center/project.ts:10`)
   - any category outside a fixed set, which throws (`project.ts:34-35`)
   - request bodies whose key count isn't exactly right (`api/manager/action-center/route.ts:10`, `api/timecards/route.ts:17`)

   And `inbox-count` answers any query string with 400 (`route.ts:8`). A browser still running the old bundle against a new server will blank Home the moment Codex adds a field.
   *Contract:*
   - Every response carries `contract: 'action-center/1'` (or an `X-Nevora-Contract` header).
   - Read parsers ignore unknown keys and keep checking the known ones. Writes stay strict.
   - The server answers an outdated client with a typed `{state: 'client_outdated'}`, so the UI can offer "Reload".

   *Impact:* Medium. *Effort:* S–M. *Owner:* Backend and UI together.

7. **Use one error envelope and real status codes everywhere.**
   *Why:*
   - Reads use `state`, but timecard mutations use `status` (`api/manager/timecards/route.ts:8-18`).
   - `inbox-count` returns **200** with no reason when the server fails (`route.ts:16`). Every similar route returns 503.
   - The action center's 400, 401 and 403 responses carry no `reason` (`route.ts:7-10`).
   - The clients treat 401 and 403 as the same thing (`attendance/client.ts:297`, `useActionCenter` in `manager-action-center.tsx`). So the UI can't tell "Sign in again" apart from "Your access changed".
   - Transient serialization failures are reported as a 409 `conflict` (`timecards/service.ts:173`).
   - 409 bodies never include the current version.
   - Policies and presentation pick the 409 by matching `/conflict/i` against the error message (`api/company-policies/route.ts:48`, `api/workspace-presentation/route.ts:27`).

   *Contract:* every route returns `{state, reason, retryable, retryAfterMs?, current?: {revision, updatedAt, updatedByName}}`, with these rules:
   - **401** `session_expired`
   - **403** `not_allowed | scope_changed | role_changed`
   - **409** only for a real version conflict, and it includes `current`
   - **503** for transient failures, with `Retry-After`

   *Impact:* Medium. *Effort:* S–M. *Owner:* Backend.

8. **Return live shift ids and deep links from Today.**
   *Why:* Today returns the id of the published-revision copy of the shift, `sh.id` (`today.server.ts:41`), not the id of the shift itself. The table already holds that id as `source_shift_id` (`db/migrations/0004_assistance_layer.sql:32`). So a no-clock-in row can only link to the person's page, or to `/app/timecards#timecard-<id>` with **no period** (`manager-inbox.tsx:158`). The manager can't open the shift, mark it "Unable to work", or land on the right timecard week.
   *Contract:* each Today shift adds `sourceShiftId`, `scheduleId`, `weekStart`, `timecardHref` (with start and end) and `canContact: boolean` (no phone numbers in the payload). Coverage-gap items add `sourceShiftId` or `{locationId, date}`.
   *Impact:* Medium. *Effort:* S. *Owner:* Backend.

9. **Add the data the v3 screens need but no endpoint provides yet.**
   - **Time off by week.** Only *pending* time off reaches the manager (`manager-dashboard.ts:287`). Add `timeOff: {employeeId, date, partialDay?, status: 'APPROVED'}[]` to the week read, for the Schedule grid and an "Out today" line on Home.
   - **Acknowledgement counts.** Every item in the Updates list carries the full `management.recipients` array, with names only and no `employeeId` (`communications/types.ts:16`). The detail page counts it in the browser (`communication-detail.tsx:79`). Add `ackSummary: {required, acknowledged, read, total}` to each list item, and make recipients on the detail page paginated and carry ids. The schedule's acknowledgement count should be one number per week, not N items (see #4).
   - **Pay rates and labour cost.** The schema has no rate column (grep of `db/migrations` and `src/lib/payroll`). The Schedule's hours rows show hours only (`manager-dashboard.ts:271-278`). Proposal: an Owner-only `POST /api/manager/week-cost {weekStart}` returning `{scheduledCost, byLocation, byEmployee?}`, behind a capability.

   *Impact:* Medium–High. *Effort:* M–L. *Owner:* Backend, plus Product (Jose decides who may see money).

10. **Stop using one `dateTime` field for different kinds of time.**
    *Why:* Coverage gaps send a local clock time without a zone, `${date}T${startTime}` (`manager-actions.ts:112,128`). Requests and corrections send the moment they were created, `createdAt` (`:144-167`, `action-center/project.ts:21`). One sort compares both as plain strings (`project.ts:27`). The browser also works out "today" from `observedAt` (`premium-home.tsx:99`), while `inbox-count` uses the server's `today` (`inbox-count.server.ts:17,22`). So around midnight they can disagree on which gaps count.
    *Contract:* replace `dateTime` with three fields: `occursOn` (the workspace's date), `startsAt` (an ISO time with offset) and `submittedAt`. Every snapshot also carries the server's `today` and `timeZone`.
    *Impact:* Medium. *Effort:* S. *Owner:* Backend.

## What's good
- **Consistent boundary headers.** Reads check same-origin, require marker headers, send `no-store, private` and `Vary: Cookie`, and carry a validity window (≤45 s or ≤60 s) that the client respects.
- **Failing closed is a deliberate rule.** For example, "never turn a partial read into zero" (`inbox-count.server.ts:19`). Parsers bound string lengths and only accept `/app` links.
- **Timecard mutations already have the right ingredients.** They have an `operationId`, an `outcome-unknown` receipt, and `blocked` reason codes (`timecards/service.ts:15-16`). They are a good base for the shared envelope in #7.

## Not checked / limits
- No browser use and no live database (per the brief). Query cost in #5 is inferred from the code, not measured.
- I did not check whether scope storage is installed anywhere, so #2 may only be latent today.
- Not reviewed in depth: the payroll, clocker and employee routes, and the server actions behind approve and decline on the request pages.
- One screenshot checked: AUDIT-M Home at 390 shows Needs you 4 with Inbox badge 4, which is consistent in the healthy case. The mismatches in #3 only appear when a read fails, which I didn't reproduce.
