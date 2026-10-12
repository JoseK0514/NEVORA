import { handle } from "@/lib/payroll/http";
import { receipt } from "@/lib/payroll/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = (request: Request) =>
  handle(
    request,
    async (proof) => ({
      receipt: await receipt(
        proof,
        new URL(request.url).searchParams.get("operationId")!,
      ),
    }),
    false,
    true,
  );
