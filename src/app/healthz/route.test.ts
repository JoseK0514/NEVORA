import { readFileSync } from "node:fs";
import { afterEach, expect, it, rs } from '@rstest/core';

const db = rs.hoisted(() => ({ getDb: rs.fn() }));
rs.mock("@/lib/db", () => db);
afterEach(() => db.getDb.mockClear());

it("answers liveness without caching or reading the database", async () => {
  const { GET, HEAD } = await import("./route");
  const response = GET();
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toEqual({ status: "ok" });
  const head = HEAD();
  expect(head.status).toBe(200);
  expect(head.headers.get("cache-control")).toBe("no-store");
  expect(await head.text()).toBe("");
  expect(db.getDb).not.toHaveBeenCalled();
});

it("stays outside the commerce proxy matcher", () => {
  const proxy = readFileSync(new URL("../../proxy.ts", import.meta.url), "utf8");
  const matcher = /matcher:\s*\[([^\]]*)\]/.exec(proxy)?.[1] ?? "";
  const patterns = [...matcher.matchAll(/"([^"]+)"/g)].map((match) => match[1].replace("/:path*", ""));
  expect(patterns.length).toBeGreaterThan(0);
  expect(patterns.some((prefix) => "/healthz".startsWith(prefix))).toBe(false);
});
