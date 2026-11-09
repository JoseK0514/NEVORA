import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ query: vi.fn(), verify: vi.fn(), transaction: vi.fn() }));
vi.mock("@/lib/db", () => ({ getDb: () => ({ query: state.query }), queryRows: (rows: unknown) => rows }));
vi.mock("@/lib/auth/password", () => ({ verifyPassword: state.verify, dummyPasswordHash: async () => "fictional-dummy-hash" }));
vi.mock("@/lib/data/notification-transactions", () => ({ neonNotificationExecutor: () => ({ transaction: state.transaction }) }));
import { DELETION_REFERENCE, activeDeletionRequest, checkDeletionRequest, newDeletionReference, rejectedByDatabase, submitDeletionRequest } from "./requests.server";

const input = { employeeId: "FICTIONAL-E1", sessionTokenHash: "a".repeat(64), password: "fictional-password", channel: "web" as const, policyVersion: "2026-10-20-draft" };
const missingTable = Object.assign(new Error("relation does not exist"), { code: "42P01" });

beforeEach(() => {
  vi.clearAllMocks();
  state.verify.mockResolvedValue(true);
  state.query.mockImplementation(async (text: string) => text.includes("employee_credentials") ? [{ password_hash: "fictional-hash", password_updated_at: "2030-01-01 09:00:00+00" }] : []);
  state.transaction.mockImplementation(async (statements: { text: string; values: unknown[] }[]) =>
    [...statements.slice(0, -1).map(() => []), [{ reference: statements.find((s: { text: string; values: unknown[] }) => /INSERT INTO account_deletion_requests/.test(s.text))!.values[1], status: "received", confirmed_at: "2030-01-01 10:00:00+00", created: true }]]);
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
    expect(statements[4].text).toMatch(/INSERT INTO account_deletion_requests[\s\S]*ON CONFLICT \(employee_id\) WHERE status IN \('received', 'processing'\) DO NOTHING/);
    expect(statements[4].values).toEqual([expect.any(String), expect.stringMatching(DELETION_REFERENCE), "FICTIONAL-E1", "web", "2026-10-20-draft"]);
    expect(statements[5].text).toMatch(/DELETE FROM employee_sessions WHERE employee_id = \$1/);
    expect(statements[6].text).toMatch(/UPDATE employees SET updated_at = clock_timestamp\(\) WHERE id = \$1/);
    expect(statements[7].text).toMatch(/UPDATE calendar_subscriptions[\s\S]*'account_loss'/);
    expect(statements.every(statement => statement.values.includes("FICTIONAL-E1"))).toBe(true);
  });

  it("returns the open request instead of making another one, and still ends every session", async () => {
    state.transaction.mockImplementation(async (statements: unknown[]) =>
      [...statements.slice(0, -1).map(() => []), [{ reference: "DEL-7KQ2M9XA", status: "received", confirmed_at: "2030-01-01 10:00:00+00", created: false }]]);
    await expect(submitDeletionRequest(input)).resolves.toEqual({ outcome: "duplicate", request: { reference: "DEL-7KQ2M9XA", status: "received", confirmedAt: "2030-01-01 10:00:00+00" } });
    const statements = state.transaction.mock.calls[0][0] as { text: string }[];
    expect(statements.some(statement => /DELETE FROM employee_sessions/.test(statement.text))).toBe(true);
  });

  it("reports a concurrent confirmation as the same request", async () => {
    state.transaction.mockImplementation(async (statements: unknown[]) =>
      [...statements.slice(0, -1).map(() => []), [{ reference: "DEL-7KQ2M9XA", status: "received", confirmed_at: "2030-01-01", created: false }]]);
    await expect(submitDeletionRequest(input)).resolves.toMatchObject({ outcome: "duplicate", request: { reference: "DEL-7KQ2M9XA" } });
  });

  it("before migration 0034: no open requests, and a request is unavailable rather than lost", async () => {
    state.query.mockImplementation(async (text: string) => { if (text.includes("employee_credentials")) return [{ password_hash: "fictional-hash", password_updated_at: "2030-01-01 09:00:00+00" }]; throw missingTable; });
    await expect(activeDeletionRequest("FICTIONAL-E1")).resolves.toBeNull();
    state.transaction.mockRejectedValue(missingTable);
    await expect(submitDeletionRequest(input)).resolves.toEqual({ outcome: "unavailable" });
  });

  it("lets other storage failures surface so the form says it couldn't submit", async () => {
    state.transaction.mockRejectedValue(new Error("connection reset"));
    await expect(submitDeletionRequest(input)).rejects.toThrow("connection reset");
  });

  it("reports a rolled-back transaction as failed, but never a reply that may have followed COMMIT", async () => {
    state.transaction.mockRejectedValue(Object.assign(new Error("could not serialize access"), { code: "40001" }));
    await expect(submitDeletionRequest(input)).resolves.toEqual({ outcome: "failed" });
    for (const unknown of [new Error("fetch failed"), Object.assign(new Error("socket hang up"), { code: "ECONNRESET" }), Object.assign(new Error("odd"), { code: 7 }),
      ...["08006", "08007", "57P01", "40003", "53200", "XX000", "EPIPE"].map(code => Object.assign(new Error(code), { code }))]) {
      expect(rejectedByDatabase(unknown)).toBe(false);
      state.transaction.mockRejectedValueOnce(unknown);
      await expect(submitDeletionRequest(input)).rejects.toBe(unknown);
    }
    for (const code of ["23505", "22001", "42501", "P0001", "40001", "40P01"]) expect(rejectedByDatabase(Object.assign(new Error(code), { code })), code).toBe(true);
  });
});

describe("checking an own request without a session", () => {
  const check = { employeeId: "FICTIONAL-E1", password: "fictional-password" };
  const open = { reference: "DEL-7KQ2M9XA", status: "received", confirmed_at: "2030-01-01 10:00:00+00" };

  it("returns only this account's open request after the password matches", async () => {
    state.query.mockImplementation(async (text: string) => text.includes("employee_credentials") ? [{ password_hash: "fictional-hash", password_updated_at: "2030-01-01 09:00:00+00" }] : [open]);
    await expect(checkDeletionRequest(check)).resolves.toEqual({ outcome: "found", request: { reference: "DEL-7KQ2M9XA", status: "received", confirmedAt: "2030-01-01 10:00:00+00" } });
    const lookup = state.query.mock.calls.find(([text]) => String(text).includes("account_deletion_requests"))!;
    expect(lookup[0]).toMatch(/WHERE employee_id = \$1 AND status IN \('received', 'processing'\)/);
    expect(lookup[1]).toEqual(["FICTIONAL-E1"]);
    expect(state.transaction).not.toHaveBeenCalled();
  });

  it("says none when there is no open request", async () => {
    await expect(checkDeletionRequest(check)).resolves.toEqual({ outcome: "none" });
  });

  it("reads no request on a wrong password, and checks unknown IDs against a dummy hash", async () => {
    state.verify.mockResolvedValue(false);
    await expect(checkDeletionRequest(check)).resolves.toEqual({ outcome: "wrong_password" });
    state.query.mockResolvedValue([]);
    state.verify.mockResolvedValue(true);
    await expect(checkDeletionRequest({ ...check, employeeId: "FICTIONAL-UNKNOWN" })).resolves.toEqual({ outcome: "wrong_password" });
    expect(state.verify).toHaveBeenLastCalledWith("fictional-password", "fictional-dummy-hash");
    expect(state.query.mock.calls.some(([text]) => String(text).includes("account_deletion_requests"))).toBe(false);
  });

  it("is unavailable before migration 0034 and lets other storage errors surface", async () => {
    state.query.mockImplementation(async (text: string) => { if (text.includes("employee_credentials")) return [{ password_hash: "fictional-hash", password_updated_at: "2030-01-01 09:00:00+00" }]; throw missingTable; });
    await expect(checkDeletionRequest(check)).resolves.toEqual({ outcome: "unavailable" });
    state.query.mockImplementation(async (text: string) => { if (text.includes("employee_credentials")) return [{ password_hash: "fictional-hash", password_updated_at: "2030-01-01 09:00:00+00" }]; throw new Error("fetch failed"); });
    await expect(checkDeletionRequest(check)).rejects.toThrow("fetch failed");
  });
});
