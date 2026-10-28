import {expect,it} from 'vitest';
import * as owned from './owned-next-app';
it('owned device setup stays loopback-only with provider and test delivery disabled',()=>{
 expect(owned).toHaveProperty('ownedDeviceEnvironment');
 const env=owned.ownedDeviceEnvironment('http://127.0.0.1:43210',true);
 expect(env.PUSH_FEATURE_ENABLED).toBe('true');expect(env.PUSH_DELIVERY_ENABLED).toBe('false');expect(env.PUSH_TEST_DELIVERY_ENABLED).toBe('false');
 expect(env.FUEL_PORTAL_ORIGIN).toBe('http://127.0.0.1:43210');expect(env).not.toHaveProperty('PUSH_VAPID_PRIVATE_KEY');expect(env).not.toHaveProperty('NOTIFICATION_WORKER_SECRET');
 expect(owned.ownedDeviceEnvironment('https://production.example',false)).toEqual({});
 for(const origin of ['https://production.example','http://localhost:43210','http://127.0.0.1','http://127.0.0.1:43210/other'])expect(()=>owned.ownedDeviceEnvironment(origin,true)).toThrow();
});
