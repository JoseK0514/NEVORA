import {beforeEach,it,expect,vi} from 'vitest';
const f=vi.hoisted(()=>({create:vi.fn(),send:vi.fn()}));
vi.mock('server-only',()=>({}));
vi.mock('nodemailer',()=>({default:{createTransport:f.create}}));
import {recoveryDelivery} from './recovery-delivery.server';
const env={NODE_ENV:'production',FUEL_PORTAL_ORIGIN:'https://portal.test',NEVORA_RECOVERY_SMTP_HOST:'smtp.example.invalid',NEVORA_RECOVERY_SMTP_PORT:'587',NEVORA_RECOVERY_FROM:'recovery@example.invalid',NEVORA_RECOVERY_SMTP_USER:'fictional-user',NEVORA_RECOVERY_SMTP_PASSWORD:'fictional-only'};
beforeEach(()=>{f.create.mockReset();f.send.mockReset();f.create.mockReturnValue({sendMail:f.send});f.send.mockResolvedValue({});});
it('PB-022 includes both alternatives and the actual issued deadline without extending the reset link',async()=>{
 const expiresAt=new Date(Date.now()+5*60000).toISOString();
 await recoveryDelivery(env)!.send('avery@example.invalid','opaque-proof',{companyName:'Harbor Studio',firstName:'Avery',expiresAt,timeZone:'America/Puerto_Rico'});
 const mail=f.send.mock.calls[0][0];
 expect(mail.subject).toContain('Harbor Studio');expect(mail.html).toContain('Harbor Studio');
 expect(mail.html).toContain('lang="es"');expect(mail.text).toContain('15 minutes');expect(mail.text).toContain('15 minutos');
 expect(mail.text).toContain('America/Puerto_Rico');expect(mail.text).not.toContain('Can’t use this email?');
 expect(mail.html).toContain('/reset-access#proof=opaque-proof');
});
it('UX-01 SMTP requires encrypted transport and restricts content sources and recipients',async()=>{const delivery=recoveryDelivery(env);expect(delivery).not.toBeNull();expect(f.create).toHaveBeenCalledWith(expect.objectContaining({requireTLS:true,secure:false,logger:false,debug:false,disableFileAccess:true,disableUrlAccess:true,maxRecipients:1}));await delivery!.send('avery@example.invalid','opaque-proof');expect(f.send).toHaveBeenCalledWith(expect.objectContaining({to:'avery@example.invalid',text:expect.stringContaining('https://portal.test/reset-access#proof=opaque-proof')}));});
it.each([{...env,FUEL_PORTAL_ORIGIN:'http://portal.test'},{...env,FUEL_PORTAL_ORIGIN:'https://evil.test/path'},{...env,NEVORA_RECOVERY_SMTP_PASSWORD:''},{...env,NEVORA_RECOVERY_FROM:'injection\r\n@example.invalid'},{}])('UX-01 missing or unsafe configuration requires assisted recovery',config=>{expect(recoveryDelivery(config)).toBeNull();expect(f.create).not.toHaveBeenCalled();});
it('UX-01 never accepts a caller-controlled recipient header',async()=>{await expect(recoveryDelivery(env)!.send('victim@example.invalid\r\nBcc: other@example.invalid','proof')).rejects.toThrow();expect(f.send).not.toHaveBeenCalled();});
