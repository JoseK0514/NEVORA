import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ role: "EMPLOYEE" as string | null, enabled: true, document: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({
  getSession: async () => (state.role ? { id: "fictional", role: state.role } : null),
  requireSessionMutationProof: async () => ({ employee: { id: "fictional", role: state.role } }),
}));
vi.mock("@/lib/payroll/access", () => ({ document: state.document }));
vi.mock("@/lib/workspace-presentation/current.server", () => ({ moduleEnabled: async () => state.enabled }));
import { GET as view } from "./route";
import { GET as download } from "../route";

const id = "11111111-1111-4111-8111-111111111111";
const call = (handler: typeof view) => handler(new Request(`https://qa.example/api/payroll/documents/${id}`), { params: Promise.resolve({ id }) });
beforeEach(() => {
  state.role = "EMPLOYEE"; state.enabled = true; state.document.mockReset();
  state.document.mockResolvedValue({ bytes: Buffer.from("%PDF-fictional"), contentType: "application/pdf", filename: "statement.pdf", sha256: "a".repeat(64) });
});

it.each([["view", view], ["download", download]] as const)("P4 %s: with Pay statements off, an employee or lead can't open a statement by URL", async (_name, handler) => {
  state.enabled = false;
  for (const role of ["EMPLOYEE", "LEAD"]) {
    state.role = role;
    const response = await call(handler);
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: "MODULE_OFF" });
  }
  expect(state.document).not.toHaveBeenCalled();
});
it.each([["view", view], ["download", download]] as const)("P4 %s: with it on, the statement opens; owners are never blocked by the toggle", async (_name, handler) => {
  expect((await call(handler)).status).toBe(200);
  state.enabled = false; state.role = "OWNER";
  expect((await call(handler)).status).toBe(200);
});
