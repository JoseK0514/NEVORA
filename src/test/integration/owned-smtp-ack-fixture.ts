import {createServer,type Socket} from 'node:net';
import {once} from 'node:events';
import {validatedMailTransport} from '@/lib/auth/mail-transport.server';
/** Loopback SMTP stand-in only: captures full DATA, then loses the final ACK. */
export async function ownedSmtpLostAcknowledgement(){
 let bodies=0;const sockets=new Set<Socket>();
 const server=createServer(socket=>{
  sockets.add(socket);socket.once('close',()=>sockets.delete(socket));socket.on('error',()=>{});
  let data=false,pending='';socket.setEncoding('utf8');socket.write('220 owned-local ESMTP\r\n');
  socket.on('data',part=>{
   pending+=part;
   for(;;){const end=pending.indexOf('\r\n');if(end<0)break;const line=pending.slice(0,end);pending=pending.slice(end+2);
    if(data){if(line==='.'){bodies++;socket.end();}continue;}
    if(/^EHLO |^HELO /.test(line))socket.write('250 localhost\r\n');
    else if(line.startsWith('MAIL FROM:')||line.startsWith('RCPT TO:'))socket.write('250 ok\r\n');
    else if(line==='DATA'){data=true;socket.write('354 send data\r\n');}
    else socket.write('500 invalid\r\n');
   }
  });
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();if(!address||typeof address==='string')throw Error('owned_smtp_unavailable');
 const mail=validatedMailTransport({NODE_ENV:'test',NEVORA_RECOVERY_SMTP_HOST:'127.0.0.1',NEVORA_RECOVERY_SMTP_PORT:String(address.port),NEVORA_RECOVERY_FROM:'fictional@example.invalid',FUEL_PORTAL_ORIGIN:'http://localhost',NEVORA_STAGING_EMAIL_RECIPIENT:'support@thevelani.com'});
 if(!mail)throw Error('owned_smtp_unavailable');
 return {mail,bodies:()=>bodies,async close(){for(const s of sockets)s.destroy();await new Promise<void>(ok=>server.close(()=>ok()));}};
}
