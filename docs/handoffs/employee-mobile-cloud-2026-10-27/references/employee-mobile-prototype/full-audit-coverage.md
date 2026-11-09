# Employee workflow coverage after full audit

34source-anchored groups; local samples and live integration are separate. This is not a completion percentage. CurrentHTML SHA256 `68aad106fa42dd4bcdf7dafb2e521561e15868e4cf607d810906244c7f9ff0ab`.

| ID | Area / workflow | Audit assessment |
| --- | --- | --- |
| `home` | Home: Own current/next shifts and attention | Local own shift/time/attention; attention and time-off visibility are narrow projections. |
| `schedule` | Schedule: Own published shifts across weeks/locations | Partial: only current+two future weeks; past/variable-duration/overnight/publication distinctions missing. |
| `schedule-review` | Schedule: Revision-bound weekly review and recovery | Partial: one current-week boolean; revision/conflict/unknown/removed-assignment recovery missing. |
| `open-shifts` | Requests: Find/request eligible open coverage | Core local flow under Requests; source Schedule/shift-origin contextual entry points missing. |
| `swap-create` | Requests: Request a shift swap | Local own Employee sample flow represented; current server authority, durability and full live behavior remain unverified. |
| `swap-incoming` | Requests: Respond to incoming swaps | Local own Employee sample flow represented; current server authority, durability and full live behavior remain unverified. |
| `callout` | Requests: Offer cover / report unable to work | Local own Employee sample flow represented; current server authority, durability and full live behavior remain unverified. |
| `exchange-history` | Requests: Own exchange/callout history and cancellation | Local own Employee sample flow represented; current server authority, durability and full live behavior remain unverified. |
| `timeoff-full` | Requests: Full-day time-off request/review | Local request; timeOff capability, owner-bound retained draft and uncertain recovery incomplete. |
| `timeoff-partial` | Requests: Partial-day time-off request | Local same-day request; same capability/draft/recovery gaps as full-day. |
| `timeoff-history` | Requests: Own pending/decided time-off history | Local own Employee sample flow represented; current server authority, durability and full live behavior remain unverified. |
| `timeoff-withdraw` | Requests: Withdraw own Pending request | Local pending cancellation; source proof/module/conflict/uncertain outcomes missing. |
| `availability-usual` | Requests: View/edit usual availability | Local own Employee sample flow represented; current server authority, durability and full live behavior remain unverified. |
| `availability-week` | Requests: Weekly availability and deadlines | Local week/deadline/locked behavior; only three fixed week records. |
| `recorded-time` | Hours: Own clock status, punches and breaks | Local own Employee sample flow represented; current server authority, durability and full live behavior remain unverified. |
| `timecards` | Hours: Own period timecard/details/history | Partial root integration: no history data supplied; status always Draft. |
| `entry-correction` | Hours: Propose completed-entry correction | Local own Employee sample flow represented; current server authority, durability and full live behavior remain unverified. |
| `missing-time` | Hours: Missing entries and completed-break corrections | Local own Employee sample flow represented; current server authority, durability and full live behavior remain unverified. |
| `correction-history` | Hours: Correction decisions/effective-time history | Local own Employee sample flow represented; current server authority, durability and full live behavior remain unverified. |
| `notification-inbox` | Home / More: Own notifications and deep links | Missing Pay/device-test kinds; schedule destination hardcodes week0; Home owner incorrectly More. |
| `company-updates` | More: Read permitted updates and acknowledge | Local own Employee sample flow represented; current server authority, durability and full live behavior remain unverified. |
| `team-post` | More: Post to today’s assigned team / withdraw own permitted post | Local own Employee sample flow represented; current server authority, durability and full live behavior remain unverified. |
| `profile-read` | Profile: Own identity, work locations/access/timezone | Local own Employee sample flow represented; current server authority, durability and full live behavior remain unverified. |
| `language` | Profile: English/Spanish sign-in language | Local own Employee sample flow represented; current server authority, durability and full live behavior remain unverified. |
| `appearance` | Profile: System/light/dark appearance | Local own Employee sample flow represented; current server authority, durability and full live behavior remain unverified. |
| `device-alerts` | Profile: Alerts on this device | Local own Employee sample flow represented; current server authority, durability and full live behavior remain unverified. |
| `calendar` | Profile: Create/copy/replace/revoke private calendar link | Local own link lifecycle; confirmed320px200% title/status overlap; no real feed. |
| `passkeys` | Profile: Register/list/remove own passkeys | Local own Employee sample flow represented; current server authority, durability and full live behavior remain unverified. |
| `support-legal` | Profile: Support/privacy/terms | Local own Employee sample flow represented; current server authority, durability and full live behavior remain unverified. |
| `account-delete` | Profile: Own account deletion request | Local own Employee sample flow represented; current server authority, durability and full live behavior remain unverified. |
| `sign-out` | Profile: Sign out | Local own Employee sample flow represented; current server authority, durability and full live behavior remain unverified. |
| `pay-statements` | Pay / Hours: Own published statements / view/download / payday | Local own Employee sample flow represented; current server authority, durability and full live behavior remain unverified. |
| `modules` | Shared: Capability-driven menus and refusal states | Marketplace/Updates/Pay/account gates represented; timeOff gate absent. |
| `recovery` | Shared: Offline/session/re-entry/stale and uncertain-result recovery | Later tools have lifecycle fences; WebKit generic sheet focus/time-off draft/partial-read semantics unresolved. |

[Full audit](full-audit.md) · [Machine-readable source anchors and issue register](full-audit.json)
