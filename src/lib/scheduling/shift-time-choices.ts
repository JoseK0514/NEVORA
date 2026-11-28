import { formatTime } from "../date-utils";

const QUARTERS = Array.from({ length: 96 }, (_, index) => `${String(Math.floor(index / 4)).padStart(2, "0")}:${String((index % 4) * 15).padStart(2, "0")}`);

/** Quarter hours, plus a saved time that isn't on a quarter so it stays as it was. */
export function timeChoices(current: string, time: (value: string) => string = formatTime) {
  const list = current && !QUARTERS.includes(current) ? [...QUARTERS, current].sort() : QUARTERS;
  // Review B2 (NV-227): the list starts at 6:00 AM (the working day), so 9:00 AM is 12 steps away, not 36; it wraps to the
  // night hours at the end. Typeahead still works.
  const first = list.findIndex(value => value >= "06:00");
  return [...list.slice(first), ...list.slice(0, first)].map(value => ({ value, label: time(value) }));
}
