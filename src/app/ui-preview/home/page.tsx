import {notFound} from 'next/navigation';
import {HomePreview} from '@/components/ui-preview/home-preview';
import '@/app/app/portal-design-system.css';
import '@/app/app/portal-refinement.css';
import '@/app/app/portal-gusto.css';
import '@/app/app/portal-motion.css';
import './preview.css';

export const metadata = {title: 'Home · NEVORA sample preview', robots: {index: false, follow: false}};
export const dynamic = 'force-dynamic';

/** Separate from /app: no session, database, login shortcut or live data fallback. */
export default function HomePreviewPage() {
  if (process.env.NODE_ENV !== 'development' && process.env.NEVORA_UI_PREVIEW_ENABLED !== '1') notFound();
  return <HomePreview/>;
}
