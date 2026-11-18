# Phase 7, package B: one success pattern for the finishing moments

Worktree `wt/p7b`, base `d74bdb30`. Patch `p7patches/b.patch`. Evidence `evidence-moments/`. Nothing pushed, no branch.
The signed-in app renders English today. The new sentences have `en` and `es`; Spanish is proved by unit tests, not by
screenshots.

## Findings

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Inventory of how each moment confirms today | fixed (table below) | "Inventory" in this file |
| 2 | One pattern, two sizes, in the kit's done state | fixed | `timeoff-sent-390`, `timeoff-sent-1440` (inline), `correction-sent-finish-390`, `-1440` (finish), `frames/*-t000` to `-t600`, `moments-log.json` |
| 3 | Truth rules checked on each moment | fixed for six claims; one payroll sentence left for Jose (locked wording) | unit tests; `schedule-published-forged-address-*`; "Truth rules" below |
| 4 | Money and payroll stay calm; the gate stays as strict; celebration is the same mark plus one ring | fixed; payroll approval seen with a forced reply only | `payroll-approved-forced-390`, `-1440`, `frames/week-confirmed-390-t080`, `frames/schedule-published-390-t160`; `celebrations.ts` and its test untouched and passing |
| 5 | Timecards, calm version, no auto-advance | fixed | `timecard-approved-390`, `-1440`, `timecard-next-*`, log `titleAfter1600ms` |
| 6 | Copy in one module, `en` and `es`, listed | fixed | "Copy" below; `b-done.test.tsx` |
| 7 | Every state around the success | fixed for time off and timecards (forced states); others unit tested | `timeoff-sending-*`, `timeoff-not-confirmed-*`, `timeoff-offline-*`, `timecard-not-confirmed-*` |

## Inventory (before this package)

"Announced" means a live region or a focus move that a screen reader reads. Employees see the Direction B screens at
every width after the page loads, so phone and desktop share one markup unless a row says otherwise.

| Moment | Where (role) | What showed | How long | Focus | Announced |
|---|---|---|---|---|---|
| a. Clock in or out | The app has no punch button for any role. The kiosk is the only place to punch. | Nothing to confirm in the app | n/a | n/a | n/a |
| a. After a kiosk punch | Employee Home and Time | A state, not a confirmation: "Clocked in at 9:02 AM", green clock icon on Home, a chip on Time. Read again on focus, no timer | While true | Not moved | Only the overrun line has `role="status"` |
| b. Time off sent | `/app/requests?tab=new` (Employee, Lead) | A card with "Request recorded", a sentence, two full-width buttons. Entered with `eb-keep-enter` (12px rise and a 4px blur) | Until the person leaves | To the h2 | By focus only |
| b. Time off sent, before the page loads its script | same | Grey 13px line "Your request was sent for manager review." after a redirect with `?submitted=1` | Until navigation | Not moved | `role="status"` |
| b. Swap, cover, can't work | `/app/exchange/swap`, `/callout` | "Request recorded" for all three and for every reply (`completed`, `pending`, `closed`), with "Keep your current shift until the request is completed" | Until the person leaves | To the h2 | By focus only |
| b. Pick up a shift | `/app/exchange?tab=open` | One plain paragraph: "Shift pickup completed. Check your current schedule." or "Pickup requested. Your assignment is awaiting review." | Until refresh | Lost (the pressed button leaves) | `role="status"` |
| b. Time correction | `/app/my-time?view=corrections&edit=…` | A 20px heading "Correction request sent", a line, two full-width buttons | Until the person leaves | To the heading | By focus only |
| b. Availability | `/app/availability` | "Usual hours saved" or "Weekly availability submitted", "Saved hours match your submission.", one grey button | Until "Review saved hours" | To the h2 | By focus only |
| b. Ask to change agreed times (U02) | `/app/availability/agreement` | Only a toast, 4.5s. Nothing stays on the page | 4.5s | To the page title (step change) | Twice: a hidden live line and the toast |
| b. Reminder (U10) | Team availability, Updates | The row reads "Reminder queued · 2:14 PM" in grey. The sheet closes before the result | Stays | Back to the row | Hidden live line, once |
| c. Week confirmed | `/app/schedule` (Employee, Lead) | The Confirm row becomes a row with a green-50 circle and check, "Week confirmed". A twelve-particle burst in four colours once per session | Stays | Lost (the Confirm button leaves) | `role="status"` on the title |
| c. Schedule published | `/app/schedule?published=…` (Owner, Manager) | Phone: bold "{Location} published." and a sentence. Desktop: an h2, the sentence, two links, and the particle burst | Until navigation | Not moved | `role="status"` present at load |
| d. Timecard approved, one | `/app/timecards` sheet | A green-50 block with a solid green circle and white check, "Approved", "7 of 12 done", "Next timecard" | Until another card opens | To "Next timecard" | `role="status"` in the sheet |
| d. Timecards approved, several | same, "Approve selected" | A list of raw result codes in lower case: "approved", "outcome unknown", "not submitted" | Until refresh | Not moved | A hidden live line |
| e. Payroll approved | `/app/payroll/review` | A toast "Payroll approved" and a teal callout "Saved. Check the status below." The same callout carries unconfirmed messages | Toast 4.5s, callout until the next action | Not moved | Twice: live block and toast |
| e. Statements shared | same | Toast "Pay statements shared" while the server has only queued the job | 4.5s | Not moved | Twice |
| e. Payroll import finish (U01) | `/app/payroll/import` | State card with a filled green check-circle glyph, "Amounts saved", receipt, "Review payroll" | Stays | To the step heading | `role="status"` |
| e. Paid time export finish (U01) | `/app/payroll-export/paid-time` | Same card: "Paid time export is complete", scope sentence, receipt | Stays | To the step heading | `role="status"` |
| e. Time exports (older CSV) | `/app/payroll-export` | One teal callout for "Files ready…" and for every failure and unknown result | Until the next action | Not moved | `role="status"` |

Distinct "done" looks before: 16 (the time off card, the shift change card, the pickup paragraph, two correction
receipts, the availability message, a toast-only result, the confirmed week's row, two published blocks, the timecard
block, the list of result codes, two teal callouts shared with failures, the filled-glyph state card, the particle
burst). After: 1 pattern in two sizes, with the same mark in two older hosts (the confirmed week's row and the
timecard block). Not counted, and unchanged: the queued reminder line and the pages shown before the script loads.

## What was built

### The pattern: `BState kind="done"` (`src/components/owner-b/b-kit.tsx`, rules in `src/app/app/b-moments.css`)

- **The mark** (`BDoneMark`): a green-50 circle with a bold green Phosphor check. 48px with a 22px check in an inline
  result, 56px with a 28px check in a page finish, 36px in a row. It settles once: the circle from 80% size and clear to
  full, the check from 50% and clear to full, 300ms (`--b-dur-enter`), `--b-ease-out`, `transform` and `opacity` only.
  With reduced motion it is simply there. It is `aria-hidden`; the words carry the result.
- **Inline** (`size` left out): the state card's own shape, in place of the form or row the result came from. Title
  16/22 600, one line 14.5/20, at most one next step as a tinted pill, so the page keeps its one filled button.
- **Finish** (`size="finish"`): the end of a flow. The signed-out finish's geometry (56px circle, 28px check, centred
  title 20/26, one line, one filled button) in the app's done colour.
- **Announced once.** The card is `role="status"`. When the screen changed under the person the caller passes
  `titleRef`, focus goes to the title and the card drops its live region, so the title is read once. `silent` is for a
  screen that already has a live line (payroll, agreed times).
- **A second way on** the screen already had ("Make another request", "Back to my schedule") is a quiet text control
  (`quiet`, class `b-done__quiet`, 44px tall), never a second pill.
- **Never blocks, never waits.** Focus and the buttons are ready the moment the mark is drawn (log: `focusAtMount`,
  `focusAt60ms`). The Employee screens bring a new card in after a 300ms wait with a rise and a blur
  (`eb-keep-enter`, `employee-b/account.css`). A result's card is switched out of that from `b-moments.css`, so the
  result is there at once and the mark's settle is its only motion (log: `hostAnims: []`, `hostOpacity: 1`). Before
  this, the time off result was invisible for its first 300ms.
- **Still when it was already true.** A done state read from the server on a later visit does not move (`BDoneMark
  still`). `BDoneArrival` (`b-arrival.tsx`, client) lets the mark of a lasting row settle only when the confirmation
  arrived on this visit, and moves focus to the row's title when the pressed control left the page.

### The celebration (`src/components/celebration.tsx`)

It is the same mark with one extra: a single 2px `--b-green-solid` ring that leaves the mark once (scale 1 to 1.4,
opacity .6 to 0, 300ms), so it stays inside the card. The twelve particles in four colours and the `nevora-celebrate` keyframes are retired. The
gate (`src/lib/celebrations.ts`) is unchanged and its tests are unchanged and pass. One stricter check was added in the
component: only the copy that is on screen may claim the session's one moment (a page that holds a result twice, phone
and wide, used to let the hidden copy spend it). The published schedule now carries the ring on phones too; before,
only the desktop copy did.

### Moments moved onto the pattern

| Moment | Now | Size | Focus | File |
|---|---|---|---|---|
| Time off sent | "Request sent", who decides, "View my request", quiet "Make another request" | inline | title | `employee-mobile/timeoff.tsx` |
| Swap, cover, can't work | Title and line follow the reply and the kind (see Truth rules) | inline | title | `employee-mobile/creation-view.tsx` |
| Pick up | "Shift picked up" or "Pickup requested", one step | inline | title, when focus was lost | `employee-mobile/requests.tsx` |
| Time correction | "Correction request sent", "View my request", quiet "Request another correction" | finish (phone screen), inline (the wide twin) | title | `employee-b/time-b.tsx`, `employee-mobile/hours-corp.tsx` |
| Availability | "Usual hours saved" or "Weekly availability submitted", what the hours are used for, "Review saved hours" | inline | title | `employee-mobile/availability.tsx` |
| Ask to change agreed times, and a manager's save, approve or decline (U02) | The toast is replaced by an inline result at the top of the page; the hidden live line says it once | inline | page title (unchanged) | `restrictions/restrictions-screen.tsx` |
| Week confirmed | The same row, with the shared mark; the ring is inside the mark | row (36px) | title, when the Confirm button left | `employee-b/schedule-b.tsx`, `employee-schedule-corp.tsx`, `employee-weekly-confirmation.tsx` |
| Schedule published | Title names the location, the line says who can see it, "Send an update", quiet "Back to Home" (desktop) | inline | not moved (a new page) | `app/app/schedule/page.tsx` |
| Timecard approved, one | Jose's block is kept (word, count, "Next timecard"); its circle is the shared mark, white on the tint | row (36px) | "Next timecard" (Phase 3, unchanged) | `timecards.tsx`, `owner-b-time-pay.css` |
| Timecards approved, several | Each card's result in words. The done card shows only when the server confirmed every card | inline | not moved | `timecards.tsx` |
| Payroll approved, payment file, settings saved | The receipt's existing title with "Check the status below.", the mark, nothing else | inline | title, when the pressed button is disabled or gone (before: lost) | `payroll/payroll-feedback.tsx`, `payroll/use-payroll.ts` |
| Payroll import and Paid time export finishes (U01) | Same sentences, shared finish | finish | step heading (unchanged) | `payroll-import/flow-kit.tsx` |
| Time exports (older CSV) | "Files ready" as the done card; every other notice keeps the plain callout | inline | not moved | `payroll-export.tsx` |

Kept as they are, on purpose:
- **Clock in.** The app has no punch. The Employee's "Clocked in at…" is a state, not a result, so it gets no mark.
- **Reminder queued (U10).** A queue receipt is not a delivery. It keeps its grey line and gets no success mark. See
  "For Jose".
- **The manager's time off decision** ("Time off approved. The employee can see it in Time off.") is a toast after a
  redirect to the list. The row it came from is gone, so the toast stays (package A's).
- **Toasts for payroll actions** stay beside the inline result, because the result card can be off screen on a long
  review page. The toast and the live block both speak, as before.
- **The pages shown before the script loads** (`wave-a/swap-sent.tsx`, `callout-sent.tsx`, the grey `?submitted=1` and
  `?saved=1` lines). An Employee sees the Direction B screen as soon as the page loads its script.

## Truth rules, moment by moment

| Moment | Reply | Before | Now |
|---|---|---|---|
| Time off | `state: complete` (request created, PENDING; checked in the database) | "Request recorded… see its current approval status" | "Request sent" and "Your manager decides." Never "approved" |
| Swap, cover, can't work | `pending` | "Request recorded" | "Swap request sent", "Cover offer sent" or "Report sent", with who answers next |
| same | `completed` | "Request recorded… Keep your current shift until the request is completed" (wrong: it is already done) | "Shift change made. Your schedule shows it now." |
| same | `closed` | "Request recorded" (wrong: nothing was changed) | Amber card "Request closed. Nothing changed on your schedule. Open the request to see why." No mark |
| Pick up | `completed` / `pending` | Two sentences, same look | "Shift picked up" / "Pickup requested. A manager reviews it before the shift is yours." A closed or refused pickup keeps its own line and no mark |
| Schedule published | A redirect with `?published=` | Drawn from the address alone. `published=all` said "Schedule published. Your team can now see…" even when one location published nothing. Typing the address drew a success | Drawn from the page's own read of each location. A named location must read PUBLISHED. "all" counts them: "Schedules published" or "1 of 2 locations published. Your team can see those. The rest are not published." |
| Timecards, several | per card | Raw codes; "outcome unknown" looked like the rest | "Not confirmed", "Not sent", "Blocked"…; the mark only when every card is approved (or every card finalized) |
| Payroll approved | A receipt for APPROVE | Teal callout shared with unconfirmed messages | Done card only when the receipt confirmed it; unconfirmed, error and neutral messages keep the callout |
| Statements shared | A receipt for PUBLISH. The server only queues the job; a worker shares the statements later | Toast "Pay statements shared" | The inline result is the plain "Saved. Check the status below." with no mark. The toast's sentence is payroll wording and was not changed: see "For Jose" |
| Time exports | A verified export reply | Same teal callout as "We couldn't confirm the export" | Done card only for the verified reply |
| Unknown results | | | Unchanged everywhere. None shows the mark (unit tests and the forced runs: `marksShown: 0`) |

## States

"Real" means the local server answered on the owned database. "Forced" means the reply was changed in the page with
`page.route`. "Unit" means a rendered unit test only.

| Screen | State | How | Evidence |
|---|---|---|---|
| Time off | Success, phone and desktop, reduced motion | Real (a request row was written each time, status PENDING) | `timeoff-sent-390`, `-1440`, `timeoff-sent-reduced-390-first-frame` |
| Time off | Sending (button reads "Sending…", disabled, form `aria-busy`) | Forced (the request was held 2.5s) | `timeoff-sending-390`, `-1440` |
| Time off | Not confirmed (no mark, focus on the message, one "Check submission status") | Forced (request aborted) | `timeoff-not-confirmed-390`, `-1440` |
| Time off | Offline | Forced (browser set offline) | `timeoff-offline-390`, `-1440` |
| Week confirmed | Success with the ring, phone and desktop, reduced motion; a later visit is still | Real (the acknowledgement row was written; it was deleted between runs so each run confirmed for real) | `week-confirmed-390`, `-1440`, `week-confirmed-revisit-*`, `week-confirmed-reduced-390-first-frame` |
| Pick up | Success | Real (the exchange became APPROVED). The fixture leaves one eligible shift per run, so 390 is from the final run and 1440 is a still from the run before it (no log entry) | `pickup-390`, `pickup-1440` |
| Can't work | Success | Real (a callout row, PENDING) | `callout-sent-390`, `-1440` |
| Availability | Success | Real | `availability-saved-390`, `-1440` |
| Agreed times | Success, no toast | Real | `agreed-times-sent-390`, `-1440` |
| Time correction | Success, the page finish, reduced motion | Real (a missed shift on a day with no punches) | `correction-sent-finish-390`, `-1440`, `correction-sent-finish-reduced-390-first-frame` |
| Timecard | Approved, phone and desktop, reduced motion, "Next timecard" | Real (three people approved per run). The 390 frames and log entry are from the run before the final one: in the final run that step met "Current view needs a fresh check" and did not approve. The timecard block did not change between the two runs | `timecard-approved-390`, `-1440`, `timecard-next-390`, `-1440`, `timecard-approved-reduced-390-first-frame` |
| Timecard | Not confirmed | Forced (request aborted) | `timecard-not-confirmed-390`, `-1440` |
| Timecards, several | All approved, partly unknown | Unit | `timecards.batch.test.tsx` |
| Schedule | Published, phone and desktop | Real (a draft made for a later week in the owned database, then published through the page) | `schedule-published-390`, `-1440` |
| Schedule | An address that claims a publish the server does not show | Unit, and a real page load with an unknown location | `schedule-published-forged-address-*`, `page.test.tsx` |
| Payroll | Approved, reduced motion | Forced: see "Not verified" | `payroll-approved-forced-390`, `-1440`, `payroll-approved-forced-reduced-390-first-frame` |
| Payroll | Statements queued, unconfirmed, error | Unit | `payroll-feedback.test.tsx` |
| Payroll import, Paid time export | Finish | Unit only (existing `views.test.tsx` passes on the new markup) | none |
| Swap, cover | Sent, completed, closed | Unit | `employee-mobile/moments.test.tsx` |

## Motion evidence

`b-evidence/moments-log.json` holds, for every run: the page's own `getAnimations({subtree:true})` on the mark at the
moment it was drawn, where focus was at that moment and 60ms later, the live regions, the mark's box at each frame, and
horizontal overflow before and after.

1. **Timed frames.** The page's own animations were paused when the mark was drawn and moved to 0, 80, 160, 300 and
   600ms; each frame is a photograph of the real page at that time. Files `frames/*-t000.png` to `*-t600.png`: the
   inline result (time off, 390 and 1440), the page finish (time correction, 390 and 1440), the row with its ring
   (confirmed week, 390 and 1440), the mark on a tint (timecard, 390 and 1440), the inline result with the ring
   (published schedule, 390 and 1440) and payroll (1440). Measured at every size: opacity 0, 0.40, 0.72, 1, 1; an
   inline circle is drawn at 38.4, 42.2, 45.3, 48, 48px. There is no exit: a result stays until the person moves on.
2. **Log.** Every mark: `b-done-settle` on the circle and `b-done-check` on the glyph, 300ms, `ease-out`, one iteration,
   properties `transform` and `opacity` only. The ring: `b-done-ring`, the same. In an unpaused run the browser's own
   `animationend` events report `elapsed: 0.3` for all three (`timeoff-sent-live-*`, `week-confirmed-live-1440`).
3. **Reduced motion.** `timeoff-sent-reduced-390`, `week-confirmed-reduced-390`, `timecard-approved-reduced-390`:
   `anims: []`, the mark is 48px (or 36px) in the first frame, no ring is created, and focus and the live text are the
   same as with motion.
4. **Focus.** Time off, can't work, time correction, availability, pick up: focus is on the result's title when the
   mark is drawn (`focusAtMount`), measured before the settle has run. Week confirmed and payroll: the title, once the
   pressed button has left (`focusAfter`). Timecard: "Next timecard" (Phase 3). Agreed times: the page title (the
   step change, unchanged). Tab order after a time off result: "View my request", then "Make another request"
   (`timeoff-sent-1440-focus-next-step`).
5. **No shift, no overflow.** The mark's layout box is the same at every frame (the log's `layout`), only its drawn
   size changes. `overflow` is 0 before and after on every run.

## Keyboard and focus

- A result that replaces a form takes focus on its title (`tabindex="-1"`). Script and pointer focus draw no ring; a
  keyboard user sees the 2px teal ring (`week-confirmed-390`).
- Tab goes from the title to the one step, then to the quiet control, then on into the page.
- Nothing traps focus and nothing waits for the mark. A timecard stays open after approving: after 1.6s the same person
  is still shown (log `titleAfter1600ms`). "Next timecard" opens the next person and puts focus on their name.
- The published result arrives with a new page, so focus starts at the top as on any page load.

## Copy

New or changed sentences. All are in `src/components/owner-b/moments-copy.ts` with `en` and `es`. None is payroll or
legal wording. The stop-slop pass: short, sentence case, no filler, no exclamation marks, no em dashes (a unit test
checks each string).

| Key | English | Spanish |
|---|---|---|
| requestSent | Request sent | Solicitud enviada |
| timeOffLine | Your manager decides. Keep your scheduled shifts until it is approved. | Su gerente decide. Mantenga sus turnos programados hasta que se apruebe. |
| viewRequest (unchanged) | View my request | Ver mi solicitud |
| anotherRequest (unchanged) | Make another request | Hacer otra solicitud |
| calloutSent | Report sent | Aviso enviado |
| calloutLine | Your manager has it. You keep the shift until they decide. | Su gerente ya lo tiene. El turno sigue siendo suyo hasta que decida. |
| swapSent | Swap request sent | Solicitud de intercambio enviada |
| swapLine (the form's own words) | Your teammate says yes first, then your manager may need to approve. | Su compañero acepta primero; luego su gerente quizá deba aprobarlo. |
| coverSent | Cover offer sent | Oferta de cobertura enviada |
| coverLine (the form's own words) | The shift stays yours until someone picks it up and any review is done. | El turno sigue siendo suyo hasta que alguien lo tome y termine la revisión. |
| changeDone | Shift change made | Cambio de turno hecho |
| changeDoneLine | Your schedule shows it now. | Su horario ya lo muestra. |
| changeClosed | Request closed | Solicitud cerrada |
| changeClosedLine | Nothing changed on your schedule. Open the request to see why. | Nada cambió en su horario. Abra la solicitud para ver por qué. |
| backToSchedule (unchanged) | Back to my schedule | Volver a mi horario |
| pickupDone | Shift picked up | Turno tomado |
| pickupDoneLine | It is on your schedule now. | Ya está en su horario. |
| pickupSent (unchanged) | Pickup requested | Turno solicitado |
| pickupSentLine | A manager reviews it before the shift is yours. | Un gerente lo revisa antes de que el turno sea suyo. |
| viewSchedule, viewRequests (unchanged) | View my schedule / View my requests | Ver mi horario / Ver mis solicitudes |
| correctionSent (unchanged) | Correction request sent | Solicitud de corrección enviada |
| correctionLine (the form's own words) | Your manager reviews it. Your original punches stay unchanged. | Su gerente la revisa. Sus marcaciones originales no cambian. |
| anotherCorrection (unchanged) | Request another correction | Pedir otra corrección |
| usualSaved, weekSubmitted (unchanged) | Usual hours saved / Weekly availability submitted | Horas habituales guardadas / Disponibilidad semanal enviada |
| usualLine (the page's own words) | Used to build your future schedules. | Se usan para preparar sus próximos horarios. |
| weekLine (the page's own words) | Used for the week of {week}. | Se usa para la semana del {week}. |
| reviewSaved, weekClosed (unchanged) | Review saved hours / This week is closed | Revisar las horas guardadas / Esta semana está cerrada |
| weekConfirmed, weekConfirmedLine (unchanged) | Week confirmed / Your manager can see you checked it | Semana confirmada / Su gerente puede ver que usted la revisó |
| published | {Location} published | {Location} publicado |
| publishedAll | Schedules published | Horarios publicados |
| publishedLine (unchanged) | Your team can now see their {week} shifts. | Su equipo ya puede ver sus turnos del {week}. |
| publishedCount | {n} of {total} locations published | {n} de {total} locales publicados |
| publishedCountLine | Your team can see those. The rest are not published. | Su equipo puede ver esos. Los demás no están publicados. |
| sendUpdate, backHome (unchanged) | Send an update / Back to Home | Enviar un aviso / Volver a Inicio |
| batchAllApproved | {n} timecards approved (1 timecard approved) | {n} registros de horas aprobados |
| batchAllFinalized | {n} timecards finalized | {n} registros de horas finalizados |
| batchLine (unchanged) | Refresh timecards before reviewing another set. | Actualice los registros antes de revisar otro grupo. |
| batchWord | Approved / Finalized / Blocked / Changed. Review it again / Not available / Not allowed / Not confirmed / Not sent | Aprobado / Finalizado / Bloqueado / Cambió. Revíselo de nuevo / No disponible / No permitido / Sin confirmar / No enviado |

Removed: "Request recorded", "Your time-off request was recorded. Open it to see its current approval status.", the
three "Your … was recorded. Open it to check …" lines with "Keep your current shift until the request is completed or
you are released.", "Shift pickup completed. Check your current schedule.", "Your assignment is awaiting review.",
"Your manager reviews it. Open it to check its status.", "Saved hours match your submission.", the raw batch codes.

Payroll sentences: none written, none changed. "Payroll approved", "Payment file ready", "Saved" and "Check the status
below." are the hook's existing words, now title and line of one card. "Files ready" and "Download the CSV and its time
record." are the existing notice split at its period.

## Components and sheets touched

- `src/components/owner-b/b-kit.tsx`: only the state card. `BStateKind` gains `"done"`; `STATE_LOOK.done`; new
  `BDoneMark`; `BState` gains `size`, `titleRef`, `heading`, `quiet`, `extra` and `action.aria` (three hunks: the
  imports, the kind table with `BDoneMark` after it, and `BState` at the end of the file). Other kinds render as before
  (unit test).
- New: `owner-b/b-arrival.tsx`, `owner-b/moments-copy.ts`, tests `owner-b/b-done.test.tsx`,
  `employee-mobile/moments.test.tsx`, `payroll/payroll-feedback.test.tsx`.
- `src/app/app/b-moments.css`: every new rule. Three keyframes, all inside `prefers-reduced-motion: no-preference`.
- `src/app/app/portal-motion.css`: the particle rules and `nevora-celebrate` removed in place (mine by the ownership
  list); one line keeps the element hidden outside Direction B.
- `src/app/app/owner-b-time-pay.css`: one rule removed in place (the solid green circle of the timecard block) and its
  comment updated. It could not be overridden from my sheet at equal layer and higher specificity.
- `src/components/celebration.tsx`: one ring; the on-screen check. `src/lib/celebrations.ts` and its test: untouched.
- Screens: the files in "Moments moved onto the pattern". Tests updated for the new words:
  `timecards.batch.test.tsx`, `payroll-export-lifetime.test.tsx`, `app/app/schedule/page.test.tsx`,
  `employee-b/schedule-b.test.tsx`.

Before and after, success only (enter, exit, press, shimmer and spinner patterns are A's and C's):

| | Before | After |
|---|---|---|
| Success layouts in the five moments | 16 | 1 pattern, 2 sizes |
| Success keyframes | `nevora-celebrate` (560ms, its own curve, not behind the preference) | `b-done-settle`, `b-done-check`, `b-done-ring` (one mark, 300ms token, behind the preference) |
| Entrances borrowed by a receipt | `eb-keep-enter` (300ms wait, rise and blur) on the time off receipt | Off for a card that holds a result |
| Particles | 12, four colours | 0; one ring |

## Checks run

- `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit -p .`: clean in `src`.
- `npx eslint` on the 27 changed and new `.ts`/`.tsx` files: clean.
- `npx vitest run --dir src src/app src/components src/lib --testTimeout=30000` on the final source: 913 files passed,
  24 skipped; 13,889 tests passed, 741 skipped, 0 failed. New tests: 37 in `owner-b/b-done.test.tsx` (19),
  `employee-mobile/moments.test.tsx` (13) and `payroll/payroll-feedback.test.tsx` (5), and one in
  `app/app/schedule/page.test.tsx`.
- `git apply --check -R p7patches/b.patch` in the worktree: passes.
- Browser: `cap.sh` with my own steps (`zz-scan/moments-flow.ts`, `moments-kit.ts`, not in the patch), roles employee
  and owner, widths 390 and 1440, motion on and reduced. Final runs: `p7b-work/f-emp` and `p7b-work/f-own`. No page
  error in either. Horizontal overflow 0 on every run.
- Not run: 900 and 320 widths; a Manager or Lead sign-in (a Lead run was queued and withdrawn for time; the shell gives
  a Lead the Employee screens at every width, `app-shell.tsx:225`); a screen reader; Safari.

## Deviations from the brief

1. **The kit had no done kind.** `BState` had six kinds and the payroll import drew its own `data-kind="done"` card. I
   added the kind to the kit and pointed that card at it, so there is still one.
2. **The check settles; it does not draw.** A drawn check needs `clip-path` or a stroke offset, which the motion rules
   exclude. The circle and the check scale and fade in.
3. **"At most one next step."** Four results keep a second, quiet text control because the screen offered two ways on
   before and behaviour is not mine to remove: "Make another request", "Back to my schedule", "Request another
   correction", "Back to Home". Each result has one pill or one filled button.
4. **The mark is green, the signed-out finish is teal.** See "For Jose", 3.
5. **Timecards keep Jose's block** (Nov 15, item 4). Only its circle became the shared mark.
6. **Payroll keeps its toast** and its sentences. The inline result is new beside it.
7. **Reminders and clock in were not moved** (reasons under "Kept as they are").
8. **Focus moves were added** where the pressed control leaves the page and focus fell to the top before: the
   confirmed week, a pickup, a payroll action.
9. **Two edits outside my sheet, in place:** one rule removed in `owner-b-time-pay.css`, and the particle rules removed
   in `portal-motion.css`. One line was added to `employee-weekly-confirmation.tsx` (it tells the done row that the
   confirmation just arrived).
10. **More than 30 pictures.** 43 stills and 55 timed frames (`frames/`), because each of five hosts has frames at two
    widths.

## For Codex

1. `publishDraftsAction` redirects with `published=all` when at least one location published, and says nothing about
   the ones that returned `published: false`. The page now counts what its read shows, so the words are true, but the
   action could carry the count.
2. `/api/payroll/runs` `PUBLISH` commits a receipt after queueing the job. The page cannot tell "queued" from "shared"
   from the receipt alone. A field on the receipt or on the job would let the page say when statements are shared.
3. The success after a publish is still reachable only through a query parameter. A one-time receipt from the action
   would be firmer than the page checking the status again.

## For Jose to decide

1. **Auto-advance after approving a timecard (OW-037).** Not built. Today: the mark, "Approved", "7 of 12 done", and
   "Next timecard" when the reviewer chooses. Nothing moves on a timer.
2. **Payroll sentence that says more than the reply: "Pay statements shared"** (toast after "Share pay statements").
   The server has only queued the statements at that moment. Locked wording, so it is unchanged. Suggested: "Pay
   statements are being shared" or keep the toast as "Saved" until the job finishes. The inline result already avoids
   the claim.
3. **The mark's colour.** The signed-in mark is green (green-50 circle, green check: "green is done"). The signed-out
   finish is teal-50 with a teal check and stays as it is. One family, two colours. Say if the app's should be teal too.
4. **A queued reminder (U10)** keeps its grey "Reminder queued · 2:14 PM" and gets no mark, because queued is not
   delivered. Say if a queue receipt should carry the mark.
5. **Celebrations that have no place to show.** "Time off approved" and "Shift change approved" on Home and "Your
   statement is ready" on My pay are on the allow-list, but the Direction B Home and Pay screens do not draw them; they
   sit only in the older layouts that Employees no longer see. Decide whether Home and Pay should show the ring.
6. **"Inbox clear"** is on the allow-list and no screen renders it today.
7. **Done results on wide pages.** An inline result fills its card (812 or 1080 wide) and reads from the left. If you
   prefer the 560 state-card width for results, it is one rule.
8. No private token was added. Nothing to approve there.

## Needed from another package

- **A.** `eb-keep-enter` (`employee-b/account.css:278`) waits 300ms, then animates `filter: blur` and `translate` on
  every `b-keep` card. I switched it off only for a card that holds a result (one rule in `b-moments.css`). For every
  other card it still breaks "transform and opacity only" and delays the content; it is A's rule to fix. If A changes
  its selector, my opt-out (`.b-keep:has(> .b-statecard[data-kind="done"])`) still applies.
- **A.** Toasts: the agreed-times screen no longer calls `toast()`. Payroll still does. If A changes toast timing, the
  payroll live block beside it already announces the result.
- **A.** The reminder sheet closes before the result arrives (`reminders.tsx:143`), so the row carries the result.
  If A keeps the sheet open until the reply, the queued line could sit in the sheet.
- **C.** Nothing. The sending state is each button's own word ("Sending…", "Submitting…"); no spinner was added.

## Suggested `DESIGN.MD` lines

- **Success (Phase 7).** One pattern: the kit's done state (`BState kind="done"`). The mark is a green-50 circle with a
  bold green check (48px inline, 56px with a 28px check for a page finish, 36px in a row). It settles once in 300ms
  (`--b-dur-enter`, transform and opacity) and is still under reduced motion and whenever the state was already true
  when the page opened.
- An inline result replaces the form or row it came from: a title that names what is now true, one line with the next
  fact, at most one tinted next step, and a quiet text control for a second way on. A page finish ends a flow: centred,
  one filled button.
- A success shows only after the server confirmed it. "Sent" is not "approved", "queued" is not "delivered", "saved" is
  not "paid". A queue receipt, a closed request and an unknown result never carry the mark.
- A result is said once: `role="status"`, or focus on its title when the screen changed under the person, not both.
- Payroll and money results use the same mark and layout and nothing more.
- Supersedes the U7 "Moment" line (twelve particles, 560ms): a celebrated moment is the same mark with one ring that
  leaves it once. The gate is unchanged.

## Not verified

- **Payroll approval end to end.** The fixture's payrolls are approved or wait for imported amounts, so no real
  approval could be sent. `payroll-approved-forced-*` changes an approved payroll's read to "review required" in the
  page and answers the approval with a receipt made in the page. It proves the card, its words, focus and motion, not
  the server. The log shows the toast "Payroll approved" beside it and no celebration.
- **Payroll announces twice** when focus moves: the feedback block is `aria-live` and the title takes focus. Before, it
  was the block and the toast. I kept the focus move so a keyboard user is not dropped to the top of the page.
- **Payroll import and Paid time export finishes** were not opened in a browser in this phase. They render through the
  same component as the correction finish, which was.
- **Swap and cover results, a `completed` or `closed` shift change, and several timecards at once**: unit tests only.
- **Spanish**: unit tests only; the signed-in app renders English.
- **A Manager** and **the 900 and 320 widths** were not captured. The pattern has no tablet-only rule.
- **Screen reader output** was not heard; the log lists roles, live text and focus.
- The date fields on the time off form show the native value over the styled value when the form is disabled
  (`timeoff-not-confirmed-390`). It is there without this package and is not a success state; not fixed.
- On phones the payroll review page shows a white gap between the band's title and its teal sub-line
  (`payroll-approved-forced-390`). It is above the result card and comes from the page's own header blocks.
- On desktop the published card pushes the week stepper off the band, where its white text is hard to read
  (`schedule-published-1440`). The card stood in the same place before this package; the stepper is the Schedule
  sheet's.
- The Schedule page logs "`<summary>` cannot be a descendant of `<p>`" in development with and without the published
  card. Not from this package.


---
Filing note (Nov 17, 2026): paths that start `p7a-work/`, `p7b-work/`, `p7c-work/` or `p7patches/` name the builder's working files, which were not kept. The pictures kept are in the evidence folder beside this report; where a builder captured more frames than are filed, the file named may not be there.
