# NEVORA writing guide · Guía de redacción

How NEVORA speaks, in English and in Puerto Rico Spanish. Use it for every new label, message,
notification, empty state and assistant answer, on every role and device.

- **Status:** Jose chose the tone on Nov 21, 2026 (table below) and approved adding this guide. It keeps
  every rule from the Oct 16 (U5) and Nov 10 (B7) passes and adds the two-language rules.
- **Wins over:** older notes on tone. **Loses to:** approved payroll and legal text (see "Pay and time").

## Jose's decisions (Nov 21, 2026)

| # | Question | Decision | Example |
|---|---|---|---|
| 1 | Overall warmth | **Calm coworker.** Plain and kind, no fluff. | Your shift starts at 8:00 AM · Tu turno empieza a las 8:00 a. m. |
| 2 | Spanish address | **Tú for everyone.** | Ingresa tu PIN |
| 3 | Owner vs Employee | **One voice, different focus.** | Employee: Your shift starts at 8:00 AM · Owner: 3 employees haven't clocked in |
| 4 | Good news | **Quietly confirm**, past tense. | Time off approved · Días libres aprobados |
| 5 | Errors | **What happened, then what to do.** | Your schedule didn't load. Try again. |
| 6 | Problems about people | **Neutral facts, no judgment.** | Ana R. · Clocked in 9 min late |
| 7 | AI assistant | **Short answer, then where it came from.** | 3 people are off Friday… From approved time off, updated 4:10 PM. |
| 8 | "Owner" in Spanish | **Dueño.** | Pide ayuda al dueño. |

## Voice

Calm, specific and kind, like a capable coworker.

- **Plain over clever.** "Schedule published", not "You're all set to rock this week!"
- **Specific over generic.** "10 employees haven't submitted availability", not "Items need attention".
- **Calm about problems.** Say what happened and what to do next. No blame, no alarm words, no
  exclamation marks in either language (no "¡…!").
- **Truthful.** Never imply a check, a publication, a delivery or a count we didn't confirm. When a
  source wasn't checked, say so ("No tasks found in the checked sources").

| Instead of | Write |
|---|---|
| Good morning, Ana! Ready to crush it? | Your shift starts at 8:00 AM |
| Oops! Something went wrong. | Your schedule didn't load. Try again. |
| Please be advised that the item could not be retrieved. | Your schedule didn't load. Try again. |
| ¡Listo! ¡Todo salió perfecto! | Horario publicado |
| Por favor, intente nuevamente. | Inténtalo de nuevo. |

## Two languages, both first

English and Spanish are equals. Neither is a translation of the other.

- **Write the Spanish, don't translate it.** Same facts, same next step, natural Puerto Rico Spanish.
  "Clock in" is "Ponchar entrada", not "Reloj de entrada".
- **Tú everywhere**: "Ingresa tu PIN", "¿Olvidaste tu contraseña?", "Tu solicitud fue enviada".
  Use ustedes only when the sentence speaks to a group, such as the support team.
- **One concept, one word, in both languages.** Use the glossary below. No English words inside Spanish
  sentences ("el Owner", "el timecard"). Proper nouns stay as they are: NEVORA, Clocker, PIN, ID, Face ID.
- **Sentence case in both.** Spanish never capitalizes days or months: "miércoles", "octubre".
- **Open and close questions**: "¿…?". No "¡…!", because no exclamation marks anywhere.
- **Leave room.** Spanish runs about 20–30% longer. Layouts must hold it at 390 px and at 200% text
  without clipping or truncating the verb.
- **Same length target.** If the Spanish needs two sentences where English needs one, shorten both.
- **Set the language on the element** (`lang="es"`) so VoiceOver pronounces it correctly.

### Glossary (core terms)

The full list is in `docs/product/review-2026-11-10/reviews/copy-audit.md`, "Glossary".

Jose, Nov 26, 2026: 'ponche/ponchar' is the one word for a punch; 'espacio de trabajo' became 'empresa'.

| Concept | English | Spanish (PR) | Never |
|---|---|---|---|
| Business owner role | Owner | Dueño | el Owner, administrador |
| Things waiting on a manager | Things to do (tab: To do) | Pendientes | Inbox, tasks, actions |
| Days or hours off | Time off; time-off request | Días libres; solicitud de días libres | leave, PTO, tiempo libre |
| One clock event | Punch | Ponche | clock action, acción de tiempo |
| Clocked-in state | Clocked in | En turno | Working, On the clock |
| Ask to change a punch | Correction request; "Fix a punch" | Solicitud de corrección; "Corregir un ponche" | proposal, submission |
| Can't work a shift | Can't work; can't-work request | No puedo trabajar | callout, Unable to work |
| Take back a request | Withdraw request | Retirar solicitud | Cancel request |
| Unassigned shift | Open shift | Turno disponible | gap, coverage gap |
| Period time record | Timecard | Tarjeta de tiempo | time sheet |
| Pay document | Pay statement | Comprobante de pago | paycheck, statement |
| Pay section | Pay (Employee), Payroll (Owner) | Pago, Nómina | Pay statements (as a tab) |
| The business | Company (Owner); workplace (Employee) | Empresa; tu trabajo | workspace |
| Message to the team | Update | Aviso | Communication, notice |
| Signing in | Sign in, Sign out | Iniciar sesión, Cerrar sesión | Log in |

## Owner and Employee: one voice, different focus

| | Employee | Owner |
|---|---|---|
| Where | Mostly phones | Mostly desktop |
| About | "You": your shift, your time, your pay | The team: counts, names, what needs a decision |
| Length | One idea per line. Shortest form that's still clear. | Can carry a count and a name in one line. |
| Words | Workplace, your manager, Pay | Company, employees, Payroll |
| Example | Your shift starts at 8:00 AM · Tu turno empieza a las 8:00 a. m. | 3 employees haven't clocked in · 3 empleados no han ponchado entrada |
| Example | Time off approved · Días libres aprobados | 2 time-off requests to review · 2 solicitudes de días libres por revisar |

The personality is the same for both. Don't make Owner copy colder or Employee copy cuter.

## Mechanics

- **Sentence case everywhere**: buttons, headings, tabs, menu items ("Add employee", "View profile").
  Exceptions: proper nouns and acronyms, and the Clocker kiosk status words (Clock In, Clock Out, On Break,
  Clocked In, Off Clock, Try Again).
- **Buttons start with a verb** and name the result: "Publish schedule" · "Publicar horario",
  "Approve time off" · "Aprobar días libres", "Save PIN" · "Guardar PIN". Never "Submit", "OK",
  "Click here", "Enviar" alone, "Aceptar" alone.
- **Spanish buttons use the infinitive; Spanish sentences use tú.** Button: "Intentar de nuevo", "Guardar",
  "Ponchar entrada". Sentence: "No pudimos cargar tu horario. Inténtalo de nuevo."
- **Links that stay in the app** end with "›". The external arrow only when a link leaves NEVORA.
- **No terminal periods** on headings, labels and buttons. Full sentences in body copy get periods.
- **Contractions are fine** in English ("didn't", "can't"). They read as a person, not a system.

## Dates, times and numbers

| | English | Spanish (PR) |
|---|---|---|
| Date | Wed, Oct 14 (`formatDisplayDate`) | mié, 14 oct |
| Range | Sep 28 – Oct 4, 2026 (`formatDateRange`) | 28 sep – 4 oct 2026 |
| Time in a sentence | 8:00 AM | 8:00 a. m. |
| Compact schedule chip | 8 am – 4 pm | 8 a. m. – 4 p. m. |
| Freshness | Updated 4:49 PM (no seconds) | Actualizado 4:49 p. m. |
| Duration | 1 h 30 min (`src/lib/duration-format.ts`) | 1 h 30 min |
| Money | $1,250.00, right-aligned, two decimals | $1,250.00 (Puerto Rico uses the US format) |
| Count | 6 of 10 | 6 de 10 |
| Unknown count | — with "Couldn't check" | — con "No pudimos verificar" |

- Never show raw ISO dates (2026-10-14) or 24-hour times (00:00) to people.
- Counts agree with the noun: "1 thing needs you", "3 things need you".
- Figures use tabular numerals so columns line up.
- A failed read is "—" or "Unavailable", never 0 or an empty list.

## Errors

**What happened, then what to do.** Add the reason only when it changes what the person should do.

| Situation | English | Spanish |
|---|---|---|
| A list didn't load | Your schedule didn't load. Try again. | No pudimos cargar tu horario. Inténtalo de nuevo. |
| Wrong sign-in | Employee ID or password is incorrect. | El ID de empleado o la contraseña no son correctos. |
| Too many tries | Too many attempts. Wait a minute, then try again. | Demasiados intentos. Espera un minuto e inténtalo de nuevo. |
| Offline | Time off unavailable offline | Días libres no disponibles sin conexión |
| Not allowed | Only the Owner can approve payroll. Ask the Owner for help. | Solo el dueño puede aprobar la nómina. Pide ayuda al dueño. |
| Reason changes the action | Face ID isn't set up for NEVORA on this device. Sign in with your password, then set it up in Profile. | Face ID no está configurado para NEVORA en este dispositivo. Inicia sesión con tu contraseña y luego configúralo en tu perfil. |

- Never blame: "Employee ID or password is incorrect", not "You entered the wrong password".
- No error codes, stack words or "Oops" in the main text. A code can go in "Details" for support.
- Say what was kept when it worries people: "Your recorded time is preserved." · "Tu tiempo registrado se conserva."

## Problems about people

Describe the punch or the record, never the person's character.

| Instead of | Write | Spanish |
|---|---|---|
| Ana is late | Ana R. · Clocked in 9 min late | Ana R. · Ponchó entrada 9 min tarde |
| Luis is a no-show / absent | Luis M. · Not clocked in · 35 min | Luis M. · Sin ponchar · 35 min |
| Luis missed his shift | Luis M. · No punches for this shift | Luis M. · Sin ponches en este turno |
| Carla is abusing overtime | Carla P. · 4 h over this week | Carla P. · 4 h de más esta semana |

- **Banned in both languages:** no-show, absent, ausente, faltó, llegó tarde (as a label), abuse, violation.
  A test already blocks "no-show" and "absent".
- Names on Owner screens: first name and last initial ("Ana R.").
- Employees see their own facts the same way: "You clocked in 9 min after your shift started."

## Good news

**Quietly confirm, in past tense.** No exclamation marks, no "Great job", no "¡Listo!".

| Moment | English | Spanish |
|---|---|---|
| Schedule published | Schedule published | Horario publicado |
| Time off approved | Time off approved | Días libres aprobados |
| PIN saved | PIN saved | PIN guardado |
| Request sent | Request sent. Your manager will review it. | Solicitud enviada. Tu gerente la revisará. |
| Verified empty list | You're all caught up | Estás al día |

- Say only what we confirmed: "Changes published. Each person with a change can see it in their schedule",
  not "Everyone has been notified" (delivery isn't confirmed).
- The celebration animation follows its gate (`src/lib/celebrations.ts`); the words stay calm either way.

## Pay and time

- **Serious and exact.** No celebration, jokes, emoji or generated text on payroll, timecards or pay.
- **Payroll and legal text stay exactly as approved.** Any change, in either language, needs Jose's sign-off,
  and counsel reads lines about taxes. Spanish payroll and legal text needs the same approval as English.
- **Pending until confirmed.** Show "Sending…" · "Enviando…" until the server confirms. Never show an
  approval or an amount early.
- **Never put pay amounts in notifications** or on the lock screen.

## Confirmations and destructive actions

- **Title names the action and the thing:** "Delete this shift?" · "¿Eliminar este turno?"
- **Body says the consequence** and whether it can be undone: "Ana and Luis will see it removed from their
  schedule. You can't undo this." · "Ana y Luis verán que se eliminó de su horario. No se puede deshacer."
- **The button repeats the verb**: "Delete shift" · "Eliminar turno". Never "Yes" / "Sí".
- **"Cancel" only closes the dialog.** Taking back a request is "Withdraw request" · "Retirar solicitud".

## Notifications

Who or what, then when, in one line. The app is one tap away for the rest.

| English | Spanish |
|---|---|
| Your Friday shift changed to 9:00 AM – 5:00 PM | Tu turno del viernes cambió a 9:00 a. m. – 5:00 p. m. |
| Time off approved for Nov 28 | Días libres aprobados para el 28 nov |
| 2 time-off requests to review | 2 solicitudes de días libres por revisar |

No pay amounts, no "Don't forget!", no guilt ("You still haven't…").

## AI assistant (Owner chat)

Same calm voice. **Short answer first, then where it came from and when.**

| English | Spanish |
|---|---|
| 3 people are off Friday: Ana, Luis and Carla. From approved time off, updated 4:10 PM. | 3 personas están libres el viernes: Ana, Luis y Carla. Según los días libres aprobados, actualizado 4:10 p. m. |
| I can't see payroll for that period. Open Payroll to check it. | No puedo ver la nómina de ese período. Abre Nómina para revisarla. |

- Answer only from data NEVORA checked. If it wasn't checked, say so; never guess a count or a name.
- No "As an AI", no "Great question", no long preambles. Offer one next step at most.
- Answer in the language the Owner wrote in.
- Never give legal or tax advice as fact. Point to the rule's source or to counsel.

## Empty states (`EmptyState`)

- **Title**: what's true now, in a few words ("No pending requests" · "No hay solicitudes pendientes").
- **Description**: one sentence of context, or what will appear here and when.
- **Action**: at most one next step, only when the person can take it.
- Use "You're all caught up" · "Estás al día" only for a verified empty result, never for loading or errors.

## Plain language over audit language (U5, Oct 16, 2026)

People see what happened and what to do next. Audit terms (source, observation, verified, authorized
snapshot, revision, captured, reference, channel, scope) stay in code, in exports and in "Details"
disclosures. They appear in the main text only where they are the subject: a payroll approval belongs to
one exact revision, so the revision is shown there.

| Instead of | Write |
|---|---|
| Recorded time includes breaks. Not payroll hours. | Hours include breaks and aren't payroll hours. |
| Verified recorded-time signals that may need manager review. | Clock-ins and breaks that may need a look. |
| No verified attendance signals were found in the current authorized snapshot. | No clock-ins need a look right now. |
| Period checked. 10 timecards. | 10 timecards in this period. |
| Requests preserve the original recorded time and require manager review. | Your manager reviews each request. Your original times are kept. |
| This inbox shows supported source updates. | Updates about your requests and schedule. |
| History checked through Oct 16, starting Sep 21. | Checked Sep 21 – Oct 16. |
| Attendance observations / Hours by captured position | Clock-in notes / Hours by position |
| Time Off Request | Time-off request |
| Attendance intelligence · 0 signals | Today's clock-ins · 0 to review |
| Checked 7:43:15 AM | Updated 7:43 AM |
| Add Employee | Add employee |
| Needs your attention | To do |
| Review · 10 actions | 10 employees haven't submitted availability |

## Protected strings

QA scripts press these exact words. Renaming one means updating the scripts in the same change:
"Approve revision", "I reviewed revision", "Approval recorded", "Clocked In", "Refresh recorded time",
"Loading Home…", "Some Home sections could not be fully checked. Counts show known items.", and the
Clocker's Title Case buttons. The Clocker keeps its English label with the Spanish second line.

## Before you ship a string

1. Does it say what happened and what to do next?
2. Is it written in both languages, with the glossary words and tú?
3. Is it free of blame, judgment words, exclamation marks and audit terms?
4. Does it claim only what the server confirmed?
5. If it touches pay, payroll or legal text, did Jose approve it?
6. Does the Spanish fit at 390 px and at 200% text?
