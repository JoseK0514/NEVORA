'use client';
import Link from 'next/link';
export default function Error({reset}:{error:Error & {digest?:string};reset:()=>void}) {
 return <section className="portal-route-state" role="alert"><h1>This page could not be loaded</h1><p>Your current information is unavailable. Try loading the page again before taking an action.</p><div className="portal-state-actions"><button type="button" className="button primary" onClick={reset}>Try again</button><Link className="button secondary" href="/app">Back to home</Link></div></section>;
}
