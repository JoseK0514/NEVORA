import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ proof: vi.fn(), admit: vi.fn(), allowed: vi.fn(), submit: vi.fn(), check: vi.fn(), active: vi.fn(), visible: vi.fn(), order: [] as string[] }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9" }) }));
vi.mock("@/lib/auth/session", () => ({ readSessionMutationProof: state.proof }));
vi.mock("@/lib/auth/login-limits.server", () => ({ admitLoginAttempt: state.admit, clientAddress: (value: string | null) => value }));
vi.mock("@/lib/auth/login-limits", () => ({ passwordLoginAllowed: state.allowed }));
vi.mock("@/lib/account-deletion/requests.server", () => ({ submitDeletionRequest: state.submit, checkDeletionRequest: state.check, activeDeletionRequest: state.active }));
vi.mock("@/lib/legal/policies", () => ({ POLICY_VERSION: "2026-10-20", policiesVisible: state.visible }));
import { requestAccountDeletion, type DeletionFormState } from "./actions";

const request = { reference: "DEL-7KQ2M9XA", status: "received", confirmedAt: "2030-01-01 10:00:00+00" };
const receipt = (kind: "received" | "duplicate") => ({ kind, reference: "DEL-7KQ2M9XA", confirmedAt: "2030-01-01 10:00:00+00" });
const idle: DeletionFormState = { kind: "idle" };
const form = (fields: Record<string, string> = {}) => { const data = new FormData(); for (const [key, value] of Object.entries({ account: "FICTIONAL-E1", password: "fictional-password", ...fields })) data.set(key, value); return data; };
const proof = { sessionTokenHash: "a".repeat(64), employee: { id: "FICTIONAL-E1", firstName: "Own", lastName: "Person", role: "EMPLOYEE", primaryLocationId: "loc-1" } };

beforeEach(() => {
  vi.clearAllMocks();
  state.order = [];
  state.visible.mockReturnValue(true);
  state.proof.mockResolvedValue(proof);
  state.admit.mockImplementation(async () => { state.order.push("admit"); return true; });
  state.allowed.mockImplementation(async () => { state.order.push("allowed"); return true; });
  state.submit.mockImplementation(async () => { state.order.push("submit"); return { outcome: "received", request }; });
  state.check.mockImplementation(async () => { state.order.push("check"); return { outcome: "none" }; });
  state.active.mockResolvedValue(null);
});

describe("requesting account deletion", () => {
  it("counts the password check like sign-in before submitting the signed-in person's request", async () => {
    await expect(requestAccountDeletion(idle, form())).resolves.toEqual(receipt("received"));
    expect(state.order).toEqual(["admit", "allowed", "submit"]);
    expect(state.admit).toHaveBeenCalledWith("FICTIONAL-E1", "203.0.113.9");
    expect(state.submit).toHaveBeenCalledWith({ employeeId: "FICTIONAL-E1", sessionTokenHash: proof.sessionTokenHash, password: "fictional-password", channel: "web", policyVersion: "2026-10-20" });
  });

  it("refuses a page that showed another account, without checking any password", async () => {
    await expect(requestAccountDeletion(idle, form({ account: "FICTIONAL-OTHER" }))).resolves.toEqual({ kind: "changed" });
    expect(state.admit).not.toHaveBeenCalled();
    expect(state.submit).not.toHaveBeenCalled();
  });

  it("stops at either sign-in limit before any password is checked", async () => {
    state.allowed.mockResolvedValueOnce(false);
    await expect(requestAccountDeletion(idle, form())).resolves.toEqual({ kind: "busy" });
    state.proof.mockResolvedValueOnce(null);state.allowed.mockResolvedValueOnce(false);
    await expect(requestAccountDeletion({ kind: "uncertain" }, form())).resolves.toEqual({ kind: "busy" });
    state.admit.mockResolvedValue(false);
    await expect(requestAccountDeletion(idle, form())).resolves.toEqual({ kind: "busy" });
    expect(state.submit).not.toHaveBeenCalled();
    expect(state.check).not.toHaveBeenCalled();
  });

  it("is unavailable while policies are hidden, and passes through wrong passwords", async () => {
    state.visible.mockReturnValue(false);
    await expect(requestAccountDeletion(idle, form())).resolves.toEqual({ kind: "unavailable" });
    state.visible.mockReturnValue(true);
    state.submit.mockResolvedValue({ outcome: "wrong_password" });
    await expect(requestAccountDeletion(idle, form())).resolves.toEqual({ kind: "wrong_password" });
  });

  it("reports a rolled-back request as failed only on a first attempt", async () => {
    state.submit.mockResolvedValue({ outcome: "failed" });
    await expect(requestAccountDeletion(idle, form())).resolves.toEqual({ kind: "failed" });
    // A later attempt being rolled back says nothing about whether an earlier unknown one was saved.
    await expect(requestAccountDeletion(idle, form({ retry: "1" }))).resolves.toEqual({ kind: "uncertain" });
  });

  it("never calls an unknown storage outcome a failure: it asks again and reports what is saved", async () => {
    state.submit.mockRejectedValue(new Error("fetch failed"));
    state.active.mockResolvedValue(request);
    await expect(requestAccountDeletion(idle, form())).resolves.toEqual(receipt("received"));
    state.active.mockResolvedValue(null);
    await expect(requestAccountDeletion(idle, form())).resolves.toEqual({ kind: "uncertain" });
    state.active.mockRejectedValue(new Error("fetch failed"));
    await expect(requestAccountDeletion(idle, form())).resolves.toEqual({ kind: "uncertain" });
  });

  it("calls the earlier request received when retrying finds it already open", async () => {
    state.submit.mockResolvedValue({ outcome: "duplicate", request });
    await expect(requestAccountDeletion({ kind: "uncertain" }, form())).resolves.toEqual(receipt("received"));
    await expect(requestAccountDeletion({ kind: "wrong_password" }, form({ retry: "1" }))).resolves.toEqual(receipt("received"));
    await expect(requestAccountDeletion(idle, form())).resolves.toEqual(receipt("duplicate"));
  });

  it("treats a limiter or session read failure as nothing sent, unless an earlier attempt is unknown", async () => {
    state.admit.mockRejectedValue(new Error("fetch failed"));
    await expect(requestAccountDeletion(idle, form())).resolves.toEqual({ kind: "failed" });
    await expect(requestAccountDeletion(idle, form({ retry: "1" }))).resolves.toEqual({ kind: "uncertain" });
    state.proof.mockRejectedValue(new Error("fetch failed"));
    await expect(requestAccountDeletion(idle, form())).resolves.toEqual({ kind: "failed" });
    await expect(requestAccountDeletion({ kind: "uncertain" }, form())).resolves.toEqual({ kind: "uncertain" });
    expect(state.submit).not.toHaveBeenCalled();
  });
});

describe("after acceptance ended the session", () => {
  beforeEach(() => state.proof.mockResolvedValue(null));

  it("recovers the reference with a counted password check, never a new request", async () => {
    state.check.mockImplementation(async () => { state.order.push("check"); return { outcome: "found", request }; });
    await expect(requestAccountDeletion({ kind: "uncertain" }, form())).resolves.toEqual(receipt("received"));
    expect(state.order).toEqual(["admit", "allowed", "check"]);
    expect(state.check).toHaveBeenCalledWith({ employeeId: "FICTIONAL-E1", password: "fictional-password" });
    expect(state.submit).not.toHaveBeenCalled();
  });

  it("says signed out (nothing deleted) when there is no open request, and keeps password and outage answers distinct", async () => {
    await expect(requestAccountDeletion({ kind: "uncertain" }, form())).resolves.toEqual({ kind: "signed_out" });
    state.check.mockResolvedValue({ outcome: "wrong_password" });
    await expect(requestAccountDeletion({ kind: "uncertain" }, form())).resolves.toEqual({ kind: "wrong_password" });
    state.check.mockRejectedValue(new Error("fetch failed"));
    await expect(requestAccountDeletion({ kind: "uncertain" }, form())).resolves.toEqual({ kind: "uncertain" });
  });

  it("does not check anything without the account the page showed", async () => {
    await expect(requestAccountDeletion(idle, form({ account: "" }))).resolves.toEqual({ kind: "signed_out" });
    expect(state.admit).not.toHaveBeenCalled();
    expect(state.check).not.toHaveBeenCalled();
  });
});
