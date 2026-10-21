'use client';

import { useSyncExternalStore } from 'react';
import { readThemeChoice, writeThemeChoice, THEME_KEY, type ThemeChoice } from '@/lib/theme';

const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  const storage = (event: StorageEvent) => { if (event.key === THEME_KEY) listener(); };
  window.addEventListener('storage', storage);
  return () => { listeners.delete(listener); window.removeEventListener('storage', storage); };
}

/** System / Light / Dark for this device, styled like the Language switch beside it. The pressed option is the choice. */
export function ThemeSwitch({ label = 'Appearance' }: { label?: string }) {
  const choice = useSyncExternalStore(subscribe, readThemeChoice, () => 'system' as ThemeChoice);
  return (
    <div className="ap-lang" role="group" aria-label={label}>
      {([['system', 'System'], ['light', 'Light'], ['dark', 'Dark']] as const).map(([value, name]) => (
        <button key={value} type="button" aria-pressed={choice === value} onClick={() => { writeThemeChoice(value); listeners.forEach(listener => listener()); }}>
          <span>{name}</span>
        </button>
      ))}
    </div>
  );
}
