import { expect, it, vi } from 'vitest';
import { clearGenerationExclusion, deleteGeneratedDraftShift } from './generation-exclusions';
import type { SqlExecutor } from '../notifications/types';
const input={workspaceId:'fictional-workspace',locationId:'fictional-location',weekStart:'2030-10-07',actorEmployeeId:'fictional-manager'};
it('rejects incomplete or non-Monday mutation scope before reading any source',async()=>{
 const executor:SqlExecutor={query:vi.fn(),transaction:vi.fn()};
 for(const patch of [{weekStart:'2030-10-08'},{workspaceId:''},{locationId:''},{actorEmployeeId:''}]) {
  await expect(deleteGeneratedDraftShift({...input,...patch,shiftId:'fictional-shift'},executor)).rejects.toThrow();
 }
 await expect(clearGenerationExclusion({...input,exclusionId:''},executor)).rejects.toThrow();
 expect(executor.query).not.toHaveBeenCalled(); expect(executor.transaction).not.toHaveBeenCalled();
});
