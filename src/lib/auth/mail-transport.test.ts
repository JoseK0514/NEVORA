import {it,expect} from 'vitest';
import {validatedMailTransport} from './mail-transport.server';
it('admits HTTPS links with a development loopback SMTP transport while remote SMTP still requires credentials and HTTPS',()=>{
 const env={NODE_ENV:'test',NEVORA_RECOVERY_SMTP_HOST:'127.0.0.1',NEVORA_RECOVERY_SMTP_PORT:'23232',NEVORA_RECOVERY_FROM:'fictional@example.invalid',FUEL_PORTAL_ORIGIN:'https://alpha.portal.example.invalid'};
 expect(validatedMailTransport(env)?.origin).toBe(env.FUEL_PORTAL_ORIGIN);expect(validatedMailTransport({...env,NEVORA_RECOVERY_SMTP_HOST:'smtp.example.invalid'})).toBeNull();expect(validatedMailTransport({...env,NODE_ENV:'production'})).toBeNull();expect(validatedMailTransport({...env,FUEL_PORTAL_ORIGIN:'ftp://alpha.portal.example.invalid'})).toBeNull();
});
