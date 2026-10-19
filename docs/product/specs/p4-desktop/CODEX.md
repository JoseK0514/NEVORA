# Phase 4 desktop: items for Codex

**Status, Oct 19 evening:** Codex built items 1 and 3 on `codex/premium-backend`. The UI for both is in this branch: the sidebar badge (`app-shell.tsx`, `useInboxCount`, off behind `INBOX_COUNT_ENDPOINT_READY = false` until the merge, so the preview doesn't log a 404 on every page; **set it to `true` in the merge**), and the pane's Dates, Time, Length, Works at and Note facts when an item carries `request` (`manager-inbox.tsx`, `requestFacts`). Joint test after the merge: badge matches Home and the Inbox summary; no badge while unavailable; the pane's facts match the full review.

October 19, 2026. These need server work. The desktop UI is built against today's server behaviour and doesn't depend on them to work; each one is set aside for joint testing.

## 1. Inbox count on every page (F1, PLAN "Backend or data changes")

**Why.** F1 says the Inbox badge in the desktop sidebar (and the phone tab) shows the same "needs you" number as Home and the Inbox summary. Today only Home and Inbox read the action center, so the sidebar has no count.

**Contract.** The shell gets one number per request, computed the same way as `needsYou(items, day, missed).count` in `src/lib/action-center/needs-you.ts` (Act now plus Requests; Plan ahead and past items excluded):

```ts
// Server: passed to <AppShell inboxCount={...}> from src/app/app/layout.tsx, or read by the client from
// GET /api/manager/inbox-count -> { state: "ready", count: number, observedAt: string } | { state: "unavailable" }
type InboxCount = { state: "ready"; count: number; observedAt: string } | { state: "unavailable" };
```

- Managers and Owners only; employees and leads get nothing.
- Same authority checks as `/api/manager/action-center`.
- When unavailable, the UI shows no badge (never "0", never "–").

**UI side (ready once the read lands).** A 12px number badge on the sidebar's Inbox entry and the phone Inbox tab, with the accessible name "Inbox, 4 need you".

## 2. Return to the Inbox after a decision (D-5): already in place

`src/app/app/requests/actions.ts:75-90` already returns a decision made from the Inbox to `/app/inbox?filter=…&decided=…`. Nothing new is needed for desktop. One note for joint testing: the desktop Inbox keeps its selected row in `?item=`; after a decision the redirect drops it, so the pane shows the first remaining item. That's the intended behaviour ("next request"), but the "Next request (2 of N)" wording from F6 still needs a count from the server.

## 3. Request facts in the Inbox detail pane

**Why.** The desktop Inbox is now a list with a detail pane. For a time-off, swap or "can't work" request, the action-center item carries only the person, the kind and the sent date, so the pane shows those and a "Review time off" button to the full review. The Oct 18 comp shows the dates, length, location and note in the pane, with Approve and Decline beside them.

**Contract.** Each request item in the action-center response gains an optional, authority-checked `request` object:

```ts
request?: { startDate: string; endDate: string; partialDay?: { start: string; end: string };
  lengthText: string; locationName: string; note?: string; reviewHref: string }
```

**UI side.** The pane shows Dates, Length, Works at and Note. Approve and Decline move into the pane only after Jose approves that change to O1 ("decisions only on the full review").

## 4. Dev-only error switch (PLAN)

Home's failed server read and the in-app error page can't be forced from the browser. Phase 4 inspected their desktop layout only where the browser can force them (client reads). The switch described in PLAN.md is still needed for the server-rendered ones.
