import { shiftPeriod } from "@/lib/scheduling/periods";
import { durationText } from "@/lib/duration-text";

export function shiftDurationLabel(date: string, startTime: string, endTime: string) {
  try {
    const period = shiftPeriod({ date, startTime, endTime });
    return `${durationText(period.end - period.start)} scheduled${endTime < startTime ? " · Ends next day" : ""}`;
  } catch {
    return "Enter a valid start and end time.";
  }
}
