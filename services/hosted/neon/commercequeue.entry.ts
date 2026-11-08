import {createScheduledHandler} from './handlers';
import {runCommerceTask} from './tasks';
const handler={fetch:createScheduledHandler('commercequeue',process.env,()=>runCommerceTask('queue'))};

export default handler;
