import { expect, it } from 'vitest';
async function api() {
  const implementation = await import('./generation-claims').catch(() => ({}));
  expect(implementation).toHaveProperty('validateGenerationClaims');
  return implementation as typeof import('./generation-claims');
}
const scope={workspaceId:'fictional',timeZone:'America/Puerto_Rico',weekStart:'2030-10-07',locationId:'fictional-location'};
const shift={positionId:'fictional-position',date:'2030-10-07',startTime:'08:00',endTime:'12:00'};
const need={kind:'POSITION' as const,positionId:'fictional-position',needStart:'2030-10-07T08:00',needEnd:'2030-10-07T12:00',configuredCapacity:2};
const claim={...need,coveredStart:need.needStart,coveredEnd:need.needEnd,quantity:1};
it('server-computed keys are contextual and reject tampering; normalized claims coalesce adjacency',async()=>{
 const a=await api(); const needKey=a.generationNeedKey(scope,need);
 const claims=a.validateGenerationClaims({version:1,claims:[{...claim,needKey,coveredEnd:'2030-10-07T10:00'},{...claim,needKey,coveredStart:'2030-10-07T10:00'}]},scope,shift);
 expect(claims).toEqual({version:1,claims:[{...claim,needKey}]});
 expect(a.generationNeedKey({...scope,locationId:'elsewhere'},need)).not.toBe(needKey);
 expect(()=>a.validateGenerationClaims({version:1,claims:[{...claim,needKey:'forged'}]},scope,shift)).toThrow();
});
it('normalizes 24:00 to next-day civil midnight without machine timezone',async()=>{
 const a=await api(); const n={...need,needEnd:'2030-10-07T24:00'};
 expect(a.generationNeedKey(scope,n)).toBe(a.generationNeedKey(scope,{...n,needEnd:'2030-10-08T00:00'}));
});
it('rejects empty, unsupported, overlapping, out-of-parent, invalid family/position, quantity, capacity and oversized claims',async()=>{
 const a=await api(); const c={...claim,needKey:a.generationNeedKey(scope,need)};
 const invalid=[{version:2,claims:[c]},{version:1,claims:[]},{version:1,claims:[c,c]},
  ...[{coveredStart:'2030-10-07T07:59'},{coveredEnd:'2030-10-07T13:00'},{coveredEnd:c.coveredStart},{positionId:null},{kind:'STAFFING'},{kind:'UNKNOWN'},{quantity:2},{configuredCapacity:0}].map(p=>({version:1,claims:[{...c,...p}]})),
  {version:1,claims:Array(257).fill(c)}, {version:1,claims:[{...c,positionId:'x'.repeat(65536)}]}];
 for(const value of invalid) expect(()=>a.validateGenerationClaims(value,scope,shift)).toThrow();
});
it('STAFFING keys ignore input order but distinguish coincidentally equal residual capacities',async()=>{
 const a=await api(); const n={kind:'STAFFING' as const,needStart:need.needStart,needEnd:need.needEnd,configuredCapacity:1,staffingBasis:{requiredStaff:4,positions:[{positionId:'a',quantity:1},{positionId:'b',quantity:2}]}};
 expect(a.generationNeedKey(scope,n)).toBe(a.generationNeedKey(scope,{...n,staffingBasis:{...n.staffingBasis,positions:[...n.staffingBasis.positions].reverse()}}));
 expect(a.generationNeedKey(scope,n)).not.toBe(a.generationNeedKey(scope,{...n,staffingBasis:{requiredStaff:3,positions:[{positionId:'a',quantity:2}]}}));
});
it('POSITION claims cannot reserve another operational position or a positionless assignment',async()=>{
 const a=await api();const value={version:1,claims:[{...claim,needKey:a.generationNeedKey(scope,need)}]};
 expect(()=>a.validateGenerationClaims(value,scope,{...shift,positionId:'other-position'})).toThrow();
 expect(()=>a.validateGenerationClaims(value,scope,{...shift,positionId:undefined})).toThrow();
});
it('LEAD claims require the parent designated flag while designated shifts may omit a LEAD claim',async()=>{
 const a=await api();const leadNeed={kind:'LEAD' as const,needStart:need.needStart,needEnd:need.needEnd,configuredCapacity:1};
 const value={version:1,claims:[{...leadNeed,needKey:a.generationNeedKey(scope,leadNeed),coveredStart:leadNeed.needStart,coveredEnd:leadNeed.needEnd,quantity:1}]};
 expect(()=>a.validateGenerationClaims(value,scope,{...shift,isDesignatedLead:false})).toThrow();
 expect(()=>a.validateGenerationClaims(value,scope,shift)).toThrow();
 expect(a.validateGenerationClaims(value,scope,{...shift,positionId:undefined,isDesignatedLead:true})).toEqual(value);
 const positionOnly={version:1,claims:[{...claim,needKey:a.generationNeedKey(scope,need)}]};
 expect(a.validateGenerationClaims(positionOnly,scope,{...shift,isDesignatedLead:true})).toEqual(positionOnly);
});
