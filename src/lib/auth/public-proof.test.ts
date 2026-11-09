import {it,expect} from 'vitest';
import {isPublicAccountProof,isPublicClockerEnrollment} from './public-proof';
it('accepts bounded opaque envelope syntax for transport without claiming verification',()=>{
 const envelope='nw1_v1.'+'A'.repeat(16)+'.'+'B'.repeat(100)+'.'+'A'.repeat(22);
 expect(isPublicAccountProof(envelope)).toBe(true);expect(isPublicClockerEnrollment(envelope)).toBe(true);
 expect(isPublicAccountProof('A'.repeat(43))).toBe(true);expect(isPublicClockerEnrollment('nev_enr_'+'a'.repeat(64))).toBe(true);
 for(const x of [envelope+'?private=1',envelope+'\n','https://example.invalid/'+envelope,'x'.repeat(4097),null])expect(isPublicAccountProof(x)).toBe(false);
});
