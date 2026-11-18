# Package C: U10, reminders (builder C)

Base `c30f530e`. Worktree `wt/p4c`. Patch `p4patches/c.patch`. Evidence `p4patches/c-evidence/`.

## What was built

One reminder pattern, used in two places. Nothing was added to navigation.

**Availability, the "Not sent" card** (`/app/availability`, Owner and Manager, reached from Things to do as before).
Each person who has not sent the week's availability gets one slot on the right of their row. The page asks the server,
per person, whether a reminder can go, then shows a tinted "Remind" pill or the reason there is none. When two or more
people can be reminded, the card's header shows "Remind 3 people". A week with no deadline shows one line
("Reminders need a deadline. Set one in Scheduling rules.") and no control. A closed week shows no control.

**An update's "Read by" list** (`/app/updates/<id>`, Owner and Manager, must-read updates only). Each person who has
not confirmed the update gets the same control after "Not yet". Optional updates get none (the contract refuses them).

**The check before sending.** "Remind" opens the app's own sheet (`QuietSheet`): a bottom sheet on phones, a centred
card from 768px. It says who gets it, what it is about, how it goes out, the earliest it can go out, when the source is
due, and the limit. One filled "Send reminder" and "Cancel". For several people it lists everyone with their state,
counts only the people the server said can be queued, and after sending shows one line per person with that person's
result and a "Check again" where a result is not confirmed.

**Who sees it.** Only an Owner or Manager session renders a control: the server page passes the values only for those
roles, and the Updates read carries the recipient list only for management. Employees and Leads see no reminder
control (the contract gives a Lead no authority; a Lead capture of `/app/availability` is in the evidence).

**New files** (all client side, under `src/components/reminders/`):
`machine.ts` (state machine and response parser), `flows.ts` (send and lookup sequences), `store.ts` (tab-level store),
`client.ts` (the three requests), `use-reminders.ts` (hook), `view.ts` (what each state says), `copy.ts` (English and
Spanish), `reminders.tsx` (provider, row control, bulk button, sheets), and four test files.
**Edited**: `src/components/availability-team-list.tsx` (mount, mine), `src/components/manager-availability.tsx`
(hands over authority, week, deadline; mine), `src/components/communication-detail.tsx` (shared: one import and the
mount inside the existing "Read by" list, nothing else), `src/components/availability-team-list.test.tsx`
(two tests added), `src/app/app/b-reminders.css`.
No server module, route, kit file, navigation file or shared stylesheet was edited.

### MG-016: how the page gets the `authority`

No server change was needed. The contract says to "derive authority using the existing server communication-context
contract". The Updates pages already do that in their server component (`communicationAuthority(proof)` from
`src/lib/communications/service.server.ts`, passed to the client as a prop). `manager-availability.tsx` (a server
component) now does the same and hands the value to the list. On an update, the read itself carries it
(`CommunicationRead.authority`, the same function). The command also needs `weekStart` and `expectedDeadline`; the page
already had both (`getWeekSettings`). So the button is in.

## Contract coverage

| Requirement | Status | Endpoint / module |
| --- | --- | --- |
| Row control: ready | done | `POST /api/manager/reminders/eligibility` `ready`; `machine.ts`, `view.ts` |
| Row control: cooldown | done. Says "One reminder a day · can remind again today after 9:00 PM" from `nextEligibleAt` (the next queue opening), and "no time left before this closes" when it is null. It does not say "Reminded 2 h ago": the contract gives no time of the last reminder | eligibility `cooldown` |
| Row control: queued / already queued | done. "Reminder queued · 3:02 PM" (the time the receipt arrived, workplace zone), "Reminder queued" for a recovered receipt, "Reminder already queued". Never "sent" or "delivered" | `POST /api/manager/reminders` `committed`, eligibility `committed` |
| Row control: held | done. `held/activation_held` and `unavailable/module_off` keep the action off, amber | eligibility 503 / 404 |
| Row control: blocked | done. Signed out (401), no access (403), stale page (`invalid_command`). No target or scope is revealed | eligibility / command 401, 403 |
| Row control: conflict | done. "This changed while you were looking." with Refresh (re-reads the page and the reminder); `source_expires_before_delivery` says it is too late | 409 |
| Row control: result not confirmed | done. Amber, "We couldn’t confirm this reminder. Check again". The check is `GET /api/manager/reminders/operations/<original id>`; nothing new is posted (capture: 0 new posts, every lookup id is a sent id) | `flows.ts`, `store.ts` |
| Row control: not sent (manual Owner help) | done. A Manager without Company access reads "Can’t remind: your access doesn’t cover this. Nothing was sent. Ask your workplace Owner to review your access." plus a link to `/support`. No request, no retry button, no new scope | contract "Restricted-access Owner help" |
| Row control: not sent after a lookup | done. `operation_not_found` reads "Not sent. Nothing was queued." with "Send again", which replays the exact original body and id | lookup |
| Check before sending, one person | done | `reminders.tsx` `OneBody` |
| The exact message | not done: the contract does not expose the message text (see For Codex 1). The sheet says what the reminder is about instead | |
| When they were last reminded | not done: not in the contract (For Codex 2). The sheet states the limit instead | |
| Check before sending, several people | done. One command per person, sent one after another, each with its own id and result | `ManyBody` |
| Availability "Not sent" (Owner, Manager) | done | kind `AVAILABILITY` |
| Updates "to confirm" (Owner, Manager) | done on the update's own "Read by" list | kind `COMMUNICATION` |
| Schedule "not confirmed yet" | not done: `ManagerReminderCommand` has two kinds only, `AVAILABILITY` and `COMMUNICATION`. No kind was invented (For Codex 3) | `src/lib/manager-reminders/types.ts` |
| "Reminders" history | not done: the contract offers no read for it ("There is no delivery-status endpoint"). Nothing was invented (For Codex 4) | |
| Employees and Leads see no control | done | page role check, `ReminderProvider` renders nothing without authority |
| States: loading, error, offline, not allowed | done | see States |
| Client state machine with tests for every transition, unknown path, EN and ES renders | done: 51 tests in `src/components/reminders/` (machine 24, store 7, copy 5, renders 15) and 2 added to `availability-team-list.test.tsx` | |
| Acceptance: consume all states under current communication authority | done. Headers `X-Nevora-Reminder: 1` and `X-Nevora-Reminder-Authority`, same value in the body | `client.ts` |
| Acceptance: after an uncertain write keep the original command/ID and query it; never mint a replacement | done. The command is frozen while sending, unknown, not sent or queued. It also survives the page being redrawn (see "One thing to know") | `machine.ts` `frozen`, `store.ts` |
| Acceptance: never say delivered from a queue receipt | done, and tested (`copy.test.ts`, `reminders.test.tsx`) | |
| Acceptance: manual Owner help is explicitly not sent and grants no new scope | done | `view.ts` |
| Acceptance: D04 / Updates / provider holds remain effective | done. The UI adds no way around a hold: held and module-off rows have no button, and the write still decides | |

### One thing to know: the store lives above the page

Operational pages are wrapped in `ScopedReadFrame`, which clears and redraws the page when the window loses focus or
the page's 15 second lifetime ends. A component's own state goes with it. An unconfirmed reminder would have lost its
id. So the machines are kept in a tab-level store (`store.ts`), the same idea as the Updates recovery ("lives above
disposable private content"). It holds memory only, is keyed by the session's authority, and a new sign-in starts
empty. When the page comes back, frozen commands are kept as they were and everything else is read again.

## States

"Real" means the real local app and its owned local Postgres answered. "Forced" means the request was answered in the
page with a body from the contract (`page.route`). Each Owner capture run queued one reminder in its own disposable local database
(environment `test`); no provider was called and nothing left the machine.

| State | Where | How produced | Evidence |
| --- | --- | --- | --- |
| Ready ("Remind") | row | real, Owner; also real for the company Manager (capture log `mgr-real`, 4 of 4 ready) | `availability-reminders-real-1440.png`, `-900.png`, `-390.png`, `-320.png` |
| Loading (quiet bar, no spinner) | row | forced (request held open) | `availability-row-error-conflict-signedout-loading-*.png` (4th row) |
| Cooldown | row | real, after a real queue and a reload | `availability-real-reload-cooldown-1440.png`; forced in `availability-row-ready-cooldown-held-blocked-*.png` |
| Cooldown, no budget left | row | forced | `availability-row-nobudget-toolate-updatesoff-stale-*.png` |
| Queued | row | real (capture log `real-1440`: ready, send, "Reminder queued · 10:40 AM", reload, cooldown) and forced | `availability-row-unknown-queued-notsent-alreadyqueued-*.png`, `reminder-focus-row-after-send-1440.png` |
| Already queued | row | forced | same set, 4th row |
| Held (activation hold) | row | forced | `availability-row-ready-cooldown-held-blocked-*.png` |
| Held (Updates off) | row | forced | `availability-row-nobudget-toolate-updatesoff-stale-*.png` |
| Blocked, no access (Owner wording) | row | forced | `availability-row-ready-cooldown-held-blocked-*.png` |
| Blocked, no access (Manager wording, manual Owner help) | row | forced, signed in as the Manager | `availability-manager-not-allowed-390.png` |
| Blocked, signed out | row | forced | `availability-row-error-conflict-signedout-loading-*.png` |
| Blocked, stale page | row | forced | `availability-row-nobudget-toolate-updatesoff-stale-*.png` |
| Conflict | row | forced | `availability-row-error-conflict-signedout-loading-*.png` |
| Too late (expires first) | row | forced | `availability-row-nobudget-toolate-updatesoff-stale-*.png` |
| Result not confirmed | row | forced (`outcome_unknown`, lookup `operation_unavailable`) | `availability-row-unknown-queued-notsent-alreadyqueued-*.png` (1st row) |
| Not sent after lookup | row | forced (502 on send, lookup `operation_not_found`) | same set, 3rd row |
| Error, with support reference | row | forced (`read_failed`, `X-Nevora-Request-Id`) | `availability-row-error-conflict-signedout-loading-*.png` (1st row) |
| Offline | row | real browser offline | `availability-row-offline-390.png` |
| Confirmation, one person | sheet | real eligibility read | `reminder-confirm-one-390/900/1440.png` |
| Confirmation, several | sheet | forced mix (2 ready, 1 cooldown, 1 held) | `reminder-confirm-several-390/900/1440.png` |
| Per-person results | sheet | forced (1 queued, 1 not confirmed) | `reminder-results-several-390/900/1440.png` |
| Update, "Read by" with reminders | row | real | `update-readby-reminders-390.png`, `update-reminder-confirm-1440.png` |
| No control for a Lead | page | real | `availability-lead-no-controls-390.png` |
| No deadline | card | unit test only | `availability-team-list.test.tsx` |
| Sending ("Queuing reminder…"), still not confirmed, sign in again then check | row | unit test only (still-not-confirmed also seen in capture log) | `reminders.test.tsx` |

## Keyboard and focus

Walked in the capture tool at 1440 and 390 (log `keyboard-1440`, `keyboard-390`):

1. Tab reaches the "Remind" pill (name "Remind Daniel Cruz", 2px teal focus ring).
2. Enter opens the sheet. Focus is inside it, on its heading "Remind Daniel Cruz?" (the dialog is modal and labelled by
   that heading).
3. Tab: "Send reminder". Tab: "Cancel". Shift+Tab: back to "Send reminder". `reminder-focus-send-1440.png`.
4. Escape closes it. Focus is back on the same "Remind" pill. `reminder-focus-back-after-escape-1440.png`.
5. Space reopens it. Tab, Enter sends. The sheet closes and focus lands on that person's row control, which now reads
   "Reminder queued · 10:40 AM", with a focus ring. `reminder-focus-row-after-send-1440.png`.
6. The result is announced once in a polite live region: "Daniel Cruz: Reminder queued · 10:40 AM".
7. Several people: after "Send 2 reminders" focus moves to the heading "Reminder results"; the summary is a live
   region. "Done" returns focus to "Remind N people", or to the first person's row when that button is gone.

Tab order on a row: the person's link, then the reminder control. Row buttons are 36px high with a 44px hit area (the
kit's `b-btn`). The first eligibility read is not announced (it would speak once per row); the placeholder has
screen-reader text "Checking if a reminder can go". Amber and red states carry an icon as well as colour.

## English and Spanish

The signed-in app is English only today, so these screens render `en`. Every string is in
`src/components/reminders/copy.ts` with an `en` and an `es` entry (the type forces the same keys).
`reminders.test.tsx` renders every row state, both confirmations and the results in Spanish and checks that no English
sentence of the feature and no missing value appears. `copy.test.ts` checks key parity and the copy rules.
Not localized: the week label and the update title, which the page passes in as it has them, and the existing pages'
own words around the control.

## Copy

Every new user-facing string. No payroll sentence is involved.

| Key | English | Spanish |
| --- | --- | --- |
| `remind` | Remind | Recordar |
| `remindAria` | Remind ${name} | Recordar a ${name} |
| `remindMany` | Remind ${count} people | Recordar a ${count} personas |
| `checking` | Checking if a reminder can go | Verificando si se puede enviar un recordatorio |
| `sending` | Queuing reminder… | Poniendo el recordatorio en cola… |
| `cooldown` | One reminder a day · can remind again ${when} | Un recordatorio al día · se puede recordar de nuevo ${when} |
| `cooldownNone` | One reminder a day · no time left before this closes | Un recordatorio al día · no queda tiempo antes del cierre |
| `queuedAt` | Reminder queued · ${time} | Recordatorio en cola · ${time} |
| `queued` | Reminder queued | Recordatorio en cola |
| `alreadyQueued` | Reminder already queued | El recordatorio ya estaba en cola |
| `heldActivation` | On hold: reminders are paused for this workplace | En pausa: los recordatorios están detenidos para este lugar de trabajo |
| `heldModule` | On hold: Updates is off for this workplace | En pausa: Novedades está apagado para este lugar de trabajo |
| `signedOut` | Can’t remind: your session ended. Nothing was sent. | No se puede recordar: la sesión terminó. No se envió nada. |
| `signIn` | Sign in again | Iniciar sesión de nuevo |
| `noAccessManager` | Can’t remind: your access doesn’t cover this. Nothing was sent. Ask your workplace Owner to review your access. | No se puede recordar: su acceso no cubre esto. No se envió nada. Pida al Owner de su lugar de trabajo que revise su acceso. |
| `noAccessOwner` | Can’t remind: your current access doesn’t cover this. Nothing was sent. | No se puede recordar: su acceso actual no cubre esto. No se envió nada. |
| `support` | Contact support | Contactar a soporte |
| `stale` | Can’t remind: this page is out of date. Nothing was sent. | No se puede recordar: esta página no está al día. No se envió nada. |
| `changed` | This changed while you were looking. | Esto cambió mientras lo veía. |
| `expiresFirst` | Too late to remind: this closes before a reminder could go out. | Ya es tarde para recordar: esto cierra antes de que pueda salir un recordatorio. |
| `refresh` | Refresh | Actualizar |
| `unknown` | We couldn’t confirm this reminder. | No pudimos confirmar este recordatorio. |
| `unknownStill` | Still not confirmed. Nothing new was sent. | Sigue sin confirmarse. No se envió nada nuevo. |
| `unknownAccess` | We couldn’t confirm this reminder. Sign in again, then check. | No pudimos confirmar este recordatorio. Inicie sesión de nuevo y vuelva a verificar. |
| `checkAgain` | Check again | Verificar de nuevo |
| `looking` | Checking… | Verificando… |
| `notSent` | Not sent. Nothing was queued. | No se envió. No quedó nada en cola. |
| `sendAgain` | Send again | Enviar de nuevo |
| `error` | Couldn’t check if a reminder can go. | No se pudo verificar si se puede enviar un recordatorio. |
| `tryAgain` | Try again | Intentar de nuevo |
| `reference` | Support reference ${id} | Referencia de soporte ${id} |
| `offline` | You’re offline. Connect to remind. | No hay conexión. Conéctese para recordar. |
| `needsDeadline` | Reminders need a deadline. Set one in Scheduling rules. | Los recordatorios necesitan una fecha límite. Fíjela en Reglas de horarios. |
| `oneTitle` | Remind ${name}? | ¿Recordar a ${name}? |
| `manyTitle` | Remind ${count} people? | ¿Recordar a ${count} personas? |
| `manyTitleNone` | No one to remind right now | Nadie a quien recordar por ahora |
| `factWho` | Who gets it | Quién lo recibe |
| `factAbout` | About | Sobre |
| `aboutAvailability` | Availability for the week of ${week} | Disponibilidad para la semana del ${week} |
| `aboutUpdate` | The update “${title}” | La novedad «${title}» |
| `factHow` | How it goes out | Cómo sale |
| `how` | NEVORA puts a notification in the queue for them. We can’t confirm when they see it. | NEVORA pone una notificación en cola para la persona. No podemos confirmar cuándo la ve. |
| `factWhen` | Earliest it can go out | Lo más temprano que puede salir |
| `factDue` | Due | Fecha límite |
| `factEnds` | Reminder ends | El recordatorio termina |
| `factLimit` | Limit | Límite |
| `limit` | One reminder per person a day. Quiet hours are 9:00 PM to 7:00 AM. | Un recordatorio por persona al día. Las horas de silencio son de 9:00 PM a 7:00 AM. |
| `send` | Send reminder | Enviar recordatorio |
| `sendMany` | count === 1 ? 'Send 1 reminder' : Send ${count} reminders | count === 1 ? 'Enviar 1 recordatorio' : Enviar ${count} recordatorios |
| `cancel` | Cancel | Cancelar |
| `done` | Done | Listo |
| `people` | People | Personas |
| `ready` | Ready | Listo para recordar |
| `manyCount` | ${count} of ${total} can be reminded now. | Se puede recordar a ${count} de ${total} ahora. |
| `resultsTitle` | Reminder results | Resultados de los recordatorios |
| `resultsSummary` | ${count} of ${total} queued. Queued is not delivered. | ${count} de ${total} en cola. En cola no significa entregado. |
| `resultsWorking` | Working through the list… | Pasando por la lista… |
| `today` | today | hoy |
| `tomorrow` | tomorrow | mañana |
| `afterToday` | today after ${time} | hoy después de las ${time} |
| `afterTomorrow` | tomorrow after ${time} | mañana después de las ${time} |
| `afterDay` | ${day} after ${time} | el ${day} después de las ${time} |

Notes on the words:
- "Send reminder" is the action's name (Jose's brief). Every result says "queued", never "sent" or "delivered".
- "Quiet hours are 9:00 PM to 7:00 AM" is written from the README ("21:00–07:00 quiet hours"). The server does not
  return the hours. If the policy changes, this sentence must change.
- "today" / "tomorrow" start with a capital where they stand alone in the sheet ("Today, 10:02 AM").

## Checks run

| Check | Result |
| --- | --- |
| `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit -p .` | `src` clean (only `zz-scan/` lines, the capture tool's) |
| `npx eslint src/components/reminders src/components/availability-team-list.tsx src/components/availability-team-list.test.tsx src/components/manager-availability.tsx src/components/communication-detail.tsx` | clean |
| `npx vitest run src/components/reminders src/components/availability-team-list.test.tsx src/components/communication-detail.test.tsx src/app/app/b-viewport.test.ts src/app/app/b-foundation.test.ts` | 8 files, 142 tests, all pass, on the final commit |
| `npx vitest run --dir src src/app src/components src/lib --testTimeout=30000` | 868 files passed, 24 skipped; 13,106 tests passed, 741 skipped; 0 failed. Run on the commit before the last stylesheet-only edits. `src/test/manual-publication.test.ts` did not fail in this run |
| Browser captures (`cap.sh`, owner, manager, lead; 1440, 900, 390, 320) | see States and the evidence. `overflow` 0 at every width and in every state. No `pageerror`. Frame probe at 1440 and 900: title top 130, band bottom 296, first card 24px under the band, card 812 wide, unchanged from before |

An earlier full unit run showed 4 failures in `availability-team-list.test.tsx` and `communication-detail.test.tsx`:
my provider called `useRouter`, which throws without a router. Fixed by reading the router from its context
(see Not verified 6). One run under machine load also timed out `src/lib/scheduling/generation/planner.test.ts`
(not mine; it passed in the clean run).

Not run: the hosted preview, any real device, WebKit or Firefox, a screen reader, 200% text size, motion on
(captures run with reduced motion).

## For Codex

1. **The exact message.** The contract does not give the manager the text the person will receive. `plan.ts` builds it
   on the server (`buildAvailabilityReminderNotification`; for an update "New team update" / "Open NEVORA to read it.").
   If the confirmation should show it, `ready` could carry `title` and `body`. Until then the sheet says what the
   reminder is about.
2. **When they were last reminded.** `cooldown` carries only `nextEligibleAt`. "Reminded 2 h ago" needs the time (and
   whether it was a manual or an automatic reminder, and whether it was queued, failed or cancelled, since all of them
   use the day's budget). Today the row says "One reminder a day · can remind again today after 9:00 PM".
3. **Schedule "not confirmed yet".** `ManagerReminderCommand` has `AVAILABILITY` and `COMMUNICATION` only. A schedule
   acknowledgement kind would be needed before a reminder can appear on Schedule. Not built.
4. **History.** There is no read of past manual reminders. Not built.
5. **One read per person.** The eligibility read is one target per request and takes the source locks each time
   (`LOCK TABLE employees IN SHARE MODE`, the availability or communication locks). A list of N people is N reads. The
   UI reads one at a time, only for rows on screen (rows inside a closed "Read by" are not read), and again when the
   page is redrawn. A list read (one request for the people on a source) would be lighter. During captures on a loaded
   machine some unrelated page loads answered 503 ("Team availability unavailable", "Couldn’t check your access")
   while reads were running. I did not prove a link.
6. **The command under the activation hold.** Reading `service.server.ts`: `executeManagerReminder` does not map the
   `communication_activation_held` sentinel (only the eligibility read does), so a command that meets the hold returns
   `unavailable/read_failed`, and the lookup returns `unavailable/operation_unavailable`. The UI cannot tell that from
   an uncertain write, so it shows "We couldn’t confirm this reminder" until the hold lifts. It can only happen when a
   hold starts between the read and the press. Returning `held/activation_held` from the command (nothing was
   dispatched) would let the row say "On hold". `ManagerReminderResult` has no `held` today; the UI already accepts it.
7. **`unavailable/read_failed` from the command** is returned before anything is dispatched, so it is a definite "not
   queued", but the body does not say so. The UI treats every `unavailable` from the command as not confirmed and looks
   the id up (`operation_not_found` then reads "Not sent. Nothing was queued."). A distinct reason would save a request.
8. The brief lists "held" as a lookup result. The lookup cannot return it today. The machine handles it and keeps the id.

## For Jose to decide

1. **Check every row, or check on tap.** Built as the brief says: every "Not sent" row is checked when it appears, so
   the row can say cooldown, held or blocked before anyone taps. The cost is one server read per person per page view
   (For Codex 5). The alternative is a plain "Remind" on every row with the check when the sheet opens.
2. **Cooldown words.** "One reminder a day · can remind again today after 9:00 PM" instead of "Reminded 2 h ago · can
   remind again at 4:10 PM", because the server does not say when the last one was.
3. **"Send again"** after "Not sent. Nothing was queued." sends at once (it is the same reminder that was already
   confirmed). Say if it should open the confirmation again.
4. **Spanish words to review:** "Novedades" for Updates, "lugar de trabajo" for workplace, "Owner" left in English in
   "Pida al Owner de su lugar de trabajo que revise su acceso", "Reglas de horarios" for Scheduling rules,
   "horas de silencio" for quiet hours.
5. **Where the Updates reminder lives.** It is on the update's own "Read by" list. The Updates list page has no
   per-person rows, so nothing was added there.

## Needed from another package

Nothing.

## Not verified

1. Real answers for held, blocked, conflict, outcome unknown, lookup results and "Updates off": all forced in the page.
   The local database passes the development guard, so the real server answered ready, queued and cooldown only.
2. Delivery. Nothing was delivered or meant to be. One reminder per Owner run was queued in a disposable local database.
3. A Manager without Company access against the real server (the fixture Manager has Company access, so the real answer was ready; the "not allowed" row is forced).
4. Conflict "Refresh" against a source that really changed (unit tests cover the state change; the capture only shows
   the row).
5. The 15 second page redraw with an unconfirmed reminder on screen, in a browser. `store.test.ts` covers it; the
   capture tool lost focus once by accident and the page redrew, which is how the need was found.
6. `reminders.tsx` reads the router from Next's `AppRouterContext`
   (`next/dist/shared/lib/app-router-context.shared-runtime`) instead of `useRouter`, so the two existing page tests
   keep rendering without a router. It is a Next internal path; a type error will show if a Next upgrade moves it.
7. 200% text size, a screen reader, WebKit, motion on, 768px exactly.
8. Every evidence file is from the final commit (`c5c3c051`, temporary), three runs: Owner, Manager, Lead.
