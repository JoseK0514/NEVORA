'use client';
import {RootErrorScreen} from '@/components/public-error-screen';

/** Catches failures in segment layouts (the portal shell's own reads) that app/app/error.tsx can't. Portal addresses keep
 * the in-app screen; signed-out and public ones get the public Direction B screen (Nov 8, 2026). */
export default function Error({reset, retry}: {error: Error & {digest?: string}; reset: () => void; retry?: () => void}) {
  return <RootErrorScreen reset={retry ?? reset} />;
}
