import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ownerCoverageAction } from "@/test/fixtures/owner-coverage-action";
import { CoverageActionPanel } from "./coverage-actions";
import { CoveragePlanResults } from "./coverage-plans";
import { ownerCoveragePlan } from "@/test/fixtures/owner-coverage-plan";
const actions={acknowledge:()=>{},save:async()=>{},recover:async()=>{},check:async()=>{},dismiss:()=>{}};
it("shows exact review terms, one acknowledgement and a disabled save until acknowledged",()=>{
 const result=ownerCoverageAction();result.review.assignments[0].employeeName="<script>unsafe</script>";
 const html=renderToStaticMarkup(<CoverageActionPanel view={{stage:"review",result,lastSavedAt:null,acknowledged:false,message:""}} actions={actions}/>);
 expect(html).toContain("Review draft changes");expect(html).toContain("&lt;script&gt;unsafe&lt;/script&gt;");expect(html).toContain("08:00");expect(html).toContain("0 configured blocks remain");expect(html).toContain("North");expect(html).toContain('type="checkbox"');expect(html).toContain("disabled");
});
it("distinguishes saved drafts, current coverage and publication without declaring resolved or notifying",()=>{
 const html=renderToStaticMarkup(<CoverageActionPanel view={{stage:"saved",result:ownerCoverageAction("coverage_checked"),lastSavedAt:null,acknowledged:false,message:""}} actions={actions}/>);
 expect(html).toContain("Draft saved");expect(html).toContain("0 of 1 published");expect(html).toContain("Check progress");expect(html).toContain("/app/schedule?week=2026-10-19");expect(html).toContain("does not confirm");
});
it("hides private details on pause and shows explicit original-request recovery",()=>{
 const html=renderToStaticMarkup(<CoverageActionPanel view={{stage:"uncertain",result:null,lastSavedAt:null,acknowledged:false,message:"Reply unavailable"}} actions={actions}/>);
 expect(html).toContain("Check original request");expect(html).not.toContain("Ana Example");
 expect(renderToStaticMarkup(<CoverageActionPanel view={{stage:"paused",result:null,lastSavedAt:null,acknowledged:false,message:"Paused"}} actions={actions}/>)).not.toContain("Ana Example");
});
it("offers the action only for fresh exact DRAFT allocations",()=>{
 const p=ownerCoveragePlan();p.alternatives[0].assignments[0].positionId=null;
 const html=renderToStaticMarkup(<CoveragePlanResults plans={p} review={()=>{}}/>);expect(html).toContain("Review draft changes");
 p.alternatives[0].assignments[0].publication="PUBLISHED";
 expect(renderToStaticMarkup(<CoveragePlanResults plans={p} review={()=>{}}/>)).not.toContain(">Review draft changes</button>");
});
