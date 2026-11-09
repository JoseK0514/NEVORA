export {compiledHostedSourceSha} from './source';
import {createScheduledHandler,observedFetch} from './handlers';
import {runCommerceTask} from './tasks';
const handler={fetch:observedFetch('commercereconcile',createScheduledHandler('commercereconcile',process.env,()=>runCommerceTask('reconcile')))};

export default handler;
