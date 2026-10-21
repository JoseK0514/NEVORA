import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ query: vi.fn(), verify: vi.fn(), transaction: vi.fn() }));
vi.mock("@/lib/db", () => ({ getDb: () => ({ query: state.query }), queryRows: (rows: unknown) => rows }));
vi.mock("@/lib/auth/password", () => ({ verifyPassword: state.verify }));
vi.mock("@/lib/data/notification-transactions", () => ({ neonNotificationExecutor: () => ({ transaction: state.transaction }) }));
import { DELETION_REFERENCE, activeDeletionRequest, newDeletionReference, submitDeletionRequest } from "./requests.server";

const input = { employeeId: "FICTIONAL-E1", password: "fictional-password", channel: "web" as const, policyVersion: "2026-10-20-draft" };
const missingTable = Object.assign(new Error("relation does not exist"), { code: "42P01" });

beforeEach(() => {
  vi.clearAllMocks();
  state.verify.mockResolvedValue(true);
  state.query.mockImplementation(async (text: string) => text.includes("employee_credentials") ? [{ password_hash: "fictional-hash" }] : []);
  state.transaction.mockImplementation(async (statements: { values: unknown[] }[]) =>
    [...statements.slice(0, -1).map(() => []), [{ reference: statements[1].values[1], status: "received", confirmed_at: "2030-01-01 10:00:00+00", created: true }]]);
});

describe("account deletion requests", () => {
  it("makes readable references without 0, O, 1 or I", () => {
    for (let i = 0; i < 50; i++) expect(newDeletionReference()).toMatch(DELETION_REFERENCE);
    expect(newDeletionReference(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 31]))).toBe("DEL-ABCDEFG9");
  });

  it("refuses without the right password and saves nothing", async () => {
    state.verify.mockResolvedValue(false);
    await expect(submitDeletionRequest(input)).resolves.toEqual({ outcome: "wrong_password" });
    await expect(submitDeletionRequest({ ...input, password: "" })).resolves.toEqual({ outcome: "wrong_password" });
    expect(state.transaction).not.toHaveBeenCalled();
  });

  it("saves the request, ends every session and revokes calendar feeds in one transaction", async () => {
    const result = await submitDeletionRequest(input);
    expect(result).toMatchObject({ outcome: "received", request: { status: "received" } });
    const statements = state.transaction.mock.calls[0][0] as { text: string; values: unknown[] }[];
    expect(statements[0].text).toMatch(/FOR UPDATE/);
    expect(statements[1].text).toMatch(/INSERT INTO account_deletion_requests[\s\S]*ON CONFLICT \(employee_id\) WHERE status IN \('received', 'processing'\) DO NOTHING/);
    expect(statements[1].values).toEqual([expect.any(String), expect.stringMatching(DELETION_REFERENCE), "FICTIONAL-E1", "web", "2026-10-20-draft"]);
    expect(statements[2].text).toMatch(/DELETE FROM employee_sessions WHERE employee_id = \$1/);
    expect(statements[3].text).toMatch(/UPDATE calendar_subscriptions[\s\S]*'account_loss'/);
    expect(statements.every(statement => statement.values.includes("FICTIONAL-E1"))).toBe(true);
  });

  it("returns the open request instead of making another one", async () => {
    state.query.mockImplementation(async (text: string) => text.includes("employee_credentials") ? [{ password_hash: "fictional-hash" }]
      : [{ reference: "DEL-7KQ2M9XA", status: "received", confirmed_at: "2030-01-01 10:00:00+00" }]);
    await expect(submitDeletionRequest(input)).resolves.toEqual({ outcome: "duplicate", request: { reference: "DEL-7KQ2M9XA", status: "received", confirmedAt: "2030-01-01 10:00:00+00" } });
    expect(state.transaction).not.toHaveBeenCalled();
  });

  it("reports a concurrent confirmation as the same request", async () => {
    state.transaction.mockImplementation(async (statements: unknown[]) =>
      [...statements.slice(0, -1).map(() => []), [{ reference: "DEL-7KQ2M9XA", status: "received", confirmed_at: "2030-01-01", created: false }]]);
    await expect(submitDeletionRequest(input)).resolves.toMatchObject({ outcome: "duplicate", request: { reference: "DEL-7KQ2M9XA" } });
  });

  it("before migration 0034: no open requests, and a request is unavailable rather than lost", async () => {
    state.query.mockImplementation(async (text: string) => { if (text.includes("employee_credentials")) return [{ password_hash: "fictional-hash" }]; throw missingTable; });
    await expect(activeDeletionRequest("FICTIONAL-E1")).resolves.toBeNull();
    state.transaction.mockRejectedValue(missingTable);
    await expect(submitDeletionRequest(input)).resolves.toEqual({ outcome: "unavailable" });
  });

  it("lets other storage failures surface so the form says it couldn't submit", async () => {
    state.transaction.mockRejectedValue(new Error("connection reset"));
    await expect(submitDeletionRequest(input)).rejects.toThrow("connection reset");
  });
});
