import {handle} from "@/lib/payroll/http";
import {nativeProfiles,saveNativeProfile} from "@/lib/payroll/native/profiles.server";
export const runtime="nodejs";export const dynamic="force-dynamic";
export const GET=(request:Request)=>handle(request,proof=>nativeProfiles(proof));
export const POST=(request:Request)=>handle(request,async(proof,input)=>({receipt:await saveNativeProfile(proof,input)}),true);
