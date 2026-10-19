import { durationText } from "@/lib/duration-text";

/** A duration that never splits across lines ("8h\u00a030m"), for Wave A's "· 8h 30m" after a time range. */
export function keepDuration(minutes: number) {
  return durationText(minutes).replace(/ /g, "\u00a0");
}
