import type {SqlExecutor} from '../../notifications/types';
import type {PhotoLifecycleProvider} from './service';

export type PhotoPlatformBinding={workspaceId:string;projectId:string;branchId:string};
const validId=(value:string|undefined):value is string=>typeof value==='string'&&/^[a-zA-Z0-9-]{1,128}$/.test(value);
export function readPhotoPlatformBinding(env:Record<string,string|undefined>):PhotoPlatformBinding|null {
 if(env.NEVORA_ENVIRONMENT!=='staging'||env.NEVORA_CLOCKER_PHOTO_RUNTIME!=='neon-staging-v1')return null;
 const workspaceId=env.NEVORA_CLOCKER_PHOTO_WORKSPACE,projectId=env.NEVORA_CLOCKER_PHOTO_PROJECT,branchId=env.NEVORA_CLOCKER_PHOTO_BRANCH;
 if(!validId(workspaceId)||!validId(projectId)||!validId(branchId))return null;
 return {workspaceId,projectId,branchId};
}
/** Owner preferences cannot attest platform operations. Stale/missing cleanup
 * health or expired operator attestation closes capture without blocking time. */
export function createPlatformPhotoLifecycle(executor:SqlExecutor,binding:PhotoPlatformBinding):PhotoLifecycleProvider {
 return async scope=>{
  if(scope.workspaceId!==binding.workspaceId)return null;
  try{
   const rows=await executor.query<{cleanup_disclosure:string;backup_disclosure:string}>({text:`SELECT cleanup_disclosure,backup_disclosure FROM clocker_photo_platform_lifecycle p
    WHERE workspace_id=$1 AND project_id=$2 AND branch_id=$3 AND enabled=true
    AND attested_until>clock_timestamp() AND last_success_at<=clock_timestamp()
    AND last_success_at>clock_timestamp()-interval '75 minutes'
    AND EXISTS(SELECT 1 FROM workspaces w WHERE w.id=p.workspace_id AND w.singleton=true AND w.active=true)`,values:[binding.workspaceId,binding.projectId,binding.branchId]});
   if(rows.length!==1||typeof rows[0].cleanup_disclosure!=='string'||typeof rows[0].backup_disclosure!=='string')return null;
   return {cleanupDisclosure:rows[0].cleanup_disclosure,backupDisclosure:rows[0].backup_disclosure};
  }catch{return null;}
 };
}
