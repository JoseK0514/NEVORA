import type { CSSProperties, ReactNode } from 'react';

export type ClockerIconName = 'lock' | 'location' | 'arrow' | 'delete' | 'check' | 'clock-in' | 'clock-out' | 'break' | 'resume' | 'refresh' | 'shield';

const paths: Record<ClockerIconName, ReactNode> = {
  lock: <><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></>,
  location: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5"/>,
  delete: <><path d="m9 5-7 7 7 7h11a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H9Z"/><path d="m12 9 6 6m0-6-6 6"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  'clock-in': <><path d="M13 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5M3 12h12m-4-4 4 4-4 4"/></>,
  'clock-out': <><path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5m-1-8h11m-4-4 4 4-4 4"/></>,
  break: <><path d="M5 9h11v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V9Zm11 1h2a3 3 0 0 1 0 6h-2M8 3v2m5-2v2"/></>,
  resume: <><circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4V8Z"/></>,
  refresh: <><path d="M20 10a8 8 0 0 0-14-4L3 9m0-5v5h5m-4 5a8 8 0 0 0 14 4l3-3m0 5v-5h-5"/></>,
  shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/></>,
};

export function ClockerIcon({ name, size = 24, style }: { name: ClockerIconName; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={style}>{paths[name]}</svg>;
}
