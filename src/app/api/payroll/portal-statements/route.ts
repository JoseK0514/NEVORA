import {handle} from "@/lib/payroll/http";import {portalStatements} from "@/lib/payroll/access";
export const runtime="nodejs";export const dynamic="force-dynamic";
export const GET=(request:Request)=>handle(request,proof=>portalStatements(proof));
