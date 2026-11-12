'use client';
import {useEffect, type ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import {isCommerceRecoveryRoute} from './recovery-routes';

/** A retained healthy layout must unmount pollers and sheets on recovery entry.
 * Leaving a layout initially rendered without its shell needs a fresh document. */
export function CommerceRecoveryBoundary({enabled, initialRecovery = false, children, shell}: {
  enabled: boolean; initialRecovery?: boolean; children: ReactNode; shell?: ReactNode;
}) {
  const pathname = usePathname();
  const recovering = enabled && isCommerceRecoveryRoute(pathname);
  const needsDocument = enabled && initialRecovery && !recovering;
  useEffect(() => { if (needsDocument) window.location.reload(); }, [needsDocument]);
  if (needsDocument) return <p role="status">Opening your workspace…</p>;
  return recovering ? <div data-commerce-recovery="true">{children}</div> : <>{shell ?? children}</>;
}
