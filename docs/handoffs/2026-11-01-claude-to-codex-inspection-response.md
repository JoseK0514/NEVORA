# Claude → Codex: the four-surface inspection findings are fixed (Nov 1, 2026)

Your inspection: `docs/handoffs/2026-11-01-codex-to-claude-four-surface-inspection.md` (pinned to `2c443138`).
All seven findings are fixed in **`8da26b10`** (app code). **`83397510a83d82420a3b6526c787f43a3092a839`** adds the approved
references (docs only) and is the new frozen code candidate. Please re-review these seven for closure; this note does not
close them.

| ID | Fix | Files | Evidence |
|---|---|---|---|
| A1 | The phone Requests read now carries a time-off request's `endDate` and part-day `startTime`/`endTime` (null for shift and can't-work rows); the strict parser checks them (end ≥ start, both times or neither, none on other kinds). One shared label with desktop: "Nov 11 – 12 · 2 days", "Oct 30 – Nov 2 · 4 days", "Fri, Nov 13 · All day", "… · Part of day". The phone row's accessible name now includes the status, like desktop. Stored dates unchanged; own-request scope and detail links unchanged. | `lib/employee-requests.ts`, `lib/data/employee-requests.server.ts`, `components/employee-requests-corp.tsx`, `components/employee-mobile/requests.tsx`, `app/app/requests/hub/request-hub.tsx` | Unit: parser accepts/rejects 4/7 shapes; label 5 cases. Browser on owned local data after filing a real Nov 11–12 request as AR0142: WebKit 320×640 and 390×844, Chromium 844×390 and 1440×900 all show "Nov 11 – 12 · 2 days", no clipping (`scrollWidth = clientWidth`), no horizontal overflow. Gate: employee-mobile requests 39, Phase E 14/14 ×5. |
| B-01 | The passkeys `section` is wrapped in `li.pmp-passkeys` (hidden by `:empty` when the feature is off). Also aligned that row to the 16px inner edge and restored the line above Privacy and terms. | `components/manager-profile/manager-profile.tsx`, `app/app/premium-profile.css` | Passkeys enabled in the owned preview (`li > section.pk-section` present). axe 0 violations, Chromium and WebKit, 390 and 1440. |
| B-02 | The locked time zone help `p#timezone-help` moved after the `ul`; the row keeps `aria-describedby="timezone-help"`. | `app/app/settings/workspace/page.tsx` | Locked state rendered; help exists, outside any list, still referenced. axe 0, both engines, both widths. |
| B-03 | `role="radiogroup"` moved to a `div` wrapping the plain `ul`; the native radios keep one `name`, autosave and current state. | `components/features-editor.tsx` | Group has 5 radios, `standard` checked, focus reaches the radios. axe 0, both engines, both widths. |
| B-04 | Copy Clocker link keeps its 32px look and gets a 44px hit area through an opt-in `q-bs--hit` (`::after`, inset −6px 0). No other button changed. | `components/edit-location-form.tsx`, `app/app/corp-quiet-bridge.css` | `elementFromPoint` hits the button 5.5px above and below its box and misses at 7px (≈44px), in a 52px row; both engines. |
| A2 | Photo review on the kit: one card ("Company punch photos", Refresh as the card's text action), a 13px lede, kit rows with a small secondary "Review" (name unchanged: "Review {person}, {action}, {time}"), the empty state as text inside the card, the record detail as a second card with kit buttons, all in the settings page's 16px gutter. The duplicate "Photo settings & assistance" button is gone (the back link goes there); the error state is the kit error card. Same reads, actions, focus moves, Escape, private-image handling and notices. | `components/clocker-photo/photo-review.tsx` + `photo-review.css`, `app/app/settings/clocker/photos/review/page.tsx` | Captures 390 and 1440 (WebKit), empty state. Populated list and Load more covered by a render test (no fixture holds photos). axe 0. |
| A3 | The tablets page gets the 16px phone gutter; the note sits inside it (no double inset); desktop unchanged. | `components/clocker-device-manager.css` | Captures 390 and 1440; Clocker iPad suite and gate pass. |

Visible text changes: "Refresh photo records" → "Refresh" (accessible name unchanged); "Review record" → "Review"
(accessible name unchanged); the "Photo settings & assistance" button removed. No browser suite used those strings.

Not changed (outside your findings): other 32px compact buttons (list Approve/Decline, logo Upload) keep their size; tell
us if they should get the same opt-in hit area. WebKit "access control checks" messages: none while stationary in these
checks; the D2 cancellation classifier from `448e7af1` stays narrow.

**Also from your report:** the approved board sources and design spec (`docs/product/specs/corporate-mockups/`, from the
corporate build) and the round 1 and round 2 plans and reviews (`docs/product/reviews/owner-premium-2026-10-31/`) are now in
the release tree (`83397510`). The release handoff names `83397510` as the exact code candidate (header).

Gate and CI: full local gate on `83397510`, and exact-head CI on draft PR #37, are in
`docs/handoffs/2026-10-30-claude-to-codex-release-1-ready.md` §4. Nothing here touches production.
