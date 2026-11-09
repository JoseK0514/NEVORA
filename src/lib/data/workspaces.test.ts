import {expect,it,vi} from 'vitest';
import {getWorkspace,getPublicWorkspaceName,workspaceReadGuard,WorkspaceUnavailableError} from './workspaces';
import type {SqlExecutor} from '../notifications/types';
const workspace={id:'northside',name:'Northside Services',timeZone:'America/New_York',active:true,createdAt:'2030-01-01 00:00:00+00',updatedAt:'2030-01-01 00:00:00.123456+00'};
it('reads the persisted configuration and exact database version, ignoring forged workspace IDs',async()=>{
 const executor={query:vi.fn(async()=>[workspace]),transaction:vi.fn()} as unknown as SqlExecutor;
 expect(await getWorkspace(executor)).toEqual(workspace);
 expect(await getPublicWorkspaceName(executor)).toBe('Northside Services');
 expect(vi.mocked(executor.query).mock.calls[0][0].values).toEqual([]);
 const guard=workspaceReadGuard(workspace);expect(guard).toHaveLength(2);expect(guard[0].text).toContain('FOR SHARE');expect(guard[1].values).toContain('2030-01-01 00:00:00.123456+00');
});
it('fails operational reads honestly but allows generic public identity on outage',async()=>{
 const executor={query:async()=>{throw new Error('offline')},transaction:vi.fn()} as SqlExecutor;
 await expect(getWorkspace(executor)).rejects.toBeInstanceOf(WorkspaceUnavailableError);expect(await getPublicWorkspaceName(executor)).toBeNull();
});
