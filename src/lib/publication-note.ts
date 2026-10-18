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
