'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { focusAfterRetry } from '@/components/kit/focus-after-retry';
import { QuietSystemState } from '@/components/quiet-system-state';

/** T-21: one Quiet error state for every role. Try again asks the server again (retry); Back to Home is the way out. */
export default function Error({reset,retry:refetch}:{error:Error & {digest?:string};reset:()=>void;retry?:()=>void}) {
 const router = useRouter();
 const retry = () => { if(refetch)refetch();else{router.refresh();reset();} focusAfterRetry('[data-nv-page]:not([data-system-state]) h1', '[data-system-state="error"] .q-btn--sec'); };
 return <QuietSystemState kind="error" alert
  primary={<button type="button" className="q-btn q-btn--sec" onClick={retry}>Try again</button>}
  secondary={<Link className="q-btn q-btn--quiet" href="/app">Back to Home</Link>} />;
}
