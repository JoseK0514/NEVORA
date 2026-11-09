import {it,expect} from 'vitest';
import {saveOnboardingPerson} from './people.server';
it('rejects a malformed person command before any company access',async()=>{
 expect((await saveOnboardingPerson({} as never,{} as never,{schemaVersion:1},{} as never)).state).toBe('invalid');
});
