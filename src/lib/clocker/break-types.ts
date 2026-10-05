export type BreakCategory = 'REST' | 'MEAL' | 'OTHER';
export type BreakTypeInput = { name: string; category: BreakCategory; targetMinutes: number | null; active: boolean };
export type BreakType = BreakTypeInput & { id: string; version: number };
export type BreakTypeSnapshot = Omit<BreakType, 'active'>;
export type BreakSelection = { id: string; version: number };
export const breakCategories = [{ value: 'REST', label: 'Rest' }, { value: 'MEAL', label: 'Meal' }, { value: 'OTHER', label: 'Other' }] as const;

export function validateBreakType(input: unknown): BreakTypeInput {
  const invalid = () => new Error('Check the break name, classification and reference duration.');
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw invalid();
  const row = input as Record<string, unknown>;
  const fields = ['name', 'category', 'targetMinutes', 'active'];
  if (Object.keys(row).length !== fields.length || !fields.every(field => Object.hasOwn(row, field)) || typeof row.name !== 'string') throw invalid();
  const name = row.name.normalize('NFC').trim();
  if (!name || [...name].length > 80 || /[\u0000-\u001f\u007f]/.test(name) ||
      typeof row.category !== 'string' || !breakCategories.some(category => category.value === row.category) ||
      typeof row.active !== 'boolean' || !(row.targetMinutes === null ||
        (typeof row.targetMinutes === 'number' && Number.isInteger(row.targetMinutes) && row.targetMinutes >= 1 && row.targetMinutes <= 1440))) throw invalid();
  return { name, category: row.category as BreakCategory, targetMinutes: row.targetMinutes as number | null, active: row.active };
}

/** Informational display only. Never mutates a break, pay calculation or clock state. */
export function breakProgress(start: string, minutes: number | null, now: number) {
  const timestamp = Date.parse(start);
  if (!Number.isFinite(timestamp) || !Number.isFinite(now) || (minutes !== null && (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440))) throw Error('Recorded break timing is unavailable.');
  const elapsedSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  return { elapsedSeconds, remainingSeconds: minutes === null ? null : Math.max(0, minutes * 60 - elapsedSeconds), overTarget: minutes !== null && elapsedSeconds > minutes * 60 };
}
