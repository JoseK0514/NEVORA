import { beforeAll, expect, it } from 'vitest';
import sharp from 'sharp';
import { validatePunchJpeg } from './jpeg';
import { decodePunchJpeg } from './decode';
let jpeg: Buffer;
beforeAll(async () => { jpeg = await sharp({ create: { width: 8, height: 6, channels: 3, background: { r: 0, g: 120, b: 140 } } }).jpeg().toBuffer(); });
it('decodes/reencodes actual synthetic pixels and returns bounded canonical JPEG', async () => {
  const photo = await decodePunchJpeg(jpeg, 'image/jpeg');
  const decoded = await sharp(Buffer.from(photo.bytes)).raw().toBuffer({ resolveWithObject: true });
  expect(decoded.info).toMatchObject({ width: 8, height: 6, channels: 3 });
  expect(photo.sha256).toMatch(/^[a-f0-9]{64}$/);
  expect(photo.bytes.length).toBeLessThan(524288);
});
it('removes APP and comment metadata before storage', async () => {
  const app = Buffer.from([255, 225, 0, 8, 69, 88, 73, 70, 0, 0]);
  const comment = Buffer.from([255, 254, 0, 8, 83, 69, 67, 82, 69, 84]);
  const withMetadata = Buffer.concat([jpeg.subarray(0, 2), app, comment, jpeg.subarray(2)]);
  const photo = await decodePunchJpeg(withMetadata, 'image/jpeg');
  const metadata = await sharp(Buffer.from(photo.bytes)).metadata();
  expect(metadata.exif).toBeUndefined();
  expect(Buffer.from(photo.bytes).includes(Buffer.from('SECRET'))).toBe(false);
});
it('cannot confuse magic-byte parsing with pixel decoding', async () => {
  const malformed = Buffer.from([255,216,255,192,0,11,8,0,1,0,1,1,1,17,0,255,218,0,8,1,1,0,0,63,0,0,255,217]);
  expect(validatePunchJpeg(malformed, 'image/jpeg').width).toBe(1);
  await expect(decodePunchJpeg(malformed, 'image/jpeg')).rejects.toThrow('Check the photo request');
});
it.each(['image/png', 'image/svg+xml', 'text/html', 'image/jpeg; charset=utf-8'])('rejects unsupported MIME %s', mime => {
  expect(() => validatePunchJpeg(jpeg, mime)).toThrow();
});
it('rejects oversized body before decoding', () => { expect(() => validatePunchJpeg(new Uint8Array(524289), 'image/jpeg')).toThrow(); });
it('rejects oversized dimensions even with a small JPEG file', async () => {
  const wide = await sharp({ create: { width: 641, height: 1, channels: 3, background: 'white' } }).jpeg().toBuffer();
  await expect(decodePunchJpeg(wide, 'image/jpeg')).rejects.toThrow();
});
it('rejects trailing polyglot content and truncation', () => {
  expect(() => validatePunchJpeg(Buffer.concat([jpeg, Buffer.from('<script>')]), 'image/jpeg')).toThrow();
  expect(() => validatePunchJpeg(jpeg.subarray(0, jpeg.length - 1), 'image/jpeg')).toThrow();
});
it('does not mutate the original bytes', () => { const original = Buffer.from(jpeg); validatePunchJpeg(jpeg, 'image/jpeg'); expect(jpeg).toEqual(original); });
