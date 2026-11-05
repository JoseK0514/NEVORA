import { expect, it } from "vitest";
import { invitationEmail, passwordChangedEmail, recoveryEmail } from "./account-email-copy";

const link = "https://portal.test/activate#proof=FICTIONAL_PROOF";
it.each([
  ["invitation", invitationEmail(link), "Activate your NEVORA account / Activa tu cuenta de NEVORA", "vence en 7 días", 2],
  ["recovery", recoveryEmail(link), "NEVORA access recovery / Recupera tu acceso a NEVORA", "vence en 15 minutos", 2],
  ["password changed", passwordChangedEmail("https://portal.test"), "Your NEVORA password was changed / Se cambió tu contraseña de NEVORA", "https://portal.test/login para revisar", 0],
] as const)("%s email reads in English, then Spanish", (_name, email, subject, spanish, links) => {
  expect(email.subject).toBe(subject);
  const [en, es] = email.text.split("\n\n—\n\n");
  expect(es).toContain(spanish); expect(en).not.toMatch(/[áéíóúñ¿¡]/);
  // Each half carries the whole link on its own line, so either reader can use it.
  expect(email.text.split("\n").filter(line => line === link).length).toBe(links);
  expect(email.subject).not.toMatch(/[\r\n]/);
});
