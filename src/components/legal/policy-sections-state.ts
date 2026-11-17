/* Which of a policy's sections are open on a phone or tablet (Phase 5, PB-034). Pure, so it is tested without a browser.
 * `choice` is what the person has opened or closed by hand (null until they touch anything); `hash` is the address's
 * fragment, which may name a section or its text. */
export type SectionsInput = { ids: readonly string[]; pinFirst: boolean; choice: ReadonlySet<string> | null; hash: string };

/** The sections that fold: all of them, or all but a pinned first one. */
export const foldingIds = ({ ids, pinFirst }: Pick<SectionsInput, "ids" | "pinFirst">): string[] => ids.filter((_, index) => !(pinFirst && index === 0));

/** Open by default: the first section (unless it is pinned open anyway) and the one the address points at. */
export function openedIds({ ids, pinFirst, choice, hash }: SectionsInput): ReadonlySet<string> {
  if (choice) return choice;
  const target = ids.find(id => hash === id || hash === `${id}-text`);
  return new Set([pinFirst ? undefined : ids[0], target].filter((id): id is string => !!id));
}

export const allOpen = (input: SectionsInput): boolean => { const opened = openedIds(input); return foldingIds(input).every(id => opened.has(id)); };

/** One section's button: open it or close it, leaving the others as they are. */
export function toggled(input: SectionsInput, id: string): ReadonlySet<string> {
  const next = new Set(openedIds(input));
  if (!next.delete(id)) next.add(id);
  return next;
}

/** "Open all" opens every folding section; pressed again ("Close all") it closes them. */
export const toggledAll = (input: SectionsInput): ReadonlySet<string> => new Set(allOpen(input) ? [] : foldingIds(input));
