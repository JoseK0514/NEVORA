import { expect,it } from 'vitest';
import type { SqlExecutor, SqlStatement } from '../notifications/types';
import {listLocations,findActiveLocationByClockerKey,createLocation} from './locations';
import {createNorthsideFixture} from '../../test/fixtures/nevora-workspace';
it.each([1,3,5,20] as const)('maps arbitrary %i locations without limiting names',async count=>{const f=createNorthsideFixture(count);const executor:SqlExecutor={query:async<T>(statement: SqlStatement)=> (statement.text.includes("FROM workspaces") ? [f.workspace] : f.locations) as T[],transaction:async()=>[]};expect(await listLocations({includeInactive:true},executor)).toEqual(f.locations);});
it('database failure is unavailable, never not-found',async()=>{const executor:SqlExecutor={query:async()=>{throw Error('offline');},transaction:async()=>[]};await expect(findActiveLocationByClockerKey('main',executor)).rejects.toThrow('unavailable');});
it('rejects overlong names before database writes',async()=>{await expect(createLocation({name:'x'.repeat(161),shortName:'New',actorEmployeeId:'owner'})).rejects.toThrow('160');});
