import {it,expect} from 'vitest';
import {parseScopeSelection} from './scope-selection';
it('requires an explicit finite mode, rejects empty or duplicate grants and never turns invalid selection into Company',()=>{
 for(const value of [null,{},[],{mode:'ALL',locationIds:[]},{mode:'COMPANY',locationIds:['A']},{mode:'LOCATIONS',locationIds:[]},
  {mode:'LOCATIONS',locationIds:['A','A']},{mode:'LOCATIONS',locationIds:[' A']},{mode:'COMPANY',locationIds:[],role:'OWNER'},
  {mode:'LOCATIONS',locationIds:Array.from({length:101},(_,i)=>String(i))}])expect(parseScopeSelection(value)).toBeNull();
 expect(parseScopeSelection({mode:'COMPANY',locationIds:[]})).toEqual({mode:'COMPANY',locationIds:[]});
 expect(parseScopeSelection({mode:'LOCATIONS',locationIds:['B','A']})).toEqual({mode:'LOCATIONS',locationIds:['A','B']});
});
