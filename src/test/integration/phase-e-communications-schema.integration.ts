import {afterEach,expect,it} from 'vitest';
import {createDisposableFoundationDatabase} from './local-postgres';
let db:Awaited<ReturnType<typeof createDisposableFoundationDatabase>>;
afterEach(async()=>{await db?.dispose();});
it('schema_cross_workspace_revision_grant_denied',async()=>{
 db=await createDisposableFoundationDatabase({mode:'current-runtime'});
 // Explicit prerequisite assertion: missing DDL fails this named behavior, no import/setup crash.
 expect(await db.executor.query({text:"SELECT to_regclass('communication_recipients')::text AS name",values:[]})).toEqual([{name:'communication_recipients'}]);
});
