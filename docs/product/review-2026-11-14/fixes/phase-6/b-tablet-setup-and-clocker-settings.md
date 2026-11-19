# Phase 6, package B: setting up a tablet, and the Owner's Clocker settings

Base `e9d2ba4e`. Evidence: [evidence-setup-and-settings/](evidence-setup-and-settings/). Paths that start `p6b-work/` name the builder's working captures, which were not kept.
Nothing was pushed. No branch was made. Fictional data and the owned local database only.

## 1. Findings

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Setting up a tablet (JR-26): the setup code as a QR code, Copy link, Show code, how long it is good, three steps; the kiosk reads the code from the link's fragment | fixed. No server change was needed | `tablets-code-qr-1440.png`, `tablets-code-qr-390.png`, `kiosk-setup-code-received-1024x768.png`, `handoff-run-log.md` |
| 2 | The kiosk's setup screen: first time, each refusal, success, offline, not confirmed, both languages | fixed. One refusal cannot be told apart by the server (see For Codex 1) | `kiosk-setup-*.png` |
| 3 | Clocker tablets: honest states, row actions, add in two steps, rename, remove with what stops working, empty state | fixed, except two parts. The empty page is unit tested only (the fixtures always have a tablet and its rows cannot be deleted). Pause: partly. There is no pause on the server. The sheet says how to stop a tablet for a while (remove it, set it up again later) | `tablets-*.png` |
| 3a | Settings shows "N not set up" as an amber chip | already fixed. Checked against the page: the hub counts the same tablets the page marks "Not set up" or "Code expired" | `scan-log` rows `hub-*` |
| 4 | Clocker PINs: who has one, people without one first, set or reset as a 560px form, the result, the person page row | fixed for the Owner. Manager: not done, the pages are Owner only on the server (For Jose 2) | `pins-*.png`, `pin-*.png`, `person-pin-row-1440.png` |
| 5 | Punch photos | fixed: one sentence on what it does, On and Off in words, the reason under the disabled moments. The photo review list was left as it is | `photos-off-1440.png` |
| 5a | Clocker recovery | fixed: help requests with a tinted Check and a quiet Fix in Timecards, the code form at 560px, and one designed card for saved, nothing saved yet, more than one record, loading, offline, session ended and failed | `recovery-*.png` |
| 6 | Loading placeholders and the Settings hub rows | fixed: five entries in `b-loading.tsx`, a `loading.tsx` per route. Hub row names already matched; no change | `clocker-owner-loading.test.ts`; `scan-log` rows `loading-*` |
| 7 | Keyboard, focus, 44px targets, every state, unit tests | fixed. See sections 4, 5 and 8 | `tablets-add-error-focus-1440.png`, `kiosk-setup-focus-*.png` |
| R1 | Round 1's kiosk work (Employee ID then PIN, lockout wording, error screen, sentence case, paused page) | not touched. The kiosk journey ran before and after (section 8) | `kiosk-final` run |

## 2. What was built

**Clocker tablets** `/app/settings/clocker` (Owner; Settings, Clocker, Clocker tablets). `src/components/clocker-device-manager.tsx`.
- The Settings frame: back link, title at 130, one line under it, band 224, one 812 column.
- One card "Tablets" with its count. One row per tablet: a 36px lead, the name, a chip only for an exception, then what and when.
  - Connected: grey words. "Calle Loíza · Connected · Last used Nov 17, 4:05 PM", or "Not used yet".
  - Not set up: amber chip "Not set up". "No setup code yet", or "Setup code good until Nov 17, 4:14 PM".
  - Code expired: amber chip "Code expired" and when it expired.
  - Location inactive: amber chip, "Can’t be used while its location is inactive".
  - Removed: its own card, grey, "Set up again".
- Row actions: one tinted pill (Get setup code, New code) and one quiet text button (Manage, Set up again). Each button's label names its tablet for a screen reader.
- One filled button on the page: Add tablet, in the card's footer.
- Add a tablet is two steps. Step 1 of 2 is a sheet: name and location. Step 2 of 2 is the setup code card.
- The setup code card: a QR code of the kiosk link, the three steps, "Good until … It works one time.", Copy link, Show code (the code, Copy code, and how to type it on a tablet with no camera), "This is the tablet: open its Clocker", Done. It closes itself when the code expires.
- Manage: rename (Done saves a changed name), Replace tablet, Remove tablet. Replace and Remove ask first, say what stops working, and start on Cancel.
- Empty: what a time clock tablet is, and one filled "Add a tablet". No active location: an amber card that leads to Locations. Failed read: one card, one retry.
- An answer that cannot be confirmed is amber "Not confirmed" with "Refresh the list". It is never shown as saved or as failed.

**The kiosk's setup screen** `/clocker/<key>` on a tablet that is not connected. `src/components/clocker-setup.tsx`, styles in `clocker-tablet-setup.module.css`.
- First time: what this tablet will be, three steps, the code field, one filled "Connect tablet", the language switch.
- From the Owner's link: "Setup code received", one filled "Connect tablet", "Type a code instead".
- Success: "This tablet is connected to Calle Loíza", the tablet's name, "Open the time clock". The clock opens by itself after 6 seconds when punches are on.
- Refusals stay on the form, under the field, in the one message style, with focus on the field.
- Offline, and "Setup not confirmed" (amber, one "Check setup").

**Clocker PINs** `/app/settings/clocker/pins` (Owner). `clocker-pin-inventory.tsx`.
- Search and tabs on the band (296). "No PIN" opens first. The card's title counts them: "11 people need a PIN".
- One row per person: avatar, name, position and location, and one action. Set PIN is the tinted pill. Reset PIN is the quiet one. A PIN is never shown.
- Designed empty and no-match states. Failed read: one card, one retry.

**One person's Clocker PIN** `/app/employees/<id>/clocker-pin` (Owner). `clocker-pin-editor.tsx`, `clocker-pin-form.tsx`.
- The Settings frame: Back names where it returns (the person, or Clocker PINs when opened from the list), the title, the person's name, band 224.
- One card, 560px form: "Set a PIN for Maria Rivera", New PIN, Type it again, one filled Save PIN on the block's right edge.
- Two different PINs send nothing. The error sits under the second field in the one error style and focus moves there.
- Saved: the form is gone. "PIN set for Maria Rivera. Tell them in person." Nothing with digits stays on screen.
- Not confirmed: amber, the save's reference, "Check if it saved" (looks the original save up; sends nothing again), Reload.
- Closed pages (another Owner, inactive person, PINs unavailable): one card that says why and one way on.

**The person page row** `/app/employees/<id>?view=access`. Without a PIN it reads "No Clocker PIN yet", "They can’t clock in on a tablet until you set one.", "Set PIN". With one it reads "Clocker PIN · Set".

**Punch photos** `/app/settings/clocker/photos` (Owner). One sentence on what the setting does. Each switch says On or Off in words. While photos are off, the four moments are disabled and one line says why. Strings moved to the copy module. The data, the save and the reload are unchanged.

**Clocker recovery** `/app/clocker-recovery` (Owner). `clocker-recovery-review.tsx`, `clocker-owner-requests.tsx`.
- Help requests: who, where, when. Tinted "Check", quiet "Fix in Timecards". Loading, empty, offline and failed states.
- "Check a code": what it is for in one sentence, one field with its help, one filled button, the one error style.
- Results: saved (green), nothing saved yet (amber, "Don’t add the time by hand yet."), more than one record (amber), offline, session ended, failed.
- A routine renewal now keeps the answer on screen. Before, the answer left the page and focus fell to the top of the document every few seconds. Editing the code, leaving the window and expiry still clear it.

**Loading placeholders.** Entries in `src/components/owner-b/b-loading.tsx` for the five routes, and a `loading.tsx` for each route (pins, photos and photo review used to show "Clocker tablets" while loading).

## 3. Where the setup code lives, and for how long

The code is a credential. It is one-use and the server gives it 15 minutes.

**On the Owner's page**
- In the React state of the tablets page, in memory, from the server's answer until the first of: Done is tapped, the code expires (a timer closes the card at that minute), the tablet is removed, a newer code is issued for the same tablet, or the page is reloaded or left.
- While the card is open it is also in the drawn QR code and in the address of "This is the tablet: open its Clocker".
- The readable code is in the page only while "Show code" is open.
- It is not written to the address bar, to local or session storage, to a cookie or to the console. The toast does not carry it.
- Copy link and Copy code put it on the clipboard. The page cannot clear a clipboard. The card says to close it when done.
- Checked in the browser: after Done the page's HTML holds no code (`scan-log`, `code-gone-*`: `inDom: false`).

**On the tablet**
- It arrives in the link's fragment (`/clocker/<key>#setup=<code>`). A browser does not send a fragment to a server or in a Referer header. It is never a query string.
- The setup screen reads it once and removes it from the address bar and from that history entry in the same step (`history.replaceState`).
- It is then held in one in-memory ref. It is never in React state, never in storage and never in the page's HTML.
- It leaves memory when the tablet connects, when the server refuses it, when someone taps "Type a code instead", and when the page goes away.
- It stays in memory after "offline" (nothing was sent) and after "not confirmed" (so the same code can be tried again after Check setup).
- It is sent once, in the body of the same `redeem` call the screen has always made.
- Nothing connects until someone taps Connect tablet. A link opened on the wrong device does not enrol that device or use up the code.
- Checked in the real run: no request carried the code in a URL; the page HTML and both storages held no code (`handoff-run-log.md`).

Limits I could not close from the UI: the browser's own history list may keep the first address it loaded, and a third-party QR scanner app may keep a scan history. The 15 minutes and the one use bound both.

## 4. Keyboard and focus

- Tablets page tab order: back link, each row's actions in order, Add tablet. Recorded in `scan-log` (`tablets-tab-order`).
- Add tablet: Enter opens the sheet with focus in the name field. Enter on an empty form puts focus on the first field in error. Escape closes and returns focus to Add tablet.
- A new setup code moves focus to its heading. Replace and Remove start on Cancel. Cancel returns focus to the row's button.
- "Not confirmed" and "Not saved" in the sheet take focus (role alert).
- PIN form: back link, New PIN, Type it again, Save PIN. A mismatch moves focus to the second field. The saved card and the not-confirmed card take focus.
- Recovery: back link, Refresh, the code field, Check code, the Timecards row. A wrong code keeps focus in the field. The answer card takes focus.
- Kiosk setup: the field, Connect tablet, the language switch. A refusal moves focus to the field. A new state (received, connected, not confirmed) moves focus to its heading.
- Every control shows the 2px focus ring. Kiosk buttons are 56px and taller. Owner controls have a 44px hit area (the kit's pills extend their hit area to 44px).
- Not done: a screen reader pass, and a pass at 200% text size.

## 5. English and Spanish

- The kiosk's setup screen is bilingual and renders both from `clocker-copy.ts` and the tablet's language. Screenshots in both.
- The Owner pages are signed-in pages: they render English. Every new string is in `src/components/clocker-owner-copy.ts` with `en` and `es`. Each screen has a Spanish render test that fails if an English sentence from the module shows.
- Not translated: messages that come from the server on the Owner side (a refused tablet name, a refused PIN). They have no stable code to key a translation on (For Codex 3). The photo review page and the "Help for your team" form keep their English strings; they were not rebuilt.

## 6. States

"Real" means the real app on the owned local server and database, signed in as the fictional Owner. "Forced" means the answer was replaced in the browser (`page.route`), so it proves the screen and not the server. "Unit" means a unit test only.

| Screen | State | How it was produced | Evidence |
|---|---|---|---|
| Clocker tablets | List: connected with last use, not set up (no code, code good until), removed | Real. Two tablets were connected by the real hand-off first | `tablets-list-1440.png`, `tablets-list-390.png` |
| | Empty | Unit. Not reached in the browser: every fixture workspace has a tablet, and time records point at it | `clocker-device-manager.test.tsx` |
| | Add a tablet, step 1, empty submit (field errors, focus on the name) | Real | `tablets-add-error-focus-1440.png` |
| | Setup code issued (QR, steps, valid until) | Real code from the local server | `tablets-code-qr-1440.png`, `tablets-code-qr-390.png` |
| | Show code, Copy link ("Link copied"), Done (code gone from the page) | Real. The readable code was masked in the browser before the screenshot | `scan-log`: `copy-*`, `code-gone-*` |
| | Manage, Replace (starts on Cancel), Remove (says what stops) | Real sheets; Remove was also submitted for one tablet | `tablets-remove-confirm-1440.png` |
| | Not confirmed | Forced (the save request was dropped) | `tablets-not-confirmed-900.png` |
| | Code expired, location inactive, no active location, failed read, Spanish | Unit | `clocker-device-manager.test.tsx` |
| Clocker PINs | People without a PIN, PIN set tab, no match | Real | `pins-list-1440.png`, `pins-list-390.png` |
| | Empty tabs, inactive tab, failed read, Spanish | Unit | `clocker-pin-inventory.test.tsx` |
| One person's PIN | Form | Real | `pin-form-390.png` |
| | Two different PINs (error, focus on the second field) | Real (nothing is sent) | `pin-mismatch-1440.png` |
| | Saved | Real save | `pin-saved-1440.png` |
| | Refused: a PIN another person has | Real. The server answered "This PIN is unavailable. Choose a different PIN." | `scan-log`: `pin-same-as-another` |
| | Not confirmed, then "Check if it saved" | Forced (the save request was dropped); the check itself ran on the real server | `pin-not-confirmed-1440.png` |
| | Closed pages (another Owner, inactive, unavailable), Spanish | Unit | `clocker-pin-form.test.tsx`, `page.test.tsx` |
| Person page | "No Clocker PIN yet" row; "Clocker PIN · Set" row | Real | `person-pin-row-1440.png` |
| Punch photos | Off (moments disabled, with the reason), on | Real page; the switch was flipped, not saved | `photos-off-1440.png`; on: `p6b-work/r4/cko-photos-on-900.png` |
| | Spanish, save results | Unit | `photo-settings.test.tsx` |
| Clocker recovery | Help requests empty; nothing saved for a code; wrong code | Real | `recovery-nothing-saved-390.png` |
| | Help requests with rows; saved; more than one record; failed; requests failed | Forced | `recovery-requests-1440.png`, `recovery-saved-1440.png`; conflict and failed: `p6b-work/r5/cko-recovery-conflict-*.png`, `cko-recovery-failed-*.png` |
| | Offline | Forced (the browser was taken offline) | `p6b-work/r5/cko-recovery-offline-*.png` |
| | Loading, session ended, Spanish | Unit | `clocker-recovery-states.test.tsx` |
| Loading placeholders | Clocker PINs (band 296), Punch photos, Clocker recovery, one person's PIN (band 224) | Real, through the access check, which draws the same placeholder | `scan-log`: `loading-*` |
| | Clocker tablets; every route's `loading.tsx` | Unit | `clocker-owner-loading.test.ts` |
| Kiosk setup | First time | Real | `kiosk-setup-first-time-1024x768.png`, `kiosk-setup-first-time-768x1024-es.png`, `kiosk-setup-first-time-800x600-es.png` |
| | Setup code received, from the link | Real link from a real code | `kiosk-setup-code-received-1024x768.png`, `kiosk-setup-code-received-768x1024-es.png` |
| | Connected, then the clock | Real | `kiosk-setup-connected-1024x768.png`, `kiosk-setup-clock-1024x768.png` |
| | Code used (the same link a second time) | Real | `kiosk-setup-code-used-768x1024-es.png` |
| | Code never issued; incomplete code; a link with a broken code | Real | `p6b-work/r4/kiosk-code-refused-*`, `kiosk-code-incomplete-*`, `kiosk-link-incomplete-*` |
| | New setup paused (402) | Forced | `p6b-work/r4/kiosk-setup-paused-*` |
| | Offline at Connect (nothing sent) | Forced (browser offline) | `kiosk-setup-offline-1024x768.png` |
| | No connection at first check | Forced | `p6b-work/r4/kiosk-no-connection-*` |
| | Not confirmed | Forced (503 on redeem) | `kiosk-setup-not-confirmed-768x1024-es.png` |
| | Already connected; punches off; cookies blocked | Unit | `clocker-setup.test.tsx` |

Kiosk sizes captured for every state above: 1024x768, 768x1024, 800x600 and 600x960, in English and Spanish. No state overflows sideways and none scrolls at any of the four sizes (`scan-log`, `kiosk` rows).

The evidence folder holds 30 pictures. Every capture, at every width and size, is in `scratchpad/p6b-work/r4/` (207 pictures, with `scan-log.json`), `p6b-work/r5/` (recovery, final commit) and `p6b-work/sparse/` (the person row).

## 7. Copy

No payroll sentence is new. Spanish is for Puerto Rico. The kiosk speaks to staff ("tú", as the kiosk already does). The Owner pages use the neutral "usted" forms.

**Kiosk setup screen (bilingual, rendered in both)**

| English | Spanish |
|---|---|
| This tablet will be the time clock for {location}. | Esta tableta será el registro de tiempo de {location}. |
| How to set it up | Cómo configurarla |
| On another device, the Owner opens Settings → Clocker tablets. | En otro dispositivo, el dueño abre Settings → Clocker tablets. |
| The Owner adds this tablet and gets its setup code. | El dueño añade esta tableta y obtiene su código de configuración. |
| Point this tablet’s camera at the code, or type the code below. | Apunta la cámara de esta tableta al código, o escribe el código abajo. |
| Setup code received | Código de configuración recibido |
| Tap Connect tablet to finish. The code works one time. | Toca Registrar tableta para terminar. El código sirve una sola vez. |
| Type a code instead | Escribir un código |
| Connecting… | Registrando… |
| Connecting this tablet… | Registrando esta tableta… |
| That link doesn’t have a complete setup code. Type the code from Owner Settings. | Ese enlace no trae un código de configuración completo. Escribe el código que aparece en Settings del dueño. |
| Enter the complete setup code from Owner Settings. | Escribe el código de configuración completo que aparece en Settings del dueño. |
| This tablet is offline. Connect it to Wi-Fi, then try again. | Esta tableta está sin conexión. Conéctala a la red Wi-Fi e inténtalo de nuevo. |
| Setup not confirmed | Configuración sin confirmar |
| This tablet is connected to {location} | Esta tableta quedó registrada en {location} |
| {device} is ready. Your team can clock in now. | {device} está lista. Tu equipo ya puede marcar. |
| Open the time clock | Abrir el registro de tiempo |
| The time clock opens in a few seconds. | El registro de tiempo se abre en unos segundos. |

**Owner pages (English rendered; Spanish in the module and under test).** Where a sentence takes a name, a count or a time it is shown with `${…}`.

| English | Spanish |
|---|---|
| **Shared** | |
| Settings | Configuración |
| Try again | Intentar de nuevo |
| Cancel | Cancelar |
| Done | Listo |
| Saving… | Guardando… |
| Checking… | Verificando… |
| Close | Cerrar |
| Location unavailable | Ubicación no disponible |
| **Clocker tablets** | |
| Clocker tablets | Tabletas de Clocker |
| The shared tablets where your team clocks in and out. | Las tabletas compartidas donde su equipo marca entrada y salida. |
| Tablets | Tabletas |
| Your tablets | Sus tabletas |
| Removed | Eliminadas |
| Removed tablets | Tabletas eliminadas |
| ${connected} connected, ${waiting} not set up, ${removed} removed | ${connected} registradas, ${waiting} sin configurar, ${removed} eliminadas |
| Add tablet | Añadir tableta |
| Add a tablet | Añadir una tableta |
| One tablet per location works best. | Lo mejor es una tableta por ubicación. |
| No time clock tablet yet | Aún no hay una tableta de registro de tiempo |
| A time clock tablet is a shared tablet at a location. Your team clocks in and out on it with their Employee ID and PIN. | Una tableta de registro de tiempo es una tableta compartida en una ubicación. Su equipo marca entrada y salida en ella con su ID de empleado y su PIN. |
| No active location | No hay una ubicación activa |
| Add or turn on a location before you add a tablet. | Añada o active una ubicación antes de añadir una tableta. |
| Go to Locations | Ir a Ubicaciones |
| Couldn’t load Clocker tablets | No se pudieron cargar las tabletas de Clocker |
| Tablet details couldn’t be read. No tablets were changed. | No se pudieron leer los datos de las tabletas. No se cambió ninguna tableta. |
| Connected | Registrada |
| Last used ${when} | Último uso: ${when} |
| Not used yet | Aún sin usar |
| No setup code yet | Aún sin código de configuración |
| Setup code good until ${when} | Código de configuración válido hasta ${when} |
| Setup code expired ${when} | El código de configuración venció ${when} |
| Setup code expired | El código de configuración venció |
| Removed | Eliminada |
| Can’t be used while its location is inactive | No se puede usar mientras su ubicación esté inactiva |
| Not set up | Sin configurar |
| Code expired | Código vencido |
| Location inactive | Ubicación inactiva |
| Get setup code | Obtener código |
| New code | Código nuevo |
| Set up again | Configurar de nuevo |
| Manage | Administrar |
| Get a setup code for ${name} | Obtener un código de configuración para ${name} |
| Get a new setup code for ${name} | Obtener un código de configuración nuevo para ${name} |
| Set up ${name} again | Configurar ${name} de nuevo |
| Manage ${name} | Administrar ${name} |
| Connect ${name} | Registrar ${name} |
| Step 2 of 2 · On the tablet | Paso 2 de 2 · En la tableta |
| For ${place} | Para ${place} |
| ['On the tablet, open the camera.', 'Point it at this code.', 'Tap the link, then tap Connect tablet.'] | ['En la tableta, abra la cámara.', 'Apúntela a este código.', 'Toque el enlace y luego toque Registrar tableta.'] |
| On the tablet | En la tableta |
| Setup code for ${name}, as a QR code | Código de configuración de ${name}, como código QR |
| This code is too long to draw. Copy the link or show the code. | Este código es muy largo para dibujarlo. Copie el enlace o muestre el código. |
| Good until ${when}. It works one time. | Válido hasta ${when}. Sirve una sola vez. |
| Anyone with this code can connect a tablet to this location. Close it when you’re done. | Cualquier persona con este código puede registrar una tableta en esta ubicación. Ciérrelo cuando termine. |
| Copy link | Copiar enlace |
| Link copied | Enlace copiado |
| Couldn’t copy. Show the code and type it on the tablet. | No se pudo copiar. Muestre el código y escríbalo en la tableta. |
| Show code | Mostrar código |
| Hide code | Ocultar código |
| Setup code | Código de configuración |
| No camera? On the tablet, open the ${place} Clocker and type this code. | ¿Sin cámara? En la tableta, abra el Clocker de ${place} y escriba este código. |
| Copy code | Copiar código |
| Code copied | Código copiado |
| This is the tablet: open its Clocker | Esta es la tableta: abrir su Clocker |
| Done | Listo |
| The setup code expired. Get a new one from the tablet’s row. | El código de configuración venció. Obtenga uno nuevo desde la fila de la tableta. |
| Setup code closed. | Código de configuración cerrado. |
| Step 1 of 2 · Name and location | Paso 1 de 2 · Nombre y ubicación |
| Add a tablet | Añadir una tableta |
| Name the tablet and choose where it will be. A tablet can’t change location later. | Póngale un nombre a la tableta y elija dónde estará. Una tableta no puede cambiar de ubicación después. |
| Tablet name | Nombre de la tableta |
| e.g. Front counter tablet | p. ej., Tableta del mostrador |
| Only you see this name. | Solo usted ve este nombre. |
| Enter a tablet name | Escriba un nombre para la tableta |
| Location | Ubicación |
| Choose a location | Elija una ubicación |
| Choose a location | Elija una ubicación |
| Get setup code | Obtener código |
| At ${place}. | En ${place}. |
| Not set up yet. Get a setup code, then scan it with the tablet. | Aún sin configurar. Obtenga un código de configuración y escanéelo con la tableta. |
| This tablet was removed. Set it up again with a new code. | Esta tableta fue eliminada. Configúrela de nuevo con un código nuevo. |
| Save name | Guardar nombre |
| Replace tablet | Reemplazar tableta |
| Use this when the tablet is lost, reset or swapped for another one. | Úselo cuando la tableta se pierde, se restablece o se cambia por otra. |
| Remove tablet | Eliminar tableta |
| To stop a tablet for a while, remove it. You can set it up again with a new code. | Para detener una tableta por un tiempo, elimínela. Puede configurarla de nuevo con un código nuevo. |
| Get a setup code for ${name}? | ¿Obtener un código de configuración para ${name}? |
| Any earlier setup code for this tablet stops working. | Cualquier código de configuración anterior de esta tableta deja de funcionar. |
| Replace ${name}? | ¿Reemplazar ${name}? |
| The tablet connected now stops working right away. Nobody can clock in on it until a tablet is set up with the new code. Time already recorded stays. | La tableta registrada ahora deja de funcionar de inmediato. Nadie puede marcar en ella hasta que se configure una tableta con el código nuevo. El tiempo ya registrado se conserva. |
| Replace and get code | Reemplazar y obtener código |
| Set up ${name} again? | ¿Configurar ${name} de nuevo? |
| You get a new setup code for the same location. | Recibe un código de configuración nuevo para la misma ubicación. |
| Remove ${name}? | ¿Eliminar ${name}? |
| Clocking in and out on this tablet stops right away, and any setup code for it stops working. Time already recorded stays. You can set it up again later. | Marcar entrada y salida en esta tableta se detiene de inmediato, y cualquier código de configuración suyo deja de funcionar. El tiempo ya registrado se conserva. Puede configurarla de nuevo después. |
| Remove tablet | Eliminar tableta |
| Tablet name saved. | Nombre de la tableta guardado. |
| Tablet removed. Its time records are kept. | Tableta eliminada. Sus registros de tiempo se conservan. |
| Setup code ready. Finish on the tablet. | Código de configuración listo. Termine en la tableta. |
| Not saved | No se guardó |
| Not confirmed | Sin confirmar |
| We don’t know if this was saved. Refresh the list to see what the tablet looks like now, then try again if you need to. | No sabemos si esto se guardó. Actualice la lista para ver cómo está la tableta ahora y, si hace falta, inténtelo de nuevo. |
| Refresh the list | Actualizar la lista |
| **Clocker PINs** | |
| Clocker PINs | PIN de Clocker |
| Search by name | Buscar por nombre |
| Show people by PIN | Mostrar personas según su PIN |
| No PIN | Sin PIN |
| PIN set | Con PIN |
| Inactive | Inactivas |
| ${label}, ${count} | ${label}, ${count} |
| count === 1 ? '1 person needs a PIN' : ${count} people need a PIN | count === 1 ? '1 persona necesita un PIN' : ${count} personas necesitan un PIN |
| PIN set | Con PIN |
| Inactive people | Personas inactivas |
| People | Personas |
| No PIN yet | Aún sin PIN |
| PIN set | Con PIN |
| Inactive | Inactiva |
| Set PIN | Crear PIN |
| Reset PIN | Cambiar PIN |
| Set a Clocker PIN for ${name} | Crear un PIN de Clocker para ${name} |
| Reset the Clocker PIN for ${name} | Cambiar el PIN de Clocker de ${name} |
| Open ${name}’s profile | Abrir el perfil de ${name} |
| View profile | Ver perfil |
| Everyone has a PIN. | Todas las personas tienen PIN. |
| New people show up here until you set theirs. | Las personas nuevas aparecen aquí hasta que cree su PIN. |
| No one has a PIN yet. | Nadie tiene PIN todavía. |
| Set a PIN for each person who clocks in on a tablet. | Cree un PIN para cada persona que marca en una tableta. |
| No inactive people. | No hay personas inactivas. |
| No one matches that name. | Nadie coincide con ese nombre. |
| Check the spelling, or look under another tab. | Revise cómo está escrito o busque en otra pestaña. |
| Clear search | Borrar búsqueda |
| Each person clocks in with their own Employee ID and PIN. Nobody can see a PIN after it is set, including you. | Cada persona marca con su propio ID de empleado y su PIN. Nadie puede ver un PIN después de crearlo, ni usted. |
| Couldn’t load Clocker PINs | No se pudieron cargar los PIN de Clocker |
| Check your connection, then try again. No PIN was changed. | Revise su conexión e inténtelo de nuevo. No se cambió ningún PIN. |
| **One person's Clocker PIN** | |
| Clocker PIN | PIN de Clocker |
| Set a PIN for ${name} | Crear un PIN para ${name} |
| Reset the PIN for ${name} | Cambiar el PIN de ${name} |
| Choose 4 digits. They type it on the tablet after their Employee ID. | Elija 4 dígitos. La persona los escribe en la tableta después de su ID de empleado. |
| Choose 4 new digits. The old PIN stops working when you save. | Elija 4 dígitos nuevos. El PIN anterior deja de funcionar al guardar. |
| New PIN | PIN nuevo |
| Type it again | Escríbalo otra vez |
| 4 digits. Each person needs their own. | 4 dígitos. Cada persona necesita el suyo. |
| The two PINs don’t match | Los dos PIN no coinciden |
| Save PIN | Guardar PIN |
| Saving the PIN. | Guardando el PIN. |
| PIN set for ${name}. Tell them in person. | PIN creado para ${name}. Dígaselo en persona. |
| The PIN is not shown again. If they forget it, set a new one. | El PIN no se vuelve a mostrar. Si lo olvida, cree uno nuevo. |
| Back to ${name} | Volver a ${name} |
| Back to Clocker PINs | Volver a PIN de Clocker |
| Set another PIN | Crear otro PIN |
| The PIN wasn’t saved | El PIN no se guardó |
| PIN not confirmed | PIN sin confirmar |
| We don’t know if the new PIN was saved. Check before you set it again. The old PIN may still work. | No sabemos si el PIN nuevo se guardó. Verifique antes de crearlo otra vez. Es posible que el PIN anterior todavía funcione. |
| Check if it saved | Verificar si se guardó |
| Save reference | Referencia del guardado |
| This save went through, then a newer PIN replaced it. Reload to see what is set now. | Este guardado se completó y luego un PIN más nuevo lo reemplazó. Vuelva a cargar para ver cuál está activo. |
| Still not confirmed. Nothing was sent again. | Todavía sin confirmar. No se volvió a enviar nada. |
| This save couldn’t be checked. Keep the reference and try again. | No se pudo verificar este guardado. Conserve la referencia e inténtelo de nuevo. |
| Reload | Volver a cargar |
| Only an Owner can do this | Solo un dueño puede hacer esto |
| Only an Owner can set another Owner’s Clocker PIN. | Solo un dueño puede crear el PIN de Clocker de otro dueño. |
| ${name} is inactive | ${name} está inactiva |
| Inactive people can’t clock in. Make them active again before you set a PIN. | Las personas inactivas no pueden marcar. Actívela de nuevo antes de crear un PIN. |
| PINs can’t be set right now | No se pueden crear PIN en este momento |
| PIN security isn’t set up or can’t be reached. No PIN was changed. | La seguridad de los PIN no está configurada o no responde. No se cambió ningún PIN. |
| View their profile | Ver su perfil |
| No Clocker PIN yet | Aún sin PIN de Clocker |
| They can’t clock in on a tablet until you set one. | No puede marcar en una tableta hasta que cree uno. |
| Clocker PIN | PIN de Clocker |
| **Punch photos** | |
| Punch photos | Fotos de marcación |
| A photo with a clock-in or clock-out on your shared tablets. | Una foto con la entrada o la salida en sus tabletas compartidas. |
| When this is on, the tablet takes one photo at the moments you choose, so you can see who clocked in. | Cuando está activado, la tableta toma una foto en los momentos que usted elija, para que vea quién marcó. |
| Punch photos aren’t available yet | Las fotos de marcación aún no están disponibles |
| You can choose your settings now. They start when photos are turned on for your workplace. | Puede elegir su configuración ahora. Empieza cuando las fotos se activen para su negocio. |
| Take punch photos | Tomar fotos de marcación |
| On | Activado |
| Off | Desactivado |
| When to take a photo | Cuándo tomar una foto |
| Turn on Take punch photos to choose these. | Active Tomar fotos de marcación para elegirlos. |
| Clock in | Marcar entrada |
| Start break | Iniciar descanso |
| End break | Terminar descanso |
| Clock out | Marcar salida |
| Keep photos for | Conservar fotos por |
| days | días |
| 1 to 30 days. A shorter time deletes older photos. | De 1 a 30 días. Un plazo más corto borra las fotos más antiguas. |
| When a photo is missing | Cuando falta una foto |
| ['The clock-in or clock-out still counts if someone declines the photo or the camera fails. They can ask for help and carry on.', 'Only an Owner can see photos. The tablet takes one photo for that moment. It never records video and never recognizes faces.'] | ['La entrada o la salida cuenta aunque la persona rechace la foto o la cámara falle. Puede pedir ayuda y continuar.', 'Solo un dueño puede ver las fotos. La tableta toma una foto para ese momento. Nunca graba video y nunca reconoce rostros.'] |
| Review punch photos | Revisar fotos de marcación |
| See saved photos and remove one. | Vea las fotos guardadas y elimine alguna. |
| Save | Guardar |
| Saved. These settings start when photos are available. | Guardado. Esta configuración empieza cuando las fotos estén disponibles. |
| We couldn’t confirm that save. Reload the settings before you try again. | No pudimos confirmar ese guardado. Vuelva a cargar la configuración antes de intentarlo de nuevo. |
| Reload settings | Volver a cargar la configuración |
| Saved settings loaded. Changes you hadn’t saved were replaced. | Se cargó la configuración guardada. Los cambios sin guardar se reemplazaron. |
| Couldn’t load the saved settings. Your changes are still here. | No se pudo cargar la configuración guardada. Sus cambios siguen aquí. |
| Couldn’t load photo settings | No se pudo cargar la configuración de fotos |
| Couldn’t load help for your team | No se pudo cargar la ayuda para su equipo |
| Check the photo settings. | Revise la configuración de fotos. |
| **Clocker recovery** | |
| Clocker recovery | Recuperación de Clocker |
| Check a clock-in or clock-out that someone isn’t sure was saved. | Verifique una entrada o salida que alguien no está seguro de haber guardado. |
| When a tablet can’t confirm a punch, it keeps a code. Checking a code here never changes recorded time. | Cuando una tableta no puede confirmar una marcación, guarda un código. Verificar un código aquí nunca cambia el tiempo registrado. |
| Help requests | Solicitudes de ayuda |
| People who asked for help | Personas que pidieron ayuda |
| Refresh | Actualizar |
| Checking for requests… | Buscando solicitudes… |
| No one needs help right now | Nadie necesita ayuda en este momento |
| When someone taps “Ask Owner to review” on a tablet, they show up here. | Cuando alguien toca “Pedir revisión al dueño” en una tableta, aparece aquí. |
| Couldn’t load help requests | No se pudieron cargar las solicitudes de ayuda |
| Check your connection, then refresh. | Revise su conexión y actualice. |
| You’re offline | Está sin conexión |
| Help requests load again when you’re back online. | Las solicitudes de ayuda se cargan de nuevo cuando vuelva la conexión. |
| Show more requests | Mostrar más solicitudes |
| Check | Verificar |
| Check ${name}’s saved punch | Verificar la marcación guardada de ${name} |
| Fix in Timecards | Corregir en Tarjetas de tiempo |
| Fix ${name}’s time in Timecards | Corregir el tiempo de ${name} en Tarjetas de tiempo |
| ${place} · ${tablet} | ${place} · ${tablet} |
| No code was kept | No se guardó un código |
| Check a code | Verificar un código |
| Code from the tablet | Código de la tableta |
| The code shown on the tablet | El código que muestra la tableta |
| On the tablet, the person opens “Something didn’t save?” to see their code. | En la tableta, la persona abre “¿Algo no se guardó?” para ver su código. |
| Enter the code from the tablet | Escriba el código de la tableta |
| Enter the whole code from the tablet, with its dashes | Escriba el código completo de la tableta, con sus guiones |
| Check code | Verificar código |
| Checking the code… | Verificando el código… |
| What was saved | Lo que se guardó |
| This punch was saved | Esta marcación se guardó |
| Tell the person. On the same tablet they tap Check action status to finish. | Avísele a la persona. En la misma tableta, toca Revisar estado de la marcación para terminar. |
| Nothing is saved for this code yet | Aún no hay nada guardado para este código |
| It may still be on its way. Ask the person to check again on the same tablet. Don’t add the time by hand yet. | Puede que todavía esté en camino. Pídale a la persona que verifique de nuevo en la misma tableta. No añada el tiempo a mano todavía. |
| This code has more than one record | Este código tiene más de un registro |
| Look at each one with the person before you change anything in Timecards. | Revise cada uno con la persona antes de cambiar algo en Tarjetas de tiempo. |
| Couldn’t check the code | No se pudo verificar el código |
| Keep the code and check again. | Conserve el código y verifique de nuevo. |
| You’re offline | Está sin conexión |
| Keep the code and check again when you’re back online. | Conserve el código y verifique de nuevo cuando vuelva la conexión. |
| Your session ended | Su sesión terminó |
| Sign in again, then check this code. | Inicie sesión de nuevo y luego verifique este código. |
| Sign in | Iniciar sesión |
| Code checked: ${code} | Código verificado: ${code} |
| Clock in | Entrada |
| Clock out | Salida |
| Start break | Inicio de descanso |
| End break | Fin de descanso |
| Recorded punch | Marcación registrada |
| Time unavailable | Hora no disponible |
| Time wrong or missing? | ¿Tiempo incorrecto o faltante? |
| Fix it in Timecards | Corríjalo en Tarjetas de tiempo |
| Turn on JavaScript to check a code. | Active JavaScript para verificar un código. |

## 8. Checks run

- Type check: `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit -p .` Clean for `src`.
- Lint: `npx eslint` on every changed `.ts` and `.tsx` file. Clean.
- Unit tests, full run: `npx vitest run --dir src src/app src/components src/lib --testTimeout=30000`. 907 files passed, 24 skipped; 13,784 tests passed, 741 skipped; none failed. Log: `p6b-work/vitest-final.log`.
- New or rewritten test files: `clocker-setup.test.tsx` (14), `clocker-setup-link.test.ts` (3), `clocker-owner-copy.test.ts` (7), `clocker-device-manager.test.tsx` (28, rewritten), `clocker-pin-inventory.test.tsx` (7), `clocker-pin-form.test.tsx` (9), `clocker-recovery-states.test.tsx` (10), `clocker-photo/photo-settings.test.tsx` (5), `clocker-owner-loading.test.ts` (6), and `employees/[employeeId]/clocker-pin/page.test.tsx` (updated). The existing recovery, copy, kiosk page and governance tests pass unchanged.
- Sheet rules: `clocker-owner-b.css` was added to the lists in `b-viewport.test.ts` and `b-foundation.test.ts` and passes them (alias breakpoints only, `!important` only in `@layer nv-b`).
- Browser, real app, owned local Postgres, fictional data:
  - **The kiosk journey before any change** (base `e9d2ba4e`): 28 of 28 steps passed. Enrol the tablet, Spanish, wrong PIN, clock in, start and end a break, clock out through saved-action recovery, a second location, PIN offline and unavailable, lockout. Log `p6b-work/base-kiosk3/scan-log.json`.
  - **The same journey on the final commit**: 28 of 28 steps passed. Log `p6b-work/kiosk-final/scan-log.json`.
  - My copy of the journey script was updated as the brief said (Employee ID then PIN, current button names). I also made it adapt to the busy fixture: James starts the day clocked in, the break types already exist, and Ana is already on a shift at the main location, so the second-location step shows the other-location screen on the second tablet. The first two attempts on the base failed on those script assumptions, not on the app.
  - **The hand-off, real, once in each language**: `b-evidence/handoff-run-log.md`. The Owner adds a tablet, the tablet opens the link, "Setup code received", Connect, connected, the clock opens, the same link a second time is refused, the Owner's row reads Connected with its last use.
  - **Every Owner state at 1440, 900 and 390**, and **every kiosk setup state at 1024x768, 768x1024, 800x600 and 600x960 in both languages**: `p6b-work/r4/` (run passed its source check; `overflow` 0 everywhere; no page error).
  - Frame numbers measured at 1440 and 900: title top 130, band 224 with one line and 296 on Clocker PINs, first card 24px under the band, content 812 wide (764 at 900).
- Not run: the integration suites that need their own databases (`vitest.clocker-*-integration`), a production build, and anything on a real device.

One capture detail to know: the last change to the patch (keeping the recovery answer on screen only for the code being checked) was made after run `r4`. Recovery was captured again on the final commit (`r5`). The full unit suite, type check and lint ran on the final commit.

## 9. For Codex

1. **One refusal for three causes.** The setup call answers `ENROLLMENT_INVALID` for a used code, an expired code and a code for another location or workplace. That is by design (the kiosk must not learn which). The screen shows the server's one sentence with its next step. If Jose wants three sentences, the server must send three codes.
2. **No pause.** The device action has REGISTER, RENAME, ROTATE and REVOKE. There is no pause and no "paused" state. The UI offers remove and set up again. A real pause needs an operation and a state.
3. **Owner-side refusals have no stable code.** `manageClockerDeviceAction` and `saveClockerPinAction` return English sentences. The Owner pages show them as sent. A code per refusal would let the copy module carry them in both languages.
4. **The setup code card cannot know the tablet connected.** The Owner sees "Connected" after a reload. A small status read for one device would let the card close itself and say so.
5. **Recovery: more than one record for one code.** The ledger key is device plus code, so two rows mean the same code on two tablets. The page shows that as "This code has more than one record" in amber. Please confirm that reading.
6. **A PIN another person has.** In the real run the server refused it with "This PIN is unavailable. Choose a different PIN." The screen shows that sentence in the red "The PIN wasn’t saved" note. It is fine as it is; it is one of the English-only sentences in item 3.
7. **`clocker-setup.module.css` is a retired name.** `src/test/phase-c-governance-cleanup.test.ts` fails if that file exists. The brief asked for that name. The new sheet is `src/components/clocker-tablet-setup.module.css`.

## 10. For Jose to decide

1. **The words.** Every new sentence is in section 7, English and Spanish. None is a payroll sentence.
2. **Managers and PINs.** The brief says "Owner and, where allowed, Manager". Today only an Owner can open the PIN pages. Should a Manager set PINs for their own location's people? That is a server permission.
3. **The clock opens by itself 6 seconds after a tablet connects.** The button opens it at once. Say if it should wait for the tap only.
4. **The step list folds away on a 600px-tall tablet when a refusal shows**, so the refusal, the field and the button fit one screen. Taller tablets keep the steps.
5. **Home Screen tablets.** A tablet's camera opens the link in the browser. If the kiosk is used from an icon added to the Home Screen on an iPad, that icon may keep its own cookies, apart from the browser's. Then the tablet set up in the browser is not set up in the icon. I could not test this on a real iPad. Typing the code inside the Home Screen app still works.
6. **"This is the tablet: open its Clocker"** opens the kiosk with the code already received, for an Owner who is holding the tablet. Keep it or drop it.
7. **Spanish for the Owner pages** is ready in the copy module but the signed-in app renders English, as agreed.

## 11. Needed from another package

- Package A owns `clocker-copy.test.tsx` and `src/app/clocker/**` tests. They pass unchanged. I added one block of strings to `clocker-copy.ts` (marked "Tablet setup (Phase 6, JR-26)") and edited nothing else there.
- `clocker-icon.tsx` is A's. The setup screen uses its existing icons only.
- The setup screen still paints the setup form for a moment on a connected tablet while it checks (the first paint is the form; two existing tests pin that). A calm "Checking this tablet…" first paint would need those tests (A's) to change.
- Shared files I touched, each by one small edit: `src/components/owner-b/b-loading.tsx` (six entries), `src/app/app/employees/[employeeId]/page.tsx` (the Clocker PIN row only), `src/app/app/b-viewport.test.ts` and `src/app/app/b-foundation.test.ts` (my sheet added to the checked list), `src/components/clocker-photo/photo-settings.tsx` (presentation and strings only).
- `src/components/clocker-pin-page.css` is deleted (the old PIN sheet frame). `owner-b-desktop.css`, `owner-b-pages.css` and `premium-wave-a.css` still carry `.wa-pin` rules that now match nothing. I did not edit those shared sheets.
- I did not update `DESIGN.MD`. Suggested lines are in section 12.

## 12. Suggested lines for DESIGN.MD (not applied)

- **Clocker settings (Phase 6).** The Owner's Clocker pages sit in the Settings frame and use the Direction B kit inside it; their own rules are in `src/components/clocker-owner-b.css`. A tablet row: 36px lead, name, an amber chip only for "Not set up", "Code expired" or "Location inactive", then where, state and when in grey. One tinted action and one quiet action per row.
- **Setup code.** Shown as a QR code of the kiosk link with the code in the fragment, never in a query string. The code is read once on the tablet, removed from the address bar, kept in memory only, and nothing connects without a tap. On the Owner's page it leaves when the card closes or the code expires.
- **PIN result.** After a save the form is gone and the card names the person: "PIN set for Maria Rivera. Tell them in person."
- **Kiosk setup.** First-time screen: what the tablet will be, three numbered steps, the field, one filled button. A refusal sits under the field. On a 600px-tall landscape tablet the eyebrow goes and the steps fold while a refusal shows.

## 13. Not verified

- A real camera scanning the QR code from a real screen. The run opened the same link the code draws; the encoder's own tests (Phase 5) read codes back with a decoder.
- A real iPad, Safari, and a Home Screen kiosk (see For Jose 5).
- **Focus after a real code check on Clocker recovery.** Measured in the browser: after the answer card appears, focus is on the document body, not on the card. The line that moves focus is unchanged from before this work, and the card is announced (role status). I did not find the cause. Every other result in this package takes focus as recorded in section 4.
- The empty Clocker tablets page in a browser (unit tested only).
- A screen reader, 200% text size, 320px width for the Owner pages (390, 900 and 1440 were captured).
- The route `loading.tsx` path in the browser. The local server streams the placeholder with the page, so holding the network back does not show it. The placeholder's shape is unit tested, and the same placeholder was seen through the access check on the pages that have one (section 6).
- States forced in the browser are marked "forced" in section 6. They prove the screen, not the server.
- The failed-read cards for tablets and PINs, the closed PIN pages, a tablet at an inactive location, an expired code and the PIN form at 200% are unit tested only.
- The photo review page and the photo settings error card were not rebuilt.

## 14. After this report (same day)

- **Recovery focus: fixed.** The page is drawn through `ScopedReadFrame`, which commits its children one step after the review component renders, so the focus effect ran before the answer card existed. The card now takes focus as it mounts when a check was asked for, only if focus is still on the control that asked or on the document body. Browser log on the real local server, 1440, a code with nothing saved, `document.activeElement` at first paint, +1s, +6s and +16s: before, body at all four; after, the answer card at all four. Focus placed in the code field afterwards stayed there across a renewal. Four unit tests in `clocker-recovery-review.test.tsx`. Not traced in the browser: a keyboard-only submit, and the saved, conflict, offline and failed answers (they share the card).
- **Two sentences aligned with the kiosk's new button names** (package A renamed them): "When someone taps “Ask Owner to check” on a tablet, they show up here." and "Tell the person. On the same tablet they tap Check if it saved to finish." Spanish: “Pedir al dueño que revise” and "Revisar si se guardó".
