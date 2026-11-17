# Package H: Phase 4, Employee and Lead account screens and the shared row rules

Base commit `6e029139`. Patch: `h.patch` (made with `git diff 6e029139 HEAD --binary -- . ':!zz-scan' ':!vitest.zz-scan.config.mts'`).
Presentation only. No server read, handler, route, permission check or data contract changed.

## Findings

| Id | Result | Evidence |
|---|---|---|
| EM-005 | partly, rest needs Codex | Row title is now the outcome and the sub-line is the object, from the event type, subject, names and count the read sends: "Time off approved / Dec 10 – 11", "Swap request waiting for you / Sat, Nov 28 · From Ana Colon", "Confirm your schedule / Week of Nov 23 · 4 shifts". An approved notice leads with a green check, a declined one with a grey x. `notificationHeadline` in `employee-mobile/notifications-list.tsx`, drawn by `employee-b/messages-b.tsx`. `notifications-1440.png`, `notifications-390.png`. What the read does not send is under "For Codex". Repeats (two "Confirm your schedule" for one week) are not folded. |
| EM-009 | fixed, one choice for Jose | From 768px: one trailing line, dot then time, 6px apart, 13.5/18 grey tabular, centred on the row (probe: offset 0 on every row). Earlier days read "Nov 13, 3:29 AM". "Action needed" is the amber chip. Unread title 600, read 500. On phones the time ends the sub-line and only the dot trails (see "For Jose"). |
| EM-006 | already fixed, decided otherwise | Phase 2's row rule made "Pick up" the tinted pill (`b-btn--ghost`), not the grey fill the finding asked for. Measured: 96 by 36 drawn at 390 and 1440, label "Pick up", 44px hit area. It was 34px tall at 320; now 36. |
| EM-024 | fixed | Phones: each tab is its label plus an equal share, 12px side padding, 13.5px labels, 18px count pill. At 390 "Open shifts 2" is 128px wide with 12px each side (was about 5px). `exchange-open-390.png`. Under 360px the 4px padding stays. |
| EM-023 | fixed, one choice for Jose | Tabs "Waiting 2" and "Decided" with the count pill. Waiting rows end with the amber "Waiting" chip; decided rows keep green "Approved", grey "Declined" and "Withdrawn". "Part of day" is dropped when a time range shows ("Thu · 9:00 AM – 12:00 PM"). `timeoff-waiting-390.png`, `timeoff-decided-390.png`. This reverses review B1 (NV-280), which had removed the chip on the Waiting tab. |
| EM-032 | fixed | Note left-aligned on the card's text edge at every width. "Requests" is a teal link to `/app/requests` with a 44px hit area. Band pills are 44px on phones ("Change one week" measured 175 by 44). `availability-390.png`, `availability-focus-390.png`. |
| EM-021 | fixed, kept the row rule | "Write an update" is one glass pill at every width. From 768px Open and Acknowledge hug their labels at the card's right edge (96 and 154 wide, 44 tall, 8px apart); phones keep two equal columns at 44px. The word "Unread" is gone from the row (the label still says it); unread title 600, read 500. Acknowledge stays the tinted pill and Open the quiet text button, as the Phase 2 row rule says, not the filled teal the finding asked for. `updates-1440.png`, `updates-390.png`. |
| EM-033 | fixed | List previews collapse line breaks to spaces and clamp to three lines. The update's own page is unchanged. Body text now starts on the title's edge at 1440 (was 1px off). |
| EM-020 | fixed | Language uses the `--b-seg-*` tokens: 44px pill track, 4px in, 36px pill items, 14/600, 44px hit area. On phones the label and hint take the row and the control sits under them at card width in two equal columns (324 wide at 390). `profile-390.png`, `profile-1440.png`. |
| EM-029 | fixed | Delete row: ink title, grey sub-line "Ends your access to this workspace", red-tinted icon only. Personal info has the card note "Your manager keeps these up to date." Sign out was not added to Profile (More and the account menu have it). |
| EM-030 | fixed | The "Calendar and alerts" card shows for an Employee and a Lead on tablets and desktop. `profile-1440.png` (Employee), `lead-profile-1440.png`. |
| EM-028 | fixed | Sign out is a white pill with a hairline ring and the glyph, as the Owner's: 124 by 44 at the left under the cards from 768px, full width and 48px on phones. `more-1440.png`, `more-focus-390.png`. |
| EM-019 | fixed | Grey circle with a search glyph, 560px card, 22px inset (18 on phones), "Go to Home" (the one filled button) and "Open Schedule" as the quiet link. Shared by every role, so an Owner sees it too. The Employee's three closed pages (`/app/restricted`, `/app/reports`, `/app/payroll-export`) now use the same state screen with the tinted pill. `notfound-1440.png`, `notfound-390.png`, `closed-insights-1440.png`. The button stays 44px like every state card, not the 48px in the finding. |
| EM-026 | fixed | The workspace name wraps to two lines (13.5/17 600, as the Owner's) and both roles carry a role line, so the card is 65px for an Employee and a Lead (probe). The full name is the card's title. Help's current state is the nav items' box: 16 to 216, 40px, same corners (probe). |
| EM-034 | already fine | Checked at 1440 by 900 by scrolling to the end on Help, Notifications and Home: the sidebar is `position: sticky`, top 0, bottom 900 at the page's end. The cut-off was how a full-page capture draws it. `rail-end-help-1440.png`. No change. |
| EM-017 | fixed | One rule in `employee-b-account.css`: a row that opens (link, button, question that opens in place) leads with the teal-50 circle and a teal glyph. Grey stays for facts that do not open and for a declined notice; amber, red and green keep their meaning. Calendar rows got a calendar glyph. |
| EM-018 | fixed | One rule: a card's note is its footer, 13.5/18 grey, 12px above, 16px below, left-aligned, on the card's text edge (18px on phones, 22px from 768px; the finding said 22 at every width). Availability's note is left-aligned too. |
| EM-027 | fixed | `text-wrap: pretty` on notes, notice lines, row sub-lines and card paragraphs. Help's warning has no width cap; it still takes two lines at 484px because the sentence is longer than the tile, and now breaks "…bank details or / pay documents." |
| TB-008 | already fixed | Jose's Phase 3 decision 12 (`4fc8e626`): one bell in the top bar, no Notifications entry in the Employee sidebar or rail. Seen in `notifications-900.png`. |
| Nov 14: titles | already fixed | Tab titles read "Pick up and swap", "Time" and "Pay" for an Employee (scan log). |
| Nov 14: targets | partly | Fixed on my screens: language buttons, links inside Help answers (43 to 44px), the Requests row link beside "Review" (41 to 44px), "Profile and settings" on More (42 to 44px). Not touched, builder G's screens: "Previous week" and "Next week" (32px drawn, 44px tall hit area, 36px wide) and Pay's "See your hours" (32px). "Forgot password?" on the sign-in page is a signed-out page. |

## What was built

- **Notifications** `/app/notifications` (top-bar bell, More): outcome titles, object sub-lines, state icons, one trailing line.
- **Pick up and swap** `/app/exchange` (Schedule, Requests): tab sizing on phones; row button height at 320.
- **Time off** `/app/requests` (Requests): tab count, row chips, shorter sub-line.
- **Availability** `/app/availability` (Schedule, More): note and link, 44px band pill. Layout only; nothing else in the form changed.
- **Updates** `/app/updates` (sidebar, More): glass Write pill, preview clamp, button row.
- **Profile** `/app/profile` (More, account menu): language control, delete row, card note, Calendar and alerts for both roles.
- **More** `/app/more`: Sign out pill.
- **Help** `/app/help`: teal row icons, 44px answer links.
- **Not found and closed pages**: `/app/<unknown>`, `/app/restricted`, `/app/reports`, `/app/payroll-export`.
- **Shell**: role line for an Employee (`app-shell.tsx`, one line), name wrap and Help box (CSS).

Files: `src/app/app/employee-b-account.css` (all new rules), `src/components/employee-b/{messages-b,timeoff-b,account-b,account-b-client}.tsx`, `account-copy.ts` (new), `src/components/employee-mobile/{notifications-list,timeoff,availability}.tsx`, `src/app/app/not-found.tsx`, `restricted/page.tsx`, `reports/page.tsx`, `payroll-export/page.tsx`, `src/components/app-shell.tsx`, and their tests. No existing stylesheet was edited. `b-kit.tsx` was not touched.

## Other screens that moved

The three shared rules apply to the whole Employee and Lead app. Page heights against the base, Employee:

| Screen | Change | Cause |
|---|---|---|
| Time `/app/my-time` | 12px taller at 1440 to 390, 16px at 320 | EM-018: "Hours include breaks." now has 12px above it |
| Home `/app` | card notes gain the same 12px (no base picture of Home was taken, so this is from the rule, not a measured difference) | EM-018 |
| Schedule, Pay | no height change | row icons that open are teal (EM-017) |

Frame numbers (title top, band end, first card) are the same as the base on all 21 routes at 1440, 900 and 768.

## States

| Screen | State | How | Evidence |
|---|---|---|---|
| Notifications | list with unread, read, action needed, approved, declined, swap for you | real local server | `notifications-1440.png`, `notifications-900.png`, `notifications-390.png`, `notifications-320.png` |
| Notifications | Unread tab by keyboard | real local server | `notifications-unread-390.png` |
| Notifications | published schedule, cover request, pay statement, "Now cancelled", Spanish | unit test only | `notifications-list.test.tsx`, `account-b.test.tsx` |
| Notifications | empty, caught up, opening spinner, error card | unit test only (unchanged code) | `account-b.test.tsx` |
| Time off | waiting, decided | real local server | `timeoff-waiting-390.png`, `timeoff-decided-390.png`, `timeoff-waiting-1440.png` |
| Updates | to confirm, unread earlier | real local server | `updates-1440.png`, `updates-390.png` |
| Updates | line breaks collapsed, read row, empty, no match | unit test only | `account-b.test.tsx` |
| Profile | ready | real local server | `profile-1440.png`, `profile-390.png` |
| Not found, closed page | shown | real local server | `notfound-*.png`, `closed-insights-1440.png` |
| 200% text | Notifications, Profile, More at 390 and 1440, no overflow | real local server, root font size doubled in the page | `text200-notifications-390.png` |

No state was forced with an intercepted response.

## Keyboard and focus

Walked with Tab in the capture tool at 1440 and 390. Every stop shows a 2px ring (teal on white, white on the band).
- More: Home, Profile and settings, Availability, Notifications, Updates, Add shifts to your calendar, Help, Privacy and terms, Sign out. `more-focus-390.png`.
- Profile: More, English, Español, (Add to calendar, Alerts on this device from 768px), Delete my account. `profile-focus-1440.png`.
- Availability: the Requests link takes focus with a ring and opens `/app/requests`. `availability-focus-390.png`.
- Not found: Home, Go to Home, Open Schedule. `notfound-focus-390.png`.
- Notifications: All, Unread, then each row; Enter on Unread filters the list.
No new motion.

## English and Spanish

The signed-in app renders English only, so these screens render `en`. Every new string is in `src/components/employee-b/account-copy.ts` with an `es` entry. `account-copy.test.tsx` checks both languages have the same keys, that no Spanish entry equals the English one, and that Spanish notification headlines carry no English copy; `notifications-list.test.tsx` renders Spanish headlines with es-PR dates. No screenshot in Spanish: none of these surfaces is bilingual today.

## Copy

New or changed sentences (English, then Spanish):

| Where | English | Spanish |
|---|---|---|
| Notification | Schedule published / Schedule updated / Confirm your schedule | Horario publicado / Horario actualizado / Confirme su horario |
| Notification | Time off approved / Time off declined / Time-off request answered | Tiempo libre aprobado / Tiempo libre rechazado / Solicitud de tiempo libre respondida |
| Notification | Can’t-work request approved / declined / answered | Solicitud de ausencia aprobada / rechazada / respondida |
| Notification | Shift swap approved / declined; Shift cover approved / declined | Cambio de turno aprobado / rechazado; Cobertura de turno aprobada / rechazada |
| Notification | Swap request waiting for you / Cover request waiting for you / Shift request waiting for you | Solicitud de cambio / de cobertura / de turno en espera de su respuesta |
| Notification | Shift request closed / Shift request updated | Solicitud de turno cerrada / actualizada |
| Notification | Send your availability / Availability sent / Availability reminder | Envíe su disponibilidad / Disponibilidad enviada / Recordatorio de disponibilidad |
| Notification | Team update to acknowledge / New team update | Aviso del equipo por confirmar / Nuevo aviso del equipo |
| Notification (payroll) | Pay statement shared | Comprobante de pago compartido |
| Notification object | Week of Nov 23 · 4 shifts / No shifts for you / From Ana Colon / Now cancelled | Semana del 23 nov · 4 turnos / Sin turnos para usted / De Ana Colon / Ahora cancelada |
| Profile | Your manager keeps these up to date. | Su gerente mantiene estos datos al día. |
| Profile | Ends your access to this workspace | Termina su acceso a este espacio de trabajo |
| Not found | Open Schedule | Abrir Horario |
| Sidebar | Employee | Empleado |
| Time off row | Thu · 9:00 AM – 12:00 PM (was "Thu · Part of day · 9:00 AM – 12:00 PM") | not rendered in Spanish |

Existing words reused unchanged: "Action needed", "Waiting", "Decided", "Sign out", "Delete my account", "One-off days off go in Requests." The one payroll sentence is "Pay statement shared": it says shared, never paid.

## Checks run

- `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit -p .`: clean in `src`.
- `npx eslint` on every changed and new ts/tsx file: clean.
- `npx vitest run --dir src src/app src/components src/lib --testTimeout=30000`: 865 files passed, 24 skipped, none failed (13,067 tests passed).
- Browser, real sign-in, owned local Postgres, fictional data: Employee on 21 routes and Lead on 22 routes at 1440, 900, 768, 390 and 320. No horizontal overflow, no page error. The only console line is the capture tool's own 403 on Notifications, known from the Nov 14 inspection.
- Owner check after the shared edits (`not-found.tsx`, `app-shell.tsx`): Owner on `/app/nope`, `/app/more`, `/app`, `/app/help`, `/app/notifications`, `/app/profile` at 1440, 900 and 390. No overflow, no page error, frame numbers as before, no role line in the Owner's sidebar. The Owner's not-found card shows the new glyph and the two ways on (`owner-notfound-1440.png`); its inset stays 17px because the inset rule is scoped to the Employee shell. A Manager was not captured.
- The Lead run was made one temp commit before the last, which only narrowed two target rules to Requests and Pick up and swap.

Not run: the browser integration suites in `src/test/integration`, the QA scripts, a production build, `src/test/manual-publication.test.ts`.

## For Codex

The notifications list read (`/api/notifications`, parsed in `src/lib/employee-view.ts`) would let the rows say more if it sent:
1. A team update's title (COMMUNICATION). Today the row can only say "New team update".
2. A pay statement's pay period (PAYROLL_STATEMENT) as a `subject`.
3. The shift's start and end time for swap and cover notices; only the date is sent.
4. What changed for SCHEDULE_CHANGED (shifts added, moved, removed); only the reader's shift count is sent.
5. The week for availability reminders.
6. One current reminder per schedule week, or a marker that a notice is superseded. The fixture shows two "Confirm your schedule" rows for one week.
7. Rows without an `eventType` (older ones) still read "Time-off request answered".

## For Jose to decide

1. **Time on phone notification rows.** On phones the time ends the sub-line ("Week of Nov 23 · 4 shifts · 5:13 AM") and only the unread dot trails. A trailing time column left 96px for the title at 320px and broke words. Tablets and desktop follow the finding exactly. Alternative: keep the trailing time on phones from 360px and accept two-line titles.
2. **"Waiting" chip on every Waiting row** (EM-023) reverses NV-280 and bends the Phase 3 rule that a chip marks an exception. It is one line to turn off.
3. **Acknowledge stays tinted, Pick up stays tinted** (Phase 2 row rule) where EM-021 and EM-006 asked for filled teal and grey.
4. **"Your manager keeps these up to date."** Confirm the sentence, and that an Owner is covered by "manager".
5. **Closed pages for an Employee** now use the tinted pill like a Manager's.
6. **Titles**: "Team update to acknowledge", "Swap request waiting for you", "Send your availability" are new wording.

## Needed from another package

- Builder G: 44px targets for Schedule's week arrows and Pay's "See your hours".
- Whoever owns `DESIGN.MD` and `docs/product/review-2026-11-11/status.json`: neither was edited here, so the tracker still shows these ids as open.
- User manuals in `docs/guides/web` name some changed labels (notification titles, "Write an update").

## Not verified

- A real touch device, Safari, a screen reader, Windows High Contrast.
- An Employee with a short workspace name (the 56px card) and one with passkeys on (the "Security" card title).
- Notification kinds the fixture does not hold (published schedule, cover request, pay statement, "Now cancelled"): unit tests only.
- Widths between 430 and 767px for the tab rule.
