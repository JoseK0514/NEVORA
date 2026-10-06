import { expect, it, vi } from "vitest";
import { listTeamExchangeActivity } from "./exchanges";
const query = vi.hoisted(() => vi.fn(async (_sql: string) => []));
vi.mock("@/lib/db", () => ({ getDb: () => ({ query }), queryRows: (rows: unknown) => rows }));
it("filters completed team outcomes before applying the history limit, while preserving the existing unfiltered reader", async () => {
  await listTeamExchangeActivity(true);
  const completed = String(query.mock.calls[0][0]);
  expect(completed).toMatch(/WHERE x.status IN \('APPROVED', 'DENIED', 'CANCELLED', 'EXPIRED'\)[\s\S]+LIMIT 30/);
  await listTeamExchangeActivity();
  expect(String(query.mock.calls[1][0])).not.toContain("WHERE x.status");
});
