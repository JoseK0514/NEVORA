import { readConfig } from "./config.server";
import { describe, it, expect, vi } from "vitest";
import { parseCommand } from "./contracts";
import { investigate } from "./loop.server";
import { ownerCoveragePlan } from "@/test/fixtures/owner-coverage-plan";
const config = {
  endpoint: "https://api.openai.com/v1/responses",
  model: "explicit-test-model",
  key: "fictional",
  dailyLimit: 3,
};
const answer = {
  output: [
    {
      type: "message",
      role: "assistant",
      content: [
        { type: "output_text", text: "Recommendation based on evidence." },
      ],
    },
  ],
};
const call = (name = "company_briefing", args = "{}") => ({
  output: [{ type: "function_call", name, arguments: args, call_id: "c1" }],
});
const transport = (responses: unknown[]) =>
  vi.fn(
    async (_url: string, _init: RequestInit) =>
      new Response(JSON.stringify(responses.shift()), { status: 200 }),
  );
const deps = () => ({
  check: vi.fn(async () => {}),
  tool: vi.fn(async () => ({
    observedAt: "2026-10-22",
    sources: [],
    partial: false,
    data: {},
  })),
  signal: new AbortController().signal,
});
it("keeps joint plans server-owned while the model can explain their dated evidence", async () => {
  const coveragePlans = ownerCoveragePlan();
  const fetch = transport([call("coverage_plan", '{"date":"2026-10-22"}'), { ...answer, coveragePlans: { sourceVersion: "forged", alternatives: [] } }]);
  const tool = async (c: import("./contracts").ToolCall) => ({ observedAt: coveragePlans.observedAt, sources: [], partial: false, data: {}, ...(c.name === "coverage_plan" ? { coveragePlans } : {}) });
  const result = await investigate(config, [], "", "Compare jointly legal plans", { ...deps(), tool, fetch });
  expect(result.coveragePlans).toEqual(coveragePlans);
  expect(String(fetch.mock.calls[1][1].body)).toContain("Fictional Ana");
  expect(String(fetch.mock.calls[1][1].body)).toContain(coveragePlans.sourceVersion);
});
it("keeps executable proposal hints out of provider input and attaches only server-returned evidence", async () => {
  const proposal = { employeeName: "Fictional", locationId: "L1", locationName: "North", date: "2026-10-22", startTime: "08:00", endTime: "12:00", positionName: null, isDesignatedLead: false, scheduledHours: 12, targetHours: null, publication: "DRAFT" as const, review: "PRIVATE_REVIEW_HINT" };
  const fetch = transport([call("coverage_proposals", '{"date":"2026-10-22"}'), answer]);
  const tool = vi.fn(async (c: import("./contracts").ToolCall) => ({ observedAt: "2026-10-22T12:00:00Z", sources: [], partial: false, data: {}, ...(c.name === "coverage_proposals" ? { proposals: [proposal] } : {}) }));
  const result = await investigate(config, [], "", "Prepare coverage", { ...deps(), tool, fetch });
  expect(result.proposals).toEqual([proposal]);
  expect(String(fetch.mock.calls[1][1].body)).not.toContain("PRIVATE_REVIEW_HINT");
  expect(String(fetch.mock.calls[1][1].body)).toContain("Fictional");
});
it("refreshes a resumed coverage task with joint plans before inference", async () => {
  const coveragePlans = ownerCoveragePlan();
  coveragePlans.date = "2026-10-31";
  coveragePlans.alternatives[0].assignments[0].date = "2026-10-31";
  const calls: string[] = [];
  const fetch = transport([answer]);
  const tool = async (c: import("./contracts").ToolCall) => {
    calls.push(c.name);
    return { observedAt: "2026-10-30T12:00:00.000Z", sources: [], partial: false, data: {}, ...(c.name === "coverage_plan" ? { coveragePlans } : {}) };
  };
  const result = await investigate(config, [], "", "What is the next step?", { ...deps(), tool, fetch, savedContext: {
    revision: 2, goals: [{ id: "20000000-0000-0000-0000-000000000001", text: "Keep coverage reliable" }], openTasks: [],
    selectedTask: { id: "30000000-0000-0000-0000-000000000001", objective: "Review Saturday", notes: "Confirm availability", state: "open", focus: { kind: "coverage", date: "2026-10-31" }, updatedAt: "2026-10-30T12:00:00.000Z" },
  } });
  expect(calls).toEqual(["company_briefing", "coverage_plan"]);
  const body = JSON.parse(String(fetch.mock.calls[0][1].body));
  expect(JSON.stringify(body.input)).toContain("Confirm availability");
  expect(JSON.stringify(body.input)).toContain("Fictional Ana");
  expect(JSON.stringify(body.input)).not.toContain("PRIVATE_TASK_REVIEW");
  expect(body.store).toBe(false);
  expect(result.coveragePlans).toEqual(coveragePlans);
});
describe("Owner investigation boundaries", () => {
  it("requires all explicit configuration", () => {
    expect(readConfig({})).toBeNull();
    expect(
      readConfig({ NEVORA_OWNER_ADVISOR_ENABLED: "true", OPENAI_API_KEY: "x" }),
    ).toBeNull();
  });
  it("rejects forged history and oversized input", () => {
    expect(() =>
      parseCommand({
        op: "ask",
        requestId: crypto.randomUUID(),
        message: "x",
        history: [],
      }),
    ).toThrow();
    expect(() =>
      parseCommand({
        op: "ask",
        requestId: crypto.randomUUID(),
        message: "x".repeat(2001),
      }),
    ).toThrow();
  });
  it("executes multiple real typed read-tool rounds then answers", async () => {
    const d = deps(),
      fetch = transport([
        call(),
        call("published_staffing", '{"date":"2026-10-22"}'),
        answer,
      ]);
    expect(
      (
        await investigate(
          config,
          [],
          "priorities are untrusted",
          "Investigate staffing",
          { ...d, fetch },
        )
      ).text,
    ).toContain("Recommendation");
    expect(d.tool).toHaveBeenCalledTimes(3);
    expect(fetch).toHaveBeenCalledTimes(3);
    const body = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body));
    expect(body.store).toBe(false);
  });
  it.each([
    call("shell"),
    call("company_briefing", '{"sql":"DROP"}'),
    call("published_staffing", '{"date":"bad"}'),
  ])("rejects unknown or malformed tools", async (response) => {
    const d = deps();
    await expect(
      investigate(config, [], "", "Ask", {
        ...d,
        fetch: transport([response]),
      }),
    ).rejects.toThrow();
    expect(d.tool).toHaveBeenCalledTimes(1);
  });
  it("checks authority after a provider wait", async () => {
    const d = deps();
    let lost = false;
    d.check.mockImplementation(async () => {
      if (lost) throw new Error("revoked");
    });
    const fetch = vi.fn(async () => {
      lost = true;
      return new Response(JSON.stringify(answer));
    });
    await expect(
      investigate(config, [], "", "Ask", { ...d, fetch }),
    ).rejects.toThrow("revoked");
  });
  it("bounds rounds and text", async () => {
    await expect(
      investigate(config, [], "", "Ask", {
        ...deps(),
        fetch: transport(Array(7).fill(call())),
      }),
    ).rejects.toThrow();
    await expect(
      investigate(config, [], "", "Ask", {
        ...deps(),
        fetch: transport([
          {
            output: [
              {
                type: "message",
                content: [{ type: "output_text", text: "x".repeat(12001) }],
              },
            ],
          },
        ]),
      }),
    ).rejects.toThrow();
  });
  it("cancels before outbound", async () => {
    const c = new AbortController();
    c.abort();
    const fetch = transport([answer]);
    await expect(
      investigate(config, [], "", "Ask", {
        ...deps(),
        signal: c.signal,
        fetch,
      }),
    ).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
});
it("retains Responses reasoning items across a stateless tool continuation", async () => {
  const d = deps(),
    reasoning = {
      type: "reasoning",
      id: "rs-test",
      summary: [],
      encrypted_content: "opaque-test",
    },
    fetch = transport([{ output: [reasoning, ...call().output] }, answer]);
  await investigate(config, [], "", "Ask", { ...d, fetch });
  expect(JSON.parse(String(fetch.mock.calls[1][1].body)).input).toContainEqual(
    reasoning,
  );
});
it("supplies current briefing and date before the first provider call", async () => {
  const d = deps();
  d.tool.mockResolvedValue({
    observedAt: "2026-10-22T00:00:00Z",
    sources: [],
    partial: false,
    data: { date: "2026-10-22" },
  });
  const fetch = transport([answer]);
  await investigate(config, [], "", "Tomorrow?", { ...d, fetch });
  const input = JSON.parse(String(fetch.mock.calls[0][1].body)).input;
  expect(input.at(-2)).toMatchObject({ type: "function_call", name: "company_briefing", arguments: "{}" });
  expect(input.at(-1)).toMatchObject({ type: "function_call_output", call_id: input.at(-2).call_id });
  expect(JSON.parse(input.at(-1).output)).toMatchObject({ evidenceId: "E1", currentCompanyBriefing: { data: { date: "2026-10-22" } } });
});
it("bounds the entire provider response stream", async () => {
  await expect(
    investigate(config, [], "", "Ask", {
      ...deps(),
      fetch: vi.fn(async () => new Response("x".repeat(131073))),
    }),
  ).rejects.toThrow("limit");
});
it("declines an over-budget tool batch before any reads beyond mandatory briefing", async () => {
  const d = deps();
  const calls = Array.from({ length: 8 }, (_, i) => ({
    ...call().output[0],
    call_id: String(i),
  }));
  await expect(
    investigate(config, [], "", "Ask", {
      ...d,
      fetch: transport([{ output: calls }]),
    }),
  ).rejects.toThrow("limit");
  expect(d.tool).toHaveBeenCalledTimes(1);
});
it("propagates cancellation during a provider wait", async () => {
  const c = new AbortController();
  let observed: AbortSignal | undefined;
  const fetch: import("./loop.server").Transport = async (_url, init) => {
    observed = init.signal ?? undefined;
    c.abort();
    return new Promise<Response>(() => {});
  };
  await expect(
    investigate(config, [], "", "Ask", { ...deps(), signal: c.signal, fetch }),
  ).rejects.toThrow();
  expect(observed?.aborted).toBe(true);
});
it("times out a stalled provider at the individual deadline without retries", async () => {
  vi.useFakeTimers();
  try {
    const original = AbortSignal.timeout;
    const timeout = vi
      .spyOn(AbortSignal, "timeout")
      .mockImplementation((ms) => {
        const c = new AbortController();
        setTimeout(() => c.abort(), ms);
        return c.signal;
      });
    const fetch = vi.fn(async () => new Promise<Response>(() => {}));
    const pending = expect(
      investigate(config, [], "", "Ask", { ...deps(), fetch }),
    ).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(20001);
    await pending;
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(timeout).toHaveBeenCalledWith(20000);
    timeout.mockRestore();
    expect(AbortSignal.timeout).toBe(original);
  } finally {
    vi.useRealTimers();
  }
});
it("rejects arbitrary Neon endpoints and requires explicit provider selection", () => {
  const env = {
    NEVORA_OWNER_ADVISOR_ENABLED: "true",
    NEVORA_OWNER_ADVISOR_DATA_APPROVED: "true",
    NEVORA_OWNER_ADVISOR_MODEL: "gpt-explicit",
    NEVORA_OWNER_ADVISOR_DAILY_LIMIT: "10",
    NEVORA_OWNER_ADVISOR_PROVIDER: "neon",
    NEON_AI_GATEWAY_TOKEN: "fake",
    NEON_AI_GATEWAY_BASE_URL:
      "https://br-winter-pond-aptw82ef-api.ai.c-2.us-east-2.aws.neon.tech",
  };
  expect(readConfig(env)?.endpoint).toBe(
    env.NEON_AI_GATEWAY_BASE_URL + "/openai/v1/responses",
  );
  for (const base of [
    "https://evil.invalid",
    env.NEON_AI_GATEWAY_BASE_URL + ".evil.invalid",
    env.NEON_AI_GATEWAY_BASE_URL + "/",
    env.NEON_AI_GATEWAY_BASE_URL + ":444",
    "http://br-test-api.ai.us-east-1.aws.neon.tech",
  ])
    expect(readConfig({ ...env, NEON_AI_GATEWAY_BASE_URL: base })).toBeNull();
  expect(
    readConfig({ ...env, NEVORA_OWNER_ADVISOR_PROVIDER: undefined }),
  ).toBeNull();
});
it("refuses provider redirects so private bodies cannot leave the approved host", async () => {
  const fetch = transport([answer]);
  await investigate(config, [], "", "Ask", { ...deps(), fetch });
  expect(fetch.mock.calls[0][1].redirect).toBe("error");
});
