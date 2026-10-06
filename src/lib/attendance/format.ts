const MINUTE_NANOSECONDS = BigInt(60_000_000_000);
const HOUR_MINUTES = BigInt(60);

export function formatAttendanceDifference(
  differenceNanoseconds: string,
): string {
  if (!/^[1-9][0-9]{0,29}$/.test(differenceNanoseconds)) {
    throw new Error("Invalid attendance difference");
  }

  const value = BigInt(differenceNanoseconds);
  if (value < MINUTE_NANOSECONDS) return "<1m";

  const minutes = value / MINUTE_NANOSECONDS;
  if (minutes < HOUR_MINUTES) return `${minutes.toString()}m`;

  const hours = minutes / HOUR_MINUTES;
  const remainder = minutes % HOUR_MINUTES;
  return `${hours.toString()}h ${remainder.toString()}m`;
}
