import {notFound} from 'next/navigation';
/** Server-only probe of the portal boundary; renders no UI of its own. */
export default async function InspectPortal():Promise<never> {
  if(process.env.NODE_ENV!=='production')await (await import('../../../lib/dev/inspection.server')).forceInspectionError('portal');
  notFound();
}
