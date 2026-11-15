import { describe, expect, it } from "vitest";
import { AUTH_COPY, authMessage, preferredAuthLang } from "./auth-copy";
import { greetingFor } from "@/components/auth-premium/greeting";

describe("sign-in words", () => {
  it("greets by the device hour: morning 5–11, afternoon 12–16, evening otherwise", () => {
    const words = AUTH_COPY.en.greeting;
    expect([4, 5, 11, 12, 16, 17, 23, 0].map(hour => greetingFor(hour, words)))
      .toEqual(["Good evening", "Good morning", "Good morning", "Good afternoon", "Good afternoon", "Good evening", "Good evening", "Good evening"]);
    expect(greetingFor(9, AUTH_COPY.es.greeting)).toBe("Buenos días");
  });

  it("says Buenas tardes until 7 PM in Spanish, as in Puerto Rico (PB-019)", () => {
    const words = AUTH_COPY.es.greeting;
    expect([11, 12, 17, 18, 19, 23, 4].map(hour => greetingFor(hour, words)))
      .toEqual(["Buenos días", "Buenas tardes", "Buenas tardes", "Buenas tardes", "Buenas noches", "Buenas noches", "Buenas noches"]);
  });

  it("a first visit follows the browser: Spanish only when it ranks ahead of English (PB-020)", () => {
    for (const accepted of ["es", "es-PR,es;q=0.9,en;q=0.8", "fr-FR, es-419;q=0.7, en;q=0.3", "en;q=0.5, es;q=0.9", "ES-pr"]) expect(preferredAuthLang(accepted)).toBe("es");
    for (const accepted of [null, undefined, "", "en-US,en;q=0.9,es;q=0.8", "fr-FR,fr;q=0.9", "es;q=0, en", "*", "en, es"]) expect(preferredAuthLang(accepted)).toBe("en");
  });

  it("pay wording on sign-in names statements and a scheduled payday, never pay itself (PY-21)", () => {
    expect(AUTH_COPY.en.panelSupport).toBe("Shifts, hours, time off and pay statements, ready the moment you sign in.");
    expect(AUTH_COPY.es.panelSupport).toBe("Turnos, horas, días libres y tus comprobantes de pago, listos al iniciar sesión.");
    expect([AUTH_COPY.en.device.nextPayday, AUTH_COPY.es.device.nextPayday]).toEqual(["Scheduled payday", "Día de pago programado"]);
  });

  it("has every English key in Spanish, and the spec's approved words", () => {
    const keys = (value: object): string[] => Object.entries(value).flatMap(([key, item]) => typeof item === "object" ? keys(item).map(inner => `${key}.${inner}`) : [key]);
    expect(keys(AUTH_COPY.es).sort()).toEqual(keys(AUTH_COPY.en).sort());
    for (const value of Object.values(AUTH_COPY.es)) if (typeof value === "string") expect(value.trim()).not.toBe("");
    expect(AUTH_COPY.es.signIn).toBe("Iniciar sesión");
    expect(AUTH_COPY.es.forgotAccess).toBe("¿Olvidaste tu contraseña?");
    expect(AUTH_COPY.es.bandLine).toBe("Tu semana, en un solo lugar.");
  });

  it("translates known recovery messages exactly and leaves unknown ones as they arrive", () => {
    expect(authMessage("es", "Passwords do not match.")).toBe("Las contraseñas no coinciden.");
    expect(authMessage("en", "Passwords do not match.")).toBe("Passwords do not match.");
    expect(authMessage("es", "A new server message.")).toBe("A new server message.");
  });
});
