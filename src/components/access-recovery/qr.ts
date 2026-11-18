/* A small QR Code encoder (ISO/IEC 18004, model 2): byte mode, error correction level M, versions 1 to 40, automatic
 * mask. It runs in the browser and has no dependency and no network use: the text given to it never leaves the
 * device. It exists for one screen (the helper's receipt of "Help someone sign in"), where the text is a one-time
 * reset link, so nothing here logs, stores or sends its input.
 *
 * The block tables are the standard's Table 9 for level M. The tests beside this file check the structure (finder
 * patterns, format and version bits, Reed-Solomon syndromes) and pin matrices that were read back with a real decoder. */

/** Error correction codewords per block, level M, by version (index 0 unused). */
const ECC_PER_BLOCK = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28];
/** Error correction blocks, level M, by version (index 0 unused). */
const BLOCKS = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49];

export type QrCode = { version: number; size: number; /** modules[y][x], true is dark. */ modules: boolean[][] };

/** Data and error correction codewords a version holds in total. */
function rawCodewords(version: number): number {
  let bits = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const align = Math.floor(version / 7) + 2;
    bits -= (25 * align - 10) * align - 55;
    if (version >= 7) bits -= 36;
  }
  return Math.floor(bits / 8);
}

const dataCodewords = (version: number) => rawCodewords(version) - ECC_PER_BLOCK[version] * BLOCKS[version];

/** How many bytes of text a version holds (byte mode, level M). */
export function qrCapacity(version: number): number {
  const countBits = version < 10 ? 8 : 16;
  return Math.floor((dataCodewords(version) * 8 - 4 - countBits) / 8);
}

// GF(256) with the QR polynomial x^8 + x^4 + x^3 + x^2 + 1.
function gfMultiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11D);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function rsDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMultiply(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = gfMultiply(root, 0x02);
  }
  return result;
}

function rsRemainder(data: number[], divisor: number[]): number[] {
  const result = divisor.map(() => 0);
  for (const byte of data) {
    const factor = byte ^ (result.shift() as number);
    result.push(0);
    divisor.forEach((coefficient, i) => { result[i] ^= gfMultiply(coefficient, factor); });
  }
  return result;
}

/** The final codeword sequence for a version: data split in blocks, each with its error correction, interleaved. */
export function qrCodewords(bytes: Uint8Array, version: number): number[] {
  const capacityBits = dataCodewords(version) * 8, countBits = version < 10 ? 8 : 16;
  const bits: number[] = [];
  const push = (value: number, length: number) => { for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1); };
  push(0b0100, 4);
  push(bytes.length, countBits);
  for (const byte of bytes) push(byte, 8);
  if (bits.length > capacityBits) throw new RangeError("Text too long for this version");
  push(0, Math.min(4, capacityBits - bits.length));
  push(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xEC; bits.length < capacityBits; pad ^= 0xEC ^ 0x11) push(pad, 8);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((byte, bit) => (byte << 1) | bit, 0));

  const blocks = BLOCKS[version], ecc = ECC_PER_BLOCK[version], raw = rawCodewords(version);
  const shortBlocks = blocks - (raw % blocks), shortLength = Math.floor(raw / blocks);
  const divisor = rsDivisor(ecc), parts: { data: number[]; ecc: number[] }[] = [];
  for (let i = 0, k = 0; i < blocks; i++) {
    const chunk = data.slice(k, k + shortLength - ecc + (i < shortBlocks ? 0 : 1));
    k += chunk.length;
    parts.push({ data: chunk, ecc: rsRemainder(chunk, divisor) });
  }
  const result: number[] = [];
  for (let i = 0; i <= shortLength - ecc; i++) for (const part of parts) if (i < part.data.length) result.push(part.data[i]);
  for (let i = 0; i < ecc; i++) for (const part of parts) result.push(part.ecc[i]);
  return result;
}

function alignmentPositions(version: number): number[] {
  if (version === 1) return [];
  const count = Math.floor(version / 7) + 2, size = version * 4 + 17;
  const step = Math.floor((version * 8 + count * 3 + 5) / (count * 4 - 4)) * 2;
  const result = [6];
  for (let position = size - 7; result.length < count; position -= step) result.splice(1, 0, position);
  return result;
}

const MASKS: ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  x => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

/** The 15 format bits for level M and a mask (BCH 15,5, then the fixed XOR). */
export function qrFormatBits(mask: number): number {
  const data = (0 << 3) | mask;
  let remainder = data;
  for (let i = 0; i < 10; i++) remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
  return ((data << 10) | remainder) ^ 0x5412;
}

/** The 18 version bits (BCH 18,6), for versions 7 and up. */
export function qrVersionBits(version: number): number {
  let remainder = version;
  for (let i = 0; i < 12; i++) remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1F25);
  return (version << 12) | remainder;
}

function penalty(modules: boolean[][]): number {
  const size = modules.length;
  let result = 0, dark = 0;
  const finderLike = (line: boolean[], i: number) => {
    // dark, light, dark x3, light, dark with four light modules on one side: 1011101 0000 or 0000 1011101.
    const at = (k: number) => (i + k >= 0 && i + k < line.length ? line[i + k] : false);
    if (!(at(0) && !at(1) && at(2) && at(3) && at(4) && !at(5) && at(6))) return 0;
    const after = !at(7) && !at(8) && !at(9) && !at(10), before = !at(-1) && !at(-2) && !at(-3) && !at(-4);
    return (after ? 40 : 0) + (before ? 40 : 0);
  };
  for (let a = 0; a < size; a++) {
    for (const line of [modules[a], modules.map(row => row[a])]) {
      let run = 1;
      for (let i = 1; i <= size; i++) {
        if (i < size && line[i] === line[i - 1]) run++;
        else { if (run >= 5) result += run - 2; run = 1; }
      }
      for (let i = 0; i + 6 < size; i++) result += finderLike(line, i);
    }
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (modules[y][x]) dark++;
    if (x + 1 < size && y + 1 < size && modules[y][x] === modules[y][x + 1] && modules[y][x] === modules[y + 1][x] && modules[y][x] === modules[y + 1][x + 1]) result += 3;
  }
  result += Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
  return result;
}

function build(codewords: number[], version: number, mask: number): boolean[][] {
  const size = version * 4 + 17;
  const modules = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const reserved = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const set = (x: number, y: number, dark: boolean) => { if (x >= 0 && x < size && y >= 0 && y < size) { modules[y][x] = dark; reserved[y][x] = true; } };

  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const distance = Math.max(Math.abs(dx), Math.abs(dy));
      set(cx + dx, cy + dy, distance !== 2 && distance !== 4);
    }
  }
  const align = alignmentPositions(version), last = align.length - 1;
  align.forEach((cy, i) => align.forEach((cx, j) => {
    if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }));
  const format = qrFormatBits(mask), bit = (value: number, i: number) => ((value >>> i) & 1) !== 0;
  for (let i = 0; i <= 5; i++) set(8, i, bit(format, i));
  set(8, 7, bit(format, 6)); set(8, 8, bit(format, 7)); set(7, 8, bit(format, 8));
  for (let i = 9; i < 15; i++) set(14 - i, 8, bit(format, i));
  for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(format, i));
  for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(format, i));
  set(8, size - 8, true);
  if (version >= 7) {
    const bits = qrVersionBits(version);
    for (let i = 0; i < 18; i++) {
      const a = size - 11 + (i % 3), b = Math.floor(i / 3);
      set(a, b, bit(bits, i)); set(b, a, bit(bits, i));
    }
  }

  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vertical = 0; vertical < size; vertical++) for (let j = 0; j < 2; j++) {
      const x = right - j, upward = ((right + 1) & 2) === 0, y = upward ? size - 1 - vertical : vertical;
      if (reserved[y][x]) continue;
      const dark = i < codewords.length * 8 && ((codewords[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
      modules[y][x] = dark !== MASKS[mask](x, y);
      i++;
    }
  }
  return modules;
}

/** Encodes text as a QR Code, or returns null when it does not fit in `maxVersion`. */
export function encodeQr(text: string, maxVersion = 40): QrCode | null {
  const bytes = new TextEncoder().encode(text);
  let version = 1;
  while (version <= Math.min(maxVersion, 40) && qrCapacity(version) < bytes.length) version++;
  if (version > Math.min(maxVersion, 40)) return null;
  const codewords = qrCodewords(bytes, version);
  let best: boolean[][] | null = null, bestPenalty = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const candidate = build(codewords, version, mask), score = penalty(candidate);
    if (score < bestPenalty) { best = candidate; bestPenalty = score; }
  }
  return { version, size: version * 4 + 17, modules: best as boolean[][] };
}

/** One SVG path for the dark modules, in module units, inside a quiet zone of `quiet` modules on every side. Draw it in
 * a viewBox of `size + 2 * quiet` with `shape-rendering="crispEdges"`. */
export function qrPath(code: QrCode, quiet = 4): string {
  let d = "";
  code.modules.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (!row[x]) continue;
      let run = 1;
      while (x + run < row.length && row[x + run]) run++;
      d += `M${x + quiet} ${y + quiet}h${run}v1h-${run}z`;
      x += run;
    }
  });
  return d;
}
