import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.fn();
vi.mock("../db", () => ({
  getDb: () => ({ query }),
  queryRows: (result: { rows: unknown[] }) => result.rows,
}));
vi.mock("./schedules", () => ({ listWeekShifts: vi.fn() }));

import { listTemplateShifts } from "./schedule-templates";

describe("applying an active schedule template", () => {
  beforeEach(() => query.mockReset());

  it("rejects archived or missing templates before any shift is applied", async () => {
    query.mockResolvedValue({ rows: [] });

    expect(await listTemplateShifts("archived-template")).toBeNull();
    expect(query.mock.calls[0][0]).toContain("t.active = true");
  });

  it("allows an active template with no shifts", async () => {
    query.mockResolvedValue({ rows: [{ id: null }] });

    expect(await listTemplateShifts("empty-template")).toEqual([]);
  });
});
