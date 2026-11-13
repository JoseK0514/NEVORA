import {createServer,type Socket} from 'node:net';
/** Fictional mail capture, bound only to an invocation-owned loopback port. */
export async function createOwnedSmtp(){
 const messages:{recipient:string;body:string}[]=[],sockets=new Set<Socket>();
 let loseAcknowledgement=false;
 const server=createServer(socket=>{
  sockets.add(socket);socket.on('close',()=>sockets.delete(socket));socket.on('error',()=>{});socket.setTimeout(10000,()=>socket.destroy());
  let buffer='',recipient='',data=false,body='';socket.write('220 owned-fixture ESMTP\r\n');
  socket.on('data',chunk=>{
   buffer+=chunk.toString('utf8');if(buffer.length+body.length>65536){socket.destroy();return;}
   while(buffer.includes('\r\n')){
    const at=buffer.indexOf('\r\n'),line=buffer.slice(0,at);buffer=buffer.slice(at+2);
    if(data){if(line==='.') {messages.push({recipient,body});data=false;body='';if(loseAcknowledgement){loseAcknowledgement=false;socket.destroy();return;}socket.write('250 captured fictional mail\r\n');}else body+=line+'\r\n';continue;}
    if(/^EHLO|^HELO/i.test(line))socket.write('250 owned-fixture\r\n');
    else if(/^MAIL FROM:/i.test(line))socket.write('250 sender accepted\r\n');
    else if(/^RCPT TO:/i.test(line)){recipient=line.slice(8).trim();socket.write('250 recipient accepted\r\n');}
    else if(line==='DATA'){data=true;socket.write('354 end with dot\r\n');}
    else if(line==='QUIT'){socket.end('221 bye\r\n');}
    else if(line==='RSET'||line==='NOOP')socket.write('250 ok\r\n');else socket.write('500 unsupported fixture command\r\n');
   }
  });
 });
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const address=server.address();if(!address||typeof address==='string')throw Error('Owned SMTP address missing');
 return {port:address.port,messages,loseNextAcknowledgement(){loseAcknowledgement=true;},async close(){for(const socket of sockets)socket.destroy();await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}};
}
