export {compiledHostedSourceSha} from './source';
import {createRuntime} from '../../commerce/runtime';
import {createCommerce} from '../../commerce/service';
import {createCommerceApiHandler} from './commerceapi';
import {observedFetch} from './handlers';
const handler={fetch:observedFetch('commerceapi',createCommerceApiHandler(process.env,async request=>{
 // Worker usage gives a short-lived bounded pool and no signing-secret custody.
 // The API key has its own reviewed customer/checkout/portal permissions.
 const runtime=createRuntime(process.env,'worker');
 try{
  // A shared staging budget, not an invented client IP or trusted forwarded header.
  if(new URL(request.url).pathname!=='/health')await runtime.store.rate('neon-staging-ingress:all',60,60,Date.now());
  const api=createCommerce({store:runtime.store,origin:runtime.config.origin,uiOrigin:runtime.config.uiOrigin,allowedOrigins:runtime.config.allowedOrigins,billing:runtime.billing,signupEnabled:false,provisioningMode:'onboarding'});
  return await api(request,'neon-staging-shared-budget');
 }finally{await runtime.pool.end();}
}))};
export default handler;
