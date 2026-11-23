import { shiftPeriod } from "@/lib/scheduling/periods";
import { durationText } from "@/lib/duration-text";
import { scheduleWords, type ScheduleLang } from "../schedule-copy";

export function shiftDurationLabel(date: string, startTime: string, endTime: string, lang: ScheduleLang = "en") {
  const t = scheduleWords(lang).edit;
  try {
    const period = shiftPeriod({ date, startTime, endTime });
    return t.scheduled(durationText(period.end - period.start), endTime < startTime);
  } catch {
    return t.invalidTimes;
  }
}
