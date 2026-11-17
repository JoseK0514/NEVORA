import type { BusinessMetricReference, BusinessModelEvidence } from './model-contracts';
import type { TaskFocus } from '../notebook';
import { parseBusinessQuery } from './parse';
import { localDateTimeToInstant } from '@/lib/business-time';
import { addDays } from '@/lib/date-utils';
export const businessMetricNames=['business_cash_inflow','business_cash_outflow','business_sales_collections','business_refund_collections','business_cash_balance','business_reported_closing','business_reconciliation_difference','business_obligations_reported','business_receivables_reported','business_cash_scenario','business_net_merchandise','business_collections','business_fees','business_net_receipts','business_tax_components'] as const;
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export function parseBusinessMetricReference(value:unknown):BusinessMetricReference|null{
 if(!object(value)||Object.keys(value).sort().join(',')!=='currency,queryHash,scale,sourceDigest,unit'||typeof value.queryHash!=='string'||!/^[a-f0-9]{64}$/.test(value.queryHash)||typeof value.sourceDigest!=='string'||!/^[a-f0-9]{64}$/.test(value.sourceDigest)||!['USD','EUR'].includes(String(value.currency))||value.unit!=='MINOR'||value.scale!==2)return null;return value as BusinessMetricReference;
}
export function formatBusinessMinor(value:string,currency:string):string{
 if(typeof value!=='string'||!/^(0|-?[1-9][0-9]{0,29})$/.test(value)||!['USD','EUR'].includes(currency))throw Error('Invalid business metric');
 const negative=value.startsWith('-'),digits=(negative?value.slice(1):value).padStart(3,'0'),whole=digits.slice(0,-2).replace(/\B(?=(\d{3})+(?!\d))/g,',');return `${currency} ${negative?'-':''}${whole}.${digits.slice(-2)}`;
}
const uid='[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}';
const citation=new RegExp(`^/api/owner/advisor/business/sources/${uid}/versions/${uid}$`);
export function isBusinessCitationHref(value:unknown):value is string{return typeof value==='string'&&citation.test(value);}
export function businessModelMatches(value:unknown,focus?:TaskFocus):BusinessModelEvidence|null{
 try{
  if(!object(value)||!object(value.call)||!object(value.result)||!['business_finance','business_sales'].includes(String(value.call.name))||!Array.isArray(value.result.businessEvidence)||value.result.businessEvidence.length!==1)return null;
  const model=value.result.businessEvidence[0] as BusinessModelEvidence;
  if(!model||!model.expiresAt||Date.parse(model.expiresAt)<=Date.now()||!Number.isFinite(Date.parse(model.expiresAt))||model.domain!==(value.call.name==='business_finance'?'FINANCE':'SALES')||model.citations.some(c=>!isBusinessCitationHref(c.href)))return null;
  const data={window:model.window,selection:model.selection,locationScope:model.locationScope,temporalUse:model.temporalUse};
  if(value.call.name==='business_finance' ? JSON.stringify(parseBusinessQuery(value.call.args,true))!==JSON.stringify(parseBusinessQuery({...data,scenario:model.scenario},true)) : JSON.stringify(parseBusinessQuery(value.call.args))!==JSON.stringify(parseBusinessQuery(data)))return null;
  if(focus&&focus.kind!=='general'){
   const start=focus.kind==='coverage'?focus.date:focus.startDate,end=focus.kind==='coverage'?focus.date:focus.endDate;
   const from=localDateTimeToInstant(`${start}T00:00`,model.timeZone),to=localDateTimeToInstant(`${addDays(end,1)}T00:00`,model.timeZone);
   if(focus.kind==='coverage' ? model.window.fromAt!==from||model.window.toAt!==to : model.window.fromAt<from||model.window.toAt>to)return null;
  }
  return model;
 }catch{return null;}
}
export function renderBusinessMetric(metric:string,reference:BusinessMetricReference,e:unknown,language:'en'|'es',focus?:TaskFocus):string|null{
 try{
  const ref=parseBusinessMetricReference(reference),model=businessModelMatches(e,focus);if(!ref||!model||model.state!=='ready'||model.queryHash!==ref.queryHash||model.sourceDigest!==ref.sourceDigest)return null;
  const es=language==='es';let amount:string|null|undefined,label:string;
  const finance=model.finance?.currencies.find(c=>c.currency===ref.currency),sales=model.sales?.currencies.find(c=>c.currency===ref.currency);
  if(metric==='business_cash_inflow'){amount=finance?.postedInflowMinor;label=es?'Entradas de efectivo registradas':'Recorded posted cash inflows';}
  else if(metric==='business_cash_outflow'){amount=finance?.postedOutflowMinor;label=es?'Salidas de efectivo registradas':'Recorded posted cash outflows';}
  else if(metric==='business_sales_collections'){amount=sales?.sales.collectionsMinor;label=es?'Cobros de ventas antes de reembolsos':'Sale collections before refunds';}
  else if(metric==='business_refund_collections'){amount=sales?.refunds.collectionsMinor;label=es?'Reembolsos registrados':'Recorded refund collections';}
  else if(metric==='business_cash_balance'){if(!finance?.reconciled||model.temporalUse!=='CURRENT'||!model.completeScope||model.sourceSubtotal)return null;amount=finance.calculatedClosingMinor;label=es?'Saldo conciliado reportado':'Reported reconciled cash';}
  else if(metric==='business_reported_closing'){amount=finance?.reportedClosingMinor;label=es?'Cierre reportado':'Reported closing balance';}
  else if(metric==='business_reconciliation_difference'){amount=finance?.differenceMinor;label=es?'Diferencia de conciliación':'Reconciliation difference';}
  else if(metric==='business_obligations_reported'){amount=finance?.obligationsMinor;label=es?'Obligaciones abiertas reportadas (incluye las no confirmadas)':'Reported open obligations (includes unconfirmed records)';}
  else if(metric==='business_receivables_reported'){amount=finance?.receivablesMinor;label=es?'Cobros esperados reportados; no son efectivo':'Reported receivables; not cash';}
  else if(metric==='business_cash_scenario'){if(!finance?.reconciled||!finance.scenarioConditional||!finance.scenarioAccountRef||!finance.scenarioAnchorAt||!model.scenario)return null;amount=finance.scenarioMinor;label=es?`Escenario condicional de cuenta ${finance.scenarioAccountRef} al ${model.scenario.throughDate}; ancla ${finance.scenarioAnchorAt}`:`Conditional account scenario ${finance.scenarioAccountRef} through ${model.scenario.throughDate}; anchor ${finance.scenarioAnchorAt}`;}
  else if(metric==='business_net_merchandise'){amount=sales?.netMerchandiseMinor;label=es?'Mercancía neta registrada':'Recorded net merchandise';}
  else if(metric==='business_collections'){amount=sales?.collectionsMinor;label=es?'Cobros registrados':'Recorded collections';}
  else if(metric==='business_fees'){amount=sales?.feesMinor;label=es?'Cargos registrados':'Recorded fees';}
  else if(metric==='business_net_receipts'){amount=sales?.netReceiptsMinor;label=es?'Ingresos netos registrados; no es ganancia':'Recorded net receipts; not profit';}
  else if(metric==='business_tax_components'){amount=sales?.taxMinor;label=es?'Componentes contributivos registrados; no es contribución a pagar':'Recorded tax components; not tax due';}
  else return null;
  if(amount===null||amount===undefined)return null;
  const perimeter=model.sourceSubtotal?(es?'subtotal de fuente':'source subtotal'):(model.domain==='FINANCE'?(es?'perímetro de cuentas declarado por el Owner':'Owner-declared account perimeter'):(es?'alcance de ubicaciones seleccionado':'selected location perimeter'));
  const mode=model.temporalUse==='HISTORICAL'?(es?'histórico':'historical'):(es?'según política de vigencia':'within declared freshness policy');
  return `${label}: ${formatBusinessMinor(amount,ref.currency)} [${model.window.fromAt}–${model.window.toAt}; ${model.timeZone}; ${perimeter}; ${mode}; ${es?'observado':'observed'} ${model.observedAt}]`;
 }catch{return null;}
}
export const businessReferenceProperties={queryHash:{type:'string',pattern:'^[a-f0-9]{64}$'},sourceDigest:{type:'string',pattern:'^[a-f0-9]{64}$'},currency:{type:'string',enum:['USD','EUR']},unit:{type:'string',enum:['MINOR']},scale:{type:'integer',enum:[2]}};
