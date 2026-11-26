import {CentralBillingPage, centralBillingMetadata, centralBillingMetadataEs} from '@/components/commerce-recovery/central-page';
import {copy} from '@/components/commerce-recovery/central-page-copy';
import {readAuthLang} from '@/lib/auth-lang.server';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const lang = await readAuthLang();
  const metadata = lang === 'es' ? centralBillingMetadataEs : centralBillingMetadata;
  return {...metadata, description: copy[lang].description};
}

export default function Page() {
  return <CentralBillingPage publicPlans/>;
}
