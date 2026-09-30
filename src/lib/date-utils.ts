const DAY_MS = 24 * 60 * 60 * 1000;

export function isValidIsoDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const value = new Date(`${date}T12:00:00Z`);
  return !Number.isNaN(value.getTime()) && value.toISOString().slice(0, 10) === date;
}

export function isValidWeekStart(date: string) {
  return isValidIsoDate(date) && new Date(`${date}T12:00:00Z`).getUTCDay() === 1;
}

export function currentDateInPuertoRico() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Puerto_Rico",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export function addDays(date: string, amount: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setTime(value.getTime() + amount * DAY_MS);
  return value.toISOString().slice(0, 10);
}

export function weekStartFor(date: string) {
  const value = new Date(`${date}T12:00:00Z`);
  const day = value.getUTCDay();
  const distanceToMonday = day === 0 ? -6 : 1 - day;
  return addDays(date, distanceToMonday);
}

export function isDateInWeek(date: string, weekStart: string) {
  return (
    isValidIsoDate(date) &&
    isValidWeekStart(weekStart) &&
    date >= weekStart &&
    date <= addDays(weekStart, 6)
  );
}

export function weekDates(weekStart: string) {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function formatWeekRange(weekStart: string) {
  const end = addDays(weekStart, 6);
  const startDate = new Date(`${weekStart}T12:00:00Z`);
  const endDate = new Date(`${end}T12:00:00Z`);

  const startLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(startDate);

  const endLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(endDate);

  return `${startLabel} – ${endLabel}`;
}

export function formatDayLabel(date: string) {
  const value = new Date(`${date}T12:00:00Z`);
  return {
    weekday: new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: "UTC",
    }).format(value),
    day: new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(value),
  };
}

export function formatTime(time: string) {
  const [hourString, minute] = time.slice(0, 5).split(":");
  const hour = Number(hourString);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${suffix}`;
}

export function durationMinutes(startTime: string, endTime: string) {
  const toMinutes = (time: string) => {
    const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
    return hours * 60 + minutes;
  };

  return Math.max(0, toMinutes(endTime) - toMinutes(startTime));
}


export function formatPuertoRicoDateTimeInput(iso?: string) {
  if (!iso) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Puerto_Rico",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

export function formatPuertoRicoDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Puerto_Rico",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}
