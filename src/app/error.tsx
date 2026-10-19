'use client';
import {AppErrorScreen} from '@/components/app-error-screen';

/** Catches failures in segment layouts (the portal shell's own reads) that app/app/error.tsx can't. */
export default function Error({reset}: {error: Error & {digest?: string}; reset: () => void}) {
  return <AppErrorScreen reset={reset} />;
}
