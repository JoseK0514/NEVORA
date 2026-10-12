import {expect,it} from 'vitest';
import {policyEffectiveInstant as convert} from './business-time';

it('preserves an unchanged policy effective instant including seconds',()=>{
 expect(convert('2030-01-01T08:00','2030-01-01T12:00:37.123Z','America/Puerto_Rico')).toBe('2030-01-01T12:00:37.123Z');
});
it('converts edited policy dates in the workspace timezone and rejects ambiguous local time',()=>{
 expect(convert('2030-01-02T08:00',undefined,'America/Puerto_Rico')).toBe('2030-01-02T12:00:00.000Z');
 expect(()=>convert('2030-11-03T01:30',undefined,'America/New_York')).toThrow();
});
