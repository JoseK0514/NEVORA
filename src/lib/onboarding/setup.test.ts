import {it,expect} from 'vitest';
import {parseSetupCommand} from './steps';
it('rejects client authority, unknown fields and malformed named timezones in business commands',()=>{
 const base={schemaVersion:1,operationId:'12345678-1234-4234-8234-123456789012',expectedVersion:'1',payload:{name:'Fictional Studio',timeZone:'America/Chicago'}};
 expect(parseSetupCommand('BUSINESS',base)).not.toBeNull();expect(parseSetupCommand('BUSINESS',{...base,payload:{...base.payload,role:'OWNER'}})).toBeNull();expect(parseSetupCommand('BUSINESS',{...base,payload:{...base.payload,timeZone:'UTC'}})).toBeNull();
});
