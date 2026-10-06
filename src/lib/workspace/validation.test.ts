import {expect,it} from 'vitest';
import {validateWorkspaceProfile} from './validation';
it('trims a Unicode customer name and preserves the configured IANA zone',()=>expect(validateWorkspaceProfile({name:' Northside Café ',timeZone:'America/New_York'})).toEqual({name:'Northside Café',timeZone:'America/New_York'}));
it.each(['',' '.repeat(2),'x'.repeat(161),'Bad\nName','Bad\u0000Name'])('rejects invalid name %j',name=>expect(()=>validateWorkspaceProfile({name,timeZone:'America/New_York'})).toThrow());
it.each(['+04:00','UTC-04','Etc/GMT+4','Not/AZone','',null])('rejects invalid or fixed offset zone %j',timeZone=>expect(()=>validateWorkspaceProfile({name:'Northside',timeZone})).toThrow());
