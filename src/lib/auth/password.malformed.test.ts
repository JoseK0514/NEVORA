import { beforeAll, describe, expect, it } from 'vitest';
import { scryptSync } from 'node:crypto';
import { hashPassword, verifyPassword } from './password';

// Actual production API + native Node crypto; only fictional credentials.
// Generated format remains scrypt$32-hex-salt$128-hex-key. These tests do not
// select a password-strength policy, change the format, or mock crypto.
const password = 'fictional-correct-password';
const wrongPassword = 'fictional-wrong-password';
const salt = Buffer.from('0123456789abcdef', 'utf8');
let generated: string;
let saltHex: string;
let digestHex: string;

function nativeFixture(saltBytes: Buffer, keyBytes: number): string {
  return `scrypt$${saltBytes.toString('hex')}$${scryptSync(password, saltBytes, keyBytes).toString('hex')}`;
}

beforeAll(async () => {
  generated = await hashPassword(password);
  [, saltHex, digestHex] = generated.split('$');
});

describe('supported generated password wire', () => {
  it('retains the actual generated algorithm, sixteen-byte salt and sixty-four-byte digest', () => {
    expect(generated).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    expect(generated.split('$')).toHaveLength(3);
  });
  it('verifies the actual generated roundtrip', async () => {
    await expect(verifyPassword(password, generated)).resolves.toBe(true);
  });
  it('rejects a wrong password for the actual generated value', async () => {
    await expect(verifyPassword(wrongPassword, generated)).resolves.toBe(false);
  });
  it.each(['salt', 'digest', 'both'] as const)('preserves uppercase hex equivalence for %s', async field => {
    const encoded = `scrypt$${field === 'digest' ? saltHex : saltHex.toUpperCase()}$${field === 'salt' ? digestHex : digestHex.toUpperCase()}`;
    await expect(verifyPassword(password, encoded)).resolves.toBe(true);
    await expect(verifyPassword(wrongPassword, encoded)).resolves.toBe(false);
  });
  it.each(['SCRYPT', 'Scrypt', 'sCryPt', 'unknown'])('rejects algorithm spelling %s', async algorithm => {
    await expect(verifyPassword(password, `${algorithm}$${saltHex}$${digestHex}`)).resolves.toBe(false);
  });
});

const malformed: ReadonlyArray<{ label: string; encoded: () => string; suppliedPassword?: string }> = [
  { label: 'nonhex zero-buffer bypass', encoded: () => 'scrypt$gg$gg', suppliedPassword: wrongPassword },
  { label: 'partially decoded salt and zero digest bypass', encoded: () => 'scrypt$00zz$zz', suppliedPassword: wrongPassword },
  { label: 'full-width nonhex salt and digest', encoded: () => `scrypt$${'g'.repeat(32)}$${'g'.repeat(128)}`, suppliedPassword: wrongPassword },
  { label: 'empty salt and digest', encoded: () => 'scrypt$$', suppliedPassword: wrongPassword },
  { label: 'empty salt with a real native derived digest', encoded: () => nativeFixture(Buffer.alloc(0), 64) },
  { label: 'empty digest with real salt', encoded: () => `scrypt$${saltHex}$` },
  { label: 'one-byte salt with coherent native digest', encoded: () => nativeFixture(salt.subarray(0, 1), 64) },
  { label: 'fifteen-byte salt with coherent native digest', encoded: () => nativeFixture(salt.subarray(0, 15), 64) },
  { label: 'seventeen-byte salt with coherent native digest', encoded: () => nativeFixture(Buffer.concat([salt, Buffer.from('x')]), 64) },
  { label: 'thirty-two-byte salt with coherent native digest', encoded: () => nativeFixture(Buffer.concat([salt, salt]), 64) },
  { label: 'one-byte digest with coherent native derivation', encoded: () => nativeFixture(salt, 1) },
  { label: 'sixty-three-byte digest with coherent native derivation', encoded: () => nativeFixture(salt, 63) },
  { label: 'sixty-five-byte digest with coherent native derivation', encoded: () => nativeFixture(salt, 65) },
  { label: 'odd trailing salt nibble after valid bytes', encoded: () => `scrypt$${saltHex}a$${digestHex}` },
  { label: 'odd trailing digest nibble after valid bytes', encoded: () => `scrypt$${saltHex}$${digestHex}a` },
  { label: 'trailing nonhex salt junk after valid bytes', encoded: () => `scrypt$${saltHex}zz$${digestHex}` },
  { label: 'trailing nonhex digest junk after valid bytes', encoded: () => `scrypt$${saltHex}$${digestHex}zz` },
  { label: 'salt whitespace after valid bytes', encoded: () => `scrypt$${saltHex} $${digestHex}` },
  { label: 'digest whitespace after valid bytes', encoded: () => `scrypt$${saltHex}$${digestHex} ` },
  { label: 'leading nonhex salt character', encoded: () => `scrypt$g${saltHex}$${digestHex}` },
  { label: 'leading nonhex digest character', encoded: () => `scrypt$${saltHex}$g${digestHex}` },
  { label: 'embedded nonhex salt character', encoded: () => `scrypt$${saltHex.slice(0, 2)}gg${saltHex.slice(4)}$${digestHex}` },
  { label: 'embedded nonhex digest character', encoded: () => `scrypt$${saltHex}$${digestHex.slice(0, 2)}gg${digestHex.slice(4)}` },
  { label: 'extra nonempty field after valid generated value', encoded: () => `${generated}$extra` },
  { label: 'extra empty field after valid generated value', encoded: () => `${generated}$` },
  { label: 'missing digest field', encoded: () => `scrypt$${saltHex}` },
  { label: 'missing salt and digest fields', encoded: () => 'scrypt' },
  { label: 'missing algorithm field', encoded: () => `$${saltHex}$${digestHex}` },
  { label: 'empty wire', encoded: () => '' },
];

describe('malformed password wire rejects without throwing', () => {
  it.each(malformed)('$label', async fixture => {
    // resolves.toBe(false) rejects both accidental ALLOW and thrown/rejected
    // malformed-source handling. Coherent native fixtures make width rejection
    // independent of an unrelated wrong-password comparison.
    await expect(verifyPassword(fixture.suppliedPassword ?? password, fixture.encoded())).resolves.toBe(false);
  });
});
