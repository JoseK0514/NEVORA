/** Workspace policy accepts named IANA regions, never a guessed UTC offset. */
export function validateWorkspaceTimeZone(timeZone:unknown):string {
  if (typeof timeZone !== 'string' || !/^[A-Za-z_]+(?:\/[A-Za-z_+-]+)+$/.test(timeZone) || /^Etc\//i.test(timeZone)) throw new Error('Choose a named IANA business timezone.');
  try { new Intl.DateTimeFormat('en', { timeZone }).format(); } catch { throw new Error('Choose a valid IANA business timezone.'); }
  return timeZone;
}
export function validateWorkspaceProfile(input: { name: unknown; timeZone: unknown }): { name: string; timeZone: string } {
  if (typeof input.name !== 'string' || /[\p{Cc}\p{Cf}]/u.test(input.name)) throw new Error('Enter a valid workspace name.');
  const name = input.name.trim();
  if (!name || [...name].length > 160) throw new Error('Workspace name must contain 1–160 characters.');
  return {name,timeZone:validateWorkspaceTimeZone(input.timeZone)};
}
