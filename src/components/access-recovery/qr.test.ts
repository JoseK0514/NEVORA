import { describe, expect, it } from "vitest";
import { encodeQr, qrCapacity, qrCodewords, qrFormatBits, qrPath, qrVersionBits } from "./qr";

/* The encoder draws the helper's one-time reset link. These tests pin its structure and three matrices that were read
 * back, module for module, by a real decoder (Apple's Core Image QR detector, Nov 17, 2026), together with all 40
 * versions at full capacity during the build. A change that alters a pinned matrix must be read back again. */

const LINK = "https://app.example.test/reset-access#proof=" + "Zx9".repeat(14) + "A";
const ENVELOPE = "https://nevora.example.test/reset-access#proof=nw1_v1." + "a".repeat(16) + "." + "B7c_".repeat(40) + "." + "d".repeat(22);
const hex = (modules: boolean[][]) => modules.map(row => BigInt("0b" + row.map(dark => (dark ? 1 : 0)).join("")).toString(16)).join(".");

// GF(256), written out again here so the check does not lean on the encoder's own arithmetic.
const EXP: number[] = [], LOG: number[] = new Array(256).fill(0);
for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11D; }
const mul = (a: number, b: number) => (a && b ? EXP[(LOG[a] + LOG[b]) % 255] : 0);
const evaluate = (block: number[], root: number) => block.reduce((sum, byte) => mul(sum, root) ^ byte, 0);

describe("QR encoder", () => {
  it("matches matrices a real decoder read back", () => {
    const pinned: [string, number, string][] = [
      ["HELLO", 1, "1fda7f.104d41.174f5d.17525d.17515d.105641.1fd57f.1f00.117ef9.3972f.165672.1c88d0.5c9c6.1dcb.1fd98a.104322.175275.17430b.174e78.1048c0.1fd1f5"],
      [LINK, 6, "1fd8f9ec17f.10572428841.1742da2165d.175013a475d.1747585fe5d.104a2709341.1fd5555557f.1c7946c00.16e1e9e4e4b.18342f29355.e4d7029066.1687805c550.4ff893fa8f.1a86f5fc4c7.d554b68867.168a44a676b.961f491611.fbd849ecae.10768442890.cb13da21a6.1ce5f13a4f7.70e1a057f7.11fcb5f4876.1804465d0da.655cb7e82c.d2796dff8e.19746345b1b.1aa975d5308.4c1717a3b9.4094f80a43.137ee6885d8.625ea6794e.9598916bf4.145bff317.1fdec529b5e.10556801510.174b13a55fa.1751224fc12.175b8e0c323.1049fea459a.1fde67f83ce"],
      [ENVELOPE, 12, "1fcf9cb4db06b0a7f.1048980e01ac1a141.175dc7f448b58b55d.1750c61df78e3865d.175f9cb27d2ca995d.105094cbc742fc441.1fd5555555555557f.114732c4398b500.17ce5ce17f823467c.15228976d29f21c4e.5476203b7423caac.ebb584ad83583439.bd63cb923ca7c9b1.151d61f6c29f29e2a.1cc7f49baf8e38f50.794144ef835836b9.24a6cd907ca7c975.3835006d29f29e2e.748e50b838e38f54.1c97bffef83583679.1bc8711b07ca7c975.7080a24d29f29e22.9ca3a88838e38f9c.813e84ef835a367b.194d8dd907c85c975.782cde4d38e29e23.104e287841ac39f94.e0b42bcfabd83670.1d7bad7807067c97e.19acfc1653ac0be21.9fe0b487f5119ff5.b194292c5e85eb12.b5bad7b5653e535e.91cfc1444f94f913.dfe0b427e17a17f4.1439429800f969b92.64bad72134ed696c.f3cfc1829ad0b670.bc6cf49a3cbd6134.162502110e176d6b1.77cde4a75ac5a16e.e3a8b642cbd0be70.b75947db56056014.1600f1b57adb6d9b1.6c6e8aee1e85ea9e.f925ed008bd0bf18.b76e751292492790.70413610edb6da39.14c3412ad9e85e886.f326a9820bd0beb4.54d4a41012492520.159b0a812edb6da79.13cce1b7c5e85e88e.a3dd9b824bd0be73.6c928243124925ae.12382ec238fb6faf8.d4d974f7fc87c9f6.1c341cc78d09d1b.1fc58595d526a175c.10584aa644bf6f918.17562ccaff067c9f5.1759c5b5c5aea9f8a.17549487e762e14fe.104b68857306b05aa.1fd62ccbf9ac1ac74"],
    ];
    for (const [text, version, expected] of pinned) {
      const code = encodeQr(text);
      expect(code?.version).toBe(version);
      expect(code?.size).toBe(version * 4 + 17);
      expect(hex(code!.modules)).toBe(expected);
    }
  });

  it("picks the smallest version that holds the text, and says when nothing fits", () => {
    expect(qrCapacity(1)).toBe(14);
    expect(qrCapacity(6)).toBe(106);
    expect(qrCapacity(10)).toBe(213);
    expect(qrCapacity(40)).toBe(2331);
    expect(encodeQr("a".repeat(14))?.version).toBe(1);
    expect(encodeQr("a".repeat(15))?.version).toBe(2);
    expect(encodeQr("a".repeat(214))?.version).toBe(11);
    expect(encodeQr("a".repeat(2332))).toBeNull();
    expect(encodeQr(LINK, 5)).toBeNull();
    // Bytes, not characters: an accented letter takes two.
    expect(encodeQr("é".repeat(7))?.version).toBe(1);
    expect(encodeQr("é".repeat(8))?.version).toBe(2);
  });

  it("draws the three finder patterns, the timing lines and the dark module", () => {
    const { modules, size } = encodeQr(LINK)!;
    const finder = ["1111111", "1000001", "1011101", "1011101", "1011101", "1000001", "1111111"];
    for (const [x0, y0] of [[0, 0], [size - 7, 0], [0, size - 7]]) {
      for (let y = 0; y < 7; y++) expect(modules[y0 + y].slice(x0, x0 + 7).map(dark => (dark ? 1 : 0)).join("")).toBe(finder[y]);
    }
    for (let i = 8; i < size - 8; i++) { expect(modules[6][i]).toBe(i % 2 === 0); expect(modules[i][6]).toBe(i % 2 === 0); }
    expect(modules[size - 8][8]).toBe(true);
  });

  it("writes format bits that are a valid BCH(15,5) word for level M, in both places", () => {
    const expected = [0x5412, 0x5125, 0x5E7C, 0x5B4B, 0x45F9, 0x40CE, 0x4F97, 0x4AA0];
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(qrFormatBits)).toEqual(expected);
    const { modules, size } = encodeQr(LINK)!;
    const first = [...[0, 1, 2, 3, 4, 5].map(y => modules[y][8]), modules[7][8], modules[8][8], modules[8][7], ...[9, 10, 11, 12, 13, 14].map(i => modules[8][14 - i])];
    const second = [...[0, 1, 2, 3, 4, 5, 6, 7].map(i => modules[8][size - 1 - i]), ...[8, 9, 10, 11, 12, 13, 14].map(i => modules[size - 15 + i][8])];
    const word = (bits: boolean[]) => bits.reduce((value, dark, i) => value | ((dark ? 1 : 0) << i), 0);
    expect(expected).toContain(word(first));
    expect(word(second)).toBe(word(first));
  });

  it("writes the standard's version words from version 7 up", () => {
    expect(qrVersionBits(7)).toBe(0x07C94);
    expect(qrVersionBits(8)).toBe(0x085BC);
    expect(qrVersionBits(40)).toBe(0x28C69);
  });

  it("every block of every version is a valid Reed-Solomon word", () => {
    const ecc = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28];
    const blocks = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49];
    for (let version = 1; version <= 40; version++) {
      const bytes = new TextEncoder().encode("k".repeat(qrCapacity(version)));
      const words = qrCodewords(bytes, version), count = blocks[version], total = words.length;
      const dataTotal = total - ecc[version] * count, short = Math.floor(dataTotal / count), longBlocks = dataTotal % count;
      const parts: number[][] = Array.from({ length: count }, () => []);
      let at = 0;
      for (let i = 0; i <= short; i++) for (let b = 0; b < count; b++) if (i < short || b >= count - longBlocks) parts[b].push(words[at++]);
      for (let i = 0; i < ecc[version]; i++) for (let b = 0; b < count; b++) parts[b].push(words[at++]);
      expect(at).toBe(total);
      for (const part of parts) for (let root = 0; root < ecc[version]; root++) expect(evaluate(part, EXP[root]), `version ${version}`).toBe(0);
      // The first data block starts with the byte-mode header.
      expect(parts[0][0] >> 4).toBe(0b0100);
    }
  });

  it("draws one path in module units, inside the quiet zone, with nothing outside the code", () => {
    const code = encodeQr("HELLO")!, path = qrPath(code, 4);
    expect(path.startsWith("M4 4h7v1h-7z")).toBe(true);
    let dark = 0;
    for (const [, x, y, run] of path.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
      dark += Number(run);
      expect(Number(x)).toBeGreaterThanOrEqual(4); expect(Number(x) + Number(run)).toBeLessThanOrEqual(code.size + 4);
      expect(Number(y)).toBeGreaterThanOrEqual(4); expect(Number(y)).toBeLessThan(code.size + 4);
    }
    expect(dark).toBe(code.modules.flat().filter(Boolean).length);
    expect(path).not.toMatch(/[^Mhvz0-9 -]/);
  });
});
