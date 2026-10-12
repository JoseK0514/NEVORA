import { schedulePayroll } from "../src/lib/payroll/schedule";
import { workerOnce } from "../src/lib/payroll/worker";
if (process.env.NEVORA_PAYROLL_ENABLED !== "true")
  throw Error("PAYROLL_DISABLED");
schedulePayroll()
  .then(() => workerOnce())
  .then((result) => console.log(JSON.stringify(result)))
  .catch(() => {
    console.error("Payroll worker failed; inspect private job status.");
    process.exitCode = 1;
  });
