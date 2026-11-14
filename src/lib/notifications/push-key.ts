/** Canonical unpadded URL-safe encoding only. Never log rejected values. */
export function decodePushKey(value: unknown, length: number): Buffer | null {
 if (typeof value!=='string' || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
 const bytes=Buffer.from(value,'base64url');
 return bytes.length===length && bytes.toString('base64url')===value ? bytes : null;
}
