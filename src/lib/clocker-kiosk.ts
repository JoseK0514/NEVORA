const KIOSK_LOCATIONS: Record<string, string> = {
  "2": "FUEL – 2",
  "110": "FUEL – 110",
};

export function kioskLocationLabel(location: string) {
  return KIOSK_LOCATIONS[location] ?? null;
}

export function applyKioskPinKey(
  current: string,
  key: string,
) {
  if (key === "clear") return "";
  if (key === "delete") return current.slice(0, -1);
  if (!/^\d$/.test(key) || current.length >= 4) return current;

  return current + key;
}

export function formatKioskTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Puerto_Rico",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(value);
}

export function formatKioskDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Puerto_Rico",
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(value);
}

export function formatElapsedDuration(startedAt: number, now: number) {
  const elapsedMinutes = Math.max(
    0,
    Math.floor((now - startedAt) / (60 * 1_000)),
  );
  const hours = Math.floor(elapsedMinutes / 60);
  const minutes = elapsedMinutes % 60;

  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
}

export function formatBreakCountdown(endAt: number, now: number) {
  const remainingSeconds = Math.max(
    0,
    Math.ceil((endAt - now) / 1_000),
  );
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
