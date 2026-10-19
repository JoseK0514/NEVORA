import Link from 'next/link';
export default function NotFound() {
 return <section className="portal-route-state"><h1>Page unavailable</h1><p>This destination may have changed or may be unavailable to your account.</p><Link className="button secondary" href="/app">Back to Home</Link></section>;
}
