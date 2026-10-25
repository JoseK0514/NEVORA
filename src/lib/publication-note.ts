/** Plain wording for a week that only some of the person's locations have published (Jose, 2026-10-18):
 *  name what is published and who has not published yet, instead of "your full week is not published".
 *  "Published", not "final": a manager can republish a week. */
export function joinNames(names: readonly string[]): string {
  const list = [...new Set(names.map(name => name.trim()).filter(Boolean))];
  if (list.length <= 1) return list[0] ?? '';
  return `${list.slice(0, -1).join(', ')} and ${list.at(-1)}`;
}

export function unpublishedNote(unpublished: readonly string[], published: readonly string[] = []): string {
  const waiting = joinNames(unpublished);
  const ready = joinNames(published);
  const many = new Set(unpublished.map(name => name.trim()).filter(Boolean)).size > 1;
  const pending = waiting ? `${waiting} ${many ? 'haven’t' : 'hasn’t'} published this week yet.` : 'Another location you work at hasn’t published this week yet.';
  return ready ? `Your ${ready} shifts are published. ${pending}` : `${pending} Shifts shown are published.`;
}

/** UX-E-03 (Oct 25, 2026): the one Schedule line for a week some of the person's locations haven't published:
 *  "West Office’s schedule isn’t out yet." or "West Office and East Office schedules aren’t out yet." */
export function notOutYetNote(unpublished: readonly string[]): string {
  const names = [...new Set(unpublished.map(name => name.trim()).filter(Boolean))];
  if (!names.length) return 'Another location’s schedule isn’t out yet.';
  return names.length === 1 ? `${names[0]}’s schedule isn’t out yet.` : `${joinNames(names)} schedules aren’t out yet.`;
}
