import { createRuntime } from "./runtime";
import { workerOnce } from "./worker";
async function main() {
  const runtime = createRuntime();
  try {
    if (process.argv[2] === "reconcile") {
      if (!runtime.billing) throw Error("billing_not_configured");
      const summary = await runtime.billing.reconcile();
      console.log(
        JSON.stringify({
          state: summary.failed ? "partial" : "completed",
          ...summary,
        }),
      );
      if (summary.failed) process.exitCode = 1;
    } else if (process.argv[2] === "once")
      console.log(
        JSON.stringify(
          await workerOnce(runtime.store, runtime.billing, runtime.sendMail),
        ),
      );
    else throw Error("usage: worker-cli once|reconcile");
  } finally {
    await runtime.pool.end();
  }
}
main().catch(() => {
  console.error(
    "Commerce worker failed. Inspect private job status; retry the same job.",
  );
  process.exitCode = 1;
});
