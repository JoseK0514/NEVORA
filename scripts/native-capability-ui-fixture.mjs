import {createServer} from 'vite';
import {realpathSync} from 'node:fs';
import {resolve} from 'node:path';
if(process.argv.slice(2).join(' ')!=='--owned-local')throw Error('Explicit owned-local UI fixture mode required');
const root=process.cwd();
const server=await createServer({root,configFile:false,envDir:false,publicDir:resolve(root,'public'),server:{host:'127.0.0.1',port:0,fs:{strict:true,allow:[root,realpathSync(resolve(root,'node_modules'))]}},logLevel:'error'});
await server.listen();const address=server.httpServer.address();
console.log(JSON.stringify({origin:`http://127.0.0.1:${address.port}`,path:'/native/capability-ui/index.html',pid:process.pid,fictional:true}));
let closing=false;const stop=async()=>{if(closing)return;closing=true;await server.close();process.exit(0);};process.once('SIGINT',stop);process.once('SIGTERM',stop);
