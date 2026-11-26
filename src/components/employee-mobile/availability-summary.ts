import { clockRangeText, type MobileLang } from "./mobile-format";
import { availabilitySummaryCopy } from "./copy/availability-summary";

/** "Weekdays · 7:00 AM – 5:00 PM" (the one time format) from the person's own weekly availability; null when it can't be said in a few words.
 * Spanish: "Días de semana · 7:00 a. m. – 5:00 p. m.". */
export function availabilitySummary(windows: { dayOfWeek: number; startTime: string; endTime: string }[], lang: MobileLang = "en"): string | null {
  const t = availabilitySummaryCopy[lang];
  if (!windows.length) return t.notSet;
  const days = [...new Set(windows.map(window => window.dayOfWeek))].sort((a, b) => a - b);
  const ranges = new Set(windows.map(window => `${window.startTime}-${window.endTime}`));
  const key = days.join("");
  const label = key === "0123456" ? t.everyDay : key === "12345" ? t.weekdays : key === "06" ? t.weekends : days.length <= 3 ? days.map(day => t.dayNames[day]).join(", ") : t.daysAWeek(days.length);
  if (ranges.size !== 1 || windows.length !== days.length) return label;
  const [first] = windows;
  // Midnight to midnight is the whole day ("Every day · all day", not "12:00 AM – 12:00 AM").
  if (first.startTime.startsWith("00:00") && /^(24:00|00:00|23:59)/.test(first.endTime)) return `${label} · ${t.allDay}`;
  return `${label} · ${clockRangeText(first.startTime, first.endTime, lang)}`;
}
