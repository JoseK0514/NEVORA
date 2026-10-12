import { handle } from "@/lib/payroll/http";
import { runs, command } from "@/lib/payroll/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = (request: Request) =>
  handle(request, (proof) => runs(proof));
export const POST = (request: Request) =>
  handle(
    request,
    async (proof, input) => ({ receipt: await command(proof, input) }),
    true,
  );
