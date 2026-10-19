'use client';
import {AppErrorScreen} from '@/components/app-error-screen';

/** Last resort when the root layout fails: Next renders this in place of the whole document. */
export default function GlobalError({reset}: {error: Error & {digest?: string}; reset: () => void}) {
  return <html lang="en"><body style={{margin: 0}}><AppErrorScreen reset={reset} /></body></html>;
}
