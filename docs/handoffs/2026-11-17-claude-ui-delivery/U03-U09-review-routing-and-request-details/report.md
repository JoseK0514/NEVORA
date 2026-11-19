# Package D: review routing and counts (U03), request details and coverage labels (U09)

Worktree `wt/p4d`. Base `c30f530e`. Presentation only. No server module, route, read or calculation was changed.

## What was built

**Home, `/app` (Owner and Manager; sidebar or tab "Home")**
- Payday (Owner with Payroll) and Timecards (Manager, or Owner without Payroll) now read one function, `paydayReview`. It counts the timecards whose pay period has ended and that this person may review. The older corporate Payday card under the Direction B screen reads the same function.
- A card that needs another reviewer is never counted. It has its own line: "Another reviewer approves your timecard" or "Another reviewer approves 2 timecards".
- A count that is a lower bound says so: "At least 2 to approve", "At least 17 things need you", pill "At least 17". With clock-ins unread the Not clocked in figure is "—", not 0, and the title is never "You're all set".
- On now: a late clock-in shows the server's minutes ("Clocked in late · 12 min") or the words alone.
- This week: "Staffing 57%" has a "What this measures" control. No staffing needs reads "No staffing needs set".

**Things to do, `/app/inbox` (Owner and Manager; sidebar "Things to do", Home "See all")**
- A swap row shows both shifts, each with date, time and place. A withheld second shift reads "The other shift's details are not available". A second shift the read does not carry reads "The other shift is not shown here. Open the request to see it."
- A cover request row says its result: picked up by whom, nobody yet, waiting for an answer, withdrawn, expired, or "Result not known".
- Timecards: the count and the names are the cards this person may review. A card another reviewer approves is its own grey row ("Your timecard", or the person's name) with "Another reviewer approves this one". The same for time corrections.
- The band says "At least N things need you" when clock-ins could not be read. An empty list with a source unread is "Nothing to do right now", not "You're all set".

**Shift requests, `/app/exchange` (Owner and Manager; Things to do, "Shift requests")**
- An opened cover request has a "Result" row with one phrase per state.
- An opened can't-work request, waiting or done, has a "Cover, as recorded" row from the request's linked history, and a line that says it is history and not today's staffing.
- An opened swap already showed both shifts from the full record. That is unchanged.

**Insights, `/app/reports` (Owner and Manager with company access; sidebar "Insights")**
- Hours by day draws a light bar for the published schedule's time behind each day's recorded bar. A day with no published schedule has no light bar and is named under the chart. A day whose scheduled time cannot be given is named too. Screen readers get both figures per day.
- "Cover filled" is now "Cover requests filled · 1 of 3 seen", with an explanation that it is a history of what was recorded.

**Schedule, `/app/schedule`**: the header coverage line (desktop and tablet) and the band (phone) carry the same explanation control and "No staffing needs set". The draft builder's result line now reads "Time fully staffed 25%" (it was "25% of needed hours covered").

**Team, `/app/employees`**: "Clocked in late · 12 min" when the server sent minutes.

**Employee Home (count and "nothing to do" only)**: the Things to do pill reads "At least N" when the read is partial or carries no task facts. "You're all set" shows only on the server's `allSet`. With information only and nothing to do it reads "Nothing to do right now."

## Contract coverage

| Requirement | Status | Endpoint and module |
|---|---|---|
| U03.1 Typed fields, no title inference | done. `present.ts` no longer tests `/^Your correction/`. `review-routing.ts` routes by `actorMayReview`, `independentReviewRequired`, `concernsActor`. A test scans 12 source files and fails if a title is used for routing again. | `POST /api/manager/action-center`, `ActionItem.review` |
| U03.2 Payday shows 2 everywhere | done. One function for the Direction B tile, both frames, and the older corporate card. Unit test with three closed cards (two reviewable, one own). Captures at 390, 900, 1440 for Owner and Manager. | same |
| U03.3 The other-reviewer item stays visible | done. Home line, Things to do row, corporate row. It says "Another reviewer approves this one" and "It needs an Owner or a Manager with company access." No name and no date. | `review.requiredReviewer`, `deadlineAt` |
| U03.4 Unknown totals | done for Home, Things to do and Employee Home. partly for the sidebar and tab badge: see "Needed from another package". | `needsYouTotal`, `homeTaskTotal`; `GET /api/employee/home` `tasks` |
| Acceptance: titles and language do not change counts | done, unit tested | |
| Acceptance: partial or legacy sources | done. An item with no `review` is "could not be checked", not counted, and makes the count "At least". | |
| U09.1 Swap counterpart shift | done on Things to do rows from `request.shift` and `request.counterpartShift`. Shift requests page already read the full record. | `ActionRequestFacts` |
| U09.1 Coverage request outcome, each distinct | done. Things to do from `request.status`. Shift requests from `ExchangeRecord.status` and `CalloutRecord.coverage`. | `listPendingCallouts`, `listTeamCalloutHistory` (read as before) |
| U09.1 "The current period" | done as the timecard's own period from `review.period`. If Jose meant something else, see "For Jose to decide". | |
| U09.2 Lateness | done on Home On now and Team. Things to do shows no late clock-in today (its "Started 52 min ago" chip is a shift with no clock-in, a different fact). | `GET /api/manager/today`, `TodayShift.lateMinutes` |
| U09.3 Scheduled against recorded by day | done | `POST /api/reports`, `projectReports`, `scheduledByDay` |
| U09.3 Coverage label and explanation | done, with one correction to the brief: see "For Jose to decide" item 1. | `CoverageMinutes`; generation `coverage.basis` |
| U09.3 Observed coverage outcomes as history | done | `coverageReliability` |
| U09.4 Tests: partial, unknown, overnight, DST | done | |

## States

| Screen | State | How produced | Evidence |
|---|---|---|---|
| Home | Payday counts 2 of 3, other-reviewer line (Owner, Payroll frame) | forced: three timecards put into the real local action center response in the page | `home-payday-2of3-owner-390/900/1440.png` |
| Home | Timecards counts 2 of 3 (Manager frame) | forced, same | `home-payday-2of3-manager-390/900/1440.png` |
| Home | "At least N", clock-ins unread | forced: `GET /api/manager/today` answered 500 | `home-at-least-owner-390/900/1440.png` |
| Home | older payload without review facts: "At least 2", "1 timecard could not be checked" | forced | `home-payday-unchecked-owner-390.png` |
| Home | late with minutes, late without minutes, on time, not clocked in | forced today response. Real local server also showed "Clocked in late · 9 min" (see the Manager Home captures). | `home-late-owner-1440.png` |
| Home | coverage label, control focused, explanation open | real local server | `home-coverage-focus-390.png`, `home-coverage-explained-1440.png` |
| Home | exact count, all set, loading, failed, offline, paused | unit tests (existing and new). Not re-captured: unchanged. | |
| Things to do | swap known, swap withheld, swap missing; cover picked up, nobody, withdrawn, expired, not known; other-reviewer correction and timecard | forced items in the real page | `inbox-details-owner-390/1440.png`, `inbox-other-reviewer-manager-900.png` |
| Things to do | "At least N" band | forced (today 500) | `inbox-at-least-owner-390.png` |
| Things to do | empty with a source unread; empty and complete | unit test only | |
| Shift requests | swap opened, both shifts | real local server | `exchange-swap-open-390/1440.png` |
| Shift requests | can't-work opened, "No cover request was made" | real local server | `exchange-callout-cover-history-390.png` |
| Shift requests | open cover, "Nobody has picked it up yet" | real local server | `exchange-cover-nobody-900.png` |
| Shift requests | done can't-work, "Cover was asked for. Nobody is confirmed yet." | real local server | `exchange-done-cover-history-1440.png` |
| Shift requests | picked up, withdrawn, expired, completed, closed, not known | unit tests only (the fictional workspace has no such request) | |
| Insights | scheduled behind recorded, real published week | real local server | `reports-week-real-1440.png` |
| Insights | sparse day ("No published schedule: ..."), explanation open and focused | forced: one day's published shifts removed from the real report source | `reports-sparse-explained-390/1440.png` |
| Insights | unpublished period ("Scheduled time not available") | real local server (last week is not published in the fictional workspace) | `reports-unpublished-900.png` |
| Insights | keyboard focus on the explanation control | real local server | `reports-explain-focus-390.png`, `reports-explain-focus-1440.png` |
| Insights | older report without daily schedule; cover none seen; unread changes | unit tests only | |
| Schedule | coverage explanation open, phone band and desktop header | real local server | `schedule-coverage-explained-390/1440.png` |
| Team | late with minutes, late without | unit test only (the forced shifts did not match the Team roster, so no capture shows the chip) | |
| Employee Home | exact count, "At least", all set, nothing to do, partial | unit tests only. No capture: only the count and the empty line changed. | |

The capture command exits 1 because three forced-route requests were still open when their page closed (a capture tool error, logged as "3 errors"). Every state step logged `ok: true`. Overflow was 0 on every captured route and width. No `pageerror` was logged.

## Keyboard and focus

- The explanation control is a native `<details>`/`<summary>` styled as the kit's quiet pill. Tab reaches it, Enter and Space open and close it, and focus stays on it. Measured on Insights at 1440: 19 Tabs from page load (17 at 900); order before it is Search, Notifications, account menu, Report period, Export, then the control. Space opened it, Enter closed it, focus stayed (`reports-keys` log).
- Focus ring: 2px solid teal `rgb(11, 110, 105)` on white, 2px white on the teal band (Schedule phone header). Recorded from computed style.
- The compact (icon only) control on the Schedule header has `aria-label="What this measures"`. The sentence has `role="note"`.
- New rows in Things to do are links like the rows around them. Each has an `aria-label` that includes the reviewer sentence or the shift lines.
- Phone (390): 7 Tabs from page load: More, This week, Last week, 30 days, Custom, then the control. Evidence `reports-explain-focus-390.png` and `reports-explain-focus-1440.png`.

## English and Spanish

The signed-in app renders English only today, so these screens render `en`. Every new string is in `src/components/review-details/copy.ts` with an `es` entry. `copy.test.ts` checks key parity, that no Spanish entry is empty or left in English, and the copy rules in both languages. `request-details.test.ts` renders every request-detail state through the Spanish copy. The screens themselves were not rendered in Spanish: they have no language input, and the strings around mine (existing ones) are English only.

## Copy (new sentences; no payroll sentence was added or changed)

Payday's existing lines are reused. One existing line was replaced because it was wrong for an Owner: "An Owner approves your timecard" is now "Another reviewer approves your timecard".

| Key | English | Spanish |
|---|---|---|
| `otherReviewer` | 'Another reviewer approves this one' | 'Otra persona aprueba esta' |
| `reviewerNeeded` | 'It needs an Owner or a Manager with company access.' | 'Hace falta un dueño o un gerente con acceso a toda la empresa.' |
| `reviewUnchecked` | 'Who approves this could not be checked' | 'No se pudo comprobar quién aprueba esto' |
| `yourTimecard` | 'Your timecard' | 'Su tarjeta de tiempo' |
| `yourCorrection` | 'Your time correction' | 'Su corrección de tiempo' |
| `otherReviewerCount` | n === 1 ? 'Another reviewer approves 1 timecard' : `Another reviewer approves ${n} timecards` | n === 1 ? 'Otra persona aprueba 1 tarjeta de tiempo' : `Otra persona aprueba ${n} tarjetas de tiempo` |
| `otherReviewerYours` | 'Another reviewer approves your timecard' | 'Otra persona aprueba su tarjeta de tiempo' |
| `uncheckedCount` | n === 1 ? '1 timecard could not be checked' : `${n} timecards could not be checked` | n === 1 ? 'No se pudo comprobar 1 tarjeta de tiempo' : `No se pudieron comprobar ${n} tarjetas de tiempo` |
| `atLeast` | `At least ${n}` | `Al menos ${n}` |
| `toApprove` | exact ? `${n} to approve` : `At least ${n} to approve` | exact ? `${n} por aprobar` : `Al menos ${n} por aprobar` |
| `toReview` | `${exact ? '' : 'At least '}${n} ${n === 1 ? 'timecard' : 'timecards'} to review` | `${exact ? '' : 'Al menos '}${n} ${n === 1 ? 'tarjeta de tiempo' : 'tarjetas de tiempo'} por revisar` |
| `needYou` | `${exact ? '' : 'At least '}${n} ${n === 1 ? 'thing needs' : 'things need'} you` | `${exact ? '' : 'Al menos '}${n} ${n === 1 ? 'asunto pendiente' : 'asuntos pendientes'}` |
| `toDoAtLeast` | `At least ${n} ${n === 1 ? 'thing' : 'things'} to do today.` | `Al menos ${n} ${n === 1 ? 'asunto' : 'asuntos'} por atender hoy.` |
| `reviewAtLeast` | `Review at least ${n} ${n === 1 ? 'timecard' : 'timecards'}` | `Revisar al menos ${n} ${n === 1 ? 'tarjeta de tiempo' : 'tarjetas de tiempo'}` |
| `noneForYou` | 'None for you to review right now' | 'Nada que le toque revisar por ahora' |
| `notAllChecked` | 'Not everything could be checked' | 'No se pudo comprobar todo' |
| `notAllCheckedLine` | 'Some of this list could not be checked. Try again in a moment.' | 'Parte de esta lista no se pudo comprobar. Inténtelo de nuevo en un momento.' |
| `clockInsUnchecked` | 'Clock-ins could not be checked, so people may be missing from this list.' | 'No se pudieron comprobar las entradas, así que pueden faltar personas en esta lista.' |
| `correctionsUnchecked` | n === 1 ? '1 time correction could not be checked.' : `${n} time corrections could not be checked.` | n === 1 ? 'No se pudo comprobar 1 corrección de tiempo.' : `No se pudieron comprobar ${n} correcciones de tiempo.` |
| `nothingListed` | 'Nothing to do right now' | 'Nada pendiente por ahora' |
| `nothingListedLine` | 'Nothing is waiting in what could be checked.' | 'No hay nada pendiente en lo que se pudo comprobar.' |
| `nothingToDo` | 'Nothing to do right now.' | 'Nada pendiente por ahora.' |
| `shiftOf` | `${name}’${name.endsWith('s') ? '' : 's'} shift` | `Turno de ${name}` |
| `otherShift` | 'The other shift' | 'El otro turno' |
| `otherShiftUnavailable` | 'The other shift’s details are not available' | 'Los detalles del otro turno no están disponibles' |
| `otherShiftMissing` | 'The other shift is not shown here. Open the request to see it.' | 'El otro turno no se muestra aquí. Abra la solicitud para verlo.' |
| `endsOn` | `ends ${day}` | `termina el ${day}` |
| `coverRequest` | 'Cover request' | 'Solicitud de cobertura' |
| `outcome` | 'Result' | 'Resultado' |
| `pickedUpBy` | `Picked up by ${name}` | `Lo tomó ${name}` |
| `pickedUp` | 'Picked up. The person is not shown here.' | 'Alguien lo tomó. La persona no se muestra aquí.' |
| `nobodyYet` | 'Nobody has picked it up yet' | 'Nadie lo ha tomado todavía' |
| `waitingFor` | `Waiting for ${name} to answer` | `En espera de la respuesta de ${name}` |
| `waitingAnswer` | 'Waiting for an answer' | 'En espera de una respuesta' |
| `approved` | 'Approved' | 'Aprobada' |
| `declined` | 'Declined' | 'Rechazada' |
| `withdrawn` | 'Withdrawn' | 'Retirada' |
| `expired` | 'Expired' | 'Vencida' |
| `outcomeUnknown` | 'Result not known' | 'Resultado desconocido' |
| `coverHistory` | 'Cover, as recorded' | 'Cobertura, según el registro' |
| `coverNotRequested` | 'No cover request was made' | 'No se pidió cobertura' |
| `coverPending` | 'Cover was asked for. Nobody is confirmed yet.' | 'Se pidió cobertura. Todavía no hay nadie confirmado.' |
| `coverCompleted` | 'Someone took the shift' | 'Alguien tomó el turno' |
| `coverClosed` | 'The cover request closed with nobody taking it' | 'La solicitud de cobertura se cerró sin que nadie tomara el turno' |
| `coverUnknown` | 'Not known' | 'Desconocido' |
| `coverHistoryHelp` | 'This comes from the request’s history. It does not show who is on the shift now.' | 'Esto sale del historial de la solicitud. No indica quién está en el turno ahora.' |
| `lateBy` | `Clocked in late · ${minutes}` | `Entrada tardía · ${minutes}` |
| `explain` | 'What this measures' | 'Qué mide esto' |
| `staffingExplain` | 'Staffing compares the staff time on the schedule with the staff time your staffing needs ask for. It is not hours worked and not pay.' | 'Personal compara el tiempo de personal en el horario con el tiempo de personal que piden sus necesidades de personal. No son horas trabajadas ni paga.' |
| `noNeeds` | 'No staffing needs set' | 'Sin necesidades de personal definidas' |
| `fullyStaffed` | 'Time fully staffed' | 'Tiempo con personal completo' |
| `fullyStaffedValue` | `Time fully staffed ${percent}%` | `Tiempo con personal completo ${percent}%` |
| `fullyStaffedExplain` | 'The share of scheduled periods where every needed position was filled. A period that is one person short counts as not staffed. It is not staff hours and not pay.' | 'La parte de los periodos programados en que se cubrió cada puesto necesario. Un periodo al que le falta una persona cuenta como no cubierto. No son horas de personal ni paga.' |
| `scheduledLegend` | 'Scheduled' | 'Programado' |
| `recordedLegend` | 'Recorded' | 'Registrado' |
| `noPublishedSchedule` | 'No published schedule' | 'Sin horario publicado' |
| `scheduleUnconfirmed` | 'Scheduled time not available' | 'Tiempo programado no disponible' |
| `scheduledExplain` | 'The light bar is the time on the published schedule that day. A day with no light bar has no published schedule. It is not hours worked and not pay.' | 'La barra clara es el tiempo del horario publicado de ese día. Un día sin barra clara no tiene horario publicado. No son horas trabajadas ni paga.' |
| `scheduleIncomplete` | 'Part of this period has no published schedule, so scheduled time is not shown for those days.' | 'Parte de este periodo no tiene horario publicado, así que no se muestra el tiempo programado de esos días.' |
| `dayRecorded` | `${day}: ${recorded} recorded` | `${day}: ${recorded} registrado` |
| `dayScheduled` | `${scheduled} scheduled` | `${scheduled} programado` |
| `coverSeen` | 'Cover requests filled' | 'Coberturas completadas' |
| `coverSeenValue` | `${filled} of ${seen} seen` | `${filled} de ${seen} vistas` |
| `coverSeenExplain` | 'This counts the cover requests seen in this period and how many were filled. It is a history of what was recorded, not a measure of how well shifts were staffed.' | 'Cuenta las solicitudes de cobertura vistas en este periodo y cuántas se completaron. Es un historial de lo registrado, no una medida de qué tan bien se cubrieron los turnos.' |
| `coverNoneSeen` | 'No cover requests were seen this period.' | 'No se vieron solicitudes de cobertura en este periodo.' |
| `coverUnread` | n === 1 ? '1 older shift change could not be read, so there may be more.' : `${n} older shift changes could not be read, so there may be more.` | n === 1 ? 'No se pudo leer 1 cambio de turno anterior, así que puede haber más.' : `No se pudieron leer ${n} cambios de turno anteriores, así que puede haber más.` |

Functions are shown by their template. "Clocked in late" and "Pay period ended" are existing fixed words.

## Checks run

- `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit -p .`: `src` clean.
- `npx eslint` on every changed and new file: clean.
- `npx vitest run --dir src src/app src/components src/lib --testTimeout=30000`: 869 files passed, 24 skipped; 13133 tests passed, 741 skipped; 0 failed. (`src/test/manual-publication.test.ts` is outside these three folders, so its expected failure does not appear.) One test (Team lateness) was added after that run; `src/components/review-details` was rerun alone: 35 passed.
- New tests: `review-routing.test.ts` (routing, Payday count, totals, the contract's `consumer-state-fixtures.json` scenarios empty-complete, mixed-complete and partial, and the title scan), `request-details.test.ts` (partial, unknown, overnight, 24:00, DST), `scheduled-days.test.ts` (sparse, unknown, partial, overnight, DST), `copy.test.ts`, `review-details.test.tsx` (31 screen-state cases on both the Direction B and the older corporate render), plus cases added to `employee-home-corp-view.test.tsx` and `present.test.ts`.
- Existing tests updated because fixtures lacked typed review facts or asserted replaced words: `owner-home-corp.test.tsx`, `manager-inbox-corp.test.tsx`, `manager-workflows.test.tsx`, `coverage-minutes.test.tsx`, `schedule-generation-controls.test.tsx`, `present.test.ts`.
- Browser captures: `cap.sh` owner and manager at 1440, 900, 390, with my own state steps (`zz-scan/states-p4d.ts`, not in the patch).
- Not run: 320px, 200% text size, reduced-motion comparison (no new motion was added), a screen reader.

## For Codex

1. `GET /api/manager/inbox-count` drives the sidebar and tab badge. When Today's read fails, Home says "At least 17" while the badge still shows the endpoint's number. If the endpoint could say that its count is a lower bound (for example `complete: false`), the badge could say so too.
2. `ActionRequestFacts.status` on a COVERAGE exchange: I read `MANAGER_PENDING` as "picked up" and `OPEN` as "nobody yet". `counterpartName` is optional and independently authorized, so a picked-up request without a name reads "Picked up. The person is not shown here." Please confirm that mapping.
3. A can't-work task in the action center carries no coverage outcome (the contract says so). Things to do therefore shows none on that row. It appears on Shift requests only.
4. `src/lib/action-center/intelligence.ts` still writes the English titles "Your correction / timecard needs another reviewer". No screen reads them for routing now. Listed only so the titles are not relied on.
5. The planner's `coverage.basis` and `unit` are not shown as text. The label was changed on that basis by contract, not by reading the field at render time (the type is optional and old plans lack it).

## For Jose to decide

1. **Two different coverage figures.** The brief asked for one label, "Time fully staffed". The code has two figures. The draft builder's percentage is fully staffed periods, so it now reads "Time fully staffed 25%". Home and the Schedule header show a different number: staff time on the schedule against staff time needed (a period one person short still counts partly). Calling that one "Time fully staffed" would be untrue, so it keeps "Staffing 57%" and its explanation says what it measures. Decide whether both should stay, or whether Home should show the fully staffed figure (that needs Codex).
2. **Legacy items.** A timecard or correction with no review facts is shown as "could not be checked" and is not counted. The alternative is to hide them. I chose visible.
3. **"Shift swaps" heading.** Cover requests are listed under the existing "Shift swaps" heading in Things to do. "Shift requests" would be more accurate. Not changed (existing heading and anchors).
4. **"The current period"** in the brief: I read it as the timecard's own pay period from the server. Tell me if it meant something else.
5. The count pill reads "At least 17". "17 shown" was the other allowed wording.
6. Insights has no coverage percentage at all today. It has cover requests (now labelled as seen) and scheduled against recorded.

## Needed from another package

- `src/components/app-shell.tsx` (shared): the Things to do badge should not show a plain number when the count is a lower bound. Not changed.
- Schedule (`manager-weekly-roster.tsx`) passes the label "Covered this week" to the coverage line. I changed only the shared line components (`schedule-coverage-line.tsx`, `coverage-minutes/coverage-minutes.tsx`) and one label function in `schedule-generation-controls.tsx`. If the Schedule builder also edits those three files, the edits are small and local: an `<Explain>` element and the "No staffing needs set" text.
- `src/components/team-live.tsx` (Team): `clockedInLate` changed from a Set to a Map of minutes. Only `clockedInText` reads it.

## Not verified

- The Team late chip on screen (unit tested only).
- Spanish on screen (no language input exists for the signed-in app).
- 320px and 200% text.
- A real end-to-end run of: Payday 2 of 3, "At least", swap withheld or missing, cover picked up, withdrawn, expired, not known. All were forced in the page from the real response. The fictional workspace has none of them.
- The older Quiet Home (`premium-home.tsx` without `corporate`) got the same guards but has no capture: nothing mounts it under Direction B.
- The draft builder's "Time fully staffed" line was not captured (it shows only after building a draft, which writes data).
