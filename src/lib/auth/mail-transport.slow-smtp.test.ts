import {createServer,type Socket} from 'node:net';
import {expect,it} from 'vitest';
import {validatedMailTransport} from './mail-transport.server';

it('bounds a real slowly progressing SMTP conversation even while each exchange stays below the idle timeout',async()=>{
 const sockets=new Set<Socket>();
 const timers=new Set<ReturnType<typeof setTimeout>>();
 let receivedData=false;
 const respond=(socket:Socket,text:string)=>{
  const timer=setTimeout(()=>{timers.delete(timer);if(!socket.destroyed)socket.write(text);},3400);
  timers.add(timer);
 };
 const server=createServer(socket=>{
  sockets.add(socket);socket.once('close',()=>sockets.delete(socket));socket.on('error',()=>{});
  socket.setEncoding('utf8');socket.write('220 owned-loopback ESMTP\r\n');
  let buffer='',data=false;
  socket.on('data',chunk=>{
   buffer+=chunk;
   while(buffer.includes('\r\n')){
    const end=buffer.indexOf('\r\n'),line=buffer.slice(0,end);buffer=buffer.slice(end+2);
    if(data){
     if(line==='.'){
      data=false;receivedData=true;respond(socket,'250 2.0.0 accepted\r\n');
     }
    }else if(/^(EHLO|HELO)\b/i.test(line))respond(socket,'250 owned-loopback\r\n');
    else if(/^MAIL FROM:/i.test(line))respond(socket,'250 sender ok\r\n');
    else if(/^RCPT TO:/i.test(line))respond(socket,'250 recipient ok\r\n');
    else if(line==='DATA'){data=true;respond(socket,'354 end with dot\r\n');}
    else if(line==='QUIT')socket.end('221 closing\r\n');
   }
  });
 });
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 try{
  const address=server.address();if(!address||typeof address==='string')throw Error('Owned SMTP bind failed');
  const mail=validatedMailTransport({NODE_ENV:'test',NEVORA_RECOVERY_SMTP_HOST:'127.0.0.1',NEVORA_RECOVERY_SMTP_PORT:String(address.port),NEVORA_RECOVERY_FROM:'sender@example.invalid',FUEL_PORTAL_ORIGIN:'http://127.0.0.1:32123'})!;
  const outcome=await mail.sendRegistered('owner@example.invalid','Fictional slow-SMTP test','Fictional body')
   .then(()=>({state:'accepted'}),error=>({state:'unknown',code:error.code}));
  expect(receivedData).toBe(true);
  expect(outcome).toEqual({state:'unknown',code:'smtp_deadline_exceeded'});
 }finally{
  for(const timer of timers)clearTimeout(timer);
  for(const socket of sockets)socket.destroy();
  await new Promise<void>(resolve=>server.close(()=>resolve()));
 }
},25000);
