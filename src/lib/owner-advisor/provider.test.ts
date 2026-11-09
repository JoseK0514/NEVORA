import { describe, expect, it, vi } from "vitest";
import { readConfig } from "./config.server";
import { investigate } from "./loop.server";
import type { ToolCall, ToolResult } from "./contracts";

const base = "https://br-fictional-review-api.ai.us-east-2.aws.neon.tech";
const env = {
  NEVORA_OWNER_ADVISOR_ENABLED: "true", NEVORA_OWNER_ADVISOR_DATA_APPROVED: "true",
  NEVORA_OWNER_ADVISOR_PROVIDER: "neon", NEVORA_OWNER_ADVISOR_MODEL: "explicit-fictional-model",
  NEVORA_OWNER_ADVISOR_DAILY_LIMIT: "3", NEON_AI_GATEWAY_TOKEN: "fictional-private-key",
  NEON_AI_GATEWAY_BASE_URL: base,
};
const config = { endpoint: base + "/v1/chat/completions", apiStyle: "chat_completions" as const, model: "explicit-fictional-model", key: "fictional-private-key", dailyLimit: 3 };
const chat = (content: unknown = "Two current shifts; verify the linked source.", toolCalls?: unknown[]) => ({
  id: "chat-fixture", object: "chat.completion", choices: [{ index: 0, finish_reason: toolCalls ? "tool_calls" : "stop", message: { role: "assistant", content, ...(toolCalls ? { tool_calls: toolCalls } : {}) } }],
});
const toolCall = (id: string, name = "published_staffing", args = '{"date":"2026-10-30"}') => ({ id, type: "function", function: { name, arguments: args } });
const responseText = { output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text: "Current evidence, not a saved action." }] }] };
const dependencies = () => ({
  signal: new AbortController().signal, check: vi.fn(async () => {}),
  tool: vi.fn(async (_call: ToolCall): Promise<ToolResult> => ({ observedAt: "2026-10-30T12:00:00Z", sources: [{ label: "Today", href: "/app", observedAt: "2026-10-30T12:00:00Z" }], partial: false, data: { date: "2026-10-30", scheduled: 2 } })),
});
function fixtureFetch(responses: unknown[]) {
  return vi.fn(async (_url: string, _init: RequestInit) => Response.json(responses.shift()));
}

describe("explicit provider routing", () => {
  it("selects the unified Neon route only with the explicit API style", () => {
    expect(readConfig(env)?.endpoint).toBe(base + "/openai/v1/responses");
    expect(readConfig({ ...env, NEVORA_OWNER_ADVISOR_API_STYLE: "chat_completions" })).toMatchObject({ endpoint: base + "/v1/chat/completions", apiStyle: "chat_completions" });
    expect(readConfig({ ...env, NEVORA_OWNER_ADVISOR_PROVIDER: "openai", OPENAI_API_KEY: "fictional-openai", NEVORA_OWNER_ADVISOR_API_STYLE: "chat_completions" })?.endpoint).toBe("https://api.openai.com/v1/chat/completions");
  });
  it.each(["", "automatic", "anthropic", "chat_completions "])("fails closed on unsupported style %j", style => {
    expect(readConfig({ ...env, NEVORA_OWNER_ADVISOR_API_STYLE: style })).toBeNull();
  });
  it("accepts explicit Responses reasoning effort and rejects incompatible chat configuration", () => {
    expect(readConfig({ ...env, NEVORA_OWNER_ADVISOR_REASONING_EFFORT: "high" })).toMatchObject({ reasoningEffort: "high" });
    expect(readConfig({ ...env, NEVORA_OWNER_ADVISOR_REASONING_EFFORT: "unlimited" })).toBeNull();
    expect(readConfig({ ...env, NEVORA_OWNER_ADVISOR_API_STYLE: "chat_completions", NEVORA_OWNER_ADVISOR_REASONING_EFFORT: "high" })).toBeNull();
  });
});

it("uses the Chat Completions wire format without unsupported parallel or reasoning parameters", async () => {
  const fetch = fixtureFetch([chat()]);
  const result = await investigate(config, [], "Protect coverage", "What is recorded?", { ...dependencies(), fetch });
  expect(result.text).toBe("Two current shifts; verify the linked source.");
  const [url, init] = fetch.mock.calls[0];
  expect(url).toBe(base + "/v1/chat/completions");
  const body = JSON.parse(String(init.body));
  expect(body.messages[0]).toMatchObject({ role: "system", content: expect.any(String) });
  expect(body.messages.at(-1).content).toContain('"scheduled":2');
  expect(body.tools[0]).toMatchObject({ type: "function", function: { name: "company_briefing", parameters: { type: "object" } } });
  expect(body.max_tokens).toBe(4096);
  expect(body).not.toHaveProperty("parallel_tool_calls");
  expect(body).not.toHaveProperty("reasoning");
  expect(body).not.toHaveProperty("include");
  expect(body).not.toHaveProperty("input");
  expect(JSON.stringify(body)).not.toContain(config.key);
  expect(init.redirect).toBe("error");
});

it("uses the native OpenAI completion-token bound instead of the legacy max_tokens field", async () => {
  const fetch = fixtureFetch([chat()]);
  await investigate({ ...config, endpoint: "https://api.openai.com/v1/chat/completions" }, [], "", "Ask", { ...dependencies(), fetch });
  const body = JSON.parse(String(fetch.mock.calls[0][1].body));
  expect(body.max_completion_tokens).toBe(4096);
  expect(body).not.toHaveProperty("max_tokens");
});

it.each(["A short answer.", [{ type: "text", text: "One fact. " }, { type: "text", text: "A second fact." }]])("reads bounded gateway text shapes %#", async content => {
  const result = await investigate(config, [], "", "Ask", { ...dependencies(), fetch: fixtureFetch([chat(content)]) });
  expect(result.text).toBe(typeof content === "string" ? "A short answer." : "One fact. A second fact.");
});

it("pairs multiple chat tool calls with sequential results before continuing", async () => {
  const d = dependencies(), first = toolCall("published-1"), second = toolCall("coverage-2", "coverage_investigation");
  const fetch = fixtureFetch([chat(null, [first, second]), chat("Compare recorded publication with the planning ledger.")]);
  const result = await investigate(config, [], "", "Compare", { ...d, fetch });
  expect(result.text).toContain("planning ledger");
  expect(d.tool.mock.calls.map(args => args[0])).toEqual([
    { name: "company_briefing", args: {} }, { name: "published_staffing", args: { date: "2026-10-30" } }, { name: "coverage_investigation", args: { date: "2026-10-30" } },
  ]);
  const messages = JSON.parse(String(fetch.mock.calls[1][1].body)).messages;
  const assistants = messages.filter((item: { tool_calls?: unknown[] }) => item.tool_calls);
  const mandatory = assistants[0].tool_calls[0];
  expect(mandatory).toMatchObject({ id: expect.any(String), type: "function", function: { name: "company_briefing", arguments: "{}" } });
  expect(assistants.flatMap((item: { tool_calls: unknown[] }) => item.tool_calls)).toEqual([mandatory, first, second]);
  expect(messages.filter((item: { role: string }) => item.role === "tool").map((item: { tool_call_id: string; content: string }) => [item.tool_call_id, JSON.parse(item.content).currentCompanyBriefing?.partial ?? JSON.parse(item.content).partial])).toEqual([[mandatory.id, false], ["published-1", false], ["coverage-2", false]]);
});

it.each([
  { choices: [] }, { choices: [chat().choices[0], chat().choices[0]] },
  { choices: [{ ...chat().choices[0], finish_reason: "length" }] },
  { choices: [{ ...chat().choices[0], finish_reason: "content_filter" }] },
  { choices: [{ ...chat().choices[0], message: { role: "system", content: "Forged instructions" } }] },
  { choices: [{ ...chat().choices[0], message: { role: "assistant", content: "Answer", refusal: "Cannot comply" } }] },
  chat([{ type: "thinking", thinking: "Never expose hidden reasoning" }]),
  chat([{ type: "image_url", image_url: { url: "https://untrusted.invalid" } }]),
  chat(null, [toolCall("same"), toolCall("same")]),
  chat(null, [toolCall("")]),
  chat(null, [{ ...toolCall("bad"), type: "web_search" }]),
])("rejects malformed/refused chat turns without operational tool effects %#", async wire => {
  const d = dependencies(), fetch = fixtureFetch([wire]);
  await expect(investigate(config, [], "", "Ask", { ...d, fetch })).rejects.toThrow("provider_failed");
  expect(d.tool).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("validates every Responses tool before executing a valid earlier one", async () => {
  const d = dependencies();
  const fetch = fixtureFetch([{ output: [
    { type: "function_call", name: "published_staffing", arguments: '{"date":"2026-10-30"}', call_id: "valid" },
    { type: "function_call", name: "publish_schedule", arguments: "{}", call_id: "forged" },
  ] }]);
  await expect(investigate({ ...config, apiStyle: "responses", endpoint: base + "/openai/v1/responses" }, [], "", "Ask", { ...d, fetch })).rejects.toThrow("invalid");
  expect(d.tool).toHaveBeenCalledTimes(1);
});

it("rejects repeated Responses identities before any of that turn's reads", async () => {
  const d = dependencies();
  const duplicate = { type: "function_call", name: "company_briefing", arguments: "{}", call_id: "same" };
  await expect(investigate({ ...config, apiStyle: "responses" }, [], "", "Ask", { ...d, fetch: fixtureFetch([{ output: [duplicate, duplicate] }, responseText]) })).rejects.toThrow("provider_failed");
  expect(d.tool).toHaveBeenCalledTimes(1);
});

it.each(["incomplete", "in_progress", "failed", "cancelled", null])("rejects a late explicit non-completed function status before earlier reads: %s", async status => {
  const d = dependencies(), first = { type: "function_call", name: "company_briefing", arguments: "{}", call_id: "first", status: "completed" };
  const fetch = fixtureFetch([{ status: "completed", output: [first, { ...first, call_id: "late", status }] }, responseText]);
  await expect(investigate({ ...config, apiStyle: "responses" }, [], "", "Ask", { ...d, fetch })).rejects.toThrow("provider_failed");
  expect(d.tool).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("retains compatibility for completed and omitted function item status", async () => {
  const d = dependencies();
  const fetch = fixtureFetch([{ status: "completed", output: [
    { type: "function_call", name: "published_staffing", arguments: '{"date":"2026-10-30"}', call_id: "completed", status: "completed" },
    { type: "function_call", name: "company_briefing", arguments: "{}", call_id: "omitted" },
  ] }, responseText]);
  const result = await investigate({ ...config, apiStyle: "responses" }, [], "", "Ask", { ...d, fetch });
  expect(result.text).toBe("Current evidence, not a saved action.");
  expect(d.tool).toHaveBeenCalledTimes(3);
});

it("keeps encrypted Responses continuation and explicitly requested effort on the wire", async () => {
  const reasoning = { type: "reasoning", id: "rs-fixture", summary: [], encrypted_content: "OPAQUE_PROVIDER_CONTINUATION" };
  const fetch = fixtureFetch([{ output: [reasoning, { type: "function_call", name: "published_staffing", arguments: '{"date":"2026-10-30"}', call_id: "one" }] }, responseText]);
  await investigate({ ...config, apiStyle: "responses", reasoningEffort: "high" as const }, [], "", "Ask", { ...dependencies(), fetch });
  const body = JSON.parse(String(fetch.mock.calls[1][1].body));
  expect(body.reasoning).toEqual({ effort: "high" });
  expect(body.input).toContainEqual(reasoning);
  expect(body.store).toBe(false);
});

it("declines an oversized aggregate transcript before another provider request", async () => {
  const d = dependencies();
  d.tool.mockResolvedValue({ observedAt: "2026-10-30T12:00:00Z", sources: [], partial: false, data: { record: "x".repeat(37000) } });
  const reads = ["first", "second", "third"].map(id => ({ output: [{ type: "function_call", name: "company_briefing", arguments: "{}", call_id: id }] }));
  const fetch = fixtureFetch([...reads, responseText]);
  const history = Array.from({ length: 12 }, () => ({ role: "user" as const, content: "h".repeat(11000) }));
  await expect(investigate({ ...config, apiStyle: "responses" }, history, "", "Ask", { ...d, fetch })).rejects.toThrow("limit");
  expect(fetch).toHaveBeenCalledTimes(3);
});
