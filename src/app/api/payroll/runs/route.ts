import { handle } from "@/lib/payroll/http";
import { runs, command } from "@/lib/payroll/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Shared payroll HTTP boundary owns session/envelope handling; service owns run visibility. */
export const GET = (request: Request) =>
  handle(request, (proof) => runs(proof));
/** Forward the command unchanged and expose its receipt; true enables mutation boundary checks. */
export const POST = (request: Request) =>
  handle(
    request,
    async (proof, input) => ({ receipt: await command(proof, input) }),
    true,
  );
