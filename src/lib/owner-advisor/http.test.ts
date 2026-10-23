import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  service: vi.fn(async (..._args: unknown[]) => ({ state: "ready" })),
}));
vi.mock("@/lib/auth/session", () => ({
  getSession: async () => ({ id: "owner", role: "OWNER" }),
  requireSessionMutationProof: async () => ({
    employee: { id: "owner", role: "OWNER" },
  }),
}));
vi.mock("@/lib/data/sql-executor", () => ({
  neonNotificationExecutor: () => ({}),
}));
vi.mock("./service.server", () => ({ advisorService: mocks.service }));
import { POST } from "@/app/api/owner/advisor/route";
afterEach(() => {
  vi.restoreAllMocks();
  mocks.service.mockClear();
});
function openRequest(signal?: AbortSignal) {
  let streamController!: ReadableStreamDefaultController<Uint8Array>;
  const cancel = vi.fn();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      streamController = controller;
      controller.enqueue(new TextEncoder().encode("{"));
    },
    cancel,
  });
  const init: RequestInit & { duplex: "half" } = {
    method: "POST",
    duplex: "half",
    body,
    signal,
    headers: {
      "x-nevora-owner-advisor": "1",
      "content-type": "application/json",
      origin: "http://localhost",
    },
  };
  return {
    request: new Request("http://localhost/api/owner/advisor", init),
    cancel,
    close: () => {
      try {
        streamController.close();
      } catch {}
    },
  };
}
async function outcome(pending: Promise<Response>) {
  return Promise.race([
    pending,
    new Promise<"pending">((resolve) =>
      setTimeout(() => resolve("pending"), 100),
    ),
  ]);
}
it("cancels an open JSON body on request abort before any service side effect", async () => {
  const controller = new AbortController(),
    f = openRequest(controller.signal);
  try {
    const pending = POST(f.request);
    await Promise.resolve();
    await Promise.resolve();
    controller.abort();
    const response = await outcome(pending);
    expect(response).not.toBe("pending");
    if (response === "pending") throw new Error("body read did not settle");
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      state: "error",
      code: "cancelled",
    });
    expect(f.cancel).toHaveBeenCalledTimes(1);
    expect(mocks.service).not.toHaveBeenCalled();
  } finally {
    f.close();
  }
});
it("starts the single deadline at entry and cancels an open body when it expires", async () => {
  const deadline = new AbortController();
  const timeout = vi
    .spyOn(AbortSignal, "timeout")
    .mockReturnValue(deadline.signal);
  const f = openRequest();
  try {
    const pending = POST(f.request);
    expect(timeout).toHaveBeenCalledWith(60000);
    await Promise.resolve();
    await Promise.resolve();
    deadline.abort(new DOMException("Expired", "TimeoutError"));
    const response = await outcome(pending);
    expect(response).not.toBe("pending");
    if (response === "pending") throw new Error("deadline did not settle body");
    expect(response.status).toBe(503);
    expect(f.cancel).toHaveBeenCalledTimes(1);
    expect(mocks.service).not.toHaveBeenCalled();
  } finally {
    f.close();
  }
});
it("passes the same entry deadline to subsequent service work", async () => {
  const deadline = new AbortController();
  vi.spyOn(AbortSignal, "timeout").mockReturnValue(deadline.signal);
  const request = new Request("http://localhost/api/owner/advisor", {
    method: "POST",
    headers: {
      "x-nevora-owner-advisor": "1",
      "content-type": "application/json",
      origin: "http://localhost",
    },
    body: "{}",
  });
  expect((await POST(request)).status).toBe(200);
  const signal = mocks.service.mock.calls[0][3] as AbortSignal;
  expect(signal.aborted).toBe(false);
  deadline.abort();
  expect(signal.aborted).toBe(true);
});
