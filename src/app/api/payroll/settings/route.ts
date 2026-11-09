import { handle } from "@/lib/payroll/http";
import { settings, saveSettings } from "@/lib/payroll/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = (request: Request) =>
  handle(request, (proof) => settings(proof));
export const POST = (request: Request) =>
  handle(
    request,
    async (proof, input) => ({ receipt: await saveSettings(proof, input) }),
    true,
  );
