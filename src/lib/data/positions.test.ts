import { expect,it } from 'vitest';
import { createPosition,listPositions } from './positions';
import type {SqlExecutor} from '../notifications/types';
it('rejects blank and overlong plain-text names before IO',async()=>{
 await expect(createPosition({name:'  ',actorEmployeeId:'owner'})).rejects.toThrow('1–80');
 await expect(createPosition({name:'x'.repeat(81),actorEmployeeId:'owner'})).rejects.toThrow('1–80');
});
it('catalog outage fails honestly',async()=>{
 const executor:SqlExecutor={query:async()=>{throw Error('offline');},transaction:async()=>[]};
 await expect(listPositions({},executor)).rejects.toThrow('unavailable');
});
