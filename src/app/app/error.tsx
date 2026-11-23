'use client';
import { useRouter } from 'next/navigation';
import { errorReference, useOnline } from '@/components/app-error-screen';
import { BRouteError } from '@/components/owner-b/b-route-error';
import { usePortalLang } from '@/lib/i18n/portal-lang';
import { SHELL_WORDS } from '@/components/shell-copy';

/* Inspection Nov 14, 2026 (RA-15): online, the screen says the fault is ours and shows Next's short reference
 * (error.digest); offline, the connection wording stays (the same words as AppErrorScreen).
 * Phase 2 (package D): the one Direction B state screen for every role (the band, then one red state card with Try again
 * and Go to Home). It was the older kit page, which had no band under Direction B and whose title was cut off under the
 * top bar; the Employee-only Signature copy was never shown and is gone. The words are unchanged. */
/** The next step, by the browser's own online flag (the same words as AppErrorScreen). */
function Advice() { return <>{SHELL_WORDS[usePortalLang()].errorAdvice(useOnline())}</>; }
/** IS-49: the one live region's whole message. */
function Spoken({ reference }: { reference: string | null }) {
 const W = SHELL_WORDS[usePortalLang()];
 return <>{`${W.errorTitle}. ${W.errorLine} ${W.errorAdvice(useOnline())}${reference ? ` ${W.errorReference(reference)}` : ''}`}</>;
}

export default function Error({error,reset,retry:refetch}:{error:Error & {digest?:string};reset:()=>void;retry?:()=>void}) {
 const router = useRouter();
 const W = SHELL_WORDS[usePortalLang()];
 const reference = errorReference(error.digest);
 return <BRouteError title={W.errorTitle} sub={W.errorLine}
  spoken={<Spoken reference={reference} />} line={<Advice />} reference={reference ? W.errorReference(reference) : null}
  onRetry={() => { if(refetch)refetch();else{router.refresh();reset();} }} away={{ href: '/app', label: W.goHome }} />;
}
