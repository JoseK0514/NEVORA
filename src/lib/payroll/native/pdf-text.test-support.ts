import { PDFArray, PDFDocument, PDFRawStream, StandardFonts, decodePDFRawStream } from "pdf-lib";
import { expect } from "vitest";

/* Reads the text runs pdf-lib wrote into a v2 document, for the pay statement and company summary tests. */
export type PdfText = { text: string; x: number; y: number; size: number; bold: boolean };
// WinAnsi bytes 0x80-0x9F, decoded explicitly: Node builds with small ICU decode "windows-1252" as Latin-1.
const WIN_ANSI_HIGH = "€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008DŽ\u008F\u0090‘’“”•–—˜™š›œ\u009DžŸ";
const winAnsi = (bytes: Buffer) => [...bytes].map(b => b >= 0x80 && b <= 0x9f ? WIN_ANSI_HIGH[b - 0x80] : String.fromCharCode(b)).join("");
export async function readPdf(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  const pages: PdfText[][] = [];
  for (const page of doc.getPages()) {
    const contents = page.node.Contents();
    const streams = contents instanceof PDFArray ? Array.from({ length: contents.size() }, (_, i) => doc.context.lookup(contents.get(i)) as PDFRawStream) : [contents as PDFRawStream];
    const operators = streams.map(stream => Buffer.from(decodePDFRawStream(stream).decode()).toString("ascii")).join("\n");
    pages.push([...operators.matchAll(/BT\s+([\s\S]*?)\s+ET/g)].map(match => {
      const tf = /\/([^\s]+)\s+([\d.]+)\s+Tf/.exec(match[1])!;
      const tm = /1 0 0 1 ([\d.-]+) ([\d.-]+) Tm/.exec(match[1])!;
      const hex = /<([0-9A-Fa-f]*)>\s*Tj/.exec(match[1])!;
      return { text: winAnsi(Buffer.from(hex[1], "hex")), x: Number(tm[1]), y: Number(tm[2]), size: Number(tf[2]), bold: tf[1].startsWith("Helvetica-Bold") };
    }));
  }
  // The employer line is drawn one spaced capital at a time; join each page's text in drawing order.
  return { doc, pages, text: pages.flat().map(line => line.text).join(" "), compact: pages.flat().map(line => line.text).join("").replace(/\s/g, "") };
}

/** Every glyph run stays inside the v2 margins, at a readable size, without overlapping another run on its line. */
export async function expectCleanGeometry(pages: PdfText[][]) {
  const metrics = await PDFDocument.create();
  const regular = await metrics.embedFont(StandardFonts.Helvetica), bold = await metrics.embedFont(StandardFonts.HelveticaBold);
  const right = (line: PdfText) => line.x + [...line.text].reduce((sum, char) => sum + (line.bold ? bold : regular).widthOfTextAtSize(char, line.size), 0);
  for (const [pageIndex, page] of pages.entries()) {
    for (const line of page) {
      const where = `page ${pageIndex + 1}: ${line.text}`;
      expect(line.size, where).toBeGreaterThanOrEqual(7);
      expect(line.x, where).toBeGreaterThanOrEqual(43.9); expect(right(line), where).toBeLessThanOrEqual(568.1);
      expect(line.y, where).toBeGreaterThanOrEqual(12); expect(line.y + line.size, where).toBeLessThanOrEqual(750);
    }
    for (let i = 0; i < page.length; i++) for (let j = i + 1; j < page.length; j++) {
      const a = page[i], b = page[j];
      if (Math.abs(a.y - b.y) < Math.min(a.size, b.size) * 0.8)
        expect(right(a) <= b.x + 0.2 || right(b) <= a.x + 0.2, `page ${pageIndex + 1} overlap: ${a.text} / ${b.text}`).toBe(true);
    }
  }
}
