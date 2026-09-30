import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.fn();
vi.mock("../db", () => ({
  getDb: () => ({ query }),
  queryRows: (result: { rows: unknown[] }) => result.rows,
}));

import { createTimeOffRequest } from "./requests";

describe("time off submission", () => {
  beforeEach(() => query.mockReset());

  it("uses the form's request ID as the unique insert key for retries", async () => {
    query.mockResolvedValue({ rows: [] });
    const request = {
      requestId: "dc6b44c9-6e3f-4f0e-890c-328067ebfe9e",
      employeeId: "FC-9004",
      startDate: "2026-11-18",
      endDate: "2026-11-18",
    };

    await createTimeOffRequest(request);
    await createTimeOffRequest(request);

    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0][0]).toContain("ON CONFLICT (id) DO NOTHING");
    expect(query.mock.calls[0][1][0]).toBe(request.requestId);
    expect(query.mock.calls[1][1][0]).toBe(request.requestId);
  });
});
