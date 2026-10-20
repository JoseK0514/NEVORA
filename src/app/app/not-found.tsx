import Link from 'next/link';
import {SignatureNotFound} from '@/components/signature/system-state';
export default function NotFound() {
 // The shared state for every role; the employee shell shows the Signature version instead (employee-style.css).
 return <>
  <div className="sg-sys-generic"><section className="portal-route-state"><h1>Page unavailable</h1><p>This destination may have changed or may be unavailable to your account.</p><Link className="button secondary" href="/app">Back to Home</Link></section></div>
  <div className="sg-sys-employee"><SignatureNotFound/></div>
 </>;
}
