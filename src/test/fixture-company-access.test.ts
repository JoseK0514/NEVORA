import {expect,it} from 'vitest';
import {installFixtureCompanyAccess} from './integration/fixture-company-access';
import type {SqlExecutor,SqlStatement} from '../lib/notifications/types';

it.each([
  {name:'fuel_scheduler',marker:'fuel-phase3-disposable:00000000-0000-4000-8000-000000000001'},
  {name:'nevora_foundation_test_fixture',marker:'unmarked'},
  {name:'nevora_foundation_test_fixture',marker:''},
])('refuses fixture migration outside the owned disposable boundary: $name / $marker',async row=>{
  let writes=0;
  const executor:SqlExecutor={
    query:async<T>(statement:SqlStatement)=>{if(!/^\s*SELECT\b/i.test(statement.text))writes++;return [row] as T[];},
    transaction:async()=>{writes++;return [];},
  };
  await expect(installFixtureCompanyAccess(executor)).rejects.toThrow('owned disposable database');
  expect(writes).toBe(0);
});
