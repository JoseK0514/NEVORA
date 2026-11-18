import { afterEach, beforeEach, describe, expect, it, rs } from '@rstest/core';
import { readConfig, type ProviderConfig } from "./config.server";
import { investigate } from "./loop.server";
import type { ToolCall, ToolResult } from "./contracts";

const config = {
  endpoint: "https://api.anthropic.com/v1/messages", apiStyle: "anthropic_messages",
  model: "claude-sonnet-5-5", key: "fictional-anthropic-key", dailyLimit: 3,
  creditExpiresAt: "2026-11-18T00:00:00Z",
} satisfies ProviderConfig;
const env = {
  NEVORA_OWNER_ADVISOR_ENABLED: "true", NEVORA_OWNER_ADVISOR_DATA_APPROVED: "true",
  NEVORA_OWNER_ADVISOR_PROVIDER: "anthropic", NEVORA_OWNER_ADVISOR_API_STYLE: "anthropic_messages",
  NEVORA_OWNER_ADVISOR_MODEL: "claude-sonnet-5-5", ANTHROPIC_API_KEY: "fictional-anthropic-key",
  NEVORA_OWNER_ADVISOR_DAILY_LIMIT: "3", NEVORA_OWNER_ADVISOR_ANTHROPIC_CREDIT_EXPIRES_AT: "2026-11-18T00:00:00Z",
};
const usage = { input_tokens: 100, output_tokens: 20 };
const text = (value = "Dos turnos registrados; consulta la fuente.") => ({ type: "text", text: value });
const call = (id: string, name = "published_staffing", input: Record<string, unknown> = { date: "2026-11-15" }) => ({ type: "tool_use", id, name, input });
const turn = (content: unknown[] = [text()], stop_reason = "end_turn") => ({
  id: "msg_fictional", type: "message", role: "assistant", model: "claude-sonnet-5-5", content, stop_reason, stop_sequence: null, usage,
});
const dependencies = () => ({
  signal: new AbortController().signal, check: rs.fn(async () => {}),
  tool: rs.fn(async (_call: ToolCall): Promise<ToolResult> => ({ observedAt: "2026-11-15T12:00:00Z", sources: [{ label: "Today", href: "/app", observedAt: "2026-11-15T12:00:00Z" }], partial: false, data: { scheduled: 2 } })),
});
beforeEach(() => { rs.spyOn(Date, "now").mockReturnValue(Date.parse("2026-11-15T12:00:00Z")); });
afterEach(() => { rs.restoreAllMocks(); rs.useRealTimers(); });

describe("direct Anthropic Owner adapter", () => {
  it("requires the selected protocol, supported model, key, approval and future credit cutoff", () => {
    expect(readConfig(env)).toMatchObject(config);
    for (const patch of [
      { ANTHROPIC_API_KEY: "" }, { NEVORA_OWNER_ADVISOR_API_STYLE: "responses" },
      { NEVORA_OWNER_ADVISOR_PROVIDER: "neon" }, { NEVORA_OWNER_ADVISOR_MODEL: "guessed-model" },
      { NEVORA_OWNER_ADVISOR_DATA_APPROVED: "false" }, { NEVORA_OWNER_ADVISOR_ANTHROPIC_CREDIT_EXPIRES_AT: "" },
      { NEVORA_OWNER_ADVISOR_ANTHROPIC_CREDIT_EXPIRES_AT: "2020-01-01T00:00:00Z" },
      { NEVORA_OWNER_ADVISOR_ANTHROPIC_CREDIT_EXPIRES_AT: "2030-01-01T00:00:00Z" },
    ]) expect(readConfig({ ...env, ...patch })).toBeNull();
  });

  it("sends native authentication and preserves Spanish history, current reads and source ownership", async () => {
    const log = rs.spyOn(console, "info").mockImplementation(() => {});
    const fetch = rs.fn(async (_url: string, _init: RequestInit) => Response.json(turn()));
    const result = await investigate(config, [{ role: "user", content: "English first." }, { role: "assistant", content: "Historical answer." }], "", "Continúa en español.", { ...dependencies(), fetch });
    expect(result.text).toBe("Dos turnos registrados; consulta la fuente.");
    expect(result.sources).toEqual([{ label: "Today", href: "/app", observedAt: "2026-11-15T12:00:00Z" }]);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(init.headers).toMatchObject({ "x-api-key": "fictional-anthropic-key", "anthropic-version": "2026-10-21" });
    expect(init.headers).not.toHaveProperty("Authorization");
    const body = JSON.parse(String(init.body));
    expect(body.system).toContain("You are Rondo");
    expect(body.messages[0]).toEqual({ role: "user", content: [{ type: "text", text: "English first." }] });
    expect(JSON.stringify(body.messages)).toContain("Continúa en español.");
    expect(body.messages.at(-1).content[0]).toMatchObject({ type: "tool_result", content: expect.stringContaining('"scheduled":2') });
    expect(body.tools[0]).toMatchObject({ name: "company_briefing", input_schema: { type: "object" } });
    expect(body.max_tokens).toBe(4096);
    expect(body.output_config).toEqual({ effort: "medium" });
    expect(body).not.toHaveProperty("store");
    expect(JSON.stringify(body)).not.toContain(config.key);
    expect(log).toHaveBeenCalledWith("owner_advisor_provider_usage", expect.objectContaining({ inputTokens: 100, outputTokens: 20, estimatedMicrousd: "400" }));
  });

  it("preserves signed thinking and parallel tool results with a stable prefix", async () => {
    rs.spyOn(console, "info").mockImplementation(() => {});
    const blocks = [{ type: "thinking", thinking: "", signature: "opaque-fixture-signature" }, text("I will inspect recorded facts."), call("read-1"), call("read-2", "coverage_investigation")];
    const outputs = [turn(blocks, "tool_use"), turn()];
    const fetch = rs.fn(async (_url: string, _init: RequestInit) => Response.json(outputs.shift()));
    const d = dependencies();
    await investigate(config, [], "", "Compare coverage.", { ...d, fetch });
    const first = JSON.parse(String(fetch.mock.calls[0][1].body)), next = JSON.parse(String(fetch.mock.calls[1][1].body));
    expect(next.system).toBe(first.system);
    expect(next.tools).toEqual(first.tools);
    expect(next.messages.slice(0, first.messages.length)).toEqual(first.messages);
    expect(next.messages.at(-2)).toEqual({ role: "assistant", content: blocks });
    expect(next.messages.at(-1).content.map((v: { tool_use_id: string }) => v.tool_use_id)).toEqual(["read-1", "read-2"]);
    expect(JSON.parse(first.messages.at(-1).content[0].content).providerBudget).toEqual({ remainingToolReviewSlots: 7, remainingReviewAttempts: 2 });
    expect(JSON.parse(next.messages.at(-1).content[0].content).providerBudget).toEqual({ remainingToolReviewSlots: 5, remainingReviewAttempts: 2 });
    expect(d.tool.mock.calls.map(([value]) => value.name)).toEqual(["company_briefing", "published_staffing", "coverage_investigation"]);
  });

  it("appends current review allowance after a rejected decision without changing signed instructions", async () => {
    rs.spyOn(console, "info").mockImplementation(() => {});
    const outputs = [turn([call("review-1", "review_decision", {})], "tool_use"), turn()];
    const fetch = rs.fn(async (_url: string, _init: RequestInit) => Response.json(outputs.shift()));
    await expect(investigate(config, [], "", "Inspect.", { ...dependencies(), fetch })).rejects.toThrow("provider_failed");
    const first = JSON.parse(String(fetch.mock.calls[0][1].body)), next = JSON.parse(String(fetch.mock.calls[1][1].body));
    expect(next.system).toBe(first.system);
    expect(JSON.parse(next.messages.at(-1).content[0].content).providerBudget).toEqual({ remainingToolReviewSlots: 6, remainingReviewAttempts: 1 });
  });

  it.each([
    turn([call("same"), call("same")], "tool_use"), turn([call("valid"), call("forged", "publish_schedule")], "tool_use"),
    turn([text()], "max_tokens"), turn([text()], "refusal"), turn([{ type: "server_tool_use", id: "forged" }], "tool_use"),
    turn([call("bad")], "end_turn"), { ...turn(), role: "user" }, { ...turn(), model: "different-model" },
  ])("rejects an invalid or unauthorized turn before any model-requested read %#", async wire => {
    rs.spyOn(console, "info").mockImplementation(() => {});
    const d = dependencies();
    const fetch = rs.fn(async () => Response.json(wire));
    await expect(investigate(config, [], "", "Inspect.", { ...d, fetch })).rejects.toThrow();
    expect(d.tool).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([429, 500, 529])("returns a safe failure and never retries or falls back after HTTP %i", async status => {
    const fetch = rs.fn(async () => new Response('PRIVATE_UPSTREAM_DETAIL', { status }));
    await expect(investigate(config, [], "", "Inspect.", { ...dependencies(), fetch })).rejects.toMatchObject({ message: "provider_failed", providerStatus: status });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("rechecks credit expiry before every provider dispatch", async () => {
    rs.spyOn(console, "info").mockImplementation(() => {});
    rs.mocked(Date.now).mockReturnValue(Date.parse("2026-11-17T23:59:59Z"));
    const fetch = rs.fn(async () => { rs.mocked(Date.now).mockReturnValue(Date.parse("2026-11-18T00:00:01Z")); return Response.json(turn([call("read-1")], "tool_use")); });
    await expect(investigate(config, [], "", "Inspect.", { ...dependencies(), fetch })).rejects.toThrow("unavailable");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("rejects a later configured cutoff even before the verified grant expires", async () => {
    const fetch = rs.fn(async () => Response.json(turn()));
    await expect(investigate({ ...config, creditExpiresAt: "2030-01-01T00:00:00Z" }, [], "", "Inspect.", { ...dependencies(), fetch })).rejects.toThrow("unavailable");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects a reused native tool identity before executing that second read", async () => {
    rs.spyOn(console, "info").mockImplementation(() => {});
    const outputs = [turn([call("same-id")], "tool_use"), turn([call("same-id")], "tool_use"), turn()];
    const fetch = rs.fn(async () => Response.json(outputs.shift()));
    const d = dependencies();
    await expect(investigate(config, [], "", "Inspect.", { ...d, fetch })).rejects.toThrow("provider_failed");
    expect(d.tool).toHaveBeenCalledTimes(2); // Mandatory briefing and first admitted read.
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("bounds UTF8 request bytes before native dispatch", async () => {
    const fetch = rs.fn(async () => Response.json(turn()));
    await expect(investigate(config, [{ role: "user", content: "😀".repeat(66000) }], "", "Inspect.", { ...dependencies(), fetch })).rejects.toThrow("limit");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("cancels an uncooperative native transport when the caller cancels", async () => {
    const controller = new AbortController();
    const fetch = rs.fn(() => { queueMicrotask(() => controller.abort()); return new Promise<Response>(() => {}); });
    await expect(investigate(config, [], "", "Inspect.", { ...dependencies(), signal: controller.signal, fetch })).rejects.toThrow("cancelled");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
