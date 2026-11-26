// G98 (Phase 2): Pick up and swap's words have a Puerto Rico Spanish entry for every English one.
import {expect,it} from '@rstest/core';
import {EXCHANGE_COPY,exchangeDay,exchangeTime} from './exchange-copy';

const plain=(s:string)=>s.replace(/\u00a0/g,' ');
const keys=(value:unknown,prefix=''):string[]=>value&&typeof value==='object'?Object.entries(value).flatMap(([k,v])=>[prefix+k,...keys(v,prefix+k+'.')]).sort():[];
it('has the same keys, deeply, in English and Spanish',()=>{
 expect(keys(EXCHANGE_COPY.es)).toEqual(keys(EXCHANGE_COPY.en));
 for(const key of Object.keys(EXCHANGE_COPY.en) as (keyof typeof EXCHANGE_COPY.en)[])expect(typeof EXCHANGE_COPY.es[key]).toBe(typeof EXCHANGE_COPY.en[key]);
});
it('counts, dates and times read naturally in both languages',()=>{
 const {en,es}=EXCHANGE_COPY;
 expect(en.openShiftsTab(0)).toBe('Open shifts');expect(en.openShiftsTab(2)).toBe('Open shifts · 2');expect(es.openShiftsTab(2)).toBe('Disponibles · 2');
 expect(exchangeDay('2026-12-07')).toBe('Mon, Dec 7');expect(exchangeDay('2026-12-07','es')).toBe('lun, 7 dic');expect(exchangeDay('2026-09-08','es')).toBe('mar, 8 sep');
 expect(exchangeTime('06:00')).toBe('6:00 AM');expect(plain(exchangeTime('14:00','es'))).toBe('2:00 p. m.');
 expect(es.status('DENIED')).toBe('Rechazada');expect(en.status('NEEDS_REVIEW')).toBe('Needs Review');
 for(const text of Object.values(es).filter((v):v is string=>typeof v==='string'))expect(text).not.toMatch(/!|¡/);
});
