import { mkdir, lstat, open } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

/** Claim once before credential access; even failed setup retains its run identity. */
export async function claimEvaluationEvidence(directory: string, sourceHead: string, dryRun: boolean) {
  await mkdir(directory, { recursive: true });
  try {
    await lstat(join(directory, "results.json"));
    throw Error("Evaluation results already exist; choose a fresh evidence directory");
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
  const handle = await open(join(directory, "run-identity.json"), "wx", 0o600);
  try {
    await handle.writeFile(JSON.stringify({ sourceHead, dryRun, runId: randomUUID(), startedAt: new Date().toISOString() }));
    await handle.sync();
  } finally { await handle.close(); }
}
