import {notFound} from 'next/navigation';
import {SignaturePreview} from '@/components/ui-preview/signature-preview';
// The employee app's own style stack (same order as src/app/app/layout.tsx, minus the manager sheets), so the page
// shows the real Signature rules rather than copies. Everything employee-specific is scoped to data-nv-e5.
import '@/app/app/portal-design-system.css';
import '@/app/app/portal-refinement.css';
import '@/app/app/portal-gusto.css';
import '@/app/app/portal-desktop.css';
import '@/app/app/portal-motion.css';
import '@/components/kit/kit.css';
import '@/app/app/portal-premium.css';
import '@/app/app/employee-style.css';
import './preview.css';

export const metadata = {title: 'Signature · NEVORA sample preview', robots: {index: false, follow: false}};
export const dynamic = 'force-dynamic';

/** Living reference for the Signature components, every state on one page. Fictional data; no session or database. */
export default function SignaturePreviewPage() {
  if (process.env.NODE_ENV !== 'development' && process.env.NEVORA_UI_PREVIEW_ENABLED !== '1') notFound();
  return <SignaturePreview/>;
}
