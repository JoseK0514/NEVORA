import type {Metadata} from 'next';
import {QuietLegal} from '@/components/brand-legal';
import {readAuthLang} from '@/lib/auth-lang.server';
import {centralBillingApiOrigin} from '@/lib/commerce/central-billing-config';
import type {BillingLanguage} from '@/lib/commerce/central-billing';
import {CentralBilling} from './central';
import {copy} from './central-page-copy';
export const centralBillingMetadata:Metadata={title:copy.en.title,robots:{index:false,follow:false},referrer:'no-referrer'};
export const centralBillingMetadataEs:Metadata={...centralBillingMetadata,title:copy.es.title};
/** `returning` marks the two pages Stripe sends the Owner back to after Checkout (JR-19). The footer line is rendered
 * here, on the server, in both languages: the page changes language without a reload. */
export async function CentralBillingPage({lang,returning=false,publicPlans=false}:{lang?:BillingLanguage;returning?:boolean;publicPlans?:boolean}){
 return <CentralBilling apiOrigin={centralBillingApiOrigin(process.env)} initialLanguage={lang??await readAuthLang()} returning={returning} publicPlans={publicPlans} legal={{en:<QuietLegal lang="en"/>,es:<QuietLegal lang="es"/>}}/>;
}
