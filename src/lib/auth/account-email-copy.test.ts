import { expect, it } from "vitest";
import { invitationEmail, passwordChangedEmail, recoveryEmail } from "./account-email-copy";

const link = "https://portal.test/activate#proof=FICTIONAL_PROOF";
it.each([
  ["invitation", invitationEmail(link), "Activate your NEVORA account / Activa tu cuenta de NEVORA", "vence en 7 días", 2],
  ["recovery", recoveryEmail(link), "Reset your NEVORA password / Restablece tu contraseña de NEVORA", "vence en 15 minutos", 2],
  ["password changed", passwordChangedEmail("https://portal.test"), "Your NEVORA password was changed / Se cambió tu contraseña de NEVORA", "https://portal.test/login para revisar", 0],
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
 expect(en).toContain('This single-use link expires in 15 minutes.');
 expect(es).toContain('Este enlace es de un solo uso y vence en 15 minutos.');
 expect(en).toContain('If you did not request this, keep your existing password and contact your manager.');
 expect(es).toContain('Si no lo pediste, conserva tu contraseña actual y comunícate con tu gerente.');
 expect(en).toMatch(/contact your manager\.\n\nCan’t use this email\? Ask your manager for help\. Manager and Owner accounts need another Owner\.$/);
 expect(es).toMatch(/comunícate con tu gerente\.\n\n¿No puedes usar este correo\? Pide ayuda a tu gerente\. Las cuentas de gerente y de dueño necesitan a otro dueño\.$/);
 for(const half of [en,es])expect(half.split('\n').filter(line=>line===link)).toHaveLength(1);
});
