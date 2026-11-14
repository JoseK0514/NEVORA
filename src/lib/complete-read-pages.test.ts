import {expect,it} from 'vitest';
import {assembleCompleteReadPages as assemble} from './complete-read-pages';
const observedAt='2026-11-10T12:00:00Z';
const source=[{observedAt,totalRows:3,pageIndex:0,cards:[{id:'A'},{id:'B'}]}, {observedAt,totalRows:3,pageIndex:1,cards:[{id:'C'}]}];
it('assembles the exact complete bounded pages without changing their order or observation',()=>{
 expect(assemble(source,'cards',2)).toEqual({observedAt,rows:[{id:'A'},{id:'B'},{id:'C'}],paging:{version:'COMPLETE_READ_V1',pageSize:2,totalRows:3,pageCounts:[2,1]}});
});
it('distinguishes an explicit complete empty source from a missing response',()=>{
 expect(assemble([{observedAt,totalRows:0,pageIndex:0,cards:[]}],'cards',2)).toMatchObject({rows:[],paging:{totalRows:0,pageCounts:[0]}});
 expect(()=>assemble([],'cards',2)).toThrow();expect(()=>assemble(null,'cards',2)).toThrow();
});
it.each([
 [source[0]], [source[1],source[0]], [source[0],source[0]],
 [source[0],{...source[1],observedAt:'2026-11-10T12:00:01Z'}],
 [source[0],{...source[1],totalRows:4}],
 [{...source[0],cards:[{id:'A'}]},source[1]],
 [source[0],{...source[1],cards:[{id:'C'},{id:'D'}]}],
 [source[0],{...source[1],pageIndex:3}],
 [source[0],{...source[1],cards:undefined}],
 [source[0],source[1],{observedAt,totalRows:3,pageIndex:2,cards:[]}],
].map(value=>[value]))('refuses missing, repeated, reordered, mixed or truncated page responses %j',value=>{
 expect(()=>assemble(value,'cards',2)).toThrow();
});
it('requires internal capture pages to be as complete as public rows',()=>{
 expect(()=>assemble(source,'internalCapture',2)).toThrow();
});
