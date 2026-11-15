import {expect,it} from 'vitest';
import {correctionDelta} from './correction-delta';
it('returns exact signed minor-unit differences including added and removed people',()=>{
 expect(correctionDelta([{employeeId:'A',netMinor:'9007199254740993'},{employeeId:'B',netMinor:'50'}],[{employeeId:'A',netMinor:'9007199254740992'},{employeeId:'C',netMinor:'75'}])).toEqual({totalNetMinor:'24',employees:[{employeeId:'A',previousNetMinor:'9007199254740993',netMinor:'9007199254740992',deltaNetMinor:'-1'},{employeeId:'B',previousNetMinor:'50',netMinor:'0',deltaNetMinor:'-50'},{employeeId:'C',previousNetMinor:'0',netMinor:'75',deltaNetMinor:'75'}]});
});
it('does not invent a difference when either source is unavailable',()=>{expect(correctionDelta(null,[])).toBeNull();expect(correctionDelta([],null)).toBeNull();});
