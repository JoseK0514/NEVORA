'use client';
import {AppErrorScreen} from '@/components/app-error-screen';

/** Last resort when the root layout fails: Next renders this in place of the whole document. */
export default function GlobalError({reset, retry}: {error: Error & {digest?: string}; reset: () => void; retry?: () => void}) {
  return <html lang="en"><body style={{margin: 0}}><AppErrorScreen reset={retry ?? reset} /></body></html>;
}
