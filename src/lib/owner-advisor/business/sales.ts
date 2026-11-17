import type { AdmittedBusinessScope, SalesMetrics, SalesMovementMetrics } from './contracts';
import { admittedRows } from './records';
import { checkpoint } from './parse';
import { minor, moneyTotal } from './money';
export function calculateSales(input: AdmittedBusinessScope, signal?: AbortSignal): SalesMetrics {
  const { rows, excluded } = admittedRows(input, signal);
  const currencies = [...new Set(input.versions.map(v => v.version.input.source.currency))].sort().map(currency => {
    let merchandise=BigInt(0),discounts=BigInt(0),tax=BigInt(0),collected=BigInt(0),fees=BigInt(0),cancellations=0;
    const empty=()=>({count:0,merchandise:BigInt(0),discounts:BigInt(0),tax:BigInt(0),collections:BigInt(0)}),sales=empty(),refunds=empty();
    for (const {record:r,currency:c} of rows) {
      checkpoint(signal);if(c!==currency)continue;
      if(r.kind==='SALE'||r.kind==='REFUND'){
        const sign=BigInt(r.kind==='REFUND'?-1:1),group=r.kind==='SALE'?sales:refunds,m=minor(r.merchandiseMinor),d=minor(r.discountMinor),t=minor(r.taxMinor),paid=minor(r.collectedMinor);
        merchandise+=sign*m;discounts+=sign*d;tax+=sign*t;collected+=sign*paid;group.count++;group.merchandise+=m;group.discounts+=d;group.tax+=t;group.collections+=paid;
      }else if(r.kind==='FEE')fees+=minor(r.feeMinor);else if(r.kind==='CANCELLATION')cancellations++;
    }
    const movement=(v:ReturnType<typeof empty>):SalesMovementMetrics=>({count:v.count,merchandiseMinor:moneyTotal(v.merchandise),discountsMinor:moneyTotal(v.discounts),netMerchandiseMinor:moneyTotal(v.merchandise-v.discounts),taxMinor:moneyTotal(v.tax),collectionsMinor:moneyTotal(v.collections)});
    return {currency,scale:2 as const,merchandiseMinor:moneyTotal(merchandise),discountsMinor:moneyTotal(discounts),netMerchandiseMinor:moneyTotal(merchandise-discounts),taxMinor:moneyTotal(tax),collectionsMinor:moneyTotal(collected),feesMinor:moneyTotal(fees),netReceiptsMinor:moneyTotal(collected-fees),cancellations,sales:movement(sales),refunds:movement(refunds)};
  });
  return {currencies,findings:[],excludedRows:excluded};
}
