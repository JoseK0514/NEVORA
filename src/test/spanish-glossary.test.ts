import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from '@rstest/core';

// The voice guide's glossary (docs/design/voice.md): a punch is "ponche" (verb "ponchar") and a timecard is "tarjeta de
// tiempo".
// The Spanish integration review (Nov 26, 2026) found literal translations of "punch" (a blow with the fist) and
// "time sheet" in shipped copy. These words never describe a clock event or a timecard in NEVORA's Spanish.
// QA's copy-slip list on the same day added "brecha de cobertura" (gap is a Never word) and "lectura protegida" (an
// internal term that reached people).
// Jose, Nov 26, 2026: "ponche/ponchar" is the one word for a punch, so "marcación" is retired; "espacio de trabajo"
// became "empresa".
const BANNED = [/puñetazo/i, /\bgolpe\b/i, /\bhojas? de tiempo\b/i, /fijas PIN de reloj/i, /brecha de cobertura/i, /lectura protegida/i,
  /marcaci[oó]n/i, /espacio de trabajo/i];

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "test" || name === "node_modules" ? [] : sources(path);
    return /\.(tsx?|mts)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });
}

it("shipped Spanish copy uses the glossary words for a punch and a timecard", () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const offenders = sources(root).flatMap(file => {
    const text = readFileSync(file, "utf8");
    return BANNED.filter(word => word.test(text)).map(word => `${file.slice(root.length)} ${word}`);
  });
  expect(offenders).toEqual([]);
});
