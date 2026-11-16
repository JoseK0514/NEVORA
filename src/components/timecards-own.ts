/** MG-004 (Nov 15, 2026): who approves the viewer's own timecard, in words.
 * A Manager is told the Owners by name, as the closed pages do ("Jose Natal or Ana Colon"); with no name to give, "An
 * Owner". An Owner keeps the sentence the page always had: the server lets another Owner or a Manager approve it, and
 * this screen cannot tell which of them exists. `row` is the list's status line, `card` the sentence in the timecard. */
export function ownApprover(viewerIsOwner: boolean, owners: readonly string[]): { row: string; card: string } {
  if (viewerIsOwner) return { row: 'Another manager approves this one', card: 'Another manager approves your own timecard.' };
  const names = owners.map(name => name.trim()).filter(Boolean).slice(0, 2);
  if (!names.length) return { row: 'An Owner approves this one', card: 'An Owner approves your timecard.' };
  const first = (name: string) => name.split(/\s+/)[0];
  return { row: `${names.map(first).join(' or ')} approves this one`, card: `${names.join(' or ')} approves your timecard.` };
}
