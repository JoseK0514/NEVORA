import { managementProof } from '../../test/fixtures/management';
import { expect, it, vi } from 'vitest';
import { clearGenerationExclusion, deleteGeneratedDraftShift } from './generation-exclusions';
import type { SqlExecutor } from '../notifications/types';
const input={proof:managementProof('fictional-manager'),workspaceId:'fictional-workspace',locationId:'fictional-location',weekStart:'2030-10-07',actorEmployeeId:'fictional-manager'};
it.each([undefined, { ...input.proof, sessionTokenHash: '' }, managementProof('other')])('clear rejects absent, malformed or actor-mismatched session proof before reading source',async proof=>{
 const executor:SqlExecutor={query:vi.fn().mockRejectedValue(new Error('unexpected_database_read')),transaction:vi.fn()};
 await expect(clearGenerationExclusion({...input,proof,exclusionId:'fictional-exclusion'} as Parameters<typeof clearGenerationExclusion>[0],executor)).rejects.toThrow('management_authorization');
 expect(executor.query).not.toHaveBeenCalled(); expect(executor.transaction).not.toHaveBeenCalled();
});
it('rejects incomplete or non-Monday mutation scope before reading any source',async()=>{
 const executor:SqlExecutor={query:vi.fn(),transaction:vi.fn()};
 for(const patch of [{weekStart:'2030-10-08'},{workspaceId:''},{locationId:''},{actorEmployeeId:''}]) {
  await expect(deleteGeneratedDraftShift({...input,...patch,shiftId:'fictional-shift'},executor)).rejects.toThrow();
 }
 await expect(clearGenerationExclusion({...input,exclusionId:''},executor)).rejects.toThrow();
 expect(executor.query).not.toHaveBeenCalled(); expect(executor.transaction).not.toHaveBeenCalled();
});
