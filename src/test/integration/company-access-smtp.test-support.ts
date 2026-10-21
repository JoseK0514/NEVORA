import {createServer, type Socket} from 'node:net';
/** Invocation-owned SMTP. Messages stay in memory and are never written to evidence. */
export async function fakeInvitationSmtp(mode:'accept'|'reject_before_data'|'drop_after_data'='accept') {
 const messages:string[]=[];
 const sockets=new Set<Socket>();
 const server=createServer(socket=>{
  sockets.add(socket);socket.on('close',()=>sockets.delete(socket));socket.on('error',()=>{});
  socket.setEncoding('utf8');socket.write('220 owned-loopback ESMTP\r\n');
  let buffer='',data=false,lines:string[]=[];
  socket.on('data',chunk=>{
   buffer+=chunk;
   while(buffer.includes('\r\n')) {
    const end=buffer.indexOf('\r\n'),line=buffer.slice(0,end);buffer=buffer.slice(end+2);
    if(data) {
     if(line==='.') {data=false;messages.push(lines.join('\r\n'));lines=[];
      if(mode==='drop_after_data'){socket.destroy();return;}
      socket.write('250 2.0.0 accepted\r\n');
     } else lines.push(line.startsWith('..')?line.slice(1):line);
     continue;
    }
    if(/^(EHLO|HELO)\b/i.test(line))socket.write('250-owned-loopback\r\n250 SIZE 65536\r\n');
    else if(/^MAIL FROM:/i.test(line))socket.write(mode==='reject_before_data'?'550 5.7.1 test rejection\r\n':'250 2.1.0 sender ok\r\n');
    else if(/^RCPT TO:/i.test(line))socket.write('250 2.1.5 recipient ok\r\n');
    else if(line==='DATA'){data=true;socket.write('354 end with dot\r\n');}
    else if(line==='QUIT'){socket.end('221 closing\r\n');}
    else socket.write('250 ok\r\n');
   }
  });
 });
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const address=server.address();if(!address||typeof address==='string')throw Error('Owned SMTP bind failed');
 return {messages,env:{NODE_ENV:'test',NEVORA_INVITATION_DELIVERY_ENABLED:'true',NEVORA_RECOVERY_SMTP_HOST:'127.0.0.1',NEVORA_RECOVERY_SMTP_PORT:String(address.port),NEVORA_RECOVERY_FROM:'invitation@example.invalid',FUEL_PORTAL_ORIGIN:'http://127.0.0.1:32123'},
  async close(){for(const socket of sockets)socket.destroy();await new Promise<void>(resolve=>server.close(()=>resolve()));messages.length=0;}};
}
