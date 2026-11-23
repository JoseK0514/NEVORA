'use client';
import { usePortalLang } from '@/lib/i18n/portal-lang';
import { loadingLine } from './shell-copy';

/** The loading frame's status line for assistive tech ("Loading your pay…"), in the person's language. A client part so
 * the server-rendered loading frames (route-skeleton.tsx) can follow the language too. */
export function RouteLoadingLine({ label }: { label: string }) {
  return <span className="sr-only">{loadingLine(label, usePortalLang())}</span>;
}
