import { handle } from "@/lib/payroll/http";
import { statements } from "@/lib/payroll/access";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = (request: Request) =>
  handle(request, (proof) => statements(proof));
