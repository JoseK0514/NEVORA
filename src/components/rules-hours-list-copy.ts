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
