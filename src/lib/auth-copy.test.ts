import { describe, expect, it } from "vitest";
import { AUTH_COPY, authMessage } from "./auth-copy";
import { greetingFor } from "@/components/auth-premium/greeting";

describe("sign-in words", () => {
  it("greets by the device hour: morning 5–11, afternoon 12–16, evening otherwise", () => {
    const words = AUTH_COPY.en.greeting;
    expect([4, 5, 11, 12, 16, 17, 23, 0].map(hour => greetingFor(hour, words)))
      .toEqual(["Good evening", "Good morning", "Good morning", "Good afternoon", "Good afternoon", "Good evening", "Good evening", "Good evening"]);
    expect(greetingFor(9, AUTH_COPY.es.greeting)).toBe("Buenos días");
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
