export type AvailabilityDayState = {
  available: boolean;
  startTime: string;
  endTime: string;
};

export type AvailabilityState = Record<number, AvailabilityDayState>;

function mondayHours(state: AvailabilityState) {
  const monday = state[1];
  return {
    startTime: monday?.startTime ?? "06:00",
    endTime: monday?.endTime ?? "18:00",
  };
}

export function applyWeekdays(state: AvailabilityState): AvailabilityState {
  const hours = mondayHours(state);
  const next = { ...state };

  for (const day of [1, 2, 3, 4, 5]) {
    next[day] = {
      available: true,
      ...hours,
    };
  }

  return next;
}

export function applyAllDays(state: AvailabilityState): AvailabilityState {
  const hours = mondayHours(state);
  const next = { ...state };

  for (let day = 0; day < 7; day += 1) {
    next[day] = {
      available: true,
      ...hours,
    };
  }

  return next;
}

export function clearAvailability(state: AvailabilityState): AvailabilityState {
  return Object.fromEntries(
    Object.entries(state).map(([day, value]) => [
      Number(day),
      { ...value, available: false },
    ]),
  ) as AvailabilityState;
}
