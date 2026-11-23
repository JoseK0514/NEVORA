import { readFileSync } from "node:fs";
import { expect, it } from "@rstest/core";
import { OWNED_PG_CONNECTION_WAIT_MS } from "./owned-pg-transport";

// G55 (Nov 23, 2026): the owned app's reads wait for a free connection instead of failing the page's server render after
// 3 s, which the browser logged as "Minified React error #441" during the parallel UI sweeps.
it("G55: the owned test transport waits 15 s for one of its 12 connections; statements still stop at 5 s", () => {
  expect(OWNED_PG_CONNECTION_WAIT_MS).toBe(15_000);
  const source = readFileSync(new URL("./owned-pg-transport.ts", import.meta.url), "utf8");
  expect(source).toContain("new Pool({ connectionString, max: 12, connectionTimeoutMillis: OWNED_PG_CONNECTION_WAIT_MS, statement_timeout: 5000,");
});
