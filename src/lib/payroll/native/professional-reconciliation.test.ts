import {expect,it} from '@rstest/core';
import {calculateNativePayroll} from './calculate';
import {OWNER_PROVISIONAL_POLICY_REFERENCE} from './contracts';
import {input,entry} from './fixtures.test-support';
import {PR_FINAL_PERIODIC_HALF_UP_GUIDANCE} from './pr-income-cent-policy';

function paycheck() {
  const pay = input();
  pay.calculationPolicyReference = OWNER_PROVISIONAL_POLICY_REFERENCE;
  pay.wages[0].wageCentRounding = 'UNVERIFIED';
  pay.tax!.ruleEvidenceReference = PR_FINAL_PERIODIC_HALF_UP_GUIDANCE.id;
  return pay;
}
const date = '2026-10-05T';
const noon = date+'12:00:00-04:00';

it.each([
  {scenario:'midshift raise and 30-minute unpaid meal',gross:'13000',ss:'806',medicare:'189',sinot:'39',net:'11966'},
  {scenario:'overnight shift with daily overtime',gross:'19000',ss:'1178',medicare:'276',sinot:'57',net:'17489'},
  {scenario:'finalized period with no entries',gross:'0',ss:'0',medicare:'0',sinot:'0',net:'0'},
])('reconciles $scenario to independently specified employee, employer and YTD cents', v => {
  const pay = paycheck();
  if (v.scenario.startsWith('midshift')) {
    const base = pay.wages[0];
    pay.wages = [{...base,hourlyRateMinor:'1500',effectiveTo:noon},{...base,id:'raise',effectiveFrom:noon}];
    pay.timecards[0].entries[0].breaks = [{id:'lunch',typeId:'MEAL',startAt:noon,endAt:date+'12:30:00-04:00'}];
  } else if (v.scenario.startsWith('overnight')) {
    pay.timecards[0].entries = [entry('overnight',date+'22:00:00-04:00','2026-10-06T07:00:00-04:00')];
  } else pay.timecards[0].entries = [];

  const r = calculateNativePayroll(pay);
  expect(r.state,JSON.stringify(r)).toBe('ready');
  if (r.state !== 'ready') throw Error('Unexpected blocked synthetic case');
  const amounts = (lines:{code:string;amountMinor:string}[]) => Object.fromEntries(lines.map(line => [line.code,line.amountMinor]));
  expect(r.row.grossMinor).toBe(v.gross);
  expect(r.row.netMinor).toBe(v.net);
  expect(amounts(r.row.employeeDeductions)).toMatchObject({
    PR_INCOME_TAX:'0',SOCIAL_SECURITY:v.ss,MEDICARE:v.medicare,ADDITIONAL_MEDICARE:'0',SINOT:v.sinot,
  });
  expect(amounts(r.row.employerContributions)).toMatchObject({SOCIAL_SECURITY:v.ss,MEDICARE:v.medicare,SINOT:v.sinot});
  expect(r.breakdown.ytdAfter).toMatchObject({grossMinor:v.gross,netMinor:v.net});
  if (!r.row.earnings) throw Error('Missing earnings breakdown');
  expect(r.row.earnings.reduce((sum,line) => sum + BigInt(line.amountMinor),BigInt(0)).toString()).toBe(v.gross);
});

it('withholds amounts when the card is still under review or the pay year is unsupported', () => {
  const pay = paycheck();
  pay.timecards[0].state = 'APPROVED';
  expect(calculateNativePayroll(pay)).toMatchObject({state:'blocked',issues:[{code:'FINALIZED_TIME_REQUIRED'}]});
  pay.timecards[0].state = 'FINALIZED';
  pay.payday = '2027-01-08';
  expect(calculateNativePayroll(pay)).toMatchObject({state:'blocked',issues:[{code:'OWNER_CALCULATION_POLICY_REQUIRED'}]});
});
