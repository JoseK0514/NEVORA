import type {CommerceStatus} from '@/lib/commerce/status';
import {SUPPORT_EMAIL} from '@/lib/legal/policies';

/* Words the in-app billing page and the central billing page share (review Nov 14, 2026, JR-9 and JR-10): one sentence
 * per reason access is paused or at risk, each naming what to do next. English and Puerto Rico Spanish ("tú"). */
export type RecoveryLang='en'|'es';
export const supportEmail=SUPPORT_EMAIL;
const words={
 en:{
  trial_ended:'Your free trial ended. Choose a plan to keep using NEVORA.',
  payment_failed:'We couldn’t charge your card. Update your payment method.',
  subscription_canceled:'Your subscription ended. Subscribe again to continue.',
  payment_required:'A payment is needed to keep using NEVORA. Choose a plan to continue.',
  setup_required:'Workplace setup is not finished. Contact us and we will help you finish it.',
  setup_pending:'Your workplace is still being set up. Check again in a few minutes.',
  limit:(active:number,limit:number)=>`Your team has ${active} active people and your plan covers ${limit}. Upgrade, or deactivate people you no longer need.`,
  quote:'Teams over 30 need a custom plan. Contact us for a quote.',
  unreachable:'We can’t check billing right now. Try again in a few minutes.',
  contact:(email:string)=>`Email ${email}`,
 },
 es:{
  trial_ended:'Tu prueba gratis terminó. Elige un plan para seguir usando NEVORA.',
  payment_failed:'No pudimos cobrar a tu tarjeta. Actualiza tu método de pago.',
  subscription_canceled:'Tu suscripción terminó. Suscríbete de nuevo para continuar.',
  payment_required:'Se necesita un pago para seguir usando NEVORA. Elige un plan para continuar.',
  setup_required:'La configuración del negocio no está completa. Contáctanos y te ayudamos a terminarla.',
  setup_pending:'Tu negocio todavía se está configurando. Vuelve a consultar en unos minutos.',
  limit:(active:number,limit:number)=>`Tu equipo tiene ${active} personas activas y tu plan cubre ${limit}. Mejora tu plan o desactiva a las personas que ya no necesitas.`,
  quote:'Los equipos de más de 30 personas necesitan un plan a la medida. Contáctanos para una cotización.',
  unreachable:'No podemos consultar la facturación en este momento. Inténtalo de nuevo en unos minutos.',
  contact:(email:string)=>`Escribir a ${email}`,
 },
};
export const quoteNotice=(lang:RecoveryLang):string=>words[lang].quote;
export const unreachableNotice=(lang:RecoveryLang):string=>words[lang].unreachable;
export const contactLabel=(lang:RecoveryLang):string=>words[lang].contact(SUPPORT_EMAIL);
/** `tone` is red while access is paused and amber while it still works; `contact` asks for the support address as the
 * action, because nothing the Owner can open in billing resolves that reason. */
export type AccessNotice={text:string;tone:'red'|'amber';contact:boolean};
export function accessNotice(lang:RecoveryLang,status:Pick<CommerceStatus,'state'|'reason'|'activeEmployees'|'employeeLimit'>):AccessNotice|null{
 if(status.reason===null)return null;
 const t=words[lang],tone=status.state==='restricted'?'red':'amber';
 if(status.reason==='employee_limit_exceeded')return status.activeEmployees>30?{text:t.quote,tone,contact:true}:{text:t.limit(status.activeEmployees,status.employeeLimit),tone,contact:false};
 return {text:t[status.reason],tone,contact:status.reason==='setup_required'};
}
