import {expect,it} from 'vitest';
import {readWorkerRoutingConfig} from '../workspace-routing/config.server';
import {workerControlRole} from './routing-reader';
const scope='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const env={NEVORA_WORKSPACE_MODE:'isolated',NEVORA_ONBOARDING_ENVIRONMENT:'test',NEVORA_PORTAL_BASE_DOMAIN:'portal-staging.nevora.team',NEVORA_CONTROL_DATABASE_URL:'postgresql://nv_control_worker_t_'+scope.replaceAll('-','')+':fictional@ep-fixture.neon.tech/control?sslmode=verify-full',NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY:Buffer.alloc(32,3).toString('base64url')};
it('uses a company/environment-bound machine reader without browser signing or APP custody',()=>{
 expect(workerControlRole(scope.toUpperCase(),'test')).toBe('nv_control_worker_t_'+scope.replaceAll('-',''));
 expect(workerControlRole(scope,'test')).toBe('nv_control_worker_t_'+scope.replaceAll('-',''));expect(workerControlRole(scope,'production')).toBe('nv_control_worker_p_'+scope.replaceAll('-',''));
 const c=readWorkerRoutingConfig(env);expect(c.secretScope).toBe('WORKER_ONLY');expect(c).not.toHaveProperty('tokenKey');
});
it.each([{NEVORA_WORKSPACE_TOKEN_SECRET:''},{NEVORA_WORKSPACE_TOKEN_SECRET:Buffer.alloc(32,4).toString('base64url')},{NEVORA_COMMERCE_BINDING_KEY:'owner-only'},{NEVORA_ONBOARDING_ENVIRONMENT:'production'},{NEVORA_CONTROL_DATABASE_URL:env.NEVORA_CONTROL_DATABASE_URL.replace('worker_t_','app_')},{NEVORA_CONTROL_DATABASE_URL:env.NEVORA_CONTROL_DATABASE_URL.replace('verify-full','require')}])('rejects excessive or mismatched machine capability: %j',patch=>{expect(()=>readWorkerRoutingConfig({...env,...patch})).toThrow();});
