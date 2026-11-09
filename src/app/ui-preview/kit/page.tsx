import {notFound} from 'next/navigation';
import {KitPreview} from '@/components/ui-preview/kit-preview';
import '@/components/kit/kit.css';
import './preview.css';

export const metadata = {title: 'Kit · NEVORA sample preview', robots: {index: false, follow: false}};
export const dynamic = 'force-dynamic';

export default function KitPreviewPage() {
  if (process.env.NODE_ENV !== 'development' && process.env.NEVORA_UI_PREVIEW_ENABLED !== '1') notFound();
  return <KitPreview/>;
}
