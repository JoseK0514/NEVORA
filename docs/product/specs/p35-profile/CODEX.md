# Owner and Manager Profile: what the server needs to provide (for Codex)

October 19, 2026. Phase 3.5, Profile session. The UI is built and inspected on branch `claude/p35-profile-6cdee8` against the contract below and the fixtures in `fixtures/`. No server code was written. This item is set aside for joint testing with Codex.

## What the page already reads today (no change needed)

| Field | Source |
|---|---|
| Name, role | `requireSessionMutationProof()` (the session's employee row) |
| Company, time zone | `getWorkspace()` (`name`, `timeZone`, shown with `timeZoneLabel()`) |
| My pay row | Shown only when `navigationForRole(role, readPayrollCapabilities(proof), { modules })` includes `/app/my-pay` (the same rule the shell uses) |
| "Alerts on this device" row | `readNotificationConfig(process.env).featureEnabled`; it opens the existing `#portal-device-settings` sheet |

The page is `src/components/manager-profile/manager-profile.tsx`, reached from `src/app/app/profile/page.tsx` when the role is `OWNER` or `MANAGER`. Employees and leads still get the Phase 3 employee Profile.

## 1. Read: `GET /api/management/profile`

The signed-in Owner or Manager's own contact details, locations and alert choices.

- Request: same-origin `GET`, `credentials: same-origin`, `cache: no-store`, `redirect: error`, `Accept: application/json`. No body, no query.
- Authority: the session's own employee, role `OWNER` or `MANAGER`, active. Never another person's data. An employee or lead gets `403`.
- Responses:
  - `200` with the ready body below.
  - `200` with `{ "state": "unavailable", "reason": "<short code>" }` when the read can't be served right now. The UI shows "Couldn’t load" in the email, phone and locations rows, "Your alert choices couldn’t load." in the alerts list, and Try again in the card's head line; a screen reader hears "We couldn’t load your contact details, locations and alert choices."
  - `401` (no session) or `403` (not Owner or Manager): the UI shows "Sign in to see this" in those rows and a Sign in link in the card's head line; a screen reader hears "Your session ended. Sign in again to see your contact details, locations and alert choices."
  - Any other status (including today's `404`, since the route doesn't exist yet), a network failure, a 10-second timeout, or a body outside the contract: read as a failed read. The UI never shows partial data.
- `Cache-Control: no-store`.

### Ready body

```json
{
  "state": "ready",
  "kind": "management-profile",
  "observedAt": "2026-10-19T14:00:00.000Z",
  "validForMs": 600000,
  "contact": { "email": "owner@northside-qa.example", "phone": "787-555-0100" },
  "locations": { "scope": "all", "names": ["Main Office", "West Office", "Old San Juan Kiosk"] },
  "alerts": [
    { "id": "time-off", "label": "Time-off requests", "detail": "When someone asks for time off", "on": true }
  ]
}
```

| Field | Rule |
|---|---|
| `observedAt` | ISO timestamp from the database clock. A response older than the one on screen is ignored. |
| `validForMs` | How long the snapshot may stay on screen, above 0. The shared snapshot controller (`src/lib/private-snapshot-client.ts`) clears it when it runs out and polls every 30 seconds. Under 45 seconds reads as a session ending, the same as the employee views. |
| `contact.email`, `contact.phone` | Strings of at most 200 characters, or `null` / `""` when not on file (shown as "Not added"). Phone is shown as stored; it wraps only at its spaces. |
| `locations.scope` | `"all"` for an Owner (every active location) or a Manager whose scope is the whole company; `"assigned"` for a Manager limited to some locations (the manager location scope in `manager-location-scope.server.ts`). |
| `locations.names` | Active location names in the order the Locations settings list shows them, at most 500. An empty list is allowed: "No locations yet" (Owner) or "None assigned yet" (Manager). The UI shows five and a "Show all N" button. |
| `alerts` | The role's fixed topic set, unique `id`s, at most 20 items. `label` and `detail` are display text (at most 200 characters each), sentence case, curly apostrophes. `on` is a boolean. |

### Topic set

**Approved by Jose on October 19, 2026** ("Approve wording and alerts"): build the read with exactly this set and wording. Owner: five topics when payroll is on (`NEVORA_PAYROLL_ENABLED`), four without `payroll-ready` when it's off. Manager: four. The UI sizes its loading rows from the same set (`ALERT_TOPIC_SIZING` in `contract.ts`), so a different set or wording would make the list move when it loads.

| id | Label | Detail | Owner | Manager |
|---|---|---|---|---|
| `time-off` | Time-off requests | When someone asks for time off | ✓ | ✓ |
| `shift-changes` | Shift requests | When someone asks to swap or give up a shift | ✓ | ✓ |
| `unable-to-work` | Unable to work | When someone can’t make a shift | ✓ | ✓ |
| `clock-review` | Clock-ins to review | When a clock-in needs your review | ✓ | ✓ |
| `payroll-ready` | Payroll ready to review | When a pay period is ready for you | ✓ (payroll on) | – |

When payroll is off, leave `payroll-ready` out of the Owner's set. The UI's loading rows already follow the same rule.

### Optional, recommended: the same read on the server

`ManagerProfileLive` takes an `initial` prop: a ready body (the shape above, parsed with `parseManagerProfile`). If the page (`manager-profile.tsx`) passes the server-side result of the same read, the details, locations and alert switches render in the first HTML, and nothing on the page moves when the client's own first read arrives. Without it, the page shows placeholders until the client read lands. Placeholders are sized for typical data, but a long email that wraps on a phone still adds a line (measured layout shift up to 0.035 at 320–430 with the Manager fixture). Suggested: `readManagementProfile(proof): Promise<ready body | null>` in `src/lib/data/`, called in `ManagerProfilePage` next to `getWorkspace()`, returning `null` on any failure, so the client read takes over.

## 2. Save: `POST /api/management/profile/alerts`

Turns one alert topic on or off for the signed-in Owner or Manager.

- Request: same-origin `POST`, `credentials: same-origin`, `cache: no-store`, `redirect: error`, headers `Content-Type: application/json`, `Accept: application/json`, `X-Nevora-Profile-Alerts: 1` (a custom header, so a cross-site form can't send it). Body: `{ "topicId": "time-off", "on": false }`.
- The UI sends one request per tap. While it's in flight, that switch is disabled, shows "Saving…" in place of its detail line and ignores further taps (proven: three taps, one request). Other switches stay usable. It gives up after 10 seconds.
- Responses the UI handles:
  - `2xx`: saved. The switch keeps the new value, and the UI re-reads `GET /api/management/profile`. From then on the read is the truth. The body isn't read; `{ "ok": true }` is enough.
  - `401` / `403`: "Not saved. Sign in again, then try." The UI re-reads the profile, so the card's head then offers Sign in.
  - Anything else, a network failure or the timeout: "Not saved. Try again." (or "Not saved. Check your connection and try again." when offline). The message takes the place of the topic's detail line, so the row doesn't change height. The switch goes back to the stored value.
- Must be idempotent: sending the same value twice is fine.
- Validation: unknown `topicId`, a topic not in the role's set, or a non-boolean `on` → `400`.
- Server side (Codex): store the choice per employee and topic, and make notification and push delivery honour it. Delivery is joint testing.

## Fixtures

`docs/product/specs/p35-profile/fixtures/` (each is checked against the parser by `src/components/manager-profile/manager-profile.test.tsx`):

| File | Covers |
|---|---|
| `owner.json` | Owner, all 3 locations, email and phone, 5 topics (one off) |
| `manager.json` | Manager assigned to 2 locations, 4 topics |
| `manager-empty.json` | No email, no phone, no locations, every topic off |
| `owner-large.json` | 60 locations with very long names, a very long email, a phone number with an extension |
| `unavailable.json` | `{ state: "unavailable" }` |

## Joint test checklist

1. Owner, Manager (all locations), Manager (some locations): the read returns the right person, scope and names.
2. Employee and Lead get `403` from both endpoints; signed out gets `401`.
3. Turning a topic off stops that notification and push for that person only; on again restores it.
4. Two quick saves for different topics both stick.
5. `validForMs`, `observedAt` and polling behave as in the employee Profile.
