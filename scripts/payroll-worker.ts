/**
 * One enabled worker invocation: enqueue due periods, then process a worker batch.
 * This entry point does not register a daemon/scheduler. It can create jobs and
 * documents in the configured database, so it is not a read-only health check.
 */
import { requireOperationalCommerce } from "../src/lib/commerce/access";
import { schedulePayroll } from "../src/lib/payroll/schedule";
import { workerOnce } from "../src/lib/payroll/worker";
if (process.env.NEVORA_PAYROLL_ENABLED !== "true")
  throw Error("PAYROLL_DISABLED");
requireOperationalCommerce().then(() => schedulePayroll())
  .then(() => workerOnce())
  .then((result) => console.log(JSON.stringify(result)))
  .catch(() => {
    console.error("Payroll worker failed; inspect private job status.");
    process.exitCode = 1;
  });
