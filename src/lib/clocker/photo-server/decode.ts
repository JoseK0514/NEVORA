import sharp from 'sharp';
import { ClockerPhotoError, PHOTO_MAX_BYTES, PHOTO_MAX_DIMENSION } from './contracts';
import { validatePunchJpeg, type ValidatedPhoto } from './jpeg';

/** Direct sharp dependency: decode pixels and strip metadata before private storage. */
export async function decodePunchJpeg(input: unknown, contentType: unknown): Promise<ValidatedPhoto> {
  const container = validatePunchJpeg(input, contentType);
  try {
    // Reencoding forces compressed pixel decoding. metadata() alone would not.
    // Default output omits metadata; container validation also strips APP/COM.
    const output = await sharp(Buffer.from(container.bytes), { failOn: 'warning', limitInputPixels: PHOTO_MAX_DIMENSION ** 2 })
      .timeout({ seconds: 3 }).toColourspace('srgb').jpeg({ quality: 80, force: true }).toBuffer();
    if (output.length > PHOTO_MAX_BYTES) throw new ClockerPhotoError('INVALID_INPUT');
    return validatePunchJpeg(output, 'image/jpeg');
  } catch { throw new ClockerPhotoError('INVALID_INPUT'); }
}
