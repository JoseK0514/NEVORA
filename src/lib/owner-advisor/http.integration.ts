import { it, expect, beforeEach, afterEach, vi } from "vitest";
import { companyAccessFixture } from "@/test/integration/company-access-fixture";
import type { SessionMutationProof } from "@/lib/shift-changes/types";
import type { SqlExecutor } from "@/lib/notifications/types";
const state = vi.hoisted(() => ({
  proof: null as SessionMutationProof | null,
  ex: null as SqlExecutor | null,
  historicalRead: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({
  getSession: async () => state.proof?.employee ?? null,
  requireSessionMutationProof: async () => state.proof,
}));
vi.mock("@/lib/data/sql-executor", () => ({
  neonNotificationExecutor: () => state.ex,
}));
vi.mock('./operational-insights.server',async importOriginal=>{const actual=await importOriginal<typeof import('./operational-insights.server')>();return {...actual,readOperationalInsights:async(...args:Parameters<typeof actual.readOperationalInsights>)=>{state.historicalRead();return actual.readOperationalInsights(...args);}};});
import {parseAnswer} from '@/components/owner-advisor/public-response';
import {ownerDecision,decisionReply} from '@/test/fixtures/owner-decision';
import { GET, POST } from "@/app/api/owner/advisor/route";
let f: Awaited<ReturnType<typeof companyAccessFixture>>;
beforeEach(async () => {
  state.historicalRead.mockClear();
  f = await companyAccessFixture();
  state.ex = f.db.executor;
  state.proof = f.owner;
  vi.stubEnv("NEVORA_OWNER_ADVISOR_ENABLED", "true");
  vi.stubEnv("NEVORA_OWNER_ADVISOR_PROVIDER", "");
});
afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  await f?.db.dispose();
});
const request = (body?: unknown, headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/owner/advisor", {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "x-nevora-owner-advisor": "1",
      "content-type": "application/json",
      origin: "http://localhost",
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
it("returns private 401/403 for absent or non-Owner authority", async () => {
  state.proof = null;
  expect((await GET(request())).status).toBe(401);
  state.proof = f.manager;
  const r = await GET(request());
  expect(r.status).toBe(403);
  expect(r.headers.get("cache-control")).toBe("no-store, private");
});
it("checks same origin, header, bounded JSON and forbids client-controlled history", async () => {
  expect(
    (await POST(request({}, { origin: "https://evil.invalid" }))).status,
  ).toBe(403);
  expect(
    (await GET(request(undefined, { "x-nevora-owner-advisor": "" }))).status,
  ).toBe(403);
  expect(
    (
      await POST(
        request({
          op: "ask",
          requestId: crypto.randomUUID(),
          message: "x",
          history: [],
        }),
      )
    ).status,
  ).toBe(400);
  expect((await POST(request({ message: "x".repeat(17000) }))).status).toBe(
    400,
  );
});
it("returns honest disabled/unavailable states with no outbound fetch", async () => {
  const outbound = vi
    .spyOn(globalThis, "fetch")
    .mockRejectedValue(new Error("unexpected outbound"));
  try {
    vi.stubEnv("NEVORA_OWNER_ADVISOR_ENABLED", "false");
    expect((await GET(request())).status).toBe(404);
    vi.stubEnv("NEVORA_OWNER_ADVISOR_ENABLED", "true");
    const r = await GET(request());
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({
      state: "ready",
      connection: "unavailable",
    });
    const ask = await POST(
      request({ op: "ask", requestId: crypto.randomUUID(), message: "Hi" }),
    );
    expect(ask.status).toBe(503);
    expect(outbound).not.toHaveBeenCalled();
  } finally {
    outbound.mockRestore();
  }
});
it("keeps legacy/default and lease snapshots lightweight and scans history only on explicit detail with current Owner authority",async()=>{
 const selected=(view:string)=>new Request('http://localhost/api/owner/advisor?view='+view,{headers:{'x-nevora-owner-advisor':'1'}});
 for(const req of [request(),selected('lease'),request()]){const r=await GET(req);expect(r.status).toBe(200);const body=await r.json();expect(body).not.toHaveProperty('operationalInsights');expect(body).toMatchObject({state:'ready',memory:expect.any(Object),notebook:expect.any(Object),validForMs:expect.any(Number)});}
 expect(state.historicalRead).not.toHaveBeenCalled();
 const detail=await GET(selected('detail'));expect(detail.status).toBe(200);expect(await detail.json()).toHaveProperty('operationalInsights');expect(state.historicalRead).toHaveBeenCalledTimes(1);
 await GET(selected('detail'));expect(state.historicalRead).toHaveBeenCalledTimes(2);
 await f.q('DELETE FROM employee_sessions WHERE token_hash=$1',[f.owner.sessionTokenHash]);
 for(const req of [request(),selected('lease'),selected('detail')])expect((await GET(req)).status).toBe(403);
 expect(state.historicalRead).toHaveBeenCalledTimes(2);
});
it.each(['ask','ask_task'])('returns actual unchanged-client-compatible fresh and replayed %s HTTP answers, while preserving internal guards and explicit schema2',async op=>{
 vi.stubEnv('NEVORA_OWNER_ADVISOR_PROVIDER','openai');vi.stubEnv('NEVORA_OWNER_ADVISOR_DATA_APPROVED','true');vi.stubEnv('NEVORA_OWNER_ADVISOR_MODEL','fictional');vi.stubEnv('NEVORA_OWNER_ADVISOR_DAILY_LIMIT','10');vi.stubEnv('OPENAI_API_KEY','fictional-not-a-key');
 const taskId=crypto.randomUUID();if(op==='ask_task'){expect((await POST(request({op:'notebook',requestId:crypto.randomUUID(),expectedRevision:0,change:{kind:'save_task',taskId,objective:'Review current evidence',notes:'',state:'open',focus:{kind:'general'}}}))).status).toBe(200);}
 const d={...ownerDecision(),summary:'Review the current evidence before any action.',observations:[{statement:'A current briefing is available.',evidenceIds:['E1']}],acknowledgedPartialEvidence:['E1']};
 const provider=vi.spyOn(globalThis,'fetch').mockImplementation(async()=>Response.json(decisionReply(d)));
 const command={op,requestId:crypto.randomUUID(),message:'Review current evidence',...(op==='ask_task'?{taskId,expectedNotebookRevision:1}:{})};
 const first=await POST(request(command));expect(first.status).toBe(200);const a=parseAnswer(await first.json()).answer;
 expect(a.context).toEqual({notebookRevision:op==='ask_task'?1:0,taskId:op==='ask_task'?taskId:null});
 const replay=await POST(request(command));expect(replay.status).toBe(200);expect(parseAnswer(await replay.json()).answer).toEqual(a);
 const extended=await POST(request(command,{'x-nevora-owner-advisor-schema':'2'}));expect(extended.status).toBe(200);expect((await extended.json()).answer.context).toMatchObject({profileRevision:0,memoryRevision:0});
 expect(provider).toHaveBeenCalledTimes(1);
 const stored=await f.q<{result:{context:unknown}}>('SELECT result FROM owner_advisor_requests WHERE request_id=$1',[command.requestId]);expect(stored[0].result.context).toMatchObject({profileRevision:0,memoryRevision:0});
 expect((await GET(request(undefined,{'x-nevora-owner-advisor-schema':'unsupported'}))).status).toBe(400);
});
