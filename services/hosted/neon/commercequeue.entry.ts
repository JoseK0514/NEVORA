import {createScheduledHandler,observedFetch} from './handlers';
import {runCommerceTask} from './tasks';
const handler={fetch:observedFetch('commercequeue',createScheduledHandler('commercequeue',process.env,()=>runCommerceTask('queue')))};

export default handler;
