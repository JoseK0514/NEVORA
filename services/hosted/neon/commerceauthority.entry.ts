export {compiledHostedSourceSha} from './source';
import {createCompanyAuthorityHandler} from './commerceauthority';
import {observedFetch} from './handlers';
import {readCommerceAuthorityRoutingConfig} from '../../../src/lib/workspace-routing/config.server';
import {withCommerceRequest} from '../../../src/lib/commerce/isolated-connection.server';
import {GET as facts} from '../../../src/app/api/commerce/facts/route';
import {POST as policy} from '../../../src/app/api/commerce/policy/route';
import {POST as owner} from '../../../src/app/api/commerce/owner/route';
const companyHandler=(request:Request)=>withCommerceRequest(request,()=>{
 const path=new URL(request.url).pathname;
 return path.endsWith('/facts')?facts(request):path.endsWith('/policy')?policy(request):owner(request);
},readCommerceAuthorityRoutingConfig());
const handler={fetch:observedFetch('commerceauthority',createCompanyAuthorityHandler(process.env,companyHandler))};
export default handler;
