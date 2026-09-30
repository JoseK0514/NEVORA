export type NavIconName =
  | "dashboard"
  | "schedule"
  | "availability"
  | "timeOff"
  | "exchange"
  | "employees"
  | "templates"
  | "rules"
  | "settings"
  | "coverage"
  | "requests"
  | "location"
  | "calendar"
  | "shift"
  | "hours"
  | "alert"
  | "publish"
  | "employee"
  | "lead"
  | "clock"
  | "logout";

export function NavIcon({
  name,
  size = 18,
}: {
  name: NavIconName;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.85,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "dashboard") {
    return (
      <svg {...common}>
        <path d="M3.5 10.8 12 3.8l8.5 7" />
        <path d="M5.7 9.9V20h12.6V9.9" />
        <path d="M9.4 20v-6.2h5.2V20" />
      </svg>
    );
  }

  if (name === "schedule" || name === "calendar") {
    return (
      <svg {...common}>
        <rect x="3.5" y="5.4" width="17" height="15.1" rx="2.2" />
        <path d="M7.2 3.5v4.1M16.8 3.5v4.1M3.5 9.7h17" />
        {name === "calendar" ? (
          <>
            <path d="M8 13h2M14 13h2M8 16.8h2M14 16.8h2" />
          </>
        ) : null}
      </svg>
    );
  }

  if (name === "availability") {
    return (
      <svg {...common}>
        <circle cx="9.2" cy="8" r="3" />
        <path d="M3.8 19.8c.4-3.9 2.3-5.8 5.4-5.8 2.1 0 3.7.8 4.6 2.4" />
        <path d="m15 17.2 1.8 1.8 3.5-4" />
      </svg>
    );
  }

  if (name === "timeOff") {
    return (
      <svg {...common}>
        <path d="M3.8 11.9 20.2 4l-4.1 16-4.7-5.2-7.6-2.9Z" />
        <path d="m11.4 14.8 4-4" />
      </svg>
    );
  }

  if (name === "exchange") {
    return (
      <svg {...common}>
        <path d="M4 7.2h13.2" />
        <path d="m14.3 4.3 2.9 2.9-2.9 2.9" />
        <path d="M20 16.8H6.8" />
        <path d="m9.7 19.7-2.9-2.9 2.9-2.9" />
      </svg>
    );
  }

  if (name === "employees") {
    return (
      <svg {...common}>
        <circle cx="8.6" cy="8" r="2.9" />
        <path d="M3.5 19.7c.4-3.7 2.1-5.6 5.1-5.6s4.8 1.9 5.2 5.6" />
        <circle cx="17.2" cy="9" r="2.2" />
        <path d="M15.3 14.8c2.9.2 4.5 1.8 4.9 4.9" />
      </svg>
    );
  }

  if (name === "templates") {
    return (
      <svg {...common}>
        <path d="M6.1 3.5h7.8l4 4V20H6.1z" />
        <path d="M13.9 3.5v4h4M9.1 12h5.8M9.1 15.7h5.8" />
      </svg>
    );
  }

  if (name === "rules") {
    return (
      <svg {...common}>
        <path d="M4 6.2h16M4 12h16M4 17.8h16" />
        <circle cx="8.3" cy="6.2" r="1.6" fill="currentColor" stroke="none" />
        <circle cx="15.5" cy="12" r="1.6" fill="currentColor" stroke="none" />
        <circle cx="10.8" cy="17.8" r="1.6" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (name === "settings") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="3.1" />
        <path d="M19 13.8a7.8 7.8 0 0 0 .1-3.6l2-1.4-2-3.4-2.4 1a8.2 8.2 0 0 0-3.1-1.8L13.3 2H9.5l-.3 2.6A8.5 8.5 0 0 0 6 6.4l-2.3-1-2 3.4 2.1 1.4a8.1 8.1 0 0 0 .1 3.6l-2 1.4 2 3.4 2.3-1a8.5 8.5 0 0 0 3.2 1.8l.3 2.6h3.8l.3-2.6a8.2 8.2 0 0 0 3.1-1.8l2.4 1 2-3.4-2.3-1.4Z" />
      </svg>
    );
  }

  if (name === "coverage") {
    return (
      <svg {...common}>
        <path d="M12 3.2 20 6.1v5.1c0 5-3.1 8-8 9.7-4.9-1.7-8-4.7-8-9.7V6.1L12 3.2Z" />
        <path d="m8.7 12.2 2.2 2.1 4.5-4.8" />
      </svg>
    );
  }

  if (name === "requests") {
    return (
      <svg {...common}>
        <path d="M7 4h10v16H7z" />
        <path d="M9.5 7.8h5M9.5 11.7h5M9.5 15.6h3.6" />
        <path d="M9.2 4V2.8h5.6V4" />
      </svg>
    );
  }

  if (name === "location") {
    return (
      <svg {...common}>
        <path d="M4.5 9.1h15l-1.4-4.3H5.9L4.5 9.1Z" />
        <path d="M5.8 9.1V20h12.4V9.1M9 20v-6.2h6V20" />
        <path d="M4.4 9.1c.2 1.8 1.2 2.7 2.6 2.7s2.5-.9 2.7-2.7c.2 1.8 1.2 2.7 2.6 2.7s2.4-.9 2.6-2.7c.2 1.8 1.2 2.7 2.6 2.7s2.4-.9 2.6-2.7" />
      </svg>
    );
  }

  if (name === "shift") {
    return (
      <svg {...common}>
        <rect x="4" y="7" width="16" height="12.5" rx="2" />
        <path d="M9 7V4.5h6V7M4 11.5h16M10 11.5v2h4v-2" />
      </svg>
    );
  }

  if (name === "hours" || name === "clock") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.6" />
        <path d="M12 7.5V12l3 2" />
        {name === "hours" ? <path d="M5 4.8 3.5 3.3M19 4.8l1.5-1.5" /> : null}
      </svg>
    );
  }

  if (name === "alert") {
    return (
      <svg {...common}>
        <path d="M12 3.7 21 20H3L12 3.7Z" />
        <path d="M12 9v5M12 17.1h.01" />
      </svg>
    );
  }

  if (name === "publish") {
    return (
      <svg {...common}>
        <path d="M12 15V4M8.3 7.7 12 4l3.7 3.7" />
        <path d="M5 12.5V20h14v-7.5" />
      </svg>
    );
  }

  if (name === "employee") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3.1" />
        <path d="M5.3 20c.4-4.2 2.6-6.3 6.7-6.3s6.3 2.1 6.7 6.3" />
      </svg>
    );
  }

  if (name === "lead") {
    return (
      <svg {...common}>
        <circle cx="9.2" cy="8.2" r="2.8" />
        <path d="M4.2 19.8c.4-3.8 2.1-5.6 5-5.6 1.7 0 3 .5 3.9 1.5" />
        <path d="m17.3 12.6 1.2 2.4 2.7.4-2 1.9.5 2.7-2.4-1.3-2.4 1.3.5-2.7-2-1.9 2.7-.4 1.2-2.4Z" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M4 5h8v14H4zM12 8h4l4 4v7h-8z" />
      <path d="M8 12h9" />
      <path d="m16 9 4 3-4 3" />
    </svg>
  );
}
