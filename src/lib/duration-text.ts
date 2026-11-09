/** One way to write a duration everywhere (TC-P3-12), matching the kit Duration:
 * "0h", "37m", "8h", "8h 30m". */
export function durationText(totalMinutes: number): string {
  const minutes = Math.max(0, Math.floor(totalMinutes));
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  if (!hours) return rest ? `${rest}m` : '0h';
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}
