import {expect,it} from 'vitest';
import {communicationFixtureUrl} from './integration/employee-mobile-communications-fixtures';
const source='postgresql://nevora_test@127.0.0.1:45678/nevora_exchange_test_c1_abcdef123456';
it('derives only each required disposable namespace within the same owned loopback cluster',()=>{
 for(const prefix of ['nevora_exchange_test_','nevora_foundation_test_','fuel_phase3_test_']){
  const url=new URL(communicationFixtureUrl(source,prefix));
  expect(url.origin).toBe(new URL(source).origin);expect(url.username).toBe('nevora_test');expect(url.hostname).toBe('127.0.0.1');expect(url.port).toBe('45678');expect(url.pathname).toBe('/'+prefix+'c1_abcdef123456');expect(url.search).toBe('');expect(url.hash).toBe('');
 }
});
it('refuses remote/existing/unmarked/ambiguous targets instead of rewriting them into permission',()=>{
 for(const target of [source.replace('127.0.0.1','database.example'),source.replace('nevora_exchange_test_c1_abcdef123456','production'),source.replace('c1_abcdef123456','other'),source+'?sslmode=require',source+'#fragment',source.replace(':45678',''),'not a URL'])expect(()=>communicationFixtureUrl(target,'nevora_foundation_test_')).toThrow();
 expect(()=>communicationFixtureUrl(source,'arbitrary_')).toThrow();
});
