import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ScheduleTemplatesPage from "./page";

const access=vi.hoisted(()=>({denied:false}));
vi.mock('@/lib/company-access/operational-scope.server',()=>({withOperationalCompany:async(_proof:unknown,load:()=>Promise<unknown>)=>access.denied?{state:'unavailable',reason:'access_denied'}:{state:'ready',data:await load(),coverage:{kind:'COMPANY',locationIds:[]},authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000}}));
const f = vi.hoisted(() => ({
  requireRoles: vi.fn(), requireProof: vi.fn(), list: vi.fn(), copy: vi.fn(),
  proof: { employee: { id: "manager", role: "MANAGER" }, sessionTokenHash: "a".repeat(64) },
  templates: [{ id: "pattern-1", name: "Regular week", shiftCount: 12, createdAt: "2026-10-01" }],
}));
vi.mock("next/link", () => ({ default: ({ children, ...props }: ComponentProps<"a">) => createElement("a", props, children), useLinkStatus: () => ({ pending: false }) }));
vi.mock("@/lib/auth/permissions", () => ({ MANAGER_ROLES: ["MANAGER", "OWNER"], requireRoles: f.requireRoles }));
vi.mock("@/lib/auth/session", () => ({ requireSessionMutationProof: f.requireProof }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), unstable_rethrow: () => {} }));
vi.mock("@/components/schedule-copy-form", async importOriginal => {
  const original = await importOriginal<typeof import("@/components/schedule-copy-form")>();
  return { ScheduleCopyForm: (props: ComponentProps<typeof original.ScheduleCopyForm>) => {
    f.copy(props);
    return createElement(original.ScheduleCopyForm, props);
  } };
});
vi.mock("@/lib/data/workspaces", () => ({ getWorkspace: async () => ({ timeZone: "America/Puerto_Rico" }) }));
vi.mock("@/lib/data/schedule-templates", () => ({ listScheduleTemplates: f.list }));
vi.mock("./actions", () => ({ saveTemplateAction: vi.fn(), applyTemplateAction: vi.fn(), archiveTemplateAction: vi.fn() }));

beforeEach(() => {
  access.denied=false;
  vi.useRealTimers();
  f.requireRoles.mockReset().mockResolvedValue({ id: "manager" });
  f.requireProof.mockReset().mockResolvedValue(f.proof);
  f.copy.mockReset();
  f.list.mockReset().mockImplementation(async () => f.templates);
  f.templates = [{ id: "pattern-1", name: "Regular week", shiftCount: 12, createdAt: "2026-10-01" }];
});
async function html(params: Parameters<typeof ScheduleTemplatesPage>[0]["searchParams"] = Promise.resolve({ week: "2026-10-12" })) {
  return renderToStaticMarkup(await ScheduleTemplatesPage({ searchParams: params }));
}

describe("schedule template workflow presentation", () => {
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
    expect(output).toContain('Oct 12 – 18');
  });
  it.each(["2026-10-13", "2030-02-30", "<script>", ""])("uses workspace-local current week for invalid input %s", async week => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-12T02:30:00Z"));
    const output = await html(Promise.resolve({ week }));
    expect(output).toContain('name="weekStart" value="2026-10-05"');
    vi.useRealTimers();
  });
  it("retains complete long names and escapes template content", async () => {
    f.templates = [{ id: "unsafe", name: "<script>alert('name')</script> & Operations", shiftCount: 1, createdAt: "2026-10-01" }];
    const output = await html();
    expect(output).not.toContain("<script>alert");
    expect(output).toContain("&lt;script&gt;");
    expect(output).toContain(">1 shift</b>");
    expect(output).toContain("Use for Oct 12 – 18");
    expect(output).toContain("Archive");
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

it('does not load templates or expose copy commands when company source is denied',async()=>{access.denied=true;const output=await html();expect(f.list).not.toHaveBeenCalled();expect(f.copy).not.toHaveBeenCalled();expect(output).toContain('Schedule templates unavailable');});

// This suite checks server-page composition. Mounted lifetime behavior has its own browser harness.
vi.mock('@/components/company-access/scoped-read-frame',()=>({ScopedReadFrame:({children,unavailable}:{children?:React.ReactNode;unavailable?:React.ReactNode})=>children??unavailable??null}));
