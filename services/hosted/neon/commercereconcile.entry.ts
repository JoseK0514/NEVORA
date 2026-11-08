import {createScheduledHandler} from './handlers';
import {runCommerceTask} from './tasks';
const handler={fetch:createScheduledHandler('commercereconcile',process.env,()=>runCommerceTask('reconcile'))};

export default handler;
