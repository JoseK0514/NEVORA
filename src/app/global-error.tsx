'use client';
import {RootErrorScreen} from '@/components/public-error-screen';

/** Last resort when the root layout fails: Next renders this in place of the whole document. Portal addresses keep the
 * in-app screen; signed-out and public ones get the public Direction B screen (Nov 8, 2026). */
export default function GlobalError({reset, retry}: {error: Error & {digest?: string}; reset: () => void; retry?: () => void}) {
  return <html lang="en"><body style={{margin: 0}}><RootErrorScreen reset={retry ?? reset} /></body></html>;
}
