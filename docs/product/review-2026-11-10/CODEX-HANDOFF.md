# Codex handoff: server, native and data work from the Nov 10, 2026 UI review

The 329 findings of the full UI/UX review (`findings.json`) were fixed in batches B1–B8 on branch
`claude-codex-collab-nevora`. Most were presentation-only. The items below need a server read, a command, a contract
change, a native bridge capability, or server-built text. The UI batches changed **no** read, handler, authorization or
contract; each item says what the UI already does, so the server change is the only step left.

Each item is listed once, by NV ID. Priority: **P1** blocks a visible fix or misleads people; **P2** improves a fix the
UI already shipped in reduced form; **P3** clean-up.

## 1. Reads and counts

| ID | Pri | Server need | UI already done |
|---|---|---|---|
| NV-006 | P1 | One shared selector, e.g. `timecardsToApprove(periodStart, periodEnd)` → `{ count, period: { startDate, endDate } }`, used by the action center, the Time exports gate and the Timecards overview. Today Home ("11 to review"), Time exports ("Approve 7 first"), export options ("12 not finalized"), Things to do and Timecards each count differently. | Filter renamed "Need review"; counts name their week; Things to do lists waiting timecards. |
| NV-007 | P1 | `readNextPay` (`src/app/app/my-pay/next-pay.ts`) returns `null` once payday passes. Add `overdue?: { payday; period: { startDate; endDate } }` (same data as the payroll runs read's `missingPeriods`). | "Ready now" removed ("Before payroll"); unlabelled segments removed. Home will show "Payday passed Nov 6 · Prepare Oct 26 – Nov 1" in red once `overdue` exists. |
| NV-014 | P2 | `src/lib/data/shift-changes.ts:275` puts "Current workflow policy requires manager review." in every pending row's reason. Return it once per read, e.g. `policy: { managerReviewRequired: true, rulePath: "Scheduling rules › Trades" }`; keep row reasons for row facts. | Decline/Approve pair 44px tall, ≥96px wide, right-aligned on wide screens. |
| NV-016 | P3 | Bell count comes from `/api/notifications`, sidebar count from the shell's read. If one source is wanted, the shell passes one count to both. | Coral dot on the bell at every width; teal count in the sidebar. |
| NV-109 | P2 | The activity read mixes future coverage gaps into past events (tomorrow above today). Leave gaps out, or mark them `upcoming`. | UI splits anything dated after today into a "Coming up" card. |
| NV-138 | P2 | Manager's "Hours this week" includes Owners. Drop Owners from Manager hour targets, or add `role` per row. | Rows sorted by name; viewer's row says "You". |
| NV-152 | P2 | After an employee confirms the week, the schedule read stops returning publication changes, so "What changed" disappears. Keep `publicationChanges` for `acknowledgedRevisionId`, and add `acknowledgedAt` (ISO) on `employeeAcknowledgement`. | Confirm keeps its size while confirming; confirmed week shows a green "Week confirmed" card. With `acknowledgedAt` it reads "Mon, Nov 9 · 9:41 PM". |
| NV-156 | P2 | Check `/api/employee/requests` (`recent`) returns every waiting time-off request, or return a total ("Showing 2 of 3"). | Waiting requests sorted soonest first on hub, Time off and desktop. |
| NV-165 | P3 | Each Pick up and swap tab's read knows only its own count. A small shared `exchangeCounts: { open: number \| null; forYou: number \| null }` keeps counts on every tab. | Count pills at every width; For you pill amber; 44px segments. |
| NV-092 | P3 | Owner's person page (`/app/employees/[id]`) has no hours read. A per-person summary (scheduled today, scheduled this week, worked this week), scoped like the Team list. | ID moved to Access and sign-in; positions as chips; 48px Call/Message. |
| NV-252 | P3 | No weekly-hours limit in the timecard read. Add the company's weekly limit or a per-card `overLimit`, so the "Over 60 h" chip doesn't invent a number. | Not shown until the data exists. |
| NV-158 | P3 | Employee requests/schedule reads don't say whether device alerts are on. Add `deviceAlerts: boolean` to the hub read (or reuse profile config) so empty states can hide "Get alerts on this device". | — |
| NV-091 / NV-240 | P3 | Optional `late` status per clocked-in person, so desktop can show Working · Late · Off today from one read (phone uses two reads today). | — |
| NV-137 | P3 | Closed pages name the active Owners via `listEmployees()`. A lighter "owner names" read is optional; UI accepts `owners: string[]`. A direct message or "request access" notice to Owners would give the notice an action (no person-to-person path exists). | Notice names the Owners. |
| NV-079 | P2 | Things to do swap and can't-work rows can't name the other person: the request facts (`src/lib/data/action-request-facts.server.ts:12`) carry no counterpart. Add a non-private `counterpartName` (the swap partner, or the person covering) so a row reads "Swap with Ana · Thu Nov 12". | Rows show the request kind and shift. |
| NV-142 | P3 | Employee notification items only carry `/app/notifications/open?notificationId=…`, so a title can't name its subject. Add a non-private `subject` (e.g. the schedule week "Nov 16 – 22" or the request date) so a row reads "Schedule for Nov 16 – 22 changed". | Rows show the stored title. |
| NV-033 | P3 | Withdraw works (`withdrawTimeOffAction`). Fixture ids like `scan-leave-maria` aren't UUID v4, so `canWithdrawTimeOff` hides it in scans. Only if real older requests have non-UUID ids does the command need to accept them; otherwise use UUIDs in fixtures. | "Withdraw request" with confirm on phone and desktop (Jose: allowed). |

## 2. New commands

| ID | Pri | Server need | UI plan |
|---|---|---|---|
| NV-261 | P2 | Re-send an update to one person, rate-limited and audited, e.g. `POST /api/updates/:id/remind { employeeId }`. | A quiet "Remind" pill on each "Not sent" row once it exists. |

## 3. Clocker (kiosk)

| ID | Pri | Server need | UI already done |
|---|---|---|---|
| NV-052 | P1 | `src/lib/clocker/pins.server.ts:62–70` budgets PIN attempts per `DEVICE`: 5 wrong PINs from anyone lock the whole tablet for everyone. Add a per-person budget (per device + candidate PIN hash, or per identified employee) and keep a higher device-wide ceiling as backstop. If scope changes, update `clocker-copy.ts` and `clocker-pin-gate.tsx` ("…on this tablet"). Jose: ship the screen now, server scope later. | "This tablet is paused" card, pause ring, amber band "Paused: too many attempts", one "Try Again". |
| NV-052 | P2 | `pin-transport.server.ts:54` always returns `retryAfterSeconds: 300`, not the time left. Return the real remaining seconds (and a matching `Retry-After`). A countdown then needs Jose's OK (DESIGN.MD rules it out while the number is wrong). | Copy says "about five minutes". |
| NV-045 | P2 | Kiosk translates server errors by exact English sentence. Send a stable `code` with every PIN and setup error (punch errors already have one). Until then, any `error:` edit in `src/lib/clocker/*` or `src/app/api/clocker/*` needs the matching `clocker-copy.ts` entry (test `clocker-copy.test.tsx` enforces it). | Spanish for every current server message; unknown messages show in English with `lang="en"`. |
| NV-047 | P3 | `src/lib/clocker/punch-command.ts` messages use audit words. Kiosk wording: "This punch reference belongs to a different punch. Ask your manager to check it." / "Your PIN check changed. Enter your PIN again; nothing was punched twice." / "We couldn't confirm your punch. Tap Check Action Status before trying again." Update the Spanish entries in the same commit. `photo-client/result-copy.ts` can then drop its kiosk-only remap. | Kiosk view rewrites the photo-library lines. |
| NV-185 | P2 | `ClockerJournal.references(location)` returns every saved reference on the tablet. Add `references(location, subject)` returning only the verified person's, plus a count of others; keep all available to the Owner recovery flow. | Current person's reference first, others behind "Show N more"; "Copy reference" removed from kiosk. |
| — | P3 | Speed: reaching the clock takes three sequential requests (PIN `verify`, PIN `status`, punch `state`). Returning verified status in `verify` saves a round trip per punch. | — |

## 4. Phone app (native)

| ID | Pri | Need | UI already done |
|---|---|---|---|
| NV-214 | P1 | Jose (Nov 10): allow Leads. Let LEAD through `nativeRoleSupported` (`src/lib/native-shell/context.ts`) and the native shell's role gate; Leads use the Employee screens, which already serve Leads on the web. Optional bridge: open the web origin in the system browser, so any still-unsupported role gets "Open NEVORA in your browser". | Unsupported page reworded, duplicate wordmark removed. It stops showing for Leads once allowed. |
| NV-212 | P2 | Bridge capability to open the app's notification settings (iOS `openSettingsURLString`, Android `ACTION_APP_NOTIFICATION_SETTINGS`). `PortalViewController.swift` has no settings opener today. | Blocked state ready for a teal "Open phone settings" pill above "Check again" (`device-settings.tsx`). |
| NV-038 | P2 | Generic privacy-safe alert in `src/lib/native-push/providers/apns.ts:58` and `fcm.ts:47`: `{ title: 'NEVORA', body: 'Open NEVORA.' }` → `{ title: 'You have an update', body: 'Open NEVORA to see it.' }`. | — |

## 5. Server-built text (push, stored notifications, email, Action Center)

Keep amounts, rules, legal meaning and contracts. Glossary: `reviews/copy-audit.md` (end of file).

**NV-038 push text** — `src/lib/notifications/payloads.ts:14-25`; update payload tests in the same change.

| Intent | New title / body |
|---|---|
| SCHEDULE_PUBLISHED, SCHEDULE_ACKNOWLEDGEMENT_REMINDER | "Your schedule is ready" / "Open NEVORA to see it." |
| SCHEDULE_CHANGED | "Your schedule changed" / "Open NEVORA to see what changed." |
| COVERAGE_ATTENTION | "A shift needs cover" / "Open NEVORA to find cover." |
| Request types (approved, denied, swap, cover) | "Your request has an update" / "Open NEVORA to see it." |
| COMMUNICATION (EVENT) | "New team update" / "Open NEVORA to read it." |

**Stored notifications (glossary "Can't work")** — `src/lib/assistance/notification-events.ts:73-76`:
- Titles → "Can’t-work request approved" / "Can’t-work request declined".
- Bodies → "Your can’t-work request was approved. The shift is now open for cover." / "Your can’t-work request was declined. It’s still your shift."
- `:95` "Shift swap request" → "Swap request". `:147` "Designated lead" → "Shift lead".
- Test `notification-events.test.ts:179-182`.

**Row labels (a server ↔ client contract)** — `NOTIFICATION_LABELS.CALLOUT` (`src/lib/notification-labels.ts`) and
`portal-notification-list.server.ts:16`: `'Unable to work update'` → `'Can’t-work update'`; `'Time off update'` →
`'Time-off update'`. Change the server label, `NOTIFICATION_LABELS` and the `case` strings in
`notificationPresentation()` (`src/lib/notification-inbox-view.ts`) together, and keep accepting the old labels for rows
already stored.

**NV-188 account recovery**
- Reply, `src/app/api/auth/recovery/route.ts:10` → "If the details match an active account, we’ll email recovery steps. Can’t use that email? Ask your manager or Owner for help." The Spanish entry for the new text is already in `MESSAGES_ES` (`src/lib/auth-copy.ts`); keep the old key until this ships, then remove it. Still no account-existence or delivery confirmation.
- Email, `src/lib/auth/account-email-copy.ts`: subject → "Reset your NEVORA password" / "Restablece tu contraseña de NEVORA". Last line → "Can’t use this email? Ask your manager for help. Manager and Owner accounts need another Owner." / "¿No puedes usar este correo? Pide ayuda a tu gerente. Las cuentas de gerente y de dueño necesitan a otro dueño." (A Manager can't recover Manager or Owner accounts, so today's line sends them to the wrong person.)
- `src/components/assisted-recovery.tsx:65`: "They open **Reset access**…" → "On the sign-in page they choose **Forgot password?**, then **I have a recovery code**…". (Check whether batch B6/B7 already changed it before editing.)
- Legal policy text (`src/lib/legal/policies`, Account deletion): "use Forgot access first" → "use Forgot password? first". Legal content; needs Jose's OK.

**Action Center items**
- `src/lib/time-off-staffing/actions.ts:10`: "Repair staffing for approved leave" → "Fill a shift for approved time off"; detail "…Approved leave overlaps published work." → "…Approved time off overlaps a published shift." Keep the "{name} · {location}" prefix (`repairPerson()` parses it).
- NV-262, `src/lib/action-center/project.ts:26`: drop the trailing "." when there are no issues (the client trims it for now); when two rows share a period for different locations, add the location ("Casey · Nov 2 – Nov 8 · Condado"). The timecard read model needs the location name.
- "Designated lead required/needed" → "Shift lead required/needed" in `manager-actions.ts:134`, `coverage-repair.server.ts:40`, `shift-change-views.ts` (shift-change integration tests pin the history text).

**NV-121 decision toasts** — time-off review redirects to `/app/requests?tab=pending&reviewed=1`
(`src/app/app/requests/actions.ts:104`), so the page can only say "Decision saved." Redirect with
`decided=timeoff-approved|timeoff-declined`; `DECISION_MESSAGES` in `src/components/toaster.tsx` then shows the right
toast. To name the person, the redirect needs a non-private display name or the page reads it. `actions.test.ts` pins
`reviewed=1`.

**NV-068 durations** — `durationText` (`src/lib/duration-text.ts`, "8h 30m") feeds timecards, employee time, action
request facts and Insights. Glossary form is "8 h 30 min". The client formatter `src/lib/duration-format.ts` exists;
point `durationText` at `durationSentence(minutes, '0 h')` when those projections may change, and update
`duration-text.test.ts`, `employee-time.test.ts`, `reports/insights.test.ts`, `action-request-facts.server.test.ts`,
`schedule/edit/page.test.tsx`, `coverage-assistant.test.tsx` and the frozen `timecards.employee-unchanged.test.tsx`.

**Server error text** — if any server route returns English text for the recoveries in
`src/lib/http/nevora-failure.ts` or the payroll blocking codes (`src/components/payroll/workflow-status.ts`), match the
client wording ("Your access changed", "That didn’t go through / Nothing was saved…", "Ask the Owner to confirm…"; no
"payroll administrator").

## 6. Small shared-file items

| ID | Need |
|---|---|
| NV-022 | `src/components/mobile-access/metadata.server.ts:8` falls back to "NEVORA Workforce" for every sign-in route when Mobile Access is off. Give each route its AUTH_COPY title (the `.replace(/\.$/,'')` is now a no-op). |
| NV-186 | Add the Spanish slogan to `src/lib/brand.ts` next to `slogan`, pending Jose's wording: "Un trabajo más brillante por delante". |
| NV-174 | The dev overlay "Encountered a script tag while rendering React component" on unknown routes comes from the root layout or global not-found, not the Clocker. |

## 7. Needs Jose's decision first

- **NV-308 (Jose decided Nov 10: new statements say "Monto")** Spanish pay statement PDF uses "Importe/Importes" (`src/lib/payroll/native/paystub-document.ts:239,242,498`); Puerto Rico usage is "Monto". `provisional-history.test.ts` checks bytes of a frozen approved statement. Version the template so new statements say "Monto" and approved ones keep their bytes.
- **Reports definitions** (`src/lib/reports/project.ts:141,144`) still say "Unable to work". DESIGN.MD keeps the technical wording there.
- **NV-052** per-person PIN lockout scope and any countdown.
- **Legal policy** "Forgot access" wording.
