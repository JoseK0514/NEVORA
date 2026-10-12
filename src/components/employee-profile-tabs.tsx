"use client";

import { useId, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";
import { UserCircleIcon } from "@phosphor-icons/react/dist/ssr/UserCircle";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr/CalendarBlank";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const tabs = [
  { label: "Details", Icon: UserCircleIcon },
  { label: "Scheduling", Icon: CalendarBlankIcon },
] as const;

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
    <div className="profile-workspace">
      <div className="profile-segments" role={enhanced ? "tablist" : "navigation"} aria-label="Employee profile sections" data-selected={selected}>
        {enhanced ? <span className="profile-segment-thumb" aria-hidden="true" /> : null}
        {tabs.map(({ label, Icon }, index) => enhanced ? (
          <button
            key={label}
            ref={node => { buttons.current[index] = node; }}
            className="profile-segment"
            type="button"
            role="tab"
            id={tabId(index)}
            aria-controls={panelId(index)}
            aria-selected={selected === index}
            tabIndex={selected === index ? 0 : -1}
            onClick={() => setSelected(index)}
            onKeyDown={event => handleKey(event, index)}
          >
            <Icon size={20} weight="regular" aria-hidden="true" focusable="false" />
            {label}
          </button>
        ) : (
          <a key={label} className="profile-segment" href={`#${panelId(index)}`}>
            <Icon size={20} weight="regular" aria-hidden="true" focusable="false" />
            {label}
          </a>
        ))}
      </div>
      {[details, scheduling].map((content, index) => (
        <div
          key={tabs[index].label}
          id={panelId(index)}
          className="profile-tab-panel"
          role={enhanced ? "tabpanel" : undefined}
          aria-labelledby={enhanced ? tabId(index) : undefined}
          hidden={enhanced && selected !== index}
          tabIndex={enhanced ? 0 : undefined}
        >
          {content}
        </div>
      ))}
    </div>
  );
}
