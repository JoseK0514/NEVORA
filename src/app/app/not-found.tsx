import Link from 'next/link';
import {SignatureNotFound} from '@/components/signature/system-state';
import {Card,CardBody,KitStack,PageBand} from '@/components/kit/kit';
export default function NotFound() {
 return <>
  <div className="sg-sys-generic nv-page premium-error" data-nv-page="">
   <PageBand title="There’s no page here" summary="The link may be old, or the page may have moved."/>
   <KitStack><Card><CardBody><div className="premium-error__body">
    <p className="premium-error__text">Check the address, or head back to Home.</p>
    <div className="premium-error__actions"><Link className="nv-btn" data-kind="primary" href="/app">Back to Home</Link></div>
   </div></CardBody></Card></KitStack>
  </div>
  <div className="sg-sys-employee"><SignatureNotFound/></div>
 </>;
}
