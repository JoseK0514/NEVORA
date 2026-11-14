vi.mock('./sql-session-contract',()=>import('../../test/fixtures/business-sql-session'));
import { expect, it, vi } from "vitest";
import { listTeamExchangeActivity } from "./exchanges";
import {readShiftChangeHistoryView} from "./shift-change-views";
import type {SessionMutationProof} from "../shift-changes/types";
const history=vi.hoisted(()=>vi.fn());
vi.mock("./shift-change-history",()=>({readShiftChangeHistory:history}));
const query = vi.hoisted(() => vi.fn(async (_sql: string) => []));
vi.mock("@/lib/db", () => ({ getDb: () => ({ query }), queryRows: (rows: unknown) => rows }));
it("filters completed team outcomes before applying the history limit, while preserving the existing unfiltered reader", async () => {
  await listTeamExchangeActivity(true);
  const completed = String(query.mock.calls[0][0]);
  expect(completed).toMatch(/WHERE x.status IN \('APPROVED', 'DENIED', 'CANCELLED', 'EXPIRED'\)[\s\S]+LIMIT 30/);
  await listTeamExchangeActivity();
  expect(String(query.mock.calls[1][0])).not.toContain("WHERE x.status");
});

it('projects immutable historical shift facts with compatible legacy fields and explicit unknowns',async()=>{
 const source={date:'2030-10-08',start_time:'08:00:00',end_time:'16:00:00',location_id:'L',position_id:'P',is_designated_lead:true,privateReason:'not-for-display'};
 const target={date:'2030-10-09',startTime:'09:00',endTime:'17:00',locationId:'L2',positionId:null,isDesignatedLead:false};
 const stored=[{request_revision:1,event_kind:'LEGACY_IMPORTED',created_at:'2030-10-01T00:00:00Z',source_terms:source,target_terms:target,outcome_mode:null},{request_revision:2,event_kind:'REQUESTED',created_at:'2030-10-02T00:00:00Z',source_terms:{date:'2030-10-10'},target_terms:null}];
 const before=structuredClone(stored);history.mockResolvedValue(stored);
 const proof={employee:{id:'employee',role:'EMPLOYEE'},sessionTokenHash:'a'.repeat(64)} as SessionMutationProof;
 const executor={query:async<T>()=>[] as T[],transaction:async()=>[]};
 const result=await readShiftChangeHistoryView(proof,'request',executor);
 expect(history).toHaveBeenCalledWith(proof,'request',executor);
 expect(result[0]).toMatchObject({revision:1,event:'legacy imported',source:'2030-10-08 · 08:00 – 16:00 · Location L · Position P · Shift lead',target:'2030-10-09 · 09:00 – 17:00 · Location L2 · No assigned position · No shift lead'});
 expect(result[1]).toMatchObject({source:'2030-10-10 · Unknown time – Unknown time · Location unknown · Position unknown · Lead designation unknown',target:null});
 expect(JSON.stringify(result)).not.toContain('not-for-display');
 expect(stored).toEqual(before);
});
