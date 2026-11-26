export const copy = {
  en: {
    // src/lib/action-center/present.ts:159, src/components/team-live.tsx:69
    notClockedIn: "Not clocked in",
    // src/components/team-live.tsx:69
    hMin: "{notClockedIn} · {hours} h {minutes} min",
    // src/components/team-live.tsx:69
    min: "{notClockedIn} · {minutes} min",
    // src/components/team-live.tsx:71
    clockedIn: "Clocked in",
    // src/components/team-live.tsx:82
    onBreak: "On break",
    // src/components/team-live.tsx:84
    offToday: "Off today",
    // src/components/team-live.tsx:86
    starts: "Starts {starts}",
  },
  es: {
    // src/lib/action-center/present.ts:159, src/components/team-live.tsx:69
    notClockedIn: "Sin ponchar",
    // src/components/team-live.tsx:69
    hMin: "{notClockedIn} · {hours} h {minutes} min",
    // src/components/team-live.tsx:69
    min: "{notClockedIn} · {minutes} min",
    // src/components/team-live.tsx:71
    clockedIn: "En turno",
    // src/components/team-live.tsx:82
    onBreak: "En descanso",
    // src/components/team-live.tsx:84
    offToday: "Libre hoy",
    // src/components/team-live.tsx:86
    starts: "Empieza {starts}",
  },
} as const;
