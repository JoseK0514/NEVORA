'use client';
import {RootErrorScreen} from '@/components/public-error-screen';

/** Last resort when the root layout fails: Next renders this in place of the whole document. Portal addresses keep the
 * in-app screen; signed-out and public ones get the public Direction B screen (Nov 8, 2026).
 * Phase 5 (Nov 17, 2026): it passes the failure's short reference like the root boundary, so support can be quoted one
 * here too (the screen prints only a short plain token, never an arbitrary digest). */
export default function GlobalError({error, reset, retry}: {error: Error & {digest?: string}; reset: () => void; retry?: () => void}) {
  return <html lang="en"><body style={{margin: 0}}><RootErrorScreen reset={retry ?? reset} digest={error.digest} error={error} /></body></html>;
}
