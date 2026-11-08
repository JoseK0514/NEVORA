import {workspaceMode} from '../workspace-routing/config.server';
import type {SqlStatement} from '../notifications/types';
/** The isolated WORKER may lock reviewed source tables through a no-write
 * definer. APP and legacy protocols retain their normal SQL/permissions. */
export function sourceTableLock(tables:readonly string[],mode:'SHARE'|'SHARE ROW EXCLUSIVE'):SqlStatement{
 if(!tables.length||tables.some(t=>!/^\w+$/.test(t)))throw Error('Invalid source table lock');
 const ordinary=`LOCK TABLE ${tables.join(',')} IN ${mode} MODE`;
 return {text:workspaceMode()==='isolated'?`DO $source_lock$ BEGIN IF EXISTS(SELECT 1 FROM public.onboarding_runtime_roles WHERE kind='WORKER' AND login_role=session_user) THEN ${tables.map(t=>`PERFORM public.onboarding_worker_table_lock('${t}','${mode}');`).join(' ')} ELSE ${ordinary}; END IF; END $source_lock$`:ordinary,values:[]};
}
