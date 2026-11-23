/* Signed-in Spanish (es-rest): the words of the Scheduling rules and policy forms (wave-b-forms.tsx), English as written
 * and Puerto Rico Spanish (docs/design/voice.md). `plain` is keyed by the server action's English message; a message
 * not in the list passes through as the server wrote it. */
const plainEn: Record<string, string> = {
  "Staffing requirements must be whole numbers between 1 and 100. Choose whether a designated Lead is required for each unconfigured location.": "Minimum staff must be a whole number from 1 to 100, and each new location needs a designated lead choice.",
  "Targets and maximums must be between 0 and 168 hours.": "Targets and maximums must be from 0 to 168 hours.",
  "Enter a valid day, time range, and optional staffing override.": "Enter a day, a start and end time, and staff numbers if you need them.",
  "Coverage window could not be saved. Check duplicate periods, active positions, and whole-number quantities from 1 to 100.": "Couldn’t add this period. It may already exist, or a quantity isn’t a whole number from 1 to 100.",
  "Settings could not be saved. Your entries are preserved.": "Couldn’t save your changes. They’re still here; try again.",
  "Coverage window could not be saved. Your entries are preserved.": "Couldn’t add this period. Your entries are still here; try again.",
  "Choose active positions and whole-number quantities from 1 to 100. Clear inactive quotas or reactivate their positions.": "Use whole numbers from 1 to 100, and clear quantities for inactive positions.",
  "Review approval mode and whole-number deadlines. Blank is unknown; completion advance must not exceed submission advance.": "Check how requests are approved, and use whole minutes. Finishing time can’t be more minutes ahead than the time to ask.",
  "Only an active Owner can save this policy.": "Only an owner can save this policy.",
};
const en = {
  plain: plainEn,
  couldntSave: "Couldn’t save your changes. They’re still here; try again.",
  staffingGroup: "Staffing and weekly hours",
  rulesSaved: "Scheduling rules saved.",
  saving: "Saving…",
  saveStaffing: "Save staffing and hours",
  orderError: "Finishing time can’t be more minutes ahead than the time to ask.",
  policySaved: "Policy saved.",
  policyChanged: "This policy changed. Reload to see the current values, then enter your changes again.",
  policyFailed: "Couldn’t save the policy. Reload to see the current values, then enter your changes again if they’re missing.",
  reloadPolicy: "Reload current policy",
};
const es: typeof en = {
  plain: {
    "Staffing requirements must be whole numbers between 1 and 100. Choose whether a designated Lead is required for each unconfigured location.": "El personal mínimo tiene que ser un número entero del 1 al 100, y cada localidad nueva necesita que elijas si requiere un líder designado.",
    "Targets and maximums must be between 0 and 168 hours.": "Las metas y los máximos tienen que ser de 0 a 168 horas.",
    "Enter a valid day, time range, and optional staffing override.": "Ingresa un día, una hora de inicio y de fin, y la cantidad de personal si la necesitas.",
    "Coverage window could not be saved. Check duplicate periods, active positions, and whole-number quantities from 1 to 100.": "No pudimos añadir este periodo. Puede que ya exista, o que una cantidad no sea un número entero del 1 al 100.",
    "Settings could not be saved. Your entries are preserved.": "No pudimos guardar tus cambios. Siguen aquí; inténtalo de nuevo.",
    "Coverage window could not be saved. Your entries are preserved.": "No pudimos añadir este periodo. Lo que ingresaste sigue aquí; inténtalo de nuevo.",
    "Choose active positions and whole-number quantities from 1 to 100. Clear inactive quotas or reactivate their positions.": "Usa números enteros del 1 al 100 y borra las cantidades de los puestos inactivos.",
    "Review approval mode and whole-number deadlines. Blank is unknown; completion advance must not exceed submission advance.": "Revisa cómo se aprueban las solicitudes y usa minutos enteros. El tiempo para terminar no puede tener más minutos de anticipación que el tiempo para pedir.",
    "Only an active Owner can save this policy.": "Solo un dueño puede guardar esta política.",
  },
  couldntSave: "No pudimos guardar tus cambios. Siguen aquí; inténtalo de nuevo.",
  staffingGroup: "Personal y horas semanales",
  rulesSaved: "Reglas del horario guardadas.",
  saving: "Guardando…",
  saveStaffing: "Guardar personal y horas",
  orderError: "El tiempo para terminar no puede tener más minutos de anticipación que el tiempo para pedir.",
  policySaved: "Política guardada.",
  policyChanged: "Esta política cambió. Vuelve a cargarla para ver los valores actuales y luego ingresa tus cambios otra vez.",
  policyFailed: "No pudimos guardar la política. Vuelve a cargarla para ver los valores actuales y luego ingresa tus cambios otra vez si faltan.",
  reloadPolicy: "Volver a cargar la política",
};
export const WAVE_B_FORMS_COPY = { en, es };
