import {CLOCKER_TRANSPORT_ERRORS,type ClockerTransportErrorCode} from '../lib/clocker/transport-errors';
export type ClockerLocale='en'|'es';
export const CLOCKER_COPY:Record<string,string>={
 "New tablet setup is paused. Use a registered tablet to finish an existing shift.":"La configuración de nuevas tabletas está pausada. Usa una tableta conectada para terminar un turno en curso.",
 "Your PIN check changed. Enter your PIN again; nothing was punched twice.":"La verificación de tu PIN cambió. Ingresa tu PIN de nuevo; no se registró ninguna marcación dos veces.",
 "This punch reference belongs to a different punch. Ask your manager to check it.":"Esta referencia pertenece a otra marcación. Pide a tu gerente que la revise.",
 "We couldn't confirm your punch. Tap Check action status before trying again.":"No pudimos confirmar tu marcación. Toca Verificar estado de la acción antes de volver a intentarlo.",
 "We couldn't confirm your punch. Tap Check Action Status before trying again.":"No pudimos confirmar tu marcación. Toca Verificar estado de la acción antes de volver a intentarlo.",
 "Photo capture is unavailable":"La captura de fotos no está disponible",
 "Photo for clock in":"Foto para marcar entrada",
 "Photo for clock out":"Foto para marcar salida",
 "Photo for break start":"Foto para iniciar el descanso",
 "Photo for break end":"Foto para terminar el descanso",
 "Opening the camera…":"Abriendo la cámara…",
 "Ready for your photo?":"¿Todo listo para la foto?",
 "Use this photo?":"¿Usar esta foto?",
 "The camera needs attention":"La cámara necesita atención",
 "This tablet can’t save punches":"Esta tableta no puede guardar marcaciones",
 "Checking your time…":"Verificando tu registro…",
 "Check your clock action":"Verifica tu marcación",
 "Saving your punch photo…":"Guardando la foto…",
 "Time recorded. Check the photo.":"Tiempo registrado. Verifica la foto.",
 "Time recorded":"Tiempo registrado",
 "Enter your PIN again":"Ingresa tu PIN de nuevo",
 "Camera closed":"Cámara cerrada",
 "Preparing your clock action…":"Preparando tu marcación…",
 "Camera access was declined. You can allow it in Safari settings or continue without a photo.":"Se rechazó el acceso a la cámara. Puedes permitirlo en la configuración de Safari o continuar sin foto.",
 "Camera permission was not completed in time. Try again while your PIN session is active.":"El permiso de la cámara no se completó a tiempo. Inténtalo mientras tu sesión de PIN esté activa.",
 "A photo could not be captured. Check the camera and try again.":"No se pudo tomar la foto. Revisa la cámara e inténtalo de nuevo.",
 "The camera is unavailable. Continue without a photo or ask your Owner for help.":"La cámara no está disponible. Continúa sin foto o pide ayuda al dueño.",
 "Live camera preview":"Vista previa de la cámara",
 "Temporary photo for this clock action":"Foto temporal para esta marcación",
 "Allow camera access in Safari":"Permite el acceso a la cámara en Safari",
 "Face the camera. Take a photo when you are ready.":"Mira hacia la cámara. Toma la foto cuando quieras.",
 "The camera is off. Confirm the photo to record your clock action.":"La cámara está apagada. Confirma la foto para registrar tu marcación.",
 "The clock result is unconfirmed. Check the original action before continuing.":"El resultado no está confirmado. Verifica la acción original antes de continuar.",
 "The recovery record could not be saved. No new request was sent. Allow browser storage or ask your Owner for help.":"No se pudo guardar el registro de recuperación. No se envió una nueva solicitud. Permite el almacenamiento del navegador o pide ayuda al dueño.",
 "The camera and private preview have been cleared.":"Se cerró la cámara y se borró la vista previa privada.",
 "Your recorded time is preserved.":"Tu tiempo registrado se conserva.",
 "Check any unconfirmed clock action after entering your PIN again.":"Verifica las acciones sin confirmar después de ingresar tu PIN de nuevo.",
 "Time recorded at {time}":"Tiempo registrado: {time}",
 "Open camera":"Abrir cámara",
 "Take photo":"Tomar foto",
 "Use this photo":"Usar esta foto",
 "Retake photo":"Volver a tomar la foto",
 "Continue without photo":"Continuar sin foto",
 "Check original action":"Verificar acción original",
 "Retry same clock action":"Reintentar la misma marcación",
 "Try saving recovery record":"Reintentar guardar la recuperación",
 "Check if the photo saved":"Revisar si se guardó la foto",
 "Send the photo again":"Enviar la foto de nuevo",
 "Cancel":"Cancelar",
 "Your company photo notice is unavailable. Continue without a photo or ask your Owner for help.":"El aviso de fotos de tu empresa no está disponible. Continúa sin foto o pide ayuda al dueño.",
 "Company photo notice":"Aviso de fotos de la empresa",
 "{company} uses a photo with selected clock actions. Photos are kept for {days} days. Only an authorized Owner can review them.":"{company} usa fotos en las marcaciones seleccionadas. Se conservan por {days} días. Solo un dueño autorizado puede revisarlas.",
 "View photo notice":"Ver aviso de fotos",
 "Get help":"Pedir ayuda",
 "Clocker takes one photo for this action. The camera stops after capture, cancellation, leaving this screen or verification expiry. It does not record continuously or recognize faces.":"Clocker toma una foto para esta acción. La cámara se detiene al tomarla, cancelar, salir de esta pantalla o vencer la verificación. No graba continuamente ni reconoce rostros.",
 "Expired photos are unavailable for review. Removing a photo preserves its time record.":"Las fotos vencidas no están disponibles para revisión. Eliminar una foto conserva su registro de tiempo.",
 "You can continue without a photo. Your punch and the missing photo are recorded separately.":"Puedes continuar sin foto. Tu marcación y la falta de foto se registran por separado.",
 "Use this contact for an assisted alternative, accessibility help or a photo removal request.":"Usa este contacto para una alternativa asistida, ayuda de accesibilidad o solicitar que se elimine una foto.",
 "The clock result is unconfirmed. Check the original action before trying another punch.":"El resultado de tiempo no está confirmado. Verifica la acción original antes de intentar otra.",
 "Your time and punch photo are recorded.":"Tu tiempo y la foto están registrados.",
 "Your time is recorded. The photo was not saved; a photo exception is recorded.":"Tu tiempo está registrado. La foto no se guardó; se registró una excepción de foto.",
 "Your time is recorded. No photo was saved; your manager can see that.":"Tu tiempo está registrado. No se guardó la foto; tu gerente podrá verlo.",
 "Your time is recorded. A photo was not required for this action.":"Tu tiempo está registrado. Esta acción no requería una foto.",
 "Your time is recorded. The photo window has expired. Ask your company’s assistance contact for help.":"Tu tiempo está registrado. El plazo para la foto venció. Pide ayuda al contacto de asistencia de tu empresa.",
 "Your time is recorded. The punch photo was removed. Removing a photo does not remove its time record.":"Tu tiempo está registrado. La foto fue eliminada. Eliminarla no elimina el registro de tiempo.",
 "Your time is recorded. The photo result is unconfirmed. Checking the photo will not repeat your clock action.":"Tu tiempo está registrado. El resultado de la foto no está confirmado. Verificarla no repetirá tu marcación.",
 "This tablet reports that it is offline. Your time is recorded. The photo result must be checked when this tablet reconnects. Photos are not queued in browser storage.":"Esta tableta indica que está sin conexión. Tu tiempo está registrado. Verifica el resultado de la foto cuando la tableta se reconecte. Las fotos no se guardan en una cola del navegador.",
 "This tablet reports that it is offline. The clock result is unconfirmed. Check the original action when this tablet reconnects. Photos are not queued in browser storage.":"Esta tableta indica que está sin conexión. El resultado de tiempo no está confirmado. Verifica la acción original cuando la tableta se reconecte. Las fotos no se guardan en una cola del navegador.",
 "This tablet reports that it is offline. No clock action has been sent. Reconnect or use your company’s assistance option. Photos are not queued in browser storage.":"Esta tableta indica que está sin conexión. No se ha enviado ninguna marcación. Reconecta la tableta o usa la opción de asistencia de tu empresa. Las fotos no se guardan en una cola del navegador.",
 // The kiosk drops the storage sentence (Nov 10 review, NV-047): the offline lines as the kiosk shows them.
 "This tablet reports that it is offline. Your time is recorded. The photo result must be checked when this tablet reconnects.":"Esta tableta indica que está sin conexión. Tu tiempo está registrado. Verifica el resultado de la foto cuando la tableta se reconecte.",
 "This tablet reports that it is offline. The clock result is unconfirmed. Check the original action when this tablet reconnects.":"Esta tableta indica que está sin conexión. El resultado no está confirmado. Verifica la marcación original cuando la tableta se reconecte.",
 "This tablet reports that it is offline. No clock action has been sent. Reconnect or use your company’s assistance option.":"Esta tableta indica que está sin conexión. No se ha enviado ninguna marcación. Reconecta la tableta o usa la opción de asistencia de tu empresa.",

 "Waiting for request confirmation.":"Esperando la confirmación de la solicitud.",
 "Requesting review…":"Solicitando revisión…",
 "Review requested":"Revisión solicitada",
 "Retry original review request":"Reintentar la solicitud original",
 "Ask Owner to review":"Pedir revisión al dueño",
 "Review request reference":"Referencia de la solicitud de revisión",
 // Premium pass (#10): the Owner's pages show this place as "Clocker recovery" (its Settings row, page title and tab are
 // English), so the Spanish names it as the Owner sees it, as "Settings → Clocker tablets" does.
 "Your Owner can find this in Clocker recovery.":"El dueño puede encontrarla en Clocker recovery.",
 "Request confirmation is unavailable. Keep this reference; retry uses the same request.":"No pudimos confirmar la solicitud. Conserva esta referencia; al reintentar se usa la misma solicitud.",
 "Stay on break":"Seguir en descanso",
 "Stay clocked in":"Seguir en turno",
 "Review your current status":"Revisa tu estado actual",
 "Review current status":"Revisar estado actual",
 "No confirmation was found. This earlier request can no longer be applied. Review your current status before choosing a new action.":"No se encontró confirmación. Esta solicitud anterior ya no puede aplicarse. Revisa tu estado actual antes de elegir una nueva acción.",
 "Your earlier punch is kept on this tablet for review. Nothing new was recorded.":"Tu marcación anterior queda en esta tableta para revisión. No se registró nada nuevo.",
 "Reference":"Referencia",
 "Saved at {time}. This screen clears in 8 seconds.":"Guardado a las {time}. Se borra en 8 segundos.",
 "Saved {time}. This screen clears in 8 seconds.":"Guardado el {time}. Se borra en 8 segundos.",
 "Something didn’t save?":"¿Algo no se guardó?",
 "Privacy reminder":"Aviso de privacidad",
 "This screen clears in {seconds} seconds.":"Esta pantalla se borra en {seconds} segundos.",
 "Clears in {seconds} s":"Se borra en {seconds} s",
 "Keep my place":"Guardar mi lugar",
 "Clocked in": "En turno",
 "PIN keypad": "Teclado del PIN",
 "Setup required": "Requiere configuración",
 "Connect tablet":"Conectar tableta",
 "On break": "En descanso",
 "Clear PIN": "Borrar PIN",
 "Delete digit": "Borrar dígito",
 "Setup code": "Código de configuración",
 "Skip to time clock": "Ir al registro de tiempo",
 "Meal": "Comida",
 "Other": "Otro",
 "Continue": "Continuar",
 "Start over": "Empezar de nuevo",
 "Done": "Listo",
 "Your PIN is not your NEVORA password.": "Tu PIN no es tu contraseña de NEVORA.",
 "Shared time clock": "Registro de tiempo compartido",
 "Enter your PIN": "Ingresa tu PIN",
 "Rest": "Descanso",
 "Employee PIN": "PIN de empleado",
 "Set up this tablet": "Configura esta tableta",
 "Back": "Volver",
 "Number {number}": "Número {number}",
 "Off clock": "Fuera de turno",
 "Clear": "Borrar",
 "PIN not recognized for this location. Try again or ask your manager.":"PIN no reconocido para esta ubicación. Inténtalo de nuevo o pide ayuda a tu gerente.",
 "Too many attempts. Wait a few minutes before trying again.":"Demasiados intentos. Espera unos minutos antes de reintentar.",
 "PIN verification is unavailable. Check the connection and try again.":"La verificación del PIN no está disponible. Revisa la conexión e inténtalo de nuevo.",
 "Reconnect this tablet before entering an employee PIN.":"Vuelve a conectar esta tableta antes de ingresar un PIN de empleado.",
 "Tablet setup could not be confirmed.": "No pudimos confirmar la configuración de la tableta.",
 "We couldn’t confirm the setup. Tap Check setup before trying again.":"No pudimos confirmar la configuración. Toca Revisar configuración antes de reintentar.",
 "We couldn’t confirm the setup. Check the connection, then tap Check setup.":"No pudimos confirmar la configuración. Revisa la conexión y toca Revisar configuración.",
 "We couldn’t confirm the setup. Allow cookies, then tap Check setup.":"No pudimos confirmar la configuración. Permite las cookies y toca Revisar configuración.",
 "Check tablet setup": "Revisa la configuración de la tableta",
 "Tablet connected":"Tableta conectada",
 "{device} is connected to this location.":"{device} está conectada a esta ubicación.",
 "Timekeeping is not available yet.": "El registro de tiempo aún no está disponible.",
 "Punching in isn’t turned on yet. Don’t use this tablet to record time.": "Las marcaciones aún no están activadas. No uses esta tableta para registrar tiempo.",
 "Owner access has been signed out on this tablet.": "La sesión del dueño se cerró en esta tableta.",
 "Check connection": "Revisar conexión",
 "One-time setup": "Configuración inicial",
 // The menu path is the Owner’s English screen, bound so a line never starts with the arrow (NV-298).
 "Ask your Owner to add this device in Settings → Clocker tablets. Then paste the one-use setup code.": "Pide al dueño que añada esta tableta en Settings → Clocker tablets. Luego pega el código de un solo uso.",
 "Use the tablet’s setup code here, not an employee PIN. Allow cookies in this browser.":"Usa aquí el código de la tableta, no un PIN de empleado. Permite las cookies en este navegador.",
 "Checking setup…": "Revisando configuración…",
 "Checking this tablet…": "Revisando esta tableta…",
 "Check setup": "Revisar configuración",
 // Tablet setup (Phase 6, JR-26): the first-time screen, the code that arrives in the Owner's link, and each answer.
 "This tablet will be the time clock for {location}.": "Esta tableta será el registro de tiempo de {location}.",
 "How to set it up": "Cómo configurarla",
 "On another device, the Owner opens Settings → Clocker tablets.": "En otro dispositivo, el dueño abre Settings → Clocker tablets.",
 "The Owner adds this tablet and gets its setup code.": "El dueño añade esta tableta y obtiene su código de configuración.",
 "Point this tablet’s camera at the code, or type the code below.": "Apunta la cámara de esta tableta al código, o escribe el código abajo.",
 "Setup code received": "Código de configuración recibido",
 "Tap Connect tablet to finish. The code works one time.":"Toca Conectar tableta para terminar. El código sirve una sola vez.",
 "Type a code instead": "Escribir un código",
 "Connecting…":"Conectando…",
 "Connecting this tablet…":"Conectando esta tableta…",
 "That link doesn’t have a complete setup code. Type the code from Owner Settings.": "Ese enlace no trae un código de configuración completo. Escribe el código que aparece en Settings del dueño.",
 "Enter the whole setup code the Owner sees in Settings → Clocker tablets.":"Escribe el código completo que ve el dueño en Settings → Clocker tablets.",
 "This tablet is offline. Connect it to Wi-Fi, then try again.": "Esta tableta está sin conexión. Conéctala a la red Wi-Fi e inténtalo de nuevo.",
 "Setup not confirmed": "Configuración sin confirmar",
 "This tablet is connected to {location}":"Esta tableta quedó conectada a {location}",
 "{device} is ready. Your team can clock in now.": "{device} está lista. Tu personal ya puede marcar.",
 "Open the time clock": "Abrir el registro de tiempo",
 "The time clock opens in a few seconds.": "El registro de tiempo se abre en unos segundos.",
 "PIN verification could not be confirmed.": "No pudimos confirmar la verificación del PIN.",
 "We could not clear tablet verification. Check the connection before continuing.": "No pudimos borrar la verificación de la tableta. Revisa la conexión antes de continuar.",
 "Enter exactly four PIN digits.": "Ingresa exactamente los cuatro dígitos del PIN.",
 "Choose your name or enter your Employee ID, then enter four PIN digits.": "Selecciona tu nombre o ingresa tu ID de empleado y luego los cuatro dígitos de tu PIN.",
 "Verification changed. Please enter your PIN again.": "La verificación cambió. Ingresa tu PIN de nuevo.",
 "Verification could not be confirmed. Please try again.": "No pudimos confirmar la verificación. Inténtalo de nuevo.",
 "Your PIN is verified for this tablet.": "Tu PIN está verificado para esta tableta.",
 "Time punches are not enabled yet.": "El registro de tiempo aún no está habilitado.",
 "No worked time has been recorded.": "No se ha registrado tiempo trabajado.",
 // Nov 14 inspection (JR-26): the next step when punches are off.
 "Ask your Owner to contact NEVORA support.": "Pide al dueño que contacte al soporte de NEVORA.",
 "Checking tablet verification…": "Verificando la tableta…",
 "Clock in recorded": "Entrada registrada",
 "Break start recorded": "Inicio de descanso registrado",
 "Break end recorded": "Fin de descanso registrado",
 "Clock out recorded": "Salida registrada",
 "Clock out?": "¿Marcar salida?",
 "Clocked In": "En turno",
 "On Break": "En descanso",
 "Off Clock": "Fuera de turno",
 "under a minute": "menos de un minuto",
 "under 1 min":"menos de 1 min",
 "Your tablet verification changed. Enter your PIN again. Any pending action is kept for checking.": "La verificación cambió. Ingresa tu PIN de nuevo. Las acciones pendientes se conservan para revisarlas.",
 "We could not confirm this action. Check its status before trying anything else.": "No pudimos confirmar esta acción. Revisa su estado antes de intentar otra acción.",
 "Your clock state could not be loaded. No action has been sent.": "No pudimos cargar tu estado. No se envió ninguna acción.",
 "Nothing was sent. Ask a manager to check this tablet.":"No se envió nada. Pide a un gerente que revise esta tableta.",
 "The action was recorded, but this browser could not clear its recovery data. Check it again after allowing browser storage.": "La acción se registró, pero no pudimos actualizar su registro de recuperación. Permite el almacenamiento del navegador y vuelve a revisarlo.",
 "No punch was sent. Ask a manager to check this tablet.":"No se envió ninguna marcación. Pide a un gerente que revise esta tableta.",
 "Your verification changed. Enter your PIN again before continuing.": "La verificación cambió. Ingresa tu PIN de nuevo antes de continuar.",
 "Your clock state or verification changed. No confirmation was found for the previous action, and nothing was replayed. Review the current state before choosing a new action.": "Tu estado o verificación cambió. No se encontró confirmación de la acción anterior y no se repitió ninguna acción. Revisa el estado actual antes de continuar.",
 "We haven’t confirmed your last punch yet. Tap Retry same action; it won’t punch twice.": "Aún no hemos confirmado tu última marcación. Toca Reintentar la misma marcación; no se marcará dos veces.",
 "Recording your action…": "Registrando tu marcación…",
 "Check your last action": "Revisa tu última marcación",
 "Previous action needs review": "La marcación anterior necesita revisión",
 "Verify your PIN again": "Verifica tu PIN de nuevo",
 "Checking your clock…": "Revisando tu registro…",
 "Browser storage needed": "Se necesita almacenamiento del navegador",
 "Clock state unavailable": "Tu estado no está disponible",
 "Break started": "Inicio del descanso",
 "Your time is recorded when you clock in.": "Tu tiempo se registra al marcar la entrada.",
 "Breaks aren’t recorded on the Clocker here.": "Aquí no se registran descansos en Clocker.",
 "No break types are configured. Ask your Owner to add one.": "No hay tipos de descanso configurados. Pide al dueño que añada uno.",
 // Premium pass (#21): one verb for a set-up tablet, "connect" / "conectar" (Phase 8).
 "This shift was started at another location. Use the connected tablet at that location.": "Este turno comenzó en otra ubicación. Usa la tableta conectada de esa ubicación.",
 "Refresh": "Actualizar",
 "New tablet setup is paused. Use an already registered tablet to finish an existing shift.":"La configuración de tabletas nuevas está pausada. Usa una tableta ya conectada para terminar un turno en curso.",
 "New clock-ins are paused. Only a shift recorded before the trial ended can continue. Ask your Owner about workplace access.": "Las nuevas entradas están pausadas. Solo puede continuar un turno registrado antes de que terminara la prueba. Consulta con tu empleador sobre el acceso al lugar de trabajo.",
 "New clock-ins are paused. Ask your Owner about workplace access.": "Las nuevas entradas están pausadas. Consulta con tu empleador sobre el acceso al lugar de trabajo.",
 "This screen clears after 30 seconds.": "Esta pantalla se borra después de 30 segundos.",
 "Your break doesn’t end on its own. Tap End break when you’re back.": "Tu descanso no termina solo. Toca Terminar descanso cuando regreses.",
 "Your shift ends at the time NEVORA records.":"Tu turno termina a la hora que registre NEVORA.",
 "Clocked in for":"Tiempo en turno",
 "This will also end your current break.": "Esto también terminará tu descanso actual.",
 "Confirm clock out": "Confirmar salida",
 "Keep working": "Seguir trabajando",
 ". This screen will clear shortly.": ". Esta pantalla se borrará en unos segundos.",
 "A previous employee’s action needs verification on this tablet. Ask that employee to enter their PIN again. No new action was sent.": "La acción de otra persona necesita verificación en esta tableta. Pídele que ingrese su PIN de nuevo. No se envió ninguna acción nueva.",
 "One saved punch can’t be read. Ask your manager to check it.": "Una marcación guardada no se puede leer. Pide a tu gerente que la revise.",
 "Keep this screen open while the action is checked.": "Mantén esta pantalla abierta mientras se revisa la acción.",
 "Reading the latest saved information.": "Consultando la información más reciente.",
 "Check action status": "Revisar estado de la marcación",
 "Retry same action": "Reintentar la misma marcación",
 "Try again": "Intentar de nuevo",
 "Don’t clear this browser’s data while a punch isn’t confirmed.":"No borres los datos del navegador mientras haya una marcación sin confirmar.",
 "Loading location time": "Cargando la hora local",
 "Checking setup": "Revisando configuración",
 "Location and time": "Ubicación y hora",
 "Time clock": "Registro de tiempo",
 "Company logo": "Logo de la empresa",
 "Hi,": "Hola,",
 "Hi, {name}.": "Hola, {name}.",
 "Start {name}": "Iniciar {name}",
 "Suggested: {minutes} min": "Sugerido: {minutes} min",
 "Since": "Desde",
 "{elapsed} ago": "hace {elapsed}",
 "time": "hora",
 "ago": "atrás",
 "&middot;": "·",
 "PIN not recognized. Try again or ask your manager to check your PIN.": "PIN no reconocido. Inténtalo de nuevo o pide a tu gerente que revise tu PIN.",
 "We could not confirm this information. Ask your Owner for help.": "No pudimos confirmar esta información. Pide ayuda al dueño.",
 "Clock in": "Marcar entrada",
 "Clock out": "Marcar salida",
 "Start break": "Iniciar descanso",
 "End break": "Terminar descanso",
 "Choose a break": "Elige un descanso",
 "{zone} time": "Hora de {zone}",
 // Direction B (Jose approved, Nov 8, 2026): the recorded and recording lines.
 "Have a good shift, {first}.": "Que tengas un buen turno, {first}.",
 "See you next time, {first}.": "Hasta la próxima, {first}.",
 "Enjoy your break.": "Disfruta tu descanso.",
 "Welcome back.": "Qué bueno verte de vuelta.",
 "Clocking in {first}…": "Registrando la entrada de {first}…",
 "Clocking out {first}…": "Registrando la salida de {first}…",
 "Starting {first}’s break…": "Iniciando el descanso de {first}…",
 "Ending {first}’s break…": "Terminando el descanso de {first}…",
 // Nov 10 review: the band follows the card (NV-049), one action per blocked state (NV-051, NV-052), busy Continue (NV-179).
 "Reconnect needed":"Hay que conectarla de nuevo",
 "No connection": "Sin conexión",
 "Paused: too many attempts": "En pausa: demasiados intentos",
 "Can’t save punches":"No puede guardar marcaciones",
 "Can’t reach NEVORA":"No se puede conectar con NEVORA",
 "This tablet is paused": "Esta tableta está en pausa",
 // Nov 14 inspection (RA-3; Jose's Nov 11 decisions): Employee ID then PIN, and a pause that names who is paused. The
 // retry time is clockerRetryText below.
 "Enter your Employee ID": "Ingresa tu ID de empleado",
 "Employee ID": "ID de empleado",
 "Change Employee ID": "Cambiar ID de empleado",
 "Don’t know your Employee ID? Ask your manager.": "¿No sabes tu ID de empleado? Pregúntale a tu gerente.",
 "Employee ID or PIN not recognized. Check both, or ask your manager.": "ID de empleado o PIN no reconocido. Revisa ambos o pide ayuda a tu gerente.",
 "Your PIN is paused": "Tu PIN está en pausa",
 "You can ask a manager to record your time.": "Puedes pedirle a un gerente que registre tu tiempo.",
 // The kiosk's own error screen (RA-4).
 "The time clock hit a problem":"El registro de tiempo tuvo un problema",
 "Tap Try again. If it happens again, ask a manager to record your time.":"Toca Intentar de nuevo. Si vuelve a pasar, pide a un gerente que registre tu tiempo.",
 // The paused page (RA-13, JR-12): the tablet's language, and no sign-in on a shared tablet.
 "Access could not be checked": "No se puede comprobar el acceso",
 "This time clock is paused":"El registro de tiempo está en pausa",
 "Clocking is unavailable right now. Ask your workplace Owner to review access and billing.": "No se puede registrar tiempo en este momento. Pídele al propietario de tu negocio que revise el acceso y la facturación.",
 "Open billing on your own device.": "Abre la facturación en tu propio dispositivo.",
 "This tablet starts working again when billing is settled.": "Esta tableta vuelve a funcionar cuando la facturación esté al día.",
 "This tablet needs to be set up again":"Hay que configurar esta tableta de nuevo",
 "Check again": "Revisar de nuevo",
 "Checking…": "Verificando…",
 // Every message the Clocker's server can send to the kiosk (NV-045; clocker-copy.test.tsx checks the list).
 "Reconnect this tablet before recording time.":"Vuelve a conectar esta tableta antes de marcar.",
 "The clock result could not be confirmed.": "No pudimos confirmar el resultado de la marcación.",
 "Time punches are not enabled in this environment.": "Las marcaciones no están activadas en este entorno.",
 "Allow cookies, then start tablet setup again.": "Permite las cookies y vuelve a empezar la configuración de la tableta.",
 "Check the setup code and try again.": "Revisa el código de configuración e inténtalo de nuevo.",
 "Choose a valid Clocker location.": "Elige una ubicación de Clocker válida.",
 "Open Clocker directly on this site.": "Abre Clocker directamente en este sitio.",
 "Open Clocker directly on this site and try again.": "Abre Clocker directamente en este sitio e inténtalo de nuevo.",
 "Clocker setup is not configured for this environment.": "La configuración de Clocker no está activada en este entorno.",
 "This setup code is expired, already used, or for another location. Ask the Owner for a new code.": "Este código venció, ya se usó o es de otra ubicación. Pide al dueño un código nuevo.",
 "We could not confirm tablet setup. Check the connection, then choose Check Setup. Do not enter a new code yet.":"No pudimos confirmar la configuración. Revisa la conexión y toca Revisar configuración. No ingreses un código nuevo todavía.",
 "Punch photo collection is not enabled in this environment.": "Las fotos de marcación no están activadas en este entorno.",
 "Open company settings directly on this site.": "Abre la configuración de la empresa directamente en este sitio.",
 "The published schedule changed while this clock action was being recorded. Check the current state and retry the same action.": "El horario publicado cambió mientras se registraba esta marcación. Revisa el estado actual y reintenta la misma marcación.",
 "This break type changed or is inactive. Reload and choose an available break type.": "Este tipo de descanso cambió o está inactivo. Actualiza y elige un tipo de descanso disponible.",
 "Check the clock action and reload its current state.": "Revisa la marcación y actualiza su estado.",
 "Verify your PIN again on this registered tablet.": "Verifica tu PIN de nuevo en esta tableta conectada.",
 "Tablet verification changed. Do not replay the previous action.": "La verificación de la tableta cambió. No repitas la marcación anterior.",
 "Your clock state changed. Reload before choosing an action.": "Tu estado cambió. Actualiza antes de elegir una marcación.",
 "This command ID already belongs to a different action. Check its saved receipt.": "Esta referencia ya pertenece a otra marcación. Revisa su comprobante guardado.",
 "This clock action is not available in the current state.": "Esta marcación no está disponible en tu estado actual.",
 "This shift is open at another location. Use a registered tablet at that location.": "Este turno está abierto en otra ubicación. Usa una tableta conectada en esa ubicación.",
 "Recorded clock data is inconsistent. No time was changed. Ask your manager for assistance.": "Los datos registrados no coinciden. No se cambió ningún tiempo. Pide ayuda a tu gerente.",
 "The server clock does not agree with recorded time. No time was changed.": "La hora del servidor no coincide con el tiempo registrado. No se cambió ningún tiempo.",
 "The clock result could not be confirmed. Check the original command receipt before retrying.": "No pudimos confirmar el resultado de la marcación. Revisa la marcación original antes de reintentar.",
 // ---- Phase 6 (Nov 17, 2026), the kiosk's clock-in flow. The tablet setup strings are builder B's and are not here. ----
 // Errors by stable code (item 1): each says what happened and what to do next. The kiosk's way out is a manager.
 "We couldn’t check your PIN. Try again, or ask a manager to record your time.":"No pudimos verificar tu PIN. Inténtalo de nuevo o pide a un gerente que registre tu tiempo.",
 "Tell a manager. Your Owner sets this tablet up again in Settings → Clocker tablets.":"Avísale a un gerente. El dueño vuelve a configurar esta tableta en Settings → Clocker tablets.",
 "This tablet’s link is not valid. Tell a manager.":"El enlace de esta tableta no es válido. Avísale a un gerente.",
 "This tablet did not open the Clocker from its own link. Ask a manager to open it again.":"Esta tableta no abrió Clocker desde su propio enlace. Pide a un gerente que lo abra de nuevo.",
 "Your PIN timed out. Enter your Employee ID and PIN again.":"Se acabó el tiempo de tu PIN. Ingresa tu ID de empleado y tu PIN de nuevo.",
 "Your PIN timed out. Any punch that isn’t confirmed stays on this tablet.":"Se acabó el tiempo de tu PIN. Una marcación sin confirmar queda en esta tableta.",
 "We couldn’t confirm that. Ask a manager to record your time.":"No pudimos confirmarlo. Pide a un gerente que registre tu tiempo.",
 "This tablet sent something NEVORA couldn’t read. Go back and try again, or ask a manager to record your time.":"Esta tableta envió algo que NEVORA no pudo leer. Vuelve e inténtalo de nuevo, o pide a un gerente que registre tu tiempo.",
 "Your time changed since this screen loaded.":"Tu tiempo cambió desde que se cargó esta pantalla.",
 "This punch doesn’t match what NEVORA has. Ask a manager to check it.":"Esta marcación no coincide con lo que tiene NEVORA. Pide a un gerente que la revise.",
 "That can’t be recorded from where you are now.":"Eso no se puede registrar desde tu estado actual.",
 "Your shift is open at another location. Use the tablet there, or ask a manager.":"Tu turno está abierto en otra ubicación. Usa la tableta de allá o pregunta a un gerente.",
 "Your time records need a manager’s check. Nothing was changed. Ask a manager to record your time.":"Tus registros de tiempo necesitan que un gerente los revise. No se cambió nada. Pide a un gerente que registre tu tiempo.",
 "The time on NEVORA’s side doesn’t match your records. Nothing was changed. Ask a manager to record your time.":"La hora de NEVORA no coincide con tus registros. No se cambió nada. Pide a un gerente que registre tu tiempo.",
 "That break is no longer offered. Go back and choose another one.":"Ese descanso ya no está disponible. Vuelve y elige otro.",
 "The schedule changed while this was being recorded.":"El horario cambió mientras esto se registraba.",
 "New clock-ins are paused for this workplace. Your Owner can restore access. Ask a manager to record your time.":"Las nuevas entradas están pausadas en este negocio. El dueño puede restablecer el acceso. Pide a un gerente que registre tu tiempo.",
 // Offline and unconfirmed (item 5, RA-6 and MK-8): what is and is not saved, what to do now, and that the tablet checks again.
 "This tablet is offline, so nothing can be recorded right now.":"Esta tableta no tiene conexión, así que ahora no se puede registrar nada.",
 "Tell a manager so your time gets recorded.":"Avísale a un gerente para que registre tu tiempo.",
 "This tablet checks again by itself when the connection returns.":"Esta tableta vuelve a revisar sola cuando regrese la conexión.",
 "Your PIN was not checked, and nothing was recorded.":"Tu PIN no se verificó y no se registró nada.",
 "Nothing can be recorded until this tablet reaches NEVORA again.":"No se puede registrar nada hasta que esta tableta vuelva a conectar con NEVORA.",
 "This tablet checks again by itself.":"Esta tableta vuelve a revisar sola.",
 "Nothing was recorded. Tell a manager if you need your time recorded now.":"No se registró nada. Avísale a un gerente si necesitas que registre tu tiempo ahora.",
 "Your clock in at {time} is not confirmed yet.":"Tu entrada de las {time} aún no está confirmada.",
 "Your clock out at {time} is not confirmed yet.":"Tu salida de las {time} aún no está confirmada.",
 "Your break start at {time} is not confirmed yet.":"El inicio de tu descanso de las {time} aún no está confirmado.",
 "Your break end at {time} is not confirmed yet.":"El fin de tu descanso de las {time} aún no está confirmado.",
 "Your clock in is not confirmed yet.":"Tu entrada aún no está confirmada.",
 "Your clock out is not confirmed yet.":"Tu salida aún no está confirmada.",
 "Your break start is not confirmed yet.":"El inicio de tu descanso aún no está confirmado.",
 "Your break end is not confirmed yet.":"El fin de tu descanso aún no está confirmado.",
 "Tell a manager now.":"Avísale a un gerente ahora.",
 "This tablet kept your punch and won’t record it twice.":"Esta tableta guardó tu marcación y no la registrará dos veces.",
 "No connection. This tablet checks again by itself when it returns.":"Sin conexión. Esta tableta vuelve a revisar sola cuando regrese.",
 "No connection. Wait for it to return before you clock in or out, or tell a manager.":"Sin conexión. Espera a que regrese antes de marcar, o avísale a un gerente.",
 "Your time is recorded. This tablet could not clear its saved copy; ask a manager to check the tablet.":"Tu tiempo está registrado. Esta tableta no pudo borrar su copia guardada; pide a un gerente que revise la tableta.",
 // Saved for later (item 3): a count of other people's saved punches, never whose they are.
 "1 more saved on this tablet.":"1 más guardada en esta tableta.",
 "{count} more saved on this tablet.":"{count} más guardadas en esta tableta.",
 "Each person can check their own after their PIN.":"Cada persona puede revisar la suya después de ingresar su PIN.",
 // Plain words in place of system words (item 9).
 "Check your last punch":"Revisa tu última marcación",
 "Check if it saved":"Revisar si se guardó",
 "Send it again":"Enviar de nuevo",
 "Your last punch still isn’t confirmed. Tap Send it again. It won’t record twice.":"Tu última marcación aún no está confirmada. Toca Enviar de nuevo. No se registrará dos veces.",
 "Recording…":"Registrando…",
 "Keep this screen open while it saves.":"Mantén esta pantalla abierta mientras se guarda.",
 "Getting your latest time.":"Consultando tu tiempo más reciente.",
 "We couldn’t load your time":"No pudimos cargar tu tiempo",
 "This tablet can’t read its saved punches":"Esta tableta no puede leer sus marcaciones guardadas",
 "Someone else’s punch is waiting":"La marcación de otra persona está pendiente",
 "The person before you has a punch that isn’t confirmed on this tablet. Ask them to enter their PIN again. Nothing was recorded for you.":"La persona anterior tiene una marcación sin confirmar en esta tableta. Pídele que ingrese su PIN de nuevo. No se registró nada para ti.",
 "Your earlier punch wasn’t recorded":"Tu marcación anterior no se registró",
 "See current status":"Ver estado actual",
 "This tablet can no longer send it. Tap See current status, then choose what to do.":"Esta tableta ya no puede enviarla. Toca Ver estado actual y luego elige qué hacer.",
 "There are no breaks to choose here yet. Ask your Owner to add one.":"Aquí aún no hay descansos para elegir. Pide al dueño que añada uno.",
 // Premium pass (#8): the help's title names the fact, and once the request is sent the result replaces the button.
 "Your punch is kept on this tablet":"Tu marcación está guardada en esta tableta",
 "Your punches are kept on this tablet":"Tus marcaciones están guardadas en esta tableta",
 "Your Owner can check it. You can leave this screen.":"El dueño puede revisarla. Puedes salir de esta pantalla.",
 "Your Owner can check them. You can leave this screen.":"El dueño puede revisarlas. Puedes salir de esta pantalla.",
 "Ask Owner to check":"Pedir al dueño que revise",
 "Asking…":"Enviando…",
 "Ask again":"Pedir de nuevo",
 "Request reference":"Referencia de la solicitud",
 "Sending the request.":"Enviando la solicitud.",
 "Request sent. Your Owner will see it under Clocker recovery.":"Solicitud enviada. El dueño la verá en Clocker recovery.",
 "We couldn’t confirm the request. Ask again; it won’t send twice.":"No pudimos confirmar la solicitud. Pide de nuevo; no se enviará dos veces.",
 "Your punch is not confirmed yet. Tap Check if it saved before doing anything else.":"Tu marcación aún no está confirmada. Toca Revisar si se guardó antes de hacer otra cosa.",
 "Getting ready…":"Preparando…",
 "Enter your PIN again to check a punch that isn’t confirmed.":"Ingresa tu PIN de nuevo para revisar una marcación sin confirmar.",
 "Photo preview":"Vista previa de la foto",
 "The camera is off. Use this photo to record your time.":"La cámara está apagada. Usa esta foto para registrar tu tiempo.",
 "Your time is recorded. The photo is not confirmed yet; checking it will not record your time twice.":"Tu tiempo está registrado. La foto aún no está confirmada; revisarla no registrará tu tiempo dos veces.",
 // Punches off for the workplace (item 7, JR-26): what it means and who can turn it on.
 "Your PIN works on this tablet.":"Tu PIN funciona en esta tableta.",
 "Clocking in is not turned on for this workplace yet.":"El registro de tiempo aún no está activado para este negocio.",
 "Nothing was recorded this time.":"Esta vez no se registró nada.",
 "Your Owner can ask NEVORA support to turn it on. Until then, ask a manager to record your time.":"El dueño puede pedir al soporte de NEVORA que lo active. Mientras tanto, pide a un gerente que registre tu tiempo.",
 "Until then, ask a manager to record your time.":"Mientras tanto, pide a un gerente que registre tu tiempo.",
 // The receipt (item 4): the first name on every line, and the next useful fact the reply carries.
 "Enjoy your break, {first}.":"Disfruta tu descanso, {first}.",
 "Welcome back, {first}.":"Qué bueno verte de vuelta, {first}.",
 "Clocked in at":"Entrada",
 "Break started at":"Inicio del descanso",
 "Break length":"Duración del descanso",
 "Break type":"Tipo de descanso",
 "Suggested length":"Duración sugerida",
 "{minutes} min":"{minutes} min",
 // Accessibility (item 10): the entered count, never the digits.
 "{count} of 4 digits entered":"{count} de 4 dígitos ingresados",
 // The Clocker's own not-found page (item 8).
 "This time clock link doesn’t work":"El enlace de este registro de tiempo no funciona",
 "Tell a manager":"Avísale a un gerente",
 "Your Owner sets this tablet up again in Settings → Clocker tablets.":"El dueño vuelve a configurar esta tableta en Settings → Clocker tablets.",
};
/** True when the kiosk can say this phrase in the chosen language. */
export function clockerHasText(locale:ClockerLocale,key:string):boolean{return locale==='en'||Object.hasOwn(CLOCKER_COPY,key);}
/** A phrase in the chosen language. A Spanish tablet shows a phrase it has no line for in English (marked lang="en" by
 * ClockerText) rather than an unrelated generic sentence (Nov 10 review, NV-045). */
export function clockerText(locale:ClockerLocale,key:string,params:Record<string,string|number>={}):string{
 const text=locale==='es'&&Object.hasOwn(CLOCKER_COPY,key)?CLOCKER_COPY[key]:key;
 return text.replace(/\{([a-zA-Z]+)\}/g,(match,name)=>String(params[name]??match));
}

/** When a pause ends, as a sentence: "Try again at 10:58 PM." Spanish says "a la 1:05" but "a las 10:58", and its times end
 * in "p. m.", so the sentence doesn't add a second full stop. */
export function clockerRetryText(locale:ClockerLocale,time:string,hour:string):string{
 const text=locale==='es'?`Inténtalo de nuevo a ${hour==='1'?'la':'las'} ${time}.`:`Try again at ${time}.`;
 return text.replace(/\.\.$/,'.');
}

/** Prefer stable codes while accepting older servers that send only an error message. */
export function clockerErrorText(locale:ClockerLocale,failure:{code?:unknown;error?:unknown}):string{
 const code=typeof failure.code==='string'&&Object.hasOwn(CLOCKER_TRANSPORT_ERRORS,failure.code)?failure.code as ClockerTransportErrorCode:null;
 const message=code?CLOCKER_TRANSPORT_ERRORS[code]:typeof failure.error==='string'?failure.error:'We could not confirm this information. Ask your Owner for help.';
 return clockerText(locale,message);
}

/* ---- Phase 6 (Nov 17, 2026): the kiosk's errors by stable code ----
 * Every refusal the staff-facing kiosk shows (Employee ID and PIN, the clock screen, breaks, the saved-punch path) is
 * picked by the server's stable code, never by the server's English sentence. Each function returns the kiosk's English
 * phrase, which is also its key in CLOCKER_COPY, so the screen prints it with the tablet's language. A reply with no
 * code (an older server, or a reply that carries only a status) falls back to what its status means; a code the kiosk
 * has never seen gets the general sentence with the manager fallback, not the server's words. */
const PIN_ERRORS:Record<string,string>={
 PIN_INPUT_INVALID:'Enter exactly four PIN digits.',
 DEVICE_REQUIRED:'Tell a manager. Your Owner sets this tablet up again in Settings → Clocker tablets.',
 PIN_DENIED:'Employee ID or PIN not recognized. Check both, or ask your manager.',
 PIN_LIMITED:'Too many attempts. Wait a few minutes before trying again.',
 PIN_UNAVAILABLE:'Your PIN was not checked, and nothing was recorded.',
 ORIGIN_REJECTED:'This tablet did not open the Clocker from its own link. Ask a manager to open it again.',
 LOCATION_INVALID:'This tablet’s link is not valid. Tell a manager.',
 SETUP_UNAVAILABLE:'Nothing can be recorded until this tablet reaches NEVORA again.',
};
export const CLOCKER_PIN_ERROR_FALLBACK='We couldn’t check your PIN. Try again, or ask a manager to record your time.';
/** The kiosk's phrase for a refused Employee ID and PIN request. */
export function clockerPinErrorKey(failure:{code?:unknown;status?:number;state?:unknown}):string{
 if(typeof failure.code==='string'&&Object.hasOwn(PIN_ERRORS,failure.code))return PIN_ERRORS[failure.code];
 if(typeof failure.code==='string')return CLOCKER_PIN_ERROR_FALLBACK;
 if(failure.state==='device_required')return PIN_ERRORS.DEVICE_REQUIRED;
 if(failure.status===429)return PIN_ERRORS.PIN_LIMITED;
 if(failure.status===401)return PIN_ERRORS.PIN_DENIED;
 if(typeof failure.status==='number'&&failure.status>=500)return PIN_ERRORS.PIN_UNAVAILABLE;
 return CLOCKER_PIN_ERROR_FALLBACK;
}
/* Every punch code the server can send (PunchErrorCode in src/lib/clocker/punch-command.ts; clocker-copy.test.tsx checks
 * the list against that file). AUTH_REQUIRED and CONTEXT_CHANGED send the person back to their PIN; UNAVAILABLE means the
 * result is not confirmed, which the clock screen says with the action and its time. */
export const CLOCKER_PUNCH_ERRORS:Record<string,string>={
 INVALID_INPUT:'This tablet sent something NEVORA couldn’t read. Go back and try again, or ask a manager to record your time.',
 AUTH_REQUIRED:'Your PIN timed out. Any punch that isn’t confirmed stays on this tablet.',
 CONTEXT_CHANGED:'Your PIN timed out. Any punch that isn’t confirmed stays on this tablet.',
 STALE_STATE:'Your time changed since this screen loaded.',
 COMMAND_REUSED:'This punch doesn’t match what NEVORA has. Ask a manager to check it.',
 INVALID_TRANSITION:'That can’t be recorded from where you are now.',
 OTHER_LOCATION:'Your shift is open at another location. Use the tablet there, or ask a manager.',
 INTEGRITY:'Your time records need a manager’s check. Nothing was changed. Ask a manager to record your time.',
 CLOCK_INVALID:'The time on NEVORA’s side doesn’t match your records. Nothing was changed. Ask a manager to record your time.',
 BREAK_TYPE_CHANGED:'That break is no longer offered. Go back and choose another one.',
 SCHEDULE_CHANGED:'The schedule changed while this was being recorded.',
 SUBSCRIPTION_REQUIRED:'New clock-ins are paused for this workplace. Your Owner can restore access. Ask a manager to record your time.',
};
export const CLOCKER_PUNCH_ERROR_FALLBACK='We couldn’t confirm that. Ask a manager to record your time.';
/** The kiosk's phrase for a refused punch request, or null when the result is simply not confirmed (UNAVAILABLE, or no
 * code at all): the clock screen then says which action is not confirmed and that the tablet kept the attempt. */
export function clockerPunchErrorKey(code:unknown):string|null{
 if(typeof code!=='string'||code==='UNAVAILABLE')return null;
 return Object.hasOwn(CLOCKER_PUNCH_ERRORS,code)?CLOCKER_PUNCH_ERRORS[code]:CLOCKER_PUNCH_ERROR_FALLBACK;
}
/** "2 more saved on this tablet.": other people's saved punches as a count only. Empty when there are none. */
export function clockerOthersSavedText(locale:ClockerLocale,count:number):string{
 if(!Number.isInteger(count)||count<1)return '';
 return count===1?clockerText(locale,'1 more saved on this tablet.'):clockerText(locale,'{count} more saved on this tablet.',{count});
}
const UNCONFIRMED:Record<string,[string,string]>={
 CLOCK_IN:['Your clock in at {time} is not confirmed yet.','Your clock in is not confirmed yet.'],
 CLOCK_OUT:['Your clock out at {time} is not confirmed yet.','Your clock out is not confirmed yet.'],
 START_BREAK:['Your break start at {time} is not confirmed yet.','Your break start is not confirmed yet.'],
 END_BREAK:['Your break end at {time} is not confirmed yet.','Your break end is not confirmed yet.'],
};
/** "Your clock in at 9:02 AM is not confirmed yet." The time is when the person pressed the button on this tablet; a punch
 * read back from the tablet's journal has no time, so the sentence leaves it out. Never "not saved": the result is unknown. */
export function clockerUnconfirmedText(locale:ClockerLocale,action:string,time:string|null):string{
 const pair=UNCONFIRMED[action]??UNCONFIRMED.CLOCK_IN;
 return time?clockerSpanishHour(clockerText(locale,pair[0],{time})):clockerText(locale,pair[1]);
}
/** Spanish says "de las 10:37" and "a las 10:37" but "de la 1:05" and "a la 1:05" (Phase 8). English is untouched. */
export function clockerSpanishHour(text:string):string{return text.replace(/\b(de|a) las (1:\d\d)/g,'$1 la $2');}
/** The kiosk's button names that its sentences quote ("Tap Send it again."), in English; each has its Spanish line. */
export const CLOCKER_BUTTON_NAMES=['Send it again','Check if it saved','See current status','End break','Connect tablet','Check setup','Try again','Ask Owner to check'];
/** A sentence that names a button keeps the button's words on one line ("Tap Send it again."), so a wrap never splits
 * a name the eye looks for (Phase 8). Only the given names are bound; the rest of the sentence wraps as usual. */
export function clockerKeepNames(text:string,names:string[]):string{
 return names.reduce((out,name)=>name.includes(' ')?out.split(name).join(name.replace(/ /g,'\u00a0')):out,text);
}
