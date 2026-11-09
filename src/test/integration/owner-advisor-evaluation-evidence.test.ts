import { afterEach, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { claimEvaluationEvidence } from "./owner-advisor-evaluation-evidence";
const owned: string[] = [];
async function directory() { const path = await mkdtemp(join(tmpdir(), "nevora-evidence-ownership-")); owned.push(path); return path; }
afterEach(async () => { await Promise.all(owned.splice(0).map(path => rm(path, { recursive: true, force: true }))); });

it("refuses an existing paid result and preserves its bytes before any continuation", async () => {
  const path = await directory(), sentinel = '{"retain":"original paid failure and usage"}\n';
  await writeFile(join(path, "results.json"), sentinel);
  await expect(claimEvaluationEvidence(path, "new-head", false)).rejects.toThrow();
  expect(await readFile(join(path, "results.json"), "utf8")).toBe(sentinel);
});
it("refuses a claimed run even if it failed before writing results", async () => {
  const path = await directory();
  await claimEvaluationEvidence(path, "original-head", false);
  const original = await readFile(join(path, "run-identity.json"), "utf8");
  await expect(claimEvaluationEvidence(path, "replacement-head", false)).rejects.toThrow();
  expect(await readFile(join(path, "run-identity.json"), "utf8")).toBe(original);
});
it("allows exactly one simultaneous owner of an evidence directory", async () => {
  const path = await directory();
  const results = await Promise.allSettled([claimEvaluationEvidence(path, "one", false), claimEvaluationEvidence(path, "two", false)]);
  expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
  expect(results.filter(r => r.status === "rejected")).toHaveLength(1);
  const identity = JSON.parse(await readFile(join(path, "run-identity.json"), "utf8"));
  expect(identity.sourceHead).toBe(results[0].status === "fulfilled" ? "one" : "two");
});
it("requires separate evidence ownership for synthetic and paid runs", async () => {
  const path = await directory();
  await claimEvaluationEvidence(path, "head", true);
  await expect(claimEvaluationEvidence(path, "head", false)).rejects.toThrow();
});
