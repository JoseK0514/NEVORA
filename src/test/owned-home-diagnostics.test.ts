import {expect,it} from 'vitest';
import {createHomeSqlDiagnostic} from './integration/owned-home-diagnostics';

it('records bounded assignment/final-read evidence without SQL, parameters, raw rows or errors',()=>{
 const samples:unknown[]=[];
 const observe=createHomeSqlDiagnostic(value=>samples.push(value),8);
 const texts=['SELECT private_token','WITH clock AS MATERIALIZED SELECT "coverageComplete"'];
 const batch=observe.begin(texts);
 observe.emit(batch,'acquired',{total:12,idle:0,waiting:2});
 const rows=[{observedAt:'2026-11-12T20:00:00Z',future:[{secret:'PRIVATE'}],current:[],coverageComplete:true,allowedLocationIds:['PRIVATE']}];
 observe.result(batch,texts[1],rows);
 observe.result(batch,texts[1],[{...rows[0],observedAt:'2026-11-12T20:00:01Z'}]);
 observe.failure(batch,{code:'55P03',message:'PRIVATE SQL and password',detail:'PRIVATE'});
 for(let i=0;i<20;i++)observe.emit(batch,'finished');
 expect(samples).toHaveLength(9); // eight events and one explicit saturation receipt
 const encoded=JSON.stringify(samples);
 expect(encoded).not.toMatch(/PRIVATE|private_token|password|SELECT|detail/);
 expect(encoded).toContain('55P03');expect(encoded).toContain('saturated');
 const results=(samples as Record<string,unknown>[]).filter(s=>s.event==='result');
 expect(results[0].fingerprint).toMatch(/^[a-f0-9]{64}$/);
 expect(results[1].fingerprint).toBe(results[0].fingerprint);
});

it('keeps changed assignment facts distinct and cannot turn an observer error into a query failure',()=>{
 const samples:Record<string,unknown>[]=[];const observe=createHomeSqlDiagnostic(value=>samples.push(value));
 const text='WITH clock AS MATERIALIZED SELECT "coverageComplete"';
 const batch=observe.begin(['/* home_final_sources */ LOCK TABLE private',text]);
 observe.result(batch,text,[{future:[{revision:1}]}]);observe.result(batch,text,[{future:[{revision:2}]}]);
 expect(samples[1].fingerprint).not.toBe(samples[2].fingerprint);
 expect(samples[0].phase).toBe('final');
 const broken=createHomeSqlDiagnostic(()=>{throw Error('Observer unavailable');});
 expect(()=>broken.emit(broken.begin([text]),'finished')).not.toThrow();
 observe.failure(batch,{code:'PRIVATE',message:'PRIVATE'});
 expect(samples.at(-1)?.code).toBe('other');
 expect(()=>observe.result(batch,text,[{value:BigInt(1)}])).not.toThrow();
 expect(samples.at(-1)?.event).toBe('observation-unavailable');
});
