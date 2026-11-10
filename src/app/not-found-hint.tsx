'use client';

import { usePathname } from 'next/navigation';
import { DeviceTabletIcon } from '@phosphor-icons/react/dist/ssr/DeviceTablet';

/** The amber time clock hint: a tablet glyph, then the question and what to do (review F2, NV-316: in the page's
 * language, with the icon the mock draws). */
export function ClockerHint({ title, body, className = '' }: { title: string; body: string; className?: string }) {
  return <p className={`not-found-hint ${className}`.trim()}><DeviceTabletIcon size={20} weight="bold" aria-hidden="true" /><span><strong>{title}</strong> {body}</span></p>;
}

/** On a tablet whose Clocker link is wrong, say how to recover. */
export function NotFoundHint({ title, body }: { title: string; body: string }) {
  const path = usePathname() ?? '';
  if (!path.startsWith('/clocker/')) return null;
  return <ClockerHint title={title} body={body} />;
}
