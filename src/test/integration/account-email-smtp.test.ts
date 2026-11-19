import {it,expect} from '@rstest/core';
import {decodeAccountEmail,readAccountEmailSet} from './account-email-smtp.test-support';
const raw='Content-Type: multipart/alternative; boundary="owned"\r\n\r\n--owned\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\nHola contrase=C3=B1a=\r\n final\r\n--owned\r\nContent-Type: text/html; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n'+Buffer.from('<p>Fictional email</p>').toString('base64')+'\r\n--owned--\r\n';
it('decodes the actually transmitted UTF-8 MIME alternatives',()=>{expect(decodeAccountEmail(raw)).toEqual({text:'Hola contraseña final',html:'<p>Fictional email</p>'});});
it('rejects missing or duplicate alternatives instead of regenerating them',()=>{expect(()=>decodeAccountEmail(raw.replace('text/html','text/plain'))).toThrow();});
it('refuses a missing password-change security notice in the captured message set',()=>{
 const email=(body:string)=>({recipient:'<fixture@example.invalid>',body:raw.replace('Hola contrase=C3=B1a=\r\n final',body).replace(Buffer.from('<p>Fictional email</p>').toString('base64'),Buffer.from('<p>'+body+'</p>').toString('base64'))});
 const invite=email('/activate'),reset=email('/reset-access');
 expect(()=>readAccountEmailSet([invite,reset],'fixture@example.invalid')).toThrow();
 const captured=readAccountEmailSet([invite,reset,email('/login')],'fixture@example.invalid');expect(captured.map(e=>e.kind)).toEqual(['invitation','reset','changed']);
});
