'use client';

import {useEffect, useRef, useState, type ReactNode} from 'react';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {NavIcon} from './nav-icon';

const TARGET = '#employee-calendar-title';

/** Calendar setup is optional, so Profile keeps it closed (Codex mobile review M3). The existing
 *  /app/profile#employee-calendar-title link (My schedule's "Add shifts to your calendar") opens it
 *  and moves focus to it. Opening it never issues a private link; the panel's own controls do that. */
export function ProfileCalendarDisclosure({children}: {children: ReactNode}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const sync = () => {
      if (location.hash !== TARGET) return;
      setOpen(true);
      requestAnimationFrame(() => {
        ref.current?.scrollIntoView({block: 'start'});
        ref.current?.querySelector('summary')?.focus({preventScroll: true});
      });
    };
    sync();
    addEventListener('hashchange', sync);
    return () => removeEventListener('hashchange', sync);
  }, []);
  return <details ref={ref} className="profile-calendar-disclosure" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="profile-setting-row">
      <span className="profile-setting-copy"><NavIcon name="calendar" size={20}/><span><strong>Add shifts to your calendar</strong><small>Apple Calendar, Google Calendar or Outlook</small></span></span>
      <CaretDownIcon className="profile-setting-caret" size={18} aria-hidden="true"/>
    </summary>
    {children}
  </details>;
}
