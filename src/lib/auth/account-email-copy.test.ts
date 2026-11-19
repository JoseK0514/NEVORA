import { expect, it } from "vitest";
import { invitationEmail, passwordChangedEmail, recoveryEmail } from "./account-email-copy";

it('PB-022 renders escaped company-specific HTML and a bilingual text fallback with the actual reset deadline',()=>{
 const context={companyName:'North & <Harbor>',firstName:'Avery <img src=x>',expiresAt:'2030-01-02T12:15:00.000Z',timeZone:'America/Puerto_Rico'};
 const mail=recoveryEmail('https://portal.test/reset-access#proof=FICTIONAL_PROOF',context);
 expect(mail.subject).toContain('North & <Harbor>');
 expect(mail.text).toContain('North & <Harbor>');
 expect(mail.text).toContain('15 minutes');expect(mail.text).toContain('15 minutos');
 expect(mail.html).toContain('North &amp; &lt;Harbor&gt;');
 expect(mail.html).not.toContain('<img src=x>');
 expect(mail.html).toContain('lang="en"');expect(mail.html).toContain('lang="es"');
 expect(mail.html).toContain('https://portal.test/reset-access#proof=FICTIONAL_PROOF');
 expect(mail.text).not.toContain('Can’t use this email?');
});

it('PB-022 invitation names the company without inventing an inviting Owner',()=>{
 const mail=invitationEmail(link,'10482',{companyName:'Fictional Market',firstName:'Avery',expiresAt:'2030-01-09T12:15:00.000Z',timeZone:'America/Puerto_Rico'});
 expect(mail.subject).toContain('Fictional Market');expect(mail.html).toContain('Set up my account');
 expect(mail.text).toContain('Avery');expect(mail.text).toContain('10482');
 expect(mail.text).not.toContain('Your Owner invited');expect(mail.text).toContain('7 days');
});

it('refuses header injection and untrusted link schemes in account email construction',()=>{
 expect(()=>recoveryEmail('javascript:alert(1)',{companyName:'Fictional Market'})).toThrow();
 expect(()=>invitationEmail(link,'10482',{companyName:'Market\r\nBcc: other@example.invalid'})).toThrow();
});

const link = "https://portal.test/activate#proof=FICTIONAL_PROOF";
it.each([
  ["invitation", invitationEmail(link), "Activate your NEVORA account / Activa tu cuenta de NEVORA", "vence en 7 días", 2],
  ["recovery", recoveryEmail(link), "Reset your NEVORA password / Restablece tu contraseña de NEVORA", "vence en 15 minutos", 2],
  ["password changed", passwordChangedEmail("https://portal.test"), "Your NEVORA password was changed / Se cambió tu contraseña de NEVORA", "https://portal.test/login", 0],
] as const)("%s email reads in English, then Spanish", (_name, email, subject, spanish, links) => {
  expect(email.subject).toBe(subject);
  const [en, es] = email.text.split("\n\n—\n\n");
  expect(es).toContain(spanish); expect(en).not.toMatch(/[áéíóúñ¿¡]/);
  // Each half carries the whole link on its own line, so either reader can use it.
  expect(email.text.split("\n").filter(line => line === link).length).toBe(links);
  expect(email.subject).not.toMatch(/[\r\n]/);
});

it('keeps the recovery fragment, expiry and security warning before role-specific help in both languages',()=>{
 const [en,es]=recoveryEmail(link).text.split("\n\n—\n\n");
 expect(en).toContain('This link works once and expires 15 minutes after it was requested.');
 expect(es).toContain('Este enlace es de un solo uso y vence en 15 minutos desde que se solicitó.');
 expect(en).toContain('If you did not request this, keep your existing password and contact your manager.');
 expect(es).toContain('Si no lo pediste, conserva tu contraseña actual y comunícate con tu gerente.');
 for(const half of [en,es])expect(half.split('\n').filter(line=>line===link)).toHaveLength(1);
});

it('accepts valid long supplementary-plane profile names in every account email',()=>{
 const context={companyName:'𐐀'.repeat(110),firstName:'𐐁'.repeat(110)};
 for(const email of [()=>invitationEmail(link,'10482',context),()=>recoveryEmail(link,context),()=>passwordChangedEmail('https://portal.test',context)])expect(email).not.toThrow();
});
