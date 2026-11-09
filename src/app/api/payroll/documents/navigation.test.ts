import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ session: vi.fn(), proof: vi.fn(), document: vi.fn(), module: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getSession: state.session, requireSessionMutationProof: state.proof }));
vi.mock("@/lib/payroll/access", () => ({ document: state.document }));
vi.mock("@/lib/workspace-presentation/current.server", () => ({ moduleEnabled: state.module }));
import { PayrollError } from "@/lib/payroll/model";
import { navigationFailure } from "./navigation";
import { GET as download } from "./[id]/route";
import { GET as view } from "./[id]/view/route";

const id = "3f2b8c1e-9a4d-4e7f-8b21-6c5d4e3f2a10";
const context = { params: Promise.resolve({ id }) };
const navigate = (route = "") => new Request(`http://fictional.test/api/payroll/documents/${id}${route}`, { headers: { "sec-fetch-mode": "navigate", "sec-fetch-site": "same-origin", accept: "text/html" } });
const scripted = (route = "") => new Request(`http://fictional.test/api/payroll/documents/${id}${route}`, { headers: { "sec-fetch-mode": "cors", "sec-fetch-site": "same-origin", accept: "*/*" } });
const employee = { id: "FICTIONAL-E1", role: "EMPLOYEE" };
const bytes = Buffer.from("%PDF-1.7 fictional");

beforeEach(() => {
  vi.clearAllMocks();
  state.session.mockResolvedValue(employee);
  state.proof.mockResolvedValue({ employee, sessionTokenHash: "a".repeat(64) });
  state.module.mockResolvedValue(true);
  state.document.mockResolvedValue({ id, filename: "statement-2030-01-10.pdf", sha256: "f".repeat(64), bytes, contentType: "application/pdf" });
});

describe("opening a pay statement", () => {
  it.each([["download", download, "attachment"], ["view", view, "inline"]] as const)("%s returns the verified bytes, never cached", async (_name, route, disposition) => {
    const response = await route(navigate(route === view ? "/view" : ""), context);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toBe(`${disposition}; filename="statement-2030-01-10.pdf"`);
    expect(response.headers.get("Cache-Control")).toBe("no-store, private");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
  });

  it.each([[download, ""], [view, "/view"]] as const)("sends an Employee back to My pay when the statement is unavailable or fails its check", async (route, suffix) => {
    state.document.mockRejectedValueOnce(new PayrollError("DOCUMENT_UNAVAILABLE", 404));
    const missing = await route(navigate(suffix), context);
    expect(missing.status).toBe(303);
    expect(missing.headers.get("Location")).toBe("/app/my-pay?document=unavailable");
    expect(missing.headers.get("Cache-Control")).toBe("no-store");
    state.document.mockRejectedValueOnce(new PayrollError("DOCUMENT_UNAVAILABLE", 503));
    expect((await route(navigate(suffix), context)).headers.get("Location")).toBe("/app/my-pay?document=failed");
    // Any other server failure is temporary, never reported as a file-check failure (PAY-CR-1).
    for (const temporary of [new PayrollError("PAYROLL_DISABLED", 503), new PayrollError("CONFLICT", 503), new Error("connection reset")]) {
      state.document.mockRejectedValueOnce(temporary);
      expect((await route(navigate(suffix), context)).headers.get("Location")).toBe("/app/my-pay?document=temporary");
    }
    state.module.mockResolvedValue(false);
    expect((await route(navigate(suffix), context)).headers.get("Location")).toBe("/app/my-pay?document=unavailable");
    expect(state.document).toHaveBeenCalledTimes(5);
  });

  it("sends an ended session to sign-in, returning to My pay", async () => {
    state.session.mockResolvedValue(null);
    const response = await view(navigate("/view"), context);
    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe("/login?returnTo=%2Fapp%2Fmy-pay");
    expect(state.document).not.toHaveBeenCalled();
  });

  it("keeps the JSON contract for scripted reads and for signed-in management", async () => {
    state.document.mockRejectedValue(new PayrollError("DOCUMENT_UNAVAILABLE", 404));
    const scriptedFailure = await download(scripted(), context);
    expect(scriptedFailure.status).toBe(404);
    expect(await scriptedFailure.json()).toMatchObject({ error: "DOCUMENT_UNAVAILABLE" });
    state.session.mockResolvedValue({ id: "FICTIONAL-M1", role: "MANAGER" });
    const manager = await download(navigate(), context);
    expect(manager.status).toBe(404);
    expect(manager.headers.get("Location")).toBeNull();
    state.session.mockResolvedValue(null);
    expect((await download(scripted(), context)).status).toBe(401);
    // Without a session the role is unknown: every navigation, management's too, goes to sign-in (PAY-CR-4).
    expect((await download(navigate(), context)).headers.get("Location")).toBe("/login?returnTo=%2Fapp%2Fmy-pay");
  });

  it("treats a request without fetch metadata as a navigation only when it asks for HTML", () => {
    const plain = (accept: string) => new Request("http://fictional.test/x", { headers: { accept } });
    expect(navigationFailure(plain("text/html,application/xhtml+xml"), "unavailable", "LEAD")?.headers.get("Location")).toBe("/app/my-pay?document=unavailable");
    expect(navigationFailure(plain("application/json"), "unavailable", "LEAD")).toBeNull();
    expect(navigationFailure(navigate(), "unavailable", "OWNER")).toBeNull();
  });
});
