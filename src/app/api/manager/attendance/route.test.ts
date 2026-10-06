import {beforeEach,describe,expect,it,vi} from 'vitest';

const mocks=vi.hoisted(()=>({session:vi.fn(),read:vi.fn()}));
vi.mock('@/lib/auth/session',()=>({getSession:mocks.session}));
vi.mock('@/lib/data/attendance-review',()=>({getAttendanceReview:mocks.read}));

import {GET} from './route';

const request=(query='',headers:Record<string,string>={'X-Nevora-Attendance':'1'})=>
  new Request('https://nevora.invalid/api/manager/attendance'+query,{headers});

const ready=()=>({
  state:'ready' as const,
  engineVersion:1 as const,
  workspaceId:'workspace-fuel',
  timeZone:'America/Puerto_Rico',
  observedAt:'2030-10-07T16:00:00Z',
  validForMs:45000,
  scope:{kind:'TODAY_AND_OPEN' as const,localDate:'2030-10-07',dayStartAt:'2030-10-07T04:00:00Z'},
  groups:[],
  recordCount:0,
  signalCount:0,
  affectedEmployeeCount:0,
  coverage:{state:'complete' as const,limitations:[],deferredCapabilities:[]},
});

describe('D1.2 manager attendance API boundary',()=>{
  beforeEach(()=>{
    vi.resetAllMocks();
    mocks.session.mockResolvedValue({
      id:'owner',
      firstName:'Owner',
      lastName:'QA',
      role:'OWNER',
      primaryLocationId:'loc-1',
    });
    mocks.read.mockResolvedValue(ready());
  });

  it('requires an authenticated portal session before reading recorded time',async()=>{
    mocks.session.mockResolvedValue(null);
    const response=await GET(request());
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({state:'unavailable',reason:'access_denied'});
    expect(mocks.read).not.toHaveBeenCalled();
  });

  it.each(['EMPLOYEE','LEAD'] as const)('denies %s without reading attendance',async role=>{
    mocks.session.mockResolvedValue({id:'worker',firstName:'A',lastName:'B',role,primaryLocationId:'loc-1'});
    const response=await GET(request());
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({state:'unavailable',reason:'access_denied'});
    expect(mocks.read).not.toHaveBeenCalled();
  });

  it.each(['OWNER','MANAGER'] as const)('returns a private uncached bounded response for %s',async role=>{
    mocks.session.mockResolvedValue({id:'manager',firstName:'A',lastName:'B',role,primaryLocationId:'loc-1'});
    const response=await GET(request());
    expect(response.status).toBe(200);
    expect(mocks.read).toHaveBeenCalledWith();
    expect(response.headers.get('cache-control')).toBe('no-store, private');
    expect(response.headers.get('vary')).toBe('Cookie');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(await response.json()).toMatchObject({state:'ready',validForMs:45000,groups:[]});
  });

  it('rejects all caller-supplied selectors instead of narrowing the authoritative source',async()=>{
    for(const query of ['?employeeId=other','?locationId=loc-2','?date=2030-10-07']){
      const response=await GET(request(query));
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({state:'unavailable',reason:'access_denied'});
    }
    expect(mocks.read).not.toHaveBeenCalled();
  });

  it('rejects cross-site and unmarked reads before any identity or data lookup',async()=>{
    let response=await GET(request('',{}));
    expect(response.status).toBe(403);
    response=await GET(request('',{'X-Nevora-Attendance':'1','Sec-Fetch-Site':'cross-site'}));
    expect(response.status).toBe(403);
    expect(mocks.session).not.toHaveBeenCalled();
    expect(mocks.read).not.toHaveBeenCalled();
  });

  it('preserves a fresh authority denial from the protected reader',async()=>{
    mocks.read.mockResolvedValue({state:'unavailable',reason:'access_denied'});
    const response=await GET(request());
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({state:'unavailable',reason:'access_denied'});
  });

  it.each(['not_configured','schema_missing','read_failed','invalid_source','incomplete_source','source_limit'] as const)(
    'maps %s to a bounded unavailable response without diagnostics',
    async reason=>{
      mocks.read.mockResolvedValue({state:'unavailable',reason});
      const response=await GET(request());
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({state:'unavailable',reason});
    },
  );

  it('never reflects thrown SQL, session hashes, or transport details',async()=>{
    mocks.read.mockRejectedValue(Error('postgres://private.example token_hash=secret'));
    const response=await GET(request());
    const copy=response.clone();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({state:'unavailable',reason:'read_failed'});
    expect(await copy.text()).not.toMatch(/postgres|token_hash|secret/i);
  });
});
