import { createHash } from 'node:crypto';
import { ClockerPhotoError, PHOTO_MAX_BYTES, PHOTO_MAX_DIMENSION } from './contracts';

export type ValidatedPhoto = { bytes: Uint8Array; sha256: string; width: number; height: number; contentType: 'image/jpeg' };
const invalid = (): never => { throw new ClockerPhotoError('INVALID_INPUT'); };

/** Parse the JPEG container, bound dimensions and strip application/comment metadata.
 * This does not claim full entropy decoding or photographic identity validation. */
export function validatePunchJpeg(input: unknown, contentType: unknown): ValidatedPhoto {
  if (!(input instanceof Uint8Array) || input.byteLength < 20 || input.byteLength > PHOTO_MAX_BYTES || contentType !== 'image/jpeg') invalid();
  const bytes = new Uint8Array(input as Uint8Array);
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) invalid();
  const parts: Uint8Array[] = [bytes.slice(0, 2)];
  let offset = 2, width = 0, height = 0, frame = false, scan = false, ended = false;
  const uint16 = (at: number) => (bytes[at] << 8) | bytes[at + 1];
  while (offset < bytes.length) {
    const start = offset;
    if (bytes[offset++] !== 0xff) invalid();
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xd9) {
      if (!frame || !scan || offset !== bytes.length) invalid();
      parts.push(bytes.slice(start, offset)); ended = true; break;
    }
    if (marker === undefined || marker === 0x00 || marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) invalid();
    if (offset + 2 > bytes.length) invalid();
    const length = uint16(offset), end = offset + length;
    if (length < 2 || end > bytes.length) invalid();
    if (marker === 0xc0 || marker === 0xc2) {
      if (frame || length < 11 || bytes[offset + 2] !== 8) invalid();
      height = uint16(offset + 3); width = uint16(offset + 5);
      const components = bytes[offset + 7];
      if (![1, 3].includes(components) || length !== 8 + 3 * components || width < 1 || height < 1 ||
          width > PHOTO_MAX_DIMENSION || height > PHOTO_MAX_DIMENSION) invalid();
      frame = true;
    } else if (marker >= 0xc0 && marker <= 0xcf && ![0xc4].includes(marker)) invalid();
    const metadata = (marker >= 0xe0 && marker <= 0xef) || marker === 0xfe;
    if (!metadata) parts.push(bytes.slice(start, end));
    offset = end;
    if (marker === 0xda) {
      if (!frame || length < 8 || length !== 6 + 2 * bytes[end - length + 2]) invalid();
      scan = true;
      const scanStart = offset;
      while (offset < bytes.length) {
        if (bytes[offset] !== 0xff) { offset++; continue; }
        const next = bytes[offset + 1];
        if (next === 0x00 || (next >= 0xd0 && next <= 0xd7)) { offset += 2; continue; }
        break;
      }
      if (offset === scanStart) invalid();
      parts.push(bytes.slice(scanStart, offset));
    }
  }
  if (!ended) invalid();
  const clean = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let cursor = 0;
  for (const part of parts) { clean.set(part, cursor); cursor += part.length; }
  return { bytes: clean, sha256: createHash('sha256').update(clean).digest('hex'), width, height, contentType: 'image/jpeg' };
}
