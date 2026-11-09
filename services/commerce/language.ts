import {CommerceError} from './model';
export type CommerceLanguage='en'|'es';
export function commerceLanguage(value:unknown):CommerceLanguage {
 if(value===undefined)return 'en';
 if(value==='en'||value==='es')return value;
 throw new CommerceError('invalid_language');
}
export function billingPage(lang:CommerceLanguage,page:'billing'|'return'){
 return lang==='es'?(page==='return'?'/pages/es-pago':'/pages/es-facturacion'):(page==='return'?'/pages/nevora-billing-return':'/pages/nevora-billing');
}
