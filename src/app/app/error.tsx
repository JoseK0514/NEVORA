'use client';
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowsClockwise";
import Link from 'next/link';
import { Card, CardBody, KitStack, PageBand } from '@/components/kit/kit';
import { focusAfterRetry } from '@/components/kit/focus-after-retry';

/** The portal's own error state: one kit page for every role (AL-53, Phase 3). */
export default function Error({reset}:{error:Error & {digest?:string};reset:()=>void}) {
 return <>
  <div className="nv-page premium-error" data-nv-page="">
   <PageBand title="This page could not be loaded" summary="Your current information is unavailable." />
   {/* IS-49: one live region with the whole message; the buttons sit outside it. */}
   <p className="nv-sr" role="alert">This page could not be loaded. Your current information is unavailable. Try loading the page again before taking an action.</p>
   <KitStack>
    <Card>
     <CardBody>
      <div className="premium-error__body">
       <p className="premium-error__text">Try loading the page again before taking an action.</p>
       <div className="premium-error__actions">
        <button type="button" className="nv-btn" data-kind="primary" onClick={() => { reset(); focusAfterRetry('[data-nv-page]:not(.premium-error) [data-nv-band] h1', '.premium-error .nv-btn[data-kind="primary"]'); }}><ArrowsClockwiseIcon size={18} aria-hidden="true" />Try again</button>
        <Link className="nv-btn" data-kind="secondary" href="/app">Back to Home</Link>
       </div>
      </div>
     </CardBody>
    </Card>
   </KitStack>
  </div>
 </>;
}
