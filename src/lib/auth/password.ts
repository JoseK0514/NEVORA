import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

export async function hashPassword(password: string) {
  if (password.length < 8) {
    throw new Error("Password must contain at least 8 characters.");
  }

  const salt = randomBytes(16);
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;

  return `scrypt$${salt.toString("hex")}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string) {
  if (typeof encoded !== "string") {
    return false;
  }

  const parts = encoded.split("$");
  if (parts.length !== 3) {
    return false;
  }

  const [algorithm, saltHex, hashHex] = parts;

  // Buffer's hex decoder can truncate malformed input. Validate the complete
  // existing generated format before deriving or comparing a key.
  if (
    algorithm !== "scrypt" ||
    saltHex.length !== 32 ||
    hashHex.length !== KEY_LENGTH * 2 ||
    /[^0-9a-f]/i.test(saltHex) ||
    /[^0-9a-f]/i.test(hashHex)
  ) {
    return false;
  }

  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = (await scryptAsync(password, salt, expected.length)) as Buffer;

  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}

let dummyHash: Promise<string> | null = null;
/** A real scrypt hash of a random secret, made once per process. Sign-in checks unknown or inactive Employee IDs
 * against it so every failed sign-in costs the same time and doesn't reveal which IDs exist. */
export function dummyPasswordHash(): Promise<string> {
  dummyHash ??= hashPassword(randomBytes(24).toString("hex"));
  return dummyHash;
}
