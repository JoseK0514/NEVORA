import {afterEach,beforeEach,expect,it,vi} from "vitest";
import {ownerCoverageAction,REVIEW_ID} from "@/test/fixtures/owner-coverage-action";
import {ownerCoveragePlan} from "@/test/fixtures/owner-coverage-plan";
import type {CoverageActionCommand} from "@/lib/owner-advisor/coverage-actions";
import {createCoverageActionController,type CoverageActionView} from "./coverage-actions-controller";
let c:ReturnType<typeof createCoverageActionController>,v:CoverageActionView;
let calls:CoverageActionCommand[],responses:(Response|Promise<Response>|Error)[];
const reply=(state:"coverage_review"|"coverage_saved"|"coverage_checked")=>new Response(JSON.stringify(ownerCoverageAction(state)),{status:200});
const plan=()=>{const p=ownerCoveragePlan();p.alternatives[0].assignments.forEach(a=>a.positionId=null);return p;};
beforeEach(()=>{
 vi.useFakeTimers();calls=[];responses=[];
 c=createCoverageActionController((next:CoverageActionView)=>v=next,(async(_url:RequestInfo|URL,init?:RequestInit)=>{calls.push(JSON.parse(String(init?.body)));const r=responses.shift();if(r instanceof Error)throw r;if(!r)throw Error("No reply");return await r;}) as typeof fetch,(()=>{let n=0;return ()=>n++===0?REVIEW_ID:"22222222-2222-4222-8222-222222222222";})());c.access("owner",15000);
});
afterEach(()=>{c.stop();vi.useRealTimers();});
it("prepares exact selected IDs and never saves before explicit acknowledgement",async()=>{
 responses.push(reply("coverage_review"));await c.prepare(plan(),0);
 expect(calls[0]).toMatchObject({op:"prepare_coverage_draft",date:"2026-10-22",assignments:[{employeeId:"ana",locationId:"north",startTime:"08:00",endTime:"12:00",positionId:null,isDesignatedLead:false}]});
 expect(Object.keys((calls[0] as Extract<CoverageActionCommand,{op:"prepare_coverage_draft"}>).assignments[0]).sort()).toEqual(["employeeId","endTime","isDesignatedLead","locationId","positionId","startTime"]);
 await c.save();expect(calls).toHaveLength(1);
 c.acknowledge(true);responses.push(reply("coverage_saved"));await c.save();expect(v.stage).toBe("saved");expect(calls[1]).toMatchObject({op:"apply_coverage_draft",reviewId:REVIEW_ID,acknowledged:true});
 responses.push(reply("coverage_checked"));await c.check();expect(v.result?.progress?.publishedAssignments).toBe(0);expect(calls[2].op).toBe("check_coverage_draft");
});
it("blocks a mixed/published plan or historical assignment without position IDs",async()=>{
 const p=plan();p.alternatives[0].assignments[0].publication="PUBLISHED";await c.prepare(p,0);expect(calls).toHaveLength(0);
 delete p.alternatives[0].assignments[0].positionId;p.alternatives[0].assignments[0].publication="DRAFT";await c.prepare(p,0);expect(calls).toHaveLength(0);
});
it("retains the original save command after loss and pause; recovery never creates a new operation",async()=>{
 responses.push(reply("coverage_review"));await c.prepare(plan(),0);c.acknowledge(true);responses.push(Error("lost"));await c.save();
 expect(v.stage).toBe("uncertain");const original=calls[1];c.pause();expect(v.result).toBeNull();c.access("owner",15000);expect(v.stage).toBe("uncertain");
 responses.push(reply("coverage_saved"));await c.recover();expect(calls[2]).toEqual(original);expect(v.stage).toBe("saved");
});
it("fences a late save reply after pause and cannot start another plan while outcome is unknown",async()=>{
 responses.push(reply("coverage_review"));await c.prepare(plan(),0);c.acknowledge(true);
 let settle!:(r:Response)=>void;responses.push(new Promise(r=>settle=r));const pending=c.save();c.pause();settle(reply("coverage_saved"));await pending;
 expect(v.result).toBeNull();c.access("owner",15000);await c.prepare(plan(),0);expect(calls).toHaveLength(2);expect(v.stage).toBe("uncertain");
});
it("expires private DOM state, refuses stale/foreign responses, and never polls a business save",async()=>{
 responses.push(reply("coverage_review"));await c.prepare(plan(),0);await vi.advanceTimersByTimeAsync(15001);expect(v.result).toBeNull();expect(calls).toHaveLength(1);
 c.access("owner",15000);const bad=ownerCoverageAction();bad.authority="other";responses.push(new Response(JSON.stringify(bad)));await c.prepare(plan(),0);expect(v.result).toBeNull();
});
it("blocks expired review confirmation and preserves a lost prepare for explicit recovery",async()=>{
 responses.push(Error("lost prepare"));await c.prepare(plan(),0);expect(v.stage).toBe("uncertain");
 const r=ownerCoverageAction();r.review.preparedAt=new Date(Date.now()-300001).toISOString();r.review.expiresAt=new Date(Date.now()-1).toISOString();responses.push(new Response(JSON.stringify(r)));await c.recover();c.acknowledge(true);await c.save();expect(calls).toHaveLength(2);
});
