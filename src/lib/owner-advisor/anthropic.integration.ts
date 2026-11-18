import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, expect, it, rs } from '@rstest/core';
import { companyAccessFixture } from "@/test/integration/company-access-fixture";
import { advisorService } from "./service.server";

let f: Awaited<ReturnType<typeof companyAccessFixture>>;
beforeEach(async () => { f = await companyAccessFixture(); rs.spyOn(console, "info").mockImplementation(() => {}); rs.spyOn(Date, "now").mockReturnValue(Date.parse("2026-11-15T12:00:00Z")); });
afterEach(async () => { rs.restoreAllMocks(); await f?.db.dispose(); });
const env = {
  NEVORA_OWNER_ADVISOR_ENABLED: "true", NEVORA_OWNER_ADVISOR_DATA_APPROVED: "true",
  NEVORA_OWNER_ADVISOR_PROVIDER: "anthropic", NEVORA_OWNER_ADVISOR_API_STYLE: "anthropic_messages",
  NEVORA_OWNER_ADVISOR_MODEL: "claude-sonnet-5-5", NEVORA_OWNER_ADVISOR_DAILY_LIMIT: "1",
  ANTHROPIC_API_KEY: "fictional-key", NEVORA_OWNER_ADVISOR_ANTHROPIC_CREDIT_EXPIRES_AT: "2026-11-18T00:00:00Z",
};
const wire = (content: unknown[] = [{ type: "text", text: "Solo observaciones actuales; no se guardó ningún cambio." }], stop_reason = "end_turn") => Response.json({
  id: "msg_fictional", type: "message", role: "assistant", model: "claude-sonnet-5-5", content, stop_reason,
  stop_sequence: null, usage: { input_tokens: 100, output_tokens: 20 },
});
const command = () => ({ op: "ask", requestId: randomUUID(), message: "Consulta los datos registrados y responde en español." });
const signal = () => new AbortController().signal;

it("uses current Owner authority, scoped persistence, exact replay and the existing daily reservation", async () => {
  const fetch = rs.fn(async () => wire());
  await expect(advisorService(f.manager, f.db.executor, env, signal(), command(), fetch)).rejects.toThrow();
  expect(fetch).not.toHaveBeenCalled();
  const c = command();
  const first = await advisorService(f.owner, f.db.executor, env, signal(), c, fetch);
  const replay = await advisorService(f.owner, f.db.executor, env, signal(), c, fetch);
  expect(first).toMatchObject({ state: "answered", answer: { text: "Solo observaciones actuales; no se guardó ningún cambio." } });
  if (first.state !== "answered") throw new Error("Expected an answered command");
  expect(replay).toMatchObject({ state: "answered", answer: first.answer });
  expect(fetch).toHaveBeenCalledTimes(1);
  await expect(advisorService(f.owner, f.db.executor, env, signal(), command(), fetch)).rejects.toThrow();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(await f.q("SELECT count(*)::int n FROM owner_advisor_requests WHERE state='completed' AND workspace_id='workspace-fuel' AND owner_id='owner'")).toEqual([{ n: 1 }]);
});

it("rejects model-supplied workplace scope before a requested read and retains the uncertain attempt", async () => {
  const fetch = rs.fn(async () => wire([{ type: "tool_use", id: "foreign-scope", name: "published_staffing", input: { date: "2026-11-15", workspaceId: "foreign-private-company" } }], "tool_use"));
  await expect(advisorService(f.owner, f.db.executor, env, signal(), command(), fetch)).rejects.toThrow("invalid");
  expect(await f.q("SELECT history FROM owner_advisor_profiles")).toEqual([]);
  await expect(advisorService(f.owner, f.db.executor, env, signal(), command(), fetch)).rejects.toThrow();
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("discards native output after authority changes during inference", async () => {
  const fetch = rs.fn(async () => { await f.q("UPDATE employees SET role='MANAGER' WHERE id='owner'"); return wire(); });
  await expect(advisorService(f.owner, f.db.executor, env, signal(), command(), fetch)).rejects.toThrow();
  expect(await f.q("SELECT history FROM owner_advisor_profiles")).toEqual([]);
  expect(await f.q("SELECT count(*)::int n FROM owner_advisor_requests WHERE state='completed'")).toEqual([{ n: 0 }]);
});
