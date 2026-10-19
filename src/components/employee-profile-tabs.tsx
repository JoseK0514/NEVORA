"use client";

import { useId, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const tabs = ["Details", "Scheduling"] as const;

/** Two views of one person: Details and Scheduling. A real tab list once the page is interactive;
 * before that, plain links to both sections (both stay visible). */
export function EmployeeProfileTabs({ details, scheduling }: { details: ReactNode; scheduling: ReactNode }) {
  const id = useId();
  const enhanced = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const [selected, setSelected] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const panelId = (index: number) => `${id}-profile-panel-${index}`;
  const tabId = (index: number) => `${id}-profile-tab-${index}`;

  function handleKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    switch (event.key) {
      case "ArrowRight": next = (index + 1) % tabs.length; break;
      case "ArrowLeft": next = (index + tabs.length - 1) % tabs.length; break;
      case "Home": next = 0; break;
      case "End": next = tabs.length - 1; break;
      default: return;
    }
    event.preventDefault();
    setSelected(next);
    buttons.current[next]?.focus();
  }

  return (
    <div className="wa-tabs">
      <div className="wa-segments" role={enhanced ? "tablist" : "navigation"} aria-label="Employee profile sections">
        {tabs.map((label, index) => enhanced ? (
          <button
            key={label}
            ref={node => { buttons.current[index] = node; }}
            className="wa-segment"
            type="button"
            role="tab"
            id={tabId(index)}
            aria-controls={panelId(index)}
            aria-selected={selected === index}
            tabIndex={selected === index ? 0 : -1}
            onClick={() => setSelected(index)}
            onKeyDown={event => handleKey(event, index)}
          >
            {label}
          </button>
        ) : (
          <a key={label} className="wa-segment" href={`#${panelId(index)}`}>{label}</a>
        ))}
      </div>
      {[details, scheduling].map((content, index) => (
        <div
          key={tabs[index]}
          id={panelId(index)}
          className="wa-tabpanel"
          role={enhanced ? "tabpanel" : undefined}
          aria-labelledby={enhanced ? tabId(index) : undefined}
          hidden={enhanced && selected !== index}
          tabIndex={enhanced ? -1 : undefined}
        >
          {content}
        </div>
      ))}
    </div>
  );
}
