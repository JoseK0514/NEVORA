import {it,expect} from 'vitest';
import {canonicalCompanyManifest} from './server';
import {bootstrapManifest} from './manifest.generated';
it('pins the API artifact to the exact ordered canonical SQL sources',async()=>{
 const actual=await canonicalCompanyManifest();expect(actual.hash).toBe(bootstrapManifest.hash);expect([...actual.base,...actual.final].map(({file,checksum})=>({file,checksum}))).toEqual(bootstrapManifest.entries);
});
