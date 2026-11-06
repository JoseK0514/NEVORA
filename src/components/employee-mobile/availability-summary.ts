const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const hour = (value: string) => {
  const [h, m] = value.split(":").map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h % 24 < 12 ? "AM" : "PM"}`;
};
/** "Weekdays · 7 AM – 5 PM" from the person's own weekly availability; null when it can't be said in a few words. */
export function availabilitySummary(windows: { dayOfWeek: number; startTime: string; endTime: string }[]): string | null {
  if (!windows.length) return "Not set";
  const days = [...new Set(windows.map(window => window.dayOfWeek))].sort((a, b) => a - b);
  const ranges = new Set(windows.map(window => `${window.startTime}-${window.endTime}`));
  const key = days.join("");
  const label = key === "0123456" ? "Every day" : key === "12345" ? "Weekdays" : key === "06" ? "Weekends" : days.length <= 3 ? days.map(day => DAY_NAMES[day]).join(", ") : `${days.length} days a week`;
  if (ranges.size !== 1 || windows.length !== days.length) return label;
  const [first] = windows;
  // Midnight to midnight is the whole day ("Every day · all day", not "12 AM – 12 AM").
  if (first.startTime.startsWith("00:00") && /^(24:00|00:00|23:59)/.test(first.endTime)) return `${label} · all day`;
  return `${label} · ${hour(first.startTime)} – ${hour(first.endTime)}`;
}
