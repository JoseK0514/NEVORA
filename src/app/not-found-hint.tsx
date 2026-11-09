'use client';

import { usePathname } from 'next/navigation';

/** On a tablet whose Clocker link is wrong, say how to recover. */
export function NotFoundHint() {
  const path = usePathname() ?? '';
  if (!path.startsWith('/clocker/')) return null;
  return <p className="not-found-hint"><strong>Is this a time clock tablet?</strong> Set up this tablet again. A manager or Owner can get the current link in Settings, under Clocker tablets.</p>;
}
