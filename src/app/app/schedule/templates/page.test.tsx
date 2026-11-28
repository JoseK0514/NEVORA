import * as rstestOriginal0 from "@/components/schedule-copy-form" with { rstest: 'importActual' };
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, rs } from '@rstest/core';
import ScheduleTemplatesPage from "./page";

const access=rs.hoisted(()=>({denied:false}));
rs.mock('@/lib/company-access/operational-scope.server',()=>({withOperationalCompany:async(_proof:unknown,load:()=>Promise<unknown>)=>access.denied?{state:'unavailable',reason:'access_denied'}:{state:'ready',data:await load(),coverage:{kind:'COMPANY',locationIds:[]},authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000}}));
const f = rs.hoisted(() => ({
  requireRoles: rs.fn(), requireProof: rs.fn(), list: rs.fn(), detail: rs.fn(), copy: rs.fn(),
  proof: { employee: { id: "manager", role: "MANAGER" }, sessionTokenHash: "a".repeat(64) },
  templates: [{ id: "pattern-1", name: "Regular week", shiftCount: 12, createdAt: "2026-10-01" }],
}));
rs.mock("next/link", () => ({ default: ({ children, ...props }: ComponentProps<"a">) => createElement("a", props, children), useLinkStatus: () => ({ pending: false }) }));
rs.mock("@/lib/auth/permissions", () => ({ MANAGER_ROLES: ["MANAGER", "OWNER"], requireRoles: f.requireRoles }));
rs.mock("@/lib/auth/session", () => ({ requireSessionMutationProof: f.requireProof }));
rs.mock("next/navigation", () => ({ useRouter: () => ({ push: rs.fn(), refresh: rs.fn() }), unstable_rethrow: () => {} }));
rs.mock("@/components/schedule-copy-form",  () => {
  const original = rstestOriginal0;
  return { ScheduleCopyForm: (props: ComponentProps<typeof original.ScheduleCopyForm>) => {
    f.copy(props);
    return createElement(original.ScheduleCopyForm, props);
  } };
});
rs.mock("@/lib/data/workspaces", () => ({ getWorkspace: async () => ({ timeZone: "America/Puerto_Rico" }) }));
rs.mock("@/lib/data/schedule-templates", () => ({ listScheduleTemplates: f.list, readTemplateDetail: f.detail }));
rs.mock("./actions", () => ({ editTemplateAction: rs.fn(), saveTemplateAction: rs.fn(), applyTemplateAction: rs.fn(), archiveTemplateAction: rs.fn() }));

beforeEach(() => {
  access.denied=false;
  rs.useRealTimers();
  f.requireRoles.mockReset().mockResolvedValue({ id: "manager" });
  f.requireProof.mockReset().mockResolvedValue(f.proof);
  f.detail.mockReset();
  f.copy.mockReset();
  f.list.mockReset().mockImplementation(async () => f.templates);
  f.templates = [{ id: "pattern-1", name: "Regular week", shiftCount: 12, createdAt: "2026-10-01" }];
});
async function html(params: Parameters<typeof ScheduleTemplatesPage>[0]["searchParams"] = Promise.resolve({ week: "2026-10-12" })) {
  return renderToStaticMarkup(await ScheduleTemplatesPage({ searchParams: params }));
}

describe("schedule template workflow presentation", () => {
  it("opens the selected template with its saved shifts and a return to the selected week", async () => {
    f.detail.mockResolvedValue({ id: "night", name: "Evening coverage", revision: "v1",
      locations: [{id: "a", name: "Condado", active: true}], employees: [], positions: [],
      shifts: [{id: "s", day: 5, start: "19:00", end: "02:00", employee: null, location: "a", position: null, lead: false, notes: "Stock check"}] });
    const output = await html(Promise.resolve({week: "2026-10-12", template: "night"}));
    expect(f.detail).toHaveBeenCalledWith("night", f.proof);
    expect(f.list).not.toHaveBeenCalled();
    for (const label of ["Evening coverage", "Saturday", "Open shift", "Condado", "Stock check", "Next day", "Edit shift"]) expect(output).toContain(label);
    expect(output).toContain('href="/app/schedule/templates?week=2026-10-12"');
    expect(f.copy).not.toHaveBeenCalled();
  });
  it("recovers from an archived template and withholds the detail read when access is denied", async () => {
    f.detail.mockResolvedValue(null);
    const params = Promise.resolve({week: "2026-10-12", template: "missing"});
    expect(await html(params)).toContain("Choose an active template");
    f.detail.mockClear(); access.denied = true;
    expect(await html(params)).not.toContain("Template shifts");
    expect(f.detail).not.toHaveBeenCalled();
  });
  it("requires management access before reading template data", async () => {
    f.requireRoles.mockRejectedValue(new Error("Forbidden"));
    await expect(html()).rejects.toThrow("Forbidden");
    expect(f.requireRoles).toHaveBeenCalledWith(["MANAGER", "OWNER"]);
    expect(f.list).not.toHaveBeenCalled();
  });
  it("requires the current session proof before reading workspace-owned templates", async () => {
    f.requireProof.mockRejectedValue(new Error("Session expired"));
    await expect(html()).rejects.toThrow("Session expired");
    expect(f.list).not.toHaveBeenCalled();
  });
  it("keeps selected week in every mutation and return destination", async () => {
    const output = await html();
    expect(output.match(/name="weekStart" value="2026-10-12"/g)).toHaveLength(2);
    expect(output.match(/name="templateId" value="pattern-1"/g)).toHaveLength(1);
    expect(f.list).toHaveBeenCalledWith(f.proof);
    expect(f.copy).toHaveBeenCalledWith(expect.objectContaining({ actorId: "manager", command: {
      operationId: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/),
      kind: "TEMPLATE", weekStart: "2026-10-12", templateId: "pattern-1",
    } }));
    expect(output).toContain('href="/app/schedule?week=2026-10-12"');
    // Quiet (v4): Templates works on the week Schedule opened it for; there is no week stepper here.
    expect(output).toContain('Oct 12–18');
  });
  it.each(["2026-10-13", "2030-02-30", "<script>", ""])("uses workspace-local current week for invalid input %s", async week => {
    rs.useFakeTimers(); rs.setSystemTime(new Date("2026-10-12T02:30:00Z"));
    const output = await html(Promise.resolve({ week }));
    expect(output).toContain('name="weekStart" value="2026-10-05"');
    rs.useRealTimers();
  });
  it("retains complete long names and escapes template content", async () => {
    f.templates = [{ id: "unsafe", name: "<script>alert('name')</script> & Operations", shiftCount: 1, createdAt: "2026-10-01" }];
    const output = await html();
    expect(output).not.toContain("<script>alert");
    expect(output).toContain("&lt;script&gt;");
    expect(output).toContain(">1 shift</b>");
    // Phase 2 (C7): the band names the week once; each saved week's button says Apply and is named for its week.
    expect(output).toMatch(/Week[\s\u00a0]of[\s\u00a0]Oct[\s\u00a0]12–18/);
    expect(output).toContain('aria-label="Apply &lt;script&gt;alert(&#x27;name&#x27;)&lt;/script&gt; &amp; Operations to Oct 12–18');
    expect(output).toContain("View and edit");
    expect(output).toContain("week=2026-10-12&amp;template=unsafe");
    expect(output).toContain("Archive");
    // Phase 2 (C7): Direction B for real, so the page carries no older-kit parts (Quiet, Wave).
    expect(output).not.toMatch(/class="[^"]*\b(?:q-(?!sheet|page q-sheet|sr")|wb-|wc-|wa-|sig-|nv-)/);
  });
  it("keeps partial application and warning counts visible with a review destination", async () => {
    const output = await html(Promise.resolve({ week: "2026-10-12", applied: "3", skipped: "2", warnings: "1" }));
    expect(output).toContain("Applied 3 shifts.");
    expect(output).toContain("2 skipped because of current conflicts or unavailable employees.");
    expect(output).toContain("1 added with a warning to review.");
    expect(output).toContain("Review schedule");
    expect(output).toMatch(/role="status" class="[^"]*form-warning"/);
  });
  it("reports zero applied shifts without hiding the receipt", async () => {
    expect(await html(Promise.resolve({ applied: "0" }))).toContain("Applied 0 shifts.");
  });
  it("shows unavailable-template recovery and the save path for an empty library", async () => {
    f.templates = [];
    const output = await html(Promise.resolve({ week: "2026-10-12", error: "unavailable" }));
    expect(output).toContain('role="alert"');
    expect(output).toContain("Choose an active template");
    expect(output).toContain('id="st-template-name"');
    expect(output).toContain('minLength="3" maxLength="50" required=""');
  });
});

it('does not load templates or expose copy commands when company source is denied',async()=>{access.denied=true;const output=await html();expect(f.list).not.toHaveBeenCalled();expect(f.copy).not.toHaveBeenCalled();expect(output).toContain('<h1>Schedule templates</h1>');});

// This suite checks server-page composition. Mounted lifetime behavior has its own browser harness.
rs.mock('@/components/company-access/scoped-read-frame',()=>({ScopedReadFrame:({children,unavailable}:{children?:React.ReactNode;unavailable?:React.ReactNode})=>children??unavailable??null}));
