import { expect, it, vi } from 'vitest';
vi.mock('@/lib/db', () => import('../db'));
import { generateWeekDraft, readGenerationSnapshot, type GenerationRequest } from './schedule-generation';
import type { SqlExecutor } from '../notifications/types';
const request: GenerationRequest = {
  workspaceId: 'fictional',
  actorEmployeeId: 'manager',
  weekStart: '2030-10-07',
  mode: 'BUILD_WEEK',
  locationScope: {
    kind: 'SELECTED',
    locationIds: ['one']
  }
};
it.each([{
  workspaceId: ''
}, {
  actorEmployeeId: ''
}, {
  weekStart: '2030-10-08'
}, {
  weekStart: '2030-02-31'
}, {
  mode: 'PUBLISH'
}, {
  locationScope: {
    kind: 'SELECTED',
    locationIds: []
  }
}, {
  locationScope: {
    kind: 'SELECTED',
    locationIds: ['one', 'one']
  }
}, {
  locationScope: {
    kind: 'SELECTED',
    locationIds: [1]
  }
}, {
  locationScope: {
    kind: 'CLIENT_ALL'
  }
}])('rejects malformed server scope before any database read: %j', async patch => {
  const executor: SqlExecutor = {
    query: vi.fn(),
    transaction: vi.fn()
  };
  await expect(generateWeekDraft({
    ...request,
    ...patch
  } as GenerationRequest, executor)).rejects.toThrow();
  expect(executor.query).not.toHaveBeenCalled();
  expect(executor.transaction).not.toHaveBeenCalled();
});
it('snapshot is one authoritative read and missing actor cannot become a solver input', async () => {
  const query = vi.fn().mockResolvedValue([{
    source: {
      workspaces: [{
        id: 'fictional',
        active: true
      }],
      employees: []
    },
    changedAt: '2030-10-07'
  }]);
  const executor: SqlExecutor = {
    query,
    transaction: vi.fn()
  };
  await expect(readGenerationSnapshot(request, executor)).rejects.toThrow('active Owner or Manager');
  expect(query).toHaveBeenCalledTimes(1);
  expect(executor.transaction).not.toHaveBeenCalled();
});
