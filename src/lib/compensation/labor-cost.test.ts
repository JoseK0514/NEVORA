import {expect,it} from '@rstest/core';
import {estimateShifts,rateIntervals,parseCostRequest} from './labor-cost';

const shift = {employeeId:'a',date:'2026-10-05',startTime:'22:00',endTime:'02:00'};
const wage = {id:'w1',effectiveFrom:'2026-01-01T00:00:00Z',effectiveTo:null,locationIds:['one'],hourlyRateMinor:'1275.5'};
const cutoff = '2026-10-06T00:00:00-04:00';
it('prices an overnight shift on both sides of an effective instant using exact cents', () => {
  const rates = rateIntervals([{...wage,effectiveTo:cutoff},{...wage,id:'w2',effectiveFrom:cutoff,hourlyRateMinor:'1550'},
    {...wage,locationIds:['two'],hourlyRateMinor:'5000'}],'one');
  expect(estimateShifts([shift],new Map([['a',rates]]),'America/Puerto_Rico')).toMatchObject({totalMinor:'5651',missingRateShifts:0});
});
it('distinguishes unpriced time from a recorded zero and rounds only the covered subtotal', () => {
  const rate = rateIntervals([{...wage,effectiveFrom:cutoff,hourlyRateMinor:'0'}],'one');
  expect(estimateShifts([shift],new Map([['a',rate]]),'America/Puerto_Rico')).toMatchObject({totalMinor:null,subtotalMinor:'0',
    missingRateNanoseconds:'7200000000000',coveredNanoseconds:'7200000000000',missingRateShifts:1});
  const all = rateIntervals([{...wage,hourlyRateMinor:'0'}],'one');
  expect(estimateShifts([shift],new Map([['a',all]]),'America/Puerto_Rico').totalMinor).toBe('0');
  const half = {...shift,startTime:'08:00',endTime:'08:30'};
  expect(estimateShifts([half,half],new Map([['a',rateIntervals([{...wage,hourlyRateMinor:'1'}],'one')]]),'UTC').totalMinor).toBe('1');
});
it('uses actual DST duration and flags an ambiguous endpoint', () => {
  const rates = new Map([['a',rateIntervals([{...wage,hourlyRateMinor:'1000'}],'one')]]);
  const fallback = {...shift,date:'2026-11-01',startTime:'00:00',endTime:'03:00'};
  expect(estimateShifts([fallback],rates,'America/New_York').totalMinor).toBe('4000');
  expect(estimateShifts([{...fallback,endTime:'01:30'}],rates,'America/New_York')).toMatchObject({unresolvedTimeShifts:1,totalMinor:null});
});
it('rejects client rate overrides, out-of-week and malformed changes', () => {
  const req = {weekStart:'2026-10-05',locationId:'one'};
  for (const change of [{kind:'add',shift:{...shift,hourlyRateMinor:'1'}},{kind:'add',shift:{...shift,date:'2026-10-12'}},
    {kind:'replace',shiftId:'s',shift:{...shift,startTime:'25:00'}},{kind:'remove',shiftId:'x',extra:true}]) {
    expect(() => parseCostRequest({...req,changes:[change]})).toThrow('INVALID_INPUT');
  }
});
