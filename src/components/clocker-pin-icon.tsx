export function ClockerPinIcon({ name, size = 20 }: {
  name: 'lock' | 'tablet' | 'clock' | 'reset' | 'check' | 'alert' | 'arrow' | 'back';
  size?: number;
}) {
  const paths = {
    lock: <><rect x="5.5" y="10" width="13" height="10.5" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" /></>,
    tablet: <><rect x="5" y="2.5" width="14" height="19" rx="3" /><path d="M10 18h4m-5-8 2 2 4-4" /></>,
    clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.5 2" /></>,
    reset: <><path d="M4.5 8a8 8 0 1 1-.2 7.5M4.5 3.5V8H9" /><path d="M12 7v5l3 2" /></>,
    check: <><circle cx="12" cy="12" r="8.5" /><path d="m8 12 2.5 2.5 5.5-5.5" /></>,
    alert: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v5m0 3.5h.01" /></>,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    back: <path d="M19 12H5m5-5-5 5 5 5" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
