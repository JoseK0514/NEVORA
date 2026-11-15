'use client';
import { useRouter } from 'next/navigation';
import { ClockerErrorScreen } from '@/components/clocker-fallback';

/** The kiosk's own error boundary (Nov 14 inspection, RA-4): the kiosk's look and the tablet's language, Try again and the
 * manager fallback. A shared tablet never shows the public screen's "Go to sign in". */
export default function ClockerError({ reset, retry }: { error: Error & { digest?: string }; reset: () => void; retry?: () => void }) {
  const router = useRouter();
  return <ClockerErrorScreen retry={() => { if (retry) retry(); else { router.refresh(); reset(); } }} />;
}
