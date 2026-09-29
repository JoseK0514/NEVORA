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
  | "requests";

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
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "dashboard") {
    return (
      <svg {...common}>
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5.5 10.5V20h13v-9.5" />
        <path d="M9.5 20v-6h5v6" />
      </svg>
    );
  }

  if (name === "schedule") {
    return (
      <svg {...common}>
        <rect x="3.5" y="5.5" width="17" height="15" rx="2" />
        <path d="M7 3.5v4M17 3.5v4M3.5 9.5h17" />
      </svg>
    );
  }

  if (name === "availability") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3" />
        <path d="M5.5 20c.4-4 2.6-6 6.5-6s6.1 2 6.5 6" />
      </svg>
    );
  }

  if (name === "timeOff") {
    return (
      <svg {...common}>
        <path d="M4 12 20 4l-4 16-4.5-5.5L4 12Z" />
        <path d="m11.5 14.5 3.5-3.5" />
      </svg>
    );
  }

  if (name === "exchange") {
    return (
      <svg {...common}>
        <path d="M4 7h13" />
        <path d="m14 4 3 3-3 3" />
        <path d="M20 17H7" />
        <path d="m10 20-3-3 3-3" />
      </svg>
    );
  }

  if (name === "employees") {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 20c.3-3.8 2.2-5.8 5.5-5.8S14.2 16.2 14.5 20" />
        <circle cx="17" cy="9" r="2.2" />
        <path d="M15.6 14.7c2.9.1 4.5 1.8 4.8 5.3" />
      </svg>
    );
  }

  if (name === "templates") {
    return (
      <svg {...common}>
        <path d="M6 3.5h8l4 4V20H6z" />
        <path d="M14 3.5v4h4M9 12h6M9 15.5h6" />
      </svg>
    );
  }

  if (name === "rules") {
    return (
      <svg {...common}>
        <path d="M5 6h14M5 12h14M5 18h14" />
        <circle cx="9" cy="6" r="1.7" fill="currentColor" stroke="none" />
        <circle cx="15" cy="12" r="1.7" fill="currentColor" stroke="none" />
        <circle cx="11" cy="18" r="1.7" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (name === "settings") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M18.5 5.5l-1.4 1.4M6.9 17.1l-1.4 1.4" />
      </svg>
    );
  }

  if (name === "coverage") {
    return (
      <svg {...common}>
        <path d="M12 3 20 6v5c0 5.2-3.2 8.2-8 10-4.8-1.8-8-4.8-8-10V6l8-3Z" />
        <path d="M12 8v5M12 16h.01" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M6 4h12v16H6z" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  );
}
