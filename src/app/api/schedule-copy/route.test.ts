import { afterEach, beforeEach, expect, it, rs } from "@rstest/core";
import { POST } from "./route";

const db = rs.hoisted(() => ({ execute: rs.fn(), recover: rs.fn() }));
rs.mock("@/lib/auth/session", () => ({
  getSession: async () => ({ id: "owner", role: "OWNER" }),
  requireSessionMutationProof: async () => ({ employee: { id: "owner" } }),
}));
rs.mock("@/lib/data/schedule-copy", () => ({
  executeScheduleCopy: db.execute, readScheduleCopyCommand: db.recover,
}));

const operationId = "11111111-1111-4111-8111-111111111111";
const command = { operationId, weekStart: "2026-11-23", kind: "PREVIOUS_WEEK" };
function post(body: unknown) {
  return POST(new Request("http://localhost/api/schedule-copy", {
    method: "POST", body: JSON.stringify(body),
    headers: { origin: "http://localhost", host: "localhost", "content-type": "application/json",
      "x-nevora-schedule-copy": "1", "x-nevora-actor": "owner" },
  }));
}
beforeEach(() => { rs.resetAllMocks(); rs.stubEnv("FUEL_PORTAL_ORIGIN", "http://localhost"); });

afterEach(() => { rs.unstubAllEnvs(); });

it("identifies an invalid command without starting a copy", async () => {
  const response = await post({ ...command, weekStart: "2026-11-24" });
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ state: "invalid", operationId });
  expect(db.execute).not.toHaveBeenCalled();
});
it("identifies a rejected operation so the browser can release just that copy", async () => {
  db.execute.mockRejectedValue(new Error("COPY_COMMAND_CONFLICT"));
  const response = await post(command);
  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({ state: "conflict", operationId });
});
it("preserves uncertainty when the stored command cannot be read", async () => {
  db.recover.mockRejectedValue(new Error("database unavailable"));
  const response = await post({ recover: operationId });
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ state: "unconfirmed" });
  expect(db.execute).not.toHaveBeenCalled();
});
it("recovers the receipt's stored command and returns its reference", async () => {
  db.recover.mockResolvedValue(command);
  db.execute.mockResolvedValue({ operationId });
  const response = await post({ recover: operationId });
  expect(db.execute).toHaveBeenCalledWith(expect.anything(), command);
  expect(await response.json()).toEqual({ state: "complete", operationId });
});
