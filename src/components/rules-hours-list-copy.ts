export const copy = {
  en: {
    // src/components/rules-hours-list.tsx:35, src/components/rules-hours-list.tsx:36
    findPerson: "Find a person",
    // src/components/rules-hours-list.tsx:40
    noTarget: "No target",
    // src/components/rules-hours-list.tsx:43
    peopleShown: "{count} of {rowsCount} people shown",
    // src/components/rules-hours-list.tsx:44
    targetHours: "Target hours",
    // src/components/rules-hours-list.tsx:44
    maximumHours: "Maximum hours",
    // src/components/rules-hours-list.tsx:51
    targetWeeklyHours: "{employeeName} target weekly hours",
    // src/components/rules-hours-list.tsx:51
    notSet: "Not set",
    // src/components/rules-hours-list.tsx:52
    maximumWeeklyHours: "{employeeName} maximum weekly hours",
    // src/components/rules-hours-list.tsx:57
    noOneMatches: "No one matches.",
    // src/components/rules-hours-list.tsx:57
    showEveryone: "Show everyone",
  },
  es: {
    // src/components/rules-hours-list.tsx:35, src/components/rules-hours-list.tsx:36
    findPerson: "Buscar a una persona",
    // src/components/rules-hours-list.tsx:40
    noTarget: "Sin meta",
    // src/components/rules-hours-list.tsx:43
    peopleShown: "{count} de {rowsCount} personas mostradas",
    // src/components/rules-hours-list.tsx:44
    targetHours: "Meta de horas",
    // src/components/rules-hours-list.tsx:44
    maximumHours: "Máximo de horas",
    // src/components/rules-hours-list.tsx:51
    targetWeeklyHours: "{employeeName}, meta de horas semanales",
    // src/components/rules-hours-list.tsx:51
    notSet: "Sin fijar",
    // src/components/rules-hours-list.tsx:52
    maximumWeeklyHours: "{employeeName}, máximo de horas semanales",
    // src/components/rules-hours-list.tsx:57
    noOneMatches: "Nadie coincide.",
    // src/components/rules-hours-list.tsx:57
    showEveryone: "Mostrar a todos",
  },
} as const;

// Live copy wiring; approved draft remains above.
/* Signed-in Spanish (es-rest): the words of Scheduling rules' weekly hours list (rules-hours-list.tsx), English as written
 * and Puerto Rico Spanish. */
const en = {
  find: "Find a person",
  noTarget: "No target",
  shown: (count: number, total: number) => `${count} of ${total} people shown`,
  target: "Target hours",
  maximum: "Maximum hours",
  targetLabel: (name: string) => name + " target weekly hours",
  maximumLabel: (name: string) => name + " maximum weekly hours",
  notSet: "Not set",
  noMatch: "No one matches.",
  showEveryone: "Show everyone",
};
const es: typeof en = {
  find: "Buscar a una persona",
  noTarget: "Sin meta",
  shown: (count: number, total: number) => `${count} de ${total} personas mostradas`,
  target: "Meta de horas",
  maximum: "Máximo de horas",
  targetLabel: (name: string) => `${name}, meta de horas semanales`,
  maximumLabel: (name: string) => `${name}, máximo de horas semanales`,
  notSet: "Sin fijar",
  noMatch: "Nadie coincide.",
  showEveryone: "Mostrar a todos",
};
export const RULES_HOURS_LIST_COPY = { en, es };
