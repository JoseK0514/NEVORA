/** Review B7 (NV-068): one way to write a duration. Three outputs, all from whole minutes:
 * - sentence: "1 h 30 min", "8 h", "45 min" (prose, cards, notes)
 * - row: "8 h 06", "32 h", "45 min" (a row's figure, as on the approved Nov 7 boards)
 * - total: "437 h" (a period total, whole hours)
 * Dense grids may still use their compact form. Negative input reads as zero. */
const whole = (minutes: number) => Math.max(0, Math.floor(minutes));

export function durationSentence(minutes: number, zero = '0 min') {
  const total = whole(minutes), hours = Math.floor(total / 60), rest = total % 60;
  return hours && rest ? `${hours} h ${rest} min` : hours ? `${hours} h` : rest ? `${rest} min` : zero;
}

export function durationRow(minutes: number, zero = '0 min') {
  const total = whole(minutes), hours = Math.floor(total / 60), rest = total % 60;
  return hours && rest ? `${hours} h ${String(rest).padStart(2, '0')}` : hours ? `${hours} h` : rest ? `${rest} min` : zero;
}

export function durationTotal(minutes: number) {
  return `${Math.round(whole(minutes) / 60)} h`;
}
