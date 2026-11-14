import type {Metadata} from 'next';
import {readAuthLang} from '@/lib/auth-lang.server';
import {centralBillingApiOrigin} from '@/lib/commerce/central-billing-config';
import type {BillingLanguage} from '@/lib/commerce/central-billing';
import {CentralBilling} from './central';
export const centralBillingMetadata:Metadata={title:'NEVORA billing',robots:{index:false,follow:false},referrer:'no-referrer'};
export async function CentralBillingPage({lang}:{lang?:BillingLanguage}){
 return <CentralBilling apiOrigin={centralBillingApiOrigin(process.env)} initialLanguage={lang??await readAuthLang()}/>;
}
