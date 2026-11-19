import {afterEach, beforeEach, expect, it, rs} from '@rstest/core';
import {POST} from '../../app/api/compensation/wages/route';
import {readSessionMutationProof} from '../auth/session';
import {employeeWages} from './wages.server';

rs.mock('../auth/session', () => ({readSessionMutationProof:rs.fn()}));
rs.mock('./wages.server', () => ({employeeWages:rs.fn()}));
beforeEach(() => { rs.stubEnv('FUEL_PORTAL_ORIGIN','http://localhost:3000'); });
afterEach(() => { rs.resetAllMocks(); rs.unstubAllEnvs(); });
const request = (origin = 'http://localhost:3000') => new Request('http://localhost:3000/api/compensation/wages', {
  method:'POST', headers:{origin,host:'localhost:3000','content-type':'application/json','x-nevora-payroll':'1'},body:'{"action":"READ_WAGES","employeeId":"example"}'
});
it('rejects cross-origin, signed-out and ordinary scheduling reads before fetching any wages', async () => {
  expect((await POST(request('https://another.example'))).status).toBe(403);
  rs.mocked(readSessionMutationProof).mockResolvedValue(null);
  expect((await POST(request())).status).toBe(401);
  rs.mocked(readSessionMutationProof).mockResolvedValue({sessionTokenHash:'a'.repeat(64),
    employee:{id:'m',role:'MANAGER',primaryLocationId:'L',firstName:'Fictional',lastName:'Manager'}});
  const denied = await POST(request());
  expect(denied.status).toBe(403);
  expect(denied.headers.get('cache-control')).toContain('no-store');
  expect(employeeWages).not.toHaveBeenCalled();
});
