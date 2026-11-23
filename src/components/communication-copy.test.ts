// G98 (Phase 2): Updates' compose form and update page have a Puerto Rico Spanish entry for every English one.
import {expect,it} from '@rstest/core';
import {COMMUNICATION_COPY,esDisplayDate,esInstant} from './communication-copy';

const plain=(s:string)=>s.replace(/\u00a0/g,' ');
const keys=(value:unknown,prefix=''):string[]=>value&&typeof value==='object'?Object.entries(value).flatMap(([k,v])=>[prefix+k,...keys(v,prefix+k+'.')]).sort():[];
it('has the same keys, deeply, in English and Spanish',()=>{
 expect(keys(COMMUNICATION_COPY.es)).toEqual(keys(COMMUNICATION_COPY.en));
 for(const key of Object.keys(COMMUNICATION_COPY.en) as (keyof typeof COMMUNICATION_COPY.en)[])expect(typeof COMMUNICATION_COPY.es[key]).toBe(typeof COMMUNICATION_COPY.en[key]);
});
it('pluralises and writes dates and times the voice guide way',()=>{
 const {en,es}=COMMUNICATION_COPY;
 expect(en.goesTo(1)).toBe('Goes to 1 person');expect(es.goesTo(1)).toBe('Para 1 persona');expect(es.goesTo(3)).toBe('Para 3 personas');
 expect(es.countOf(0,10)).toBe('0 de 10');expect(es.confirmed).toBe('Confirmado');expect(es.confirmIRead).toBe('Confirmar que lo leí');
 expect(esDisplayDate('2026-10-14')).toBe('mié, 14 oct');
 expect(plain(esInstant('2026-10-08T12:00:00Z','America/Puerto_Rico',true))).toBe('8 oct 2026, 8:00 a. m.');
 expect(plain(esInstant('2026-10-08T20:05:00Z','America/Puerto_Rico',false))).toBe('8 oct, 4:05 p. m.');
 expect(plain(es.timeRange('06:00','14:00'))).toBe('6:00 a. m. – 2:00 p. m.');expect(es.zone('America/Puerto_Rico')).toBe('hora de Puerto Rico');
 expect(plain(en.stamp('2026-10-08T12:00:00Z','America/Puerto_Rico'))).toContain('Oct 8, 2026');
 for(const text of Object.values(es).filter((v):v is string=>typeof v==='string'))expect(text).not.toMatch(/!|¡|Owner|Update\b/);
});
