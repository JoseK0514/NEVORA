'use client';
import { useRouter } from 'next/navigation';
import { errorReference, portalErrorAdvice, useOnline } from '@/components/app-error-screen';
import { BRouteError } from '@/components/owner-b/b-route-error';

/* Inspection Nov 14, 2026 (RA-15): online, the screen says the fault is ours and shows Next's short reference
 * (error.digest); offline, the connection wording stays (the same words as AppErrorScreen).
 * Phase 2 (package D): the one Direction B state screen for every role (the band, then one red state card with Try again
 * and Go to Home). It was the older kit page, which had no band under Direction B and whose title was cut off under the
 * top bar; the Employee-only Signature copy was never shown and is gone. The words are unchanged. */
/** The next step, by the browser's own online flag (the same words as AppErrorScreen). */
function Advice() { return <>{portalErrorAdvice(useOnline())}</>; }
/** IS-49: the one live region's whole message. */
function Spoken({ reference }: { reference: string | null }) {
 return <>{`This page didn’t load. Nothing was changed. ${portalErrorAdvice(useOnline())}${reference ? ` Reference: ${reference}` : ''}`}</>;
}

export default function Error({error,reset,retry:refetch}:{error:Error & {digest?:string};reset:()=>void;retry?:()=>void}) {
 const router = useRouter();
 const reference = errorReference(error.digest);
 return <BRouteError title="This page didn’t load" sub="Nothing was changed."
  spoken={<Spoken reference={reference} />} line={<Advice />} reference={reference ? `Reference: ${reference}` : null}
  onRetry={() => { if(refetch)refetch();else{router.refresh();reset();} }} away={{ href: '/app', label: 'Go to Home' }} />;
}
