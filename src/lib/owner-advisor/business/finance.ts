import { businessDate } from '@/lib/business-time';
import type { AdmittedBusinessScope, BusinessFinanceQuery, BusinessFinding, BusinessRecord, FinanceMetrics, FinanceScenarioInputs } from './contracts';
import { admittedRows } from './records';
import { checkpoint } from './parse';
import { minor, moneyTotal } from './money';
type Balance = Extract<BusinessRecord, { kind: 'BALANCE' }>;
export function calculateFinance(input: AdmittedBusinessScope, scenario: BusinessFinanceQuery['scenario'], signal?: AbortSignal): FinanceMetrics {
  const { rows, excluded } = admittedRows(input, signal); const findings: BusinessFinding[] = []; let excludedRows = excluded;
  const exclusions = new Map<string, BusinessFinding>();
  const exclude = (code: string, accountRef: string) => { const key = JSON.stringify([code, accountRef]); const old = exclusions.get(key); if (old) old.count!++; else exclusions.set(key, { code, accountRef, recordIds: [], differenceMinor: null, count: 1 }); };
  const currencies = [...new Set(input.versions.map(v => v.version.input.source.currency))].sort().map(currency => {
    const selected = rows.filter(r => r.currency === currency).map(r => r.record);
    const accounts = [...new Set(input.versions.filter(v => v.version.input.source.currency === currency).flatMap(v => v.accountRefs))];
    const shared = input.query.locationScope.kind === 'SELECTED' && accounts.some(a => input.accounts.find(x => x.accountRef === a)?.ownership.kind !== 'EXCLUSIVE_LOCATION');
    let inflow=BigInt(0),outflow=BigInt(0),postedCount=0,postedInflowCount=0,postedOutflowCount=0;
    let opening = BigInt(0), posted = BigInt(0), reported = BigInt(0), obligations = BigInt(0), receivables = BigInt(0);
    let hasOpening = accounts.length > 0 && !shared, hasClosing = accounts.length > 0 && !shared, reconciled = accounts.length > 0 && !shared;
    const closingRecords: Balance[] = [];
    for (const accountRef of accounts) {
      checkpoint(signal);
      const balances = selected.filter((r): r is Balance => r.kind === 'BALANCE' && r.accountRef === accountRef);
      const opens = balances.filter(r => r.at === input.query.window.fromAt), closes = balances.filter(r => r.at === input.query.window.toAt);
      const validOpen = opens.length > 0 && new Set(opens.map(r => r.amountMinor)).size === 1;
      const validClose = closes.length > 0 && new Set(closes.map(r => r.amountMinor)).size === 1;
      const start = validOpen ? minor(opens[0].amountMinor) : null, end = validClose ? minor(closes[0].amountMinor) : null;
      hasOpening &&= validOpen; hasClosing &&= validClose; if (validClose) closingRecords.push(...closes);
      let delta = BigInt(0);
      for (const r of selected) {
        checkpoint(signal); if (!('accountRef' in r) || r.accountRef !== accountRef) continue;
        if (r.kind === 'CASH') { if (r.state === 'POSTED' && r.postedAt && r.postedAt >= input.query.window.fromAt && r.postedAt < input.query.window.toAt) { const amount=minor(r.deltaMinor); delta += amount;postedCount++;if(amount>BigInt(0)){inflow+=amount;postedInflowCount++;}else if(amount<BigInt(0)){outflow-=amount;postedOutflowCount++;} } else { excludedRows++; exclude(r.state === 'PENDING' ? 'PENDING_CASH_EXCLUDED' : r.state === 'REVERSED' ? 'VOID_CASH_EXCLUDED' : 'OUTSIDE_POSTED_WINDOW', accountRef); } }
        else if (r.kind === 'OBLIGATION' && r.state === 'OPEN') { obligations += minor(r.amountMinor); if (r.confirmation === 'UNCONFIRMED') exclude('UNCONFIRMED_OBLIGATION', accountRef); }
        else if (r.kind === 'RECEIVABLE' && r.state === 'OPEN') { receivables += minor(r.amountMinor); if (r.confirmation === 'UNCONFIRMED') exclude('UNCONFIRMED_RECEIVABLE', accountRef); }
      }
      const constituent=constituentReconciliation(input,currency,accountRef,signal);
      if(constituent.length){reconciled=false;findings.push(...constituent);}
      opening += start ?? BigInt(0); reported += end ?? BigInt(0); posted += delta;
      if (start === null || end === null || start + delta !== end) reconciled = false;
      if (start !== null && end !== null && start + delta !== end) findings.push({ code: 'RECONCILIATION_DIFFERENCE', accountRef, recordIds: closes.map(r => r.recordId).sort(), differenceMinor: moneyTotal(end - start - delta) });
      if (!validOpen || !validClose) findings.push({ code: 'MISSING_OR_CONFLICTING_ANCHOR', accountRef, recordIds: [], differenceMinor: null });
    }
    if (shared) findings.push({ code: 'SHARED_ACCOUNT_NOT_ALLOCATABLE', accountRef: null, recordIds: [], differenceMinor: null });
    let scenarioMinor: string | null = null, scenarioAccountRef: string | null = null, scenarioAnchorAt: string | null = null;
    if (scenario && reconciled) {
      const anchors = closingRecords.filter(r => r.recordId === scenario.anchorRecordId), anchor = anchors.length === 1 ? anchors[0] : null;
      let valid = !!anchor && rows.filter(r => r.record.recordId === scenario.anchorRecordId && r.record.kind === 'BALANCE').length === 1 && scenario.throughDate >= businessDate(new Date(input.query.window.toAt), rows.find(row => row.record === anchor)?.timeZone ?? input.timeZone), effect = BigInt(0);
      const allIds = [...scenario.obligationRecordIds, ...scenario.receivableRecordIds]; if (new Set(allIds).size !== allIds.length) valid = false;
      for (const [ids, kind, sign] of [[scenario.obligationRecordIds, 'OBLIGATION', -1], [scenario.receivableRecordIds, 'RECEIVABLE', 1]] as const) for (const id of ids) {
        checkpoint(signal); const matches = selected.filter(r => r.recordId === id && r.kind === kind);
        const r = matches.length === 1 ? matches[0] : null;
        if (rows.filter(r => r.record.recordId === id && r.record.kind === kind).length !== 1 || !r || (r.kind !== 'OBLIGATION' && r.kind !== 'RECEIVABLE') || r.state !== 'OPEN' || r.confirmation === 'UNCONFIRMED' || r.dueDate > scenario.throughDate || r.accountRef !== anchor?.accountRef) valid = false;
        else effect += BigInt(sign) * minor(r.amountMinor);
      }
      if (valid && anchor) { scenarioMinor = moneyTotal(minor(anchor.amountMinor) + effect); scenarioAccountRef = anchor.accountRef; scenarioAnchorAt = anchor.at; }
    }
    return { currency, scale: 2 as const, openingMinor: hasOpening ? moneyTotal(opening) : null, postedDeltaMinor: moneyTotal(posted), postedInflowMinor:moneyTotal(inflow), postedOutflowMinor:moneyTotal(outflow),postedCount,postedInflowCount,postedOutflowCount, calculatedClosingMinor: hasOpening ? moneyTotal(opening + posted) : null,
      reportedClosingMinor: hasClosing ? moneyTotal(reported) : null, differenceMinor: hasOpening && hasClosing ? moneyTotal(reported - opening - posted) : null,
      reconciled, obligationsMinor: moneyTotal(obligations), receivablesMinor: moneyTotal(receivables), scenarioMinor, scenarioConditional: scenarioMinor !== null, scenarioAccountRef, scenarioAnchorAt };
  });
  let scenarioInputs: FinanceScenarioInputs = { state: 'ready', reason: null, anchors: [], obligations: [], receivables: [] };
  for (const row of rows) {
    checkpoint(signal); const r = row.record;
    if (!('accountRef' in r)) continue;
    const identity = { recordId: r.recordId, accountRef: r.accountRef, currency: row.currency, namespace: row.namespace, sourceId: row.sourceId, versionId: row.versionId };
    if (r.kind === 'BALANCE' && r.at === input.query.window.toAt && currencies.find(c => c.currency === row.currency)?.reconciled && !input.incompleteReason) scenarioInputs.anchors.push({ ...identity, at: r.at, amountMinor: r.amountMinor });
    if ((r.kind === 'OBLIGATION' || r.kind === 'RECEIVABLE') && r.state === 'OPEN' && r.confirmation !== 'UNCONFIRMED') scenarioInputs[r.kind === 'OBLIGATION' ? 'obligations' : 'receivables'].push({ ...identity, dueDate: r.dueDate, amountMinor: r.amountMinor, confirmation: r.confirmation });
  }
  const reason = scenarioInputs.anchors.length + scenarioInputs.obligations.length + scenarioInputs.receivables.length > 100 ? 'INPUT_LIMIT' : !scenarioInputs.anchors.length ? 'NO_RECONCILED_ANCHOR' : null;
  if (reason) scenarioInputs = { state: 'unavailable', reason, anchors: [], obligations: [], receivables: [] };
  return { currencies, findings: [...findings, ...exclusions.values()], excludedRows, scenarioInputs };
}

/** Reconcile every admitted cash window separately. Net-zero discrepancies across
 * windows never establish cash clearance; distinct boundary observations must agree. */
function constituentReconciliation(input:AdmittedBusinessScope,currency:string,accountRef:string,signal?:AbortSignal):BusinessFinding[]{
 const entries=input.versions.filter(e=>e.version.input.source.currency===currency&&e.metrics.includes('CASH')&&e.accountRefs.includes(accountRef));
 const findings:BusinessFinding[]=[],boundaries=new Map<string,Set<string>>();
 for(const entry of entries){
  checkpoint(signal);const selected=admittedRows({...input,query:{...input.query,window:entry.window},versions:[{...entry,accountRefs:[accountRef]}]},signal).rows.map(r=>r.record);
  const balances=selected.filter((r):r is Balance=>r.kind==='BALANCE'&&r.accountRef===accountRef);
  for(const r of balances){const values=boundaries.get(r.at)??new Set<string>();values.add(r.amountMinor);boundaries.set(r.at,values);}
  const points=[...new Set([entry.window.fromAt,...balances.map(r=>r.at),entry.window.toAt])].sort();
  for(let i=1;i<points.length;i++){
   checkpoint(signal);const window={fromAt:points[i-1],toAt:points[i]},opens=balances.filter(r=>r.at===window.fromAt),closes=balances.filter(r=>r.at===window.toAt);
   if(window.fromAt===input.query.window.fromAt&&window.toAt===input.query.window.toAt)continue;
   if(!opens.length||!closes.length||new Set(opens.map(r=>r.amountMinor)).size!==1||new Set(closes.map(r=>r.amountMinor)).size!==1){findings.push({code:'MISSING_OR_CONFLICTING_ANCHOR',accountRef,recordIds:[],differenceMinor:null,window});continue;}
   let delta=BigInt(0);for(const r of selected)if(r.kind==='CASH'&&r.accountRef===accountRef&&r.state==='POSTED'&&r.postedAt&&r.postedAt>=window.fromAt&&r.postedAt<window.toAt)delta+=minor(r.deltaMinor);
   const difference=minor(closes[0].amountMinor)-minor(opens[0].amountMinor)-delta;if(difference!==BigInt(0))findings.push({code:'RECONCILIATION_DIFFERENCE',accountRef,recordIds:closes.map(r=>r.recordId).sort(),differenceMinor:moneyTotal(difference),window});
  }
 }
 for(const [at,values]of boundaries)if(values.size>1)findings.push({code:'BOUNDARY_ANCHOR_CONFLICT',accountRef,recordIds:[],differenceMinor:null,boundaryAt:at});
 return findings;
}
