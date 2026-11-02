import {logout} from '@/app/login/actions';
import {Button, Card, CardBody, PageBand} from '@/components/kit/kit';

/** Native release qualification only; account permissions remain unchanged. */
export function UnsupportedNativeRole() {
  return <main className="nv-page">
    <PageBand title="Use NEVORA in your web browser" />
    <div className="nv-content"><Card><CardBody>
      <p>This version of the NEVORA app supports Employee and Owner accounts.</p>
      <p>You can continue using your account in your web browser.</p>
      <form action={logout}><Button type="submit">Sign out</Button></form>
    </CardBody></Card></div>
  </main>;
}
