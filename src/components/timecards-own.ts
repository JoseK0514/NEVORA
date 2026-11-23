import {TIMECARDS_COPY,type TimecardsCopy} from './timecards-copy';

/** MG-004 (Nov 15, 2026): who approves the viewer's own timecard, in words.
 * A Manager is told the Owners by name, as the closed pages do ("Jose Natal or Ana Colon"); with no name to give, "An
 * Owner". An Owner keeps the sentence the page always had: the server lets another Owner or a Manager approve it, and
 * this screen cannot tell which of them exists. `row` is the list's status line, `card` the sentence in the timecard.
 * Signed-in Spanish (Nov 23, 2026): the words come from the person's language table (English unless given). */
export function ownApprover(viewerIsOwner: boolean, owners: readonly string[], T: TimecardsCopy = TIMECARDS_COPY.en): { row: string; card: string } {
  if (viewerIsOwner) return { row: T.anotherApprovesRow, card: T.anotherApprovesCard };
  const names = owners.map(name => name.trim()).filter(Boolean).slice(0, 2);
  if (!names.length) return { row: T.ownerApprovesRow, card: T.ownerApprovesCard };
  const first = (name: string) => name.split(/\s+/)[0];
  return { row: T.namesApproveRow(names.map(first)), card: T.namesApproveCard(names) };
}
