# Package A: U02, scheduling restrictions

Worktree `wt/p4a`, patch base `c30f530e`, evidence taken at temp commit `5baf41dc` (the patch equals that commit).
Nothing was pushed. No branch was made. No server file was edited.

## What was built

**Management side (Owner, Manager): `/app/employees/[employeeId]/restrictions`**
- Reached from the person's page under Team. One new row in the Work card: "When they can be scheduled".
- Built on the corporate kit that the Direction B layers dress, as the person's page is. Title at 130, band ends at 224, one 812 column (probe: card left 296, width 812, 24px under the band).
- View: "In effect now" with "In effect since Mon, Oct 19". Seven day rows, Monday first. Each row has the times in words, and a 24-hour track from 768px (the same drawing Availability uses). An overnight range shows on both days ("10:00 PM – midnight, continues into Sunday" and "midnight – 6:00 AM, from Saturday night").
- "Starts later": each future version with its Monday, and "Changed" chips against the version before it.
- "Not confirmed yet" (older record): amber chip, one paragraph, a link to the hours the person entered, and two choices: "Set the agreed times" and "No restrictions". Nothing is preselected.
- "Change requests": each waiting request lists only the days it changes, each with "Now: ..." under it. Approve is the tinted pill, Decline is the quiet text button. Each opens its own small panel. Approve asks for the Monday it starts. Decline asks for nothing but an optional note.
- "Earlier requests": the last five decided requests with Approved or Declined, the date and the manager's note.
- Editor: one block per day with All day, Set times, Not this day (the kit's segmented control). Ranges have From and To, a remove button, "Add a time range" and "Copy to other days" (a checklist of the other six days). A range that ends at or before its start ends the next day and says so ("Ends Sunday at 6:00 AM"). The next day says what it receives ("Also Saturday night until 6:00 AM").
- "Starts" card: a Monday picker that lists only the server's earliest week and the eleven Mondays after it, with the reason earlier weeks are missing. Optional note.
- Review step: one sentence that says what changes and from when, the week with "Changed" chips, then "Save agreement".

**Employee and Lead side: `/app/availability/agreement`**
- Reached from Availability: a glass pill "Agreed times" in the band, beside "Change one week", at every width.
- Why Availability and not Profile: it is where a person already thinks about when they can work, and the two things must not be confused. The page says so in its closing line. Profile is about the account.
- Built on the Direction B screen (the Employee shell shows it at every width). Probe at 1440: title 130, band 224, card 812 wide, 24px gap.
- Shows the agreement in effect, what starts later, their requests ("Waiting" with only the changed days), earlier requests, and "Ask to change it". The request form is the same editor with a note for the manager. There is no approve control on this side.
- An Owner or Manager who opens this address goes to `/app/availability`.

**Not built:** a list of everyone with an older record or a waiting request. No existing read surfaces them (the agreement is read one person at a time). See For Codex.

## Contract coverage

| Requirement | Status | Endpoint and module |
|---|---|---|
| Read and command protocol, exact headers and bodies | done | both endpoints, `src/lib/scheduling/restrictions-client.ts` |
| Status and state matched together | done | `restrictions-client.ts` (unit tests for every pair) |
| Missing session is not "temporarily unavailable" | done | 401 gives "Your session ended" with Sign in, no retry |
| Early 403 (role, actor, view) apart from domain denied | done | "This page is out of date" with Reload, versus "You can't manage this agreement" |
| Workplace local dates and clocks | done | current week from the workplace zone (`workplaceWeek`); dates from the workplace's day; a line under the week names the zone. The zone comes from the page (`getWorkspace`), see For Codex |
| Sunday 0 to Saturday 6 | done | `restrictions-week.ts`, shown Monday first |
| End of 24:00 only | done | `unavailableFromPlan` writes 24:00 only as an end |
| Overnight split per occupied date | done | `rangeOccupancy`, `planAllowed`; drawn on both days |
| A version starts on a Monday; admissible Mondays only | done | `admissibleMondays(earliestWeek)`; a draft week below the bound is raised to the bound before it is shown or sent |
| Next effective-week lower bound | done | picker starts at `earliestWeek`. Real run: after a version for Jan 11 the first Monday offered was Jan 18 |
| Closed-week race | done | real 409 `locked` with `earliestWeek`; the card offers "Use Mon, Dec 14" |
| Cross-location authority; Owner records Owner-only | partly | the denied state says who can. Seen only with a forced 403: the local data has no Manager with part of a footprint |
| On conflict or lock, re-read before a deliberate review | done | both re-read first; the next send is a new operation with the fresh revision |
| Keep target, operation, contents and expected revision through a lost reply | done | the command object is kept whole in memory. "Check now" reads and looks for the operation. "Send again" sends the same object |
| Manager confirms legacy versus explicit unrestricted | done | two choices, both through review; "No restrictions" sends an empty list |
| Sees future versions and requests, approves or declines each on its own | done | real run: one approved, one declined |
| Own Employee or Lead sees the agreement and asks for a change without approving | done | real run as Employee and as Lead. A hand-made approve from the Employee's session got 403 on both endpoints and nothing changed |
| Availability preferences stay separate | done | separate page; nothing in the availability forms or their logic changed; the closing line says it |
| List of people who need attention | waiting on Codex | needs a read |
| "Confirm the older record as the agreement" with its hours filled in | partly | the manager types the agreed times; the page links to the hours the person entered. The read does not carry those hours |

## States

Real = the owned local server answered. Forced = the answer was replaced in the page with `page.route`.

| State | How it was produced | Evidence |
|---|---|---|
| Loading | real read, delayed 4 s in the page | `mgr-loading-1440` |
| No agreement, older record (management) | real | `mgr-legacy-1440`, `-390` |
| No agreement (Employee) | real (first baseline run), unit test | not in the evidence folder |
| In effect | real read of a seeded document (made with the server's own `applyRestrictionCommand`; the endpoints never admit a past week) | `mgr-view-1440/900/390/320`, `emp-view-390/1440` |
| Future version | real | `mgr-conflict-1440` (Starts later), `mgr-decide-approve-1440` |
| Request waiting | real | `mgr-requests-1440`, `emp-waiting-390/1440`, `lead-waiting-390` |
| Request approved, declined | real | `mgr-conflict-1440` (Earlier requests) |
| Decision panel | real | `mgr-decide-approve-1440` |
| Editor, review | real | `mgr-editor-*`, `mgr-review-*`, `emp-request-form-390` |
| Save in progress | unit test only | none |
| Conflict | real 409 (another version was written to the database while the review was open) | `mgr-conflict-1440`, `-390` |
| Closed-week race | real 409 locked (the chosen week's availability deadline was moved into the past while the review was open) | `mgr-closed-week-1440` |
| Unknown, request never arrived | forced (request aborted); then real read "It is not saved yet"; then real save of the same command (bodies compared, identical) | `mgr-unknown-1440`, `-390`, `mgr-unknown-not-saved-1440` |
| Unknown, saved but reply lost | forced (server saved, reply dropped); "Check now" found the operation; no second command was sent | run log `manager-legacy`; screenshot not in the folder |
| Not allowed for this location | forced 403 denied | `mgr-denied-locations-1440` |
| Error, signed out | forced 503 and 401; "Try again" then loaded from the real server | run log; unit tests |
| Offline | the app's own offline screen took the page (existing behaviour). This screen's own offline card: unit test only | none |
| Invalid, capacity, unsent, page out of date | unit test only | none |

All captures: overflow 0 at 1440, 900, 390 and 320. No page errors. No control under 44px on the phone.

## Keyboard and focus

- Opening the editor, the review step, and returning to the view move focus to the page title.
- A conflict, lock or unknown card takes focus when it appears and is an alert.
- Review with a bad range: focus goes to the summary line ("1 time range needs a fix..."), and the range carries the message and `aria-invalid`. `mgr-editor-error-focus-1440`.
- Add a time range: focus lands in the new From field (`mgr-editor-focus-1440`). Remove: focus goes to that day's Add. Copy: focus goes to the first checkbox, then back to the Copy button.
- Approve or Decline: focus goes to the panel's heading.
- View tab order after the title: the main action (`mgr-view-focus-main-1440`).
- Not walked by hand: Escape (nothing here is a dialog), and a full Tab walk of the Employee form.

## English and Spanish

The signed-in app renders English. Every string is in `src/components/restrictions/copy.ts` with `en` and `es`. A unit test renders 30 states in Spanish and fails on any English phrase, English day name, AM or PM, or missing value. Spanish role words are left as "Owner" and "Manager"; Jose may want "dueño" and "gerente".

## Copy

No payroll sentence. Source of truth is `copy.ts`; `${...}` marks a name, date or count. A stock reason is stored when a note is left empty (the server requires a reason): "Agreed with the employee", "Change requested", "Approved", "Declined". It is never shown as a note.

| Key | English | Spanish |
|---|---|---|
| days | Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday | Domingo, Lunes, Martes, Miércoles, Jueves, Viernes, Sábado |
| reviewChange | From ${date}, ${name} can be scheduled at these times. N day(s) change: Monday and Tuesday. | Desde el ${date}, a ${name} se le puede asignar en estas horas. Cambia(n) N día(s): lunes y martes. |
| daysShort | ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] | ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] |
| am | AM | a. m. |
| pm | PM | p. m. |
| midnight | midnight | medianoche |
| and | and | y |
| entryManagement | When they can be scheduled | Cuándo se le puede asignar turnos |
| entryManagementLabel | When ${name} can be scheduled | Cuándo se le puede asignar turnos a ${name} |
| entryEmployee | Agreed times | Horario acordado |
| titleManagement | When they can be scheduled | Cuándo se le puede asignar turnos |
| titleEmployee | Agreed times | Horario acordado |
| subEmployee | What you and your manager agreed | Lo que usted y su gerente acordaron |
| backTeam | Team | Equipo |
| backAvailability | Availability | Disponibilidad |
| titleEditManagement | Change the agreement | Cambiar el acuerdo |
| titleEditEmployee | Ask to change it | Pedir un cambio |
| titleReviewManagement | Review the change | Revise el cambio |
| titleReviewEmployee | Review your request | Revise su solicitud |
| now | In effect now | Vigente ahora |
| since | In effect since ${date} | Vigente desde el ${date} |
| anyTime | Any time | A cualquier hora |
| notThisDay | Not this day | Este día no |
| until | Until ${time} | Hasta ${time} |
| intoNext | continues into ${day} | continúa el ${day.toLowerCase()} |
| fromPrevious | from ${day} night | desde la noche del ${day.toLowerCase()} |
| changed | Changed | Cambió |
| nowIs | Now: ${times} | Ahora: ${times} |
| otherDaysSame | The other days stay as they are. | Los demás días quedan como están. |
| unrestrictedManagement | No restrictions. ${name} can be scheduled any day, at any time. | Sin restricciones. A ${name} se le puede asignar cualquier día, a cualquier hora. |
| unrestrictedEmployee | No restrictions. You can be scheduled any day, at any time. | Sin restricciones. Se le puede asignar cualquier día, a cualquier hora. |
| weekLabel | Times ${name} can be scheduled, by day | Horas en que se puede asignar a ${name}, por día |
| weekLabelOwn | Times you can be scheduled, by day | Horas en que se le puede asignar, por día |
| legacyChip | Not confirmed | Sin confirmar |
| legacyTitleManagement | Not confirmed yet | Todavía sin confirmar |
| legacyBodyManagement | No agreement is recorded for ${name}. The schedule still follows the hours they entered in Availability. Nothing is confirmed until you choose one of these. | No hay un acuerdo registrado para ${name}. El horario todavía sigue las horas que esta persona anotó en Disponibilidad. Nada queda confirmado hasta que elija una de estas opciones. |
| legacySet | Set the agreed times | Anotar el horario acordado |
| legacyOpen | No restrictions | Sin restricciones |
| legacyHours | See the hours they entered | Ver las horas que anotó |
| legacyTitleEmployee | Nothing agreed yet | Todavía no hay acuerdo |
| legacyBodyEmployee | Your manager has not confirmed an agreement with you. Your schedule still follows the availability you send. | Su gerente no ha confirmado un acuerdo con usted. Su horario todavía sigue la disponibilidad que usted envía. |
| notYetTitle | Nothing is in effect yet | Todavía no hay nada vigente |
| notYetBody | The first agreement starts ${date}. | El primer acuerdo empieza el ${date}. |
| later | Starts later | Empieza más adelante |
| starts | Starts ${date} | Empieza el ${date} |
| separateManagement | Weekly availability is separate. What people send each week is a preference. This agreement is what the schedule must respect. | La disponibilidad semanal es aparte. Lo que cada persona envía por semana es una preferencia. Este acuerdo es lo que el horario tiene que respetar. |
| separateEmployee | This is what you and your manager agreed. It is different from the availability you send each week, which is a preference. | Esto es lo que usted y su gerente acordaron. Es distinto de la disponibilidad que usted envía cada semana, que es una preferencia. |
| changeAgreement | Change the agreement | Cambiar el acuerdo |
| askChange | Ask to change it | Pedir un cambio |
| askFirst | Ask for agreed times | Pedir un horario acordado |
| note | Note: ${text} | Nota: ${text} |
| requestsManagement | Change requests | Solicitudes de cambio |
| requestsEmployee | Your requests | Sus solicitudes |
| earlier | Earlier requests | Solicitudes anteriores |
| waiting | Waiting | En espera |
| approved | Approved | Aprobada |
| declined | Declined | Rechazada |
| askedOn | Asked ${date} | Pedida el ${date} |
| sentOn | Sent ${date} | Enviada el ${date} |
| forWeek | For the week of ${date} | Para la semana del ${date} |
| daysChange | ${count} ${plural(count, "day changes", "days change")} | ${plural(count, "Cambia", "Cambian")} ${count} ${plural(count, "día", "días")} |
| noDaysChange | Same times as the agreement in effect | Las mismas horas que el acuerdo vigente |
| asksOpen | Asks for no restrictions | Pide quedar sin restricciones |
| waitingEmployee | Your manager has not decided yet. Nothing changes until they approve. | Su gerente todavía no ha decidido. Nada cambia hasta que la apruebe. |
| approvedOn | (date: string | (date: string |
| start | string) => `Approved ${date}, starts ${start} | string) => `Aprobada el ${date}, empieza el ${start} |
| declinedOn | Declined ${date} | Rechazada el ${date} |
| approve | Approve | Aprobar |
| decline | Decline | Rechazar |
| approveLabel | (name: string | (name: string |
| date | string) => `From ${date}, ${name} has no restrictions and can be scheduled any day, at any time. | string) => `Desde el ${date}, ${name} queda sin restricciones y se le puede asignar cualquier día, a cualquier hora. |
| declineLabel | (name: string | (name: string |
| decideApproveTitle | Approve this request | Aprobar esta solicitud |
| decideDeclineTitle | Decline this request | Rechazar esta solicitud |
| decideStart | Starts | Empieza |
| decideStartHelp | (asked: string | (asked: string |
| offered | string) => asked === offered ? `They asked for the week of ${asked}.` : `They asked for the week of ${asked}. That week is closed, so the earliest start is ${offered}. | string) => asked === offered ? `Pidió la semana del ${asked}.` : `Pidió la semana del ${asked}. Esa semana ya cerró, así que lo más pronto es el ${offered}. |
| decideNote | Note for them (optional) | Nota para la persona (opcional) |
| confirmApprove | Approve from ${date} | Aprobar desde el ${date} |
| confirmDecline | Decline request | Rechazar solicitud |
| showRequested | Show the times they asked for | Ver las horas que pidió |
| editCardManagement | Times ${name} can work | Horas en que ${name} puede trabajar |
| editCardEmployee | Times you can work | Horas en que usted puede trabajar |
| modeLabel | ${day}: when | ${day}: cuándo |
| modeAny | All day | Todo el día |
| modeRanges | Set times | Horas fijas |
| modeNone | Not this day | Este día no |
| from | From | Desde |
| to | To | Hasta |
| fromLabel | (day: string | (day: string |
| index | number) => `Remove range ${index} on ${day} | number) => `Quitar el horario ${index} del ${day.toLowerCase()} |
| toLabel | (day: string | (day: string |
| addRange | Add a time range | Añadir un horario |
| addRangeLabel | Add a time range on ${day} | Añadir un horario el ${day.toLowerCase()} |
| remove | Remove | Quitar |
| removeLabel | (day: string | (day: string |
| endsNext | (day: string | (day: string |
| time | string) => `Also ${day} night until ${time} | string) => `También la noche del ${day.toLowerCase()} hasta las ${time} |
| carried | (day: string | (day: string |
| copy | Copy to other days | Copiar a otros días |
| copyLabel | Copy ${day} to other days | Copiar el ${day.toLowerCase()} a otros días |
| copyTitle | Copy ${day} to | Copiar el ${day.toLowerCase()} a |
| copyApply | Copy | Copiar |
| cancel | Cancel | Cancelar |
| copied | (day: string | (day: string |
| count | number) => `${day} copied to ${count} ${plural(count, "day", "days")} | number) => `${day} copiado a ${count} ${plural(count, "día", "días")} |
| zone | Times are the workplace’s local time (${label}). | Las horas son la hora local del negocio (${label}). |
| problemMissing | Enter a start and an end time | Escriba la hora de inicio y la de fin |
| problemSame | The start and the end can’t be the same time | El inicio y el fin no pueden ser la misma hora |
| problemSummary | ${count} ${plural(count, "time range needs", "time ranges need")} a fix before you can continue | ${count} ${plural(count, "horario necesita", "horarios necesitan")} un arreglo antes de continuar |
| startCard | Starts | Empieza |
| startLabelManagement | First week | Primera semana |
| startLabelEmployee | From the week of | Desde la semana del |
| startHelpManagement | The earliest start is ${date}. Earlier weeks are already published or closed, or come before the latest agreement. An agreement always starts on a Monday. | Lo más pronto que puede empezar es el ${date}. Las semanas anteriores ya están publicadas o cerradas, o quedan antes del acuerdo más reciente. Un acuerdo siempre empieza un lunes. |
| startHelpEmployee | Your manager chooses the final start date when they approve. | Su gerente elige la fecha final de inicio cuando la apruebe. |
| weekOf | Week of ${date} | Semana del ${date} |
| noteManagement | Note (optional) | Nota (opcional) |
| noteManagementHelp | Kept with this agreement. | Se guarda con este acuerdo. |
| noteEmployee | Note for your manager (optional) | Nota para su gerente (opcional) |
| review | Review | Revisar |
| reviewFirst | (name: string | (name: string |
| reviewChange | (name: string | (name: string |
| reviewSame | From ${date}, the times stay the same as the agreement in effect. | Desde el ${date}, las horas quedan iguales al acuerdo vigente. |
| reviewOpen | (name: string | (name: string |
| reviewUntil | Until then, nothing changes. | Hasta entonces, nada cambia. |
| reviewRequest | You are asking for these times from the week of ${date}. Your manager decides. Nothing changes until they approve. | Usted pide estas horas desde la semana del ${date}. Su gerente decide. Nada cambia hasta que la apruebe. |
| reviewRequestDays | ${days.length} ${plural(days.length, "day changes", "days change")}: ${list(days, "and")}. | ${plural(days.length, "Cambia", "Cambian")} ${days.length} ${plural(days.length, "día", "días")}: ${list(days.map(day => day.toLowerCase()), "y")}. |
| save | Save agreement | Guardar acuerdo |
| saving | Saving… | Guardando… |
| send | Send request | Enviar solicitud |
| sending | Sending… | Enviando… |
| backToEdit | Back to edit | Volver a editar |
| savedToast | Agreement saved | Acuerdo guardado |
| sentToast | Request sent | Solicitud enviada |
| approvedToast | Request approved | Solicitud aprobada |
| declinedToast | Request declined | Solicitud rechazada |
| defaultReasonSet | Agreed with the employee | Acordado con la persona |
| defaultReasonRequest | Change requested | Cambio solicitado |
| defaultReasonApprove | Approved | Aprobada |
| defaultReasonDecline | Declined | Rechazada |
| loading | Loading… | Cargando… |
| failedTitle | The agreement didn’t load | El acuerdo no cargó |
| failedBody | Check your connection, then try again. | Verifique su conexión e intente de nuevo. |
| tryAgain | Try again | Intentar de nuevo |
| offlineTitle | You’re offline | No hay conexión |
| offlineBody | Reconnect, then try again. | Conéctese e intente de nuevo. |
| signedOutTitle | Your session ended | Su sesión terminó |
| signedOutBody | Sign in again to see this. | Inicie sesión de nuevo para ver esto. |
| signIn | Sign in | Iniciar sesión |
| accessTitle | This page is out of date | Esta página no está al día |
| accessBody | Reload it to continue. Nothing was saved. | Vuelva a cargarla para continuar. No se guardó nada. |
| reload | Reload | Volver a cargar |
| deniedLocationsTitle | You can’t manage this agreement | Usted no puede administrar este acuerdo |
| deniedLocationsBody | ${name} works at locations you don’t manage. An Owner, or a Manager with access to every location they work at, can change it. | ${name} trabaja en locales que usted no administra. Un Owner, o un Manager con acceso a todos los locales donde trabaja, puede cambiarlo. |
| deniedOwnerTitle | Only an Owner can manage this | Solo un Owner puede administrar esto |
| deniedOwnerBody | This is an Owner’s record. Ask an Owner to change it. | Este es el registro de un Owner. Pida a un Owner que lo cambie. |
| deniedEmployeeTitle | This isn’t available to you | Esto no está disponible para usted |
| deniedEmployeeBody | Ask your manager about your agreement. | Pregunte a su gerente por su acuerdo. |
| backToPerson | Back to ${name} | Volver a ${name} |
| conflictTitle | Someone else changed this agreement | Otra persona cambió este acuerdo |
| conflictBody | Your change was not saved. The agreement as it is now is shown below. Review your change against it before you send it again. | Su cambio no se guardó. Abajo está el acuerdo como quedó. Compare su cambio con ese acuerdo antes de enviarlo otra vez. |
| conflictDecisionBody | Your decision was not saved. The request was already decided, or the agreement changed. What is current is shown below. | Su decisión no se guardó. La solicitud ya se había decidido, o el acuerdo cambió. Abajo está lo vigente. |
| reviewAgain | Review again | Revisar otra vez |
| discard | Discard my change | Descartar mi cambio |
| close | Close | Cerrar |
| lockedTitle | That week is no longer available | Esa semana ya no está disponible |
| lockedBody | (asked: string | (asked: string |
| next | string) => `The week of ${asked} closed before this was saved. Nothing was saved. The next week you can choose is ${next}. | string) => `La semana del ${asked} cerró antes de que esto se guardara. No se guardó nada. La próxima semana que puede elegir es la del ${next}. |
| lockedBodyUnknown | The week of ${asked} closed before this was saved. Nothing was saved. Choose a later week. | La semana del ${asked} cerró antes de que esto se guardara. No se guardó nada. Elija una semana posterior. |
| useWeek | Use ${date} | Usar el ${date} |
| chooseWeek | Choose another week | Elegir otra semana |
| unknownTitle | We couldn’t confirm this was saved | No pudimos confirmar que esto se guardó |
| unknownBody | The reply was lost, so it may or may not be saved. Check before you do anything else. Checking never saves it twice. | La respuesta se perdió, así que puede que se haya guardado o no. Verifique antes de hacer otra cosa. Verificar nunca lo guarda dos veces. |
| checkNow | Check now | Verificar ahora |
| checking | Checking… | Verificando… |
| notSavedTitle | It is not saved yet | Todavía no está guardado |
| notSavedBody | The agreement does not show your change. You can send the same change again. It is saved only once. | El acuerdo no muestra su cambio. Puede enviar el mismo cambio otra vez. Se guarda una sola vez. |
| sendAgain | Send again | Enviar otra vez |
| stillUnknownTitle | Still not confirmed | Sigue sin confirmar |
| stillUnknownBody | We couldn’t reach NEVORA to check. Try the check again. | No pudimos comunicarnos con NEVORA para verificar. Intente verificar de nuevo. |
| unsentTitle | That wasn’t sent | Eso no se envió |
| unsentBody | NEVORA couldn’t take it right now. Nothing was saved. | NEVORA no pudo recibirlo en este momento. No se guardó nada. |
| invalidTitle | That couldn’t be saved | Eso no se pudo guardar |
| invalidBody | Nothing was saved. Check the times and the start week, then try again. | No se guardó nada. Revise las horas y la semana de inicio, e intente de nuevo. |
| capacityTitle | This record is full | Este registro está lleno |
| capacityBody | Nothing was saved. No more changes can be added to this agreement. Contact NEVORA support. | No se guardó nada. No se pueden añadir más cambios a este acuerdo. Comuníquese con el apoyo de NEVORA. |
| deniedCommandTitle | You can’t make this change | Usted no puede hacer este cambio |
| deniedCommandBody | Nothing was saved. Your access to this person’s locations may have changed. | No se guardó nada. Puede que su acceso a los locales de esta persona haya cambiado. |
| confirmedSaved | Checked: it was saved. | Verificado: se guardó. |


## Checks run

- `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit -p .`: `src` clean.
- `npx eslint` on every changed ts and tsx file: clean.
- `npx vitest run --dir src src/app src/components src/lib --testTimeout=30000`: 867 files passed, 1 failed (`src/lib/scheduling/generation/planner.test.ts`, a timing measure, while a capture was running). Rerun alone: 64 passed. `src/test/manual-publication.test.ts` was not part of this run.
- New tests: `restrictions-week.test.ts` (15), `restrictions-client.test.ts` (12), `restrictions-screen.test.tsx` (61), `loading.test.ts` (2). The fixtures are built with the server's own `applyRestrictionCommand`.
- Browser: `cap.sh ... owner 1440 ... NEVORA_SCAN_RESTRICTIONS=1` with my flow `zz-scan/restrictions-flow.ts` (not in the patch). It signs in as Owner, Manager (Elena), Employee (Maria) and Lead (Ana). Exit 0, 94 PNGs, 30 copied. `a-evidence/scan-log.json` is the run log.
- Not run: 200% text size, a screen reader, reduced motion (the feature adds no motion), a real touch device.

## For Codex

1. The read returns no time zone. The contract says "with the returned time zone". The page passes the workspace zone from `getWorkspace()`. Confirm that is the right source.
2. A read that lists people with an older record or a waiting request, so Things to do or Team can show them.
3. The older record's hours are not in the read, so "confirm it as the agreement" cannot be prefilled.
4. `reason` is required. The brief calls the note optional, so a stock reason is sent when it is empty. Say if a different value is wanted.
5. `approvedBy`, `requestedBy` and the decision actor are IDs. The screens show dates and notes, not who. A display name would let them say it.
6. A `REQUEST` is not checked against `earliestWeek`. The Employee picker still offers only weeks from the bound, and the manager picks the real start.
7. A 503 `{state:'unavailable'}` on a command is treated as "not sent, nothing saved" (the handler names no operation). Confirm.

## For Jose to decide

1. Names: "When they can be scheduled" (management) and "Agreed times" (Employee). 
2. The screens show when a person can work. The server stores when they cannot. Say if you would rather see blocked times.
3. The entry on Availability is a second pill in the band. Say if you prefer a row on Profile or More.
4. Decided requests show the last five only.
5. Spanish role words (see above).

## Needed from another package

Nothing. Shared files touched, each by a few lines: `b-loading.tsx` (two entries), the person's page (one row), `employee-b/availability-b.tsx` (one link). `b-kit.tsx` was not changed.

## Not verified

- A real Manager with only part of a person's locations, and a real Manager opening an Owner's record.
- A reload during an unknown result. The kept command lives in memory; the page warns before leaving, but a reload loses it.
- The existing availability hero at 900 with two pills.
- Capacity and invalid answers from the real server.
