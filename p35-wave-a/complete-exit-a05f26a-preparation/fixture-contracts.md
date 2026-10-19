# Wave A positive-state fixture contracts — prepared, not executed

Current review: `563bf65a83f6ff4ce97da4dc7eb131a18f9e9fea`. All findings below come from static inspection of this source and the coordinator launcher/helpers. No preview, database connection, fixture write or browser was used for this preparation.

The launcher seeds the current/next week and time-off request. `seed-extra.mts` adds Employee Swap targets `x-swap-5/6`, both people's reviewed profiles/06:00–22:00 availability, and next-week submissions. It gives Lead shifts but does **not** configure Lead's operational profile/availability. Neither helper seeds pending Swap/Coverage/Unable-to-work manager decisions. Do not count redirect, empty or withheld-Approve states as their positive coverage.

## Coverage and Review replacement

`/app/schedule/coverage?week=…&date=…&locationId=…&start=…&end=…` without `repair` links to a prefilled Add shift. It does not exercise Review replacement. A genuine repair link carries JSON `CoverageRepairLocator`:

```json
{"version":1,"weekStart":"2026-10-26","gapKey":"loc-2|2026-11-01|08:00|16:00","locationId":"loc-2","date":"2026-11-01","startTime":"08:00","endTime":"16:00","target":"STAFFING","reported":{"missingStaff":1,"requiresLead":false,"positions":[]}}
```

This is a **proposed fixture locator**, not a currently measured valid URL. The stock 00:00–24:00 coverage windows and 06:00–22:00 candidate availability do not establish an eligible whole-gap candidate. A small owned fixture can set the existing `qa-loc-2-0` Sunday window to08:00–16:00 before fingerprinting. There are no loc-2 next-week assignments in the stock seed; AUDIT-E is free on Sunday, has loc-2 eligibility,80h maximum and reviewed rules. Derive the actual current block with `calculateScheduleHealth` and `reportedCoverageState`; require `deriveCoverageRepair(...).status==='READY'` and nonempty candidates rather than trusting this proposed JSON.

For each manager actor separately, read their repair page and retain the genuine candidate href `/app/schedule/new?review=<actor-bound hint>` privately. `createCoverageRepairReview` binds actor employee, workspace and SHA256 of the entire generation source; `readCoverageRepairSelection` rejects a different actor or any changed source. Freeze **all** fixture writes/publications/requests before discovery. Token generation must be refreshed if fixture data later changes. Store only case/path and a fixture fingerprint in public evidence; private hrefs belong under owned `PREVIEW_OUT` mode600.

Contracts: `src/lib/scheduling/coverage-repair.ts`, `src/lib/data/coverage-repair.server.ts`, `src/app/app/schedule/coverage/page.tsx`, `src/app/app/schedule/new/page.tsx`. Assertions: title `Review replacement`, selected person/date/time/location, enabled confirm/save action, source-read candidate eligibility. Invalid/stale review is a separate variant.

## Manager decisions and activity

Use the exact-source `seedOwnedScenario` with distinct fictional labels/weeks and `executeShiftChange` through the owned executor before inspection. This keeps assignment episodes, terms, recorded policy and actual employee consent coherent; direct legacy request rows are insufficient to expose allowed Approve.

1. Temporarily set only the owned workspace's Swap/Coverage policy to `MANAGER_REVIEW`, zero advance minutes. Save the original policy and restore it after request creation. Recorded manual policy keeps the requests pending when live policy returns to automatic (`decideShiftChangeTransition`).
2. Swap: scenario A/B; `readShiftChangeTerms(A,source,target)` → `PROPOSE_SWAP`; B `ACCEPT` with returned request revision. Require result `pending`, persisted status `MANAGER_PENDING`, and Owner **and** Manager `readShiftChangeAvailability(MANAGER_APPROVE).allowed===true`.
3. Pick-up: separate scenario; A `OFFER_COVERAGE`; C `ACCEPT`. Require `MANAGER_PENDING` and both manager approval reads allowed.
4. Unable to work: separate scenario A `SUBMIT_CALLOUT` with source episode/fingerprint, `ILLNESS` or a coherent `OTHER` note. Require pending current-episode report and both manager `APPROVE_CALLOUT` reads allowed.
5. Open coverage: separate scenario A `OFFER_COVERAGE`, leave `OPEN`. Another distinct scenario may be declined through the fixture executor to establish a real recent outcome.

Read-only routes: `/app/exchange?tab=pending&requestId=<id>#request-<id>`, `/app/exchange?tab=coverage`, `/app/exchange?tab=activity`. Pending button selectors can be scoped to `#request-<id>` then `button[name=kind][value=MANAGER_APPROVE|MANAGER_DECLINE|APPROVE_CALLOUT|DECLINE_CALLOUT]`. Open Coverage uses `input[name=kind][value=MANAGER_CLOSE]` within its form and `Close request` button. Source `manager-shift-requests.tsx` supplies specific accessible names; bind those or the exact scoped selector, not the first generic Approve across cards.

Every browser decision is intercepted and aborted; fixture creation is never browser interaction. Failed UI actions cannot consume these baseline cards. Keep failures distinct from server-side fixtures and never describe the latter as browser business-flow success.

## Copy receipts and retry

Receipt reads are scoped by `(workspace_id,actor_employee_id,operation_id)`. One Owner operation cannot stand in for Manager. The existing `cloud-inventory.mjs` supplies real immutable `TEMPLATE_UNAVAILABLE` receipts for both actors, but that helper is **not** called by the shared launcher. These exercise `Nothing copied`, not `Week copied` or partial rows.

For positive/partial UI, prepare a tiny exact-source template and invoke `executeScheduleCopy` through each actor's owned executor into separate unused future weeks before freezing fixtures. At least one eligible named employee row must be `COMMITTED`; a deliberately unavailable fictional employee row can establish `SKIPPED/EMPLOYEE_UNAVAILABLE`. Assert receipt contains both statuses for partial, plus date/time/location/name descriptions, then bind `/app/schedule/copy-receipt?operation=<actor-specific UUID>`. A fully copied fixture omits the unavailable row. Keep all inserted shifts outside current/next inspected weeks.

The canonical unconfirmed UUID with no stored operation has no retry button. To exercise `Retry this copy`, seed an immutable **command without receipt** for that actor through owned fixture setup (explicitly synthetic unconfirmed outcome), with a valid UUID/command hash/source. Bind that UUID privately. `ScheduleCopyForm` sends JSON to `/api/schedule-copy` with `x-nevora-actor`; hold/abort it and inspect the original retained operation across retries. Never continue a copy request to get a receipt during inspection.

Contracts: `src/lib/data/schedule-copy.ts`, `db/migrations/0024_schedule_copy_receipts.sql`, `src/app/app/schedule/copy-receipt/page.tsx`, `src/components/schedule-copy-form.tsx`.

## Swap/Unable-to-work sent views

Employee source: `/app/exchange/swap?sourceShiftId=audit-next-0-1`, choose `input[name=targetShiftId][value=x-swap-5]`, click `Send swap request`. Existing seed rules support this positive path. Lead needs reviewed profile/availability and a real eligible target **Lead** peer: Lead's source `x-audit-next-AUDIT-LEAD-2` is designated Lead, so adding an ordinary Employee target is not sufficient proof of both replacement assignments. Add one fictional qualified Lead peer/weekend shift in owned setup, publish, then require source `readShiftChangeAvailability(PROPOSE_SWAP).allowed` for the selected target.

Callout: existing own future shift, choose `select[name=reasonCode]` value `ILLNESS`; for Other choose `OTHER` and fill `textarea[name=reasonNote]` with3–300 characters. Click `Send report`. The original current-week Employee callout source must still be future at execution; if the week/day has passed, bind own next-week shift rather than counting a redirect.

Both forms call a Next Server Action (`next-action` header), not JSON REST. Returning `application/json` cannot establish sent UI. Static Next reducer contract expects `text/x-component`, a Flight root with `a` equal to a structured `{status:'pending',operationId,requestId,revision}`, and no replacement flight tree (`f:""`, the explicit no-flight path, subject to runtime decoder check). A proposed browser-only fulfillment is `0:{"a":{"status":"pending","operationId":"…","requestId":"…","revision":1},"f":"","i":false}\n`; verify this protocol in the released browser before credit. No request may reach the app server. Do not inject `.form-success` or call React setters manually.

`ShiftChangeForm` writes a direct-child `.form-success`, then calls `router.refresh()`. The real `ReviewedSwapForm` / `ReviewedCalloutForm` MutationObserver invokes the mounted sent boundary. Assert `Swap request sent` / `Report sent`, correct shifts, follow-up words, visible focused notice above the tab bar, stable retained boundary after the harmless GET refresh, and exactly one intercepted action on double activation. If the mock Flight response is not accepted, keep the sent case incomplete and repair the external protocol seam.

No fabricated pending result proves persistence, real consent, approval or publication. It proves the frontend success/sent state under a browser-owned response only.
