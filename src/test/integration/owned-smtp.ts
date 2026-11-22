import {createServer,type Socket} from 'node:net';
import {createSecureContext, TLSSocket} from 'node:tls';

type OwnedSmtpTls = { cert: Buffer; key: Buffer; password: string };

/** Fictional mail capture, bound only to an invocation-owned loopback port. */
export async function createOwnedSmtp(onCapture?: (body: string) => void, tls?: OwnedSmtpTls){
 const messages:{recipient:string;body:string}[]=[],sockets=new Set<Socket>();
 const secureContext=tls?createSecureContext({cert:tls.cert,key:tls.key}):null;
 let loseAcknowledgement=false;
 const server=createServer(socket=>{
  sockets.add(socket);socket.on('close',()=>sockets.delete(socket));socket.on('error',()=>{});socket.setTimeout(10000,()=>socket.destroy());
  let channel=socket,encrypted=false,authenticated=!tls;
  let buffer='',recipient='',data=false,body='';channel.write('220 owned-fixture ESMTP\r\n');
  const receive=(chunk:Buffer)=>{
   buffer+=chunk.toString('utf8');if(buffer.length+body.length>65536){channel.destroy();return;}
   while(buffer.includes('\r\n')){
    const at=buffer.indexOf('\r\n'),line=buffer.slice(0,at);buffer=buffer.slice(at+2);
    if(data){if(line==='.') {messages.push({recipient,body});onCapture?.(body);data=false;body='';if(loseAcknowledgement){loseAcknowledgement=false;channel.destroy();return;}channel.write('250 captured fictional mail\r\n');}else body+=line+'\r\n';continue;}
    if(/^(?:EHLO|HELO) /i.test(line))channel.write(!tls?'250 owned-fixture\r\n':encrypted?'250-owned-fixture\r\n250 AUTH PLAIN\r\n':'250-owned-fixture\r\n250 STARTTLS\r\n');
    else if(line==='STARTTLS'&&secureContext&&!encrypted){
     socket.removeListener('data',receive);
     socket.write('220 Ready to start TLS\r\n');
     const secure=new TLSSocket(socket,{secureContext,isServer:true});
     channel=secure;
     encrypted=true;
     buffer='';
     secure.on('error',()=>secure.destroy());
     secure.on('data',receive);
     return;
    }
    else if(tls&&encrypted&&line.startsWith('AUTH PLAIN ')){
     authenticated=Buffer.from(line.slice(11),'base64').toString('utf8')===('\0collab-qa\0'+tls.password);
     channel.write(authenticated?'235 Authenticated\r\n':'535 Authentication refused\r\n');
    }
    else if(line==='QUIT')channel.end('221 bye\r\n');
    else if(!authenticated)channel.write('530 TLS and authentication required\r\n');
    else if(/^MAIL FROM:/i.test(line))channel.write('250 sender accepted\r\n');
    else if(/^RCPT TO:/i.test(line)){
     recipient=line.slice(8).trim();
     if(tls&&recipient.toLowerCase()!=='<qa-signup@example.invalid>') channel.write('550 Fictional recipient required\r\n');
     else channel.write('250 recipient accepted\r\n');
    }
    else if(line==='DATA'){data=true;channel.write('354 end with dot\r\n');}
    else if(line==='RSET'||line==='NOOP')channel.write('250 ok\r\n');else channel.write('500 unsupported fixture command\r\n');
   }
  };
  socket.on('data',receive);
 });
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const address=server.address();if(!address||typeof address==='string')throw Error('Owned SMTP address missing');
 return {port:address.port,messages,loseNextAcknowledgement(){loseAcknowledgement=true;},async close(){for(const socket of sockets)socket.destroy();await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}};
}
