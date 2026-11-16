/* Owner roster import: reading a pasted spreadsheet or a CSV file in the browser. Nothing here decides what is valid:
 * POST /api/onboarding/roster/preview does (docs/handoffs/2026-11-14-owner-simplicity.md). This module turns what the
 * Owner pasted into a grid of text cells, catches what the server would refuse outright (too large, no people, a missing
 * column) before a request is made, and writes the grid back as CSV so one row can be fixed or removed and checked again.
 * The cell grammar and the header names are the server's (src/lib/onboarding/roster.ts); table.test.ts holds the two
 * together. Cells are always text; nothing is evaluated. */

/** The contract's limits (roster.ts and the handoff): 50 people, 20 columns, 65,536 UTF-8 bytes of table text, and
 * 131,072 bytes for a whole request body. */
export const ROSTER_MAX_ROWS = 50;
export const ROSTER_MAX_COLUMNS = 20;
export const ROSTER_MAX_BYTES = 65536;
export const ROSTER_MAX_BODY_BYTES = 131072;

export type RosterField = "id" | "firstName" | "lastName" | "phone" | "email" | "role" | "primaryLocationId" | "eligibleLocationIds" | "positionIds";
export const REQUIRED_FIELDS: readonly RosterField[] = ["id", "firstName", "lastName", "phone"];
export type Delimiter = "," | "\t" | ";";
/** Row 1 is the header, as in the Owner's spreadsheet; a blank line stays a row so the numbers keep matching. */
export type Grid = string[][];

/** What the browser can tell before asking the server. The first four are the server's own codes for the same thing. */
export type TableProblem = "TABLE_TOO_LARGE" | "MALFORMED_TABLE" | "DUPLICATE_COLUMNS" | "REQUIRED_COLUMNS"
  | "EMPTY" | "NO_ROWS" | "TOO_MANY_ROWS" | "TOO_MANY_COLUMNS";
export type TableRead = { ok: true; grid: Grid; fields: (RosterField | null)[]; people: number } | { ok: false; problem: TableProblem };

const ALIASES = new Map<string, RosterField>([
  ["id", "id"], ["employeeid", "id"], ["idempleado", "id"],
  ["firstname", "firstName"], ["nombre", "firstName"],
  ["lastname", "lastName"], ["apellido", "lastName"],
  ["phone", "phone"], ["telefono", "phone"],
  ["email", "email"], ["correo", "email"],
  ["role", "role"], ["roldeacceso", "role"],
  ["primarylocationid", "primaryLocationId"], ["eligiblelocationids", "eligibleLocationIds"], ["positionids", "positionIds"],
]);

/** The column a header names, or null for a column the import does not use. Case, spaces, underscores, hyphens and
 * accents don't matter ("First name", "first_name", "Teléfono"). */
export function headerField(header: string): RosterField | null {
  return ALIASES.get(header.trim().normalize("NFD").replace(/\p{M}/gu, "").replace(/[\s_-]/g, "").toLowerCase()) ?? null;
}

export function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}

/** A chosen file as text. UTF-8 first; a CSV saved by a spreadsheet on Windows is often Windows-1252, which keeps the
 * accents in names. Null for a file that is not text (a workbook, UTF-16): the Owner is asked to save it as CSV. */
export function decodeFile(buffer: ArrayBuffer): string | null {
  const bytes = new Uint8Array(buffer);
  let text: string;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { try { text = new TextDecoder("windows-1252").decode(bytes); } catch { return null; } }
  return text.includes("\u0000") ? null : text;
}

/** Cells copied from a spreadsheet arrive with tabs; a CSV file has commas; a spreadsheet set to Spanish may save with
 * semicolons. The header row decides. */
export function detectDelimiter(text: string): Delimiter {
  const header = text.replace(/^﻿/, "").split(/\r\n|\n|\r/, 1)[0] ?? "";
  return header.includes("\t") ? "\t" : header.includes(",") ? "," : header.includes(";") ? ";" : ",";
}

/** The server's cell grammar: quoted cells may hold the delimiter, line breaks and doubled quotes; text after a closing
 * quote, or a quote that never closes, makes the table unreadable (null). One thing is read more kindly than the
 * server would: a quote in the middle of an unquoted cell (a nickname, Luis "Tito" Rivera, as spreadsheets paste it)
 * is kept as text. serializeGrid then writes that cell quoted, so the server reads the same name. */
export function parseCells(text: string, delimiter: Delimiter): Grid | null {
  const table: Grid = [];
  let row: string[] = [], cell = "", quoted = false, closed = false;
  const endCell = () => { row.push(cell); cell = ""; closed = false; };
  const endRow = () => { endCell(); table.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else { quoted = false; closed = true; } }
      else cell += c;
      continue;
    }
    if (c === delimiter) { endCell(); continue; }
    if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; endRow(); continue; }
    if (c === '"') {
      if (closed || (cell.length && !cell.trim())) return null;
      if (cell.length) { cell += c; continue; }
      quoted = true; continue;
    }
    if (closed) { if (c === " " || (c === "\t" && delimiter !== "\t")) continue; return null; }
    cell += c;
  }
  if (quoted) return null;
  if (cell.length || row.length || closed) endRow();
  return table;
}

const blank = (row: string[]) => row.every(cell => !cell.trim());
const quote = (cell: string) => /[",\r\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;

/** The grid as CSV, the text the preview route reads. Blank rows stay (as empty lines) so row numbers don't move; blank
 * rows at the end are dropped. */
export function serializeGrid(grid: Grid): string {
  let end = grid.length;
  while (end > 1 && blank(grid[end - 1])) end--;
  return grid.slice(0, end).map(row => blank(row) ? "" : row.map(quote).join(",")).join("\n");
}

/** Read what the Owner pasted or uploaded. A refusal here is one the server would also make; everything else (a bad
 * phone number, a duplicate, an ID already in use) is the preview's to report, row by row. */
export function readTable(text: string): TableRead {
  if (!text.trim()) return { ok: false, problem: "EMPTY" };
  if (utf8Bytes(text) > ROSTER_MAX_BYTES) return { ok: false, problem: "TABLE_TOO_LARGE" };
  const source = text.replace(/^﻿/, "");
  const grid = parseCells(source, detectDelimiter(source));
  if (!grid || !grid.length) return { ok: false, problem: "MALFORMED_TABLE" };
  if (grid.some(row => row.length > ROSTER_MAX_COLUMNS)) return { ok: false, problem: "TOO_MANY_COLUMNS" };
  const fields = grid[0].map(headerField);
  const known = fields.filter((field): field is RosterField => field !== null);
  if (new Set(known).size !== known.length) return { ok: false, problem: "DUPLICATE_COLUMNS" };
  if (!REQUIRED_FIELDS.every(field => known.includes(field))) return { ok: false, problem: "REQUIRED_COLUMNS" };
  const people = grid.slice(1).filter(row => !blank(row)).length;
  if (!people) return { ok: false, problem: "NO_ROWS" };
  if (people > ROSTER_MAX_ROWS) return { ok: false, problem: "TOO_MANY_ROWS" };
  if (utf8Bytes(serializeGrid(grid)) > ROSTER_MAX_BYTES) return { ok: false, problem: "TABLE_TOO_LARGE" };
  return { ok: true, grid, fields, people };
}

/** What one row holds for each column the import uses (trimmed, as the server reads them). */
export function rowValues(grid: Grid, rowNumber: number): Partial<Record<RosterField, string>> {
  const row = grid[rowNumber - 1] ?? [];
  const values: Partial<Record<RosterField, string>> = {};
  grid[0]?.forEach((header, index) => { const field = headerField(header); if (field) values[field] = (row[index] ?? "").trim(); });
  return values;
}

/** Write an Owner's fix into one row. The row is made as long as the header (a row with a missing or an extra cell is
 * exactly what the Owner is fixing), and a column the list didn't have (a role, a location for one person) is added to
 * the end with an empty cell for everyone else. Returns a new grid; rows keep their numbers. */
export function updateRow(grid: Grid, rowNumber: number, changes: Partial<Record<RosterField, string>>): Grid {
  const index = rowNumber - 1;
  if (index < 1 || index >= grid.length) return grid;
  const next = grid.map(row => [...row]);
  const fields = next[0].map(headerField);
  for (const field of Object.keys(changes) as RosterField[]) {
    if (fields.includes(field)) continue;
    // A full header can't take another column; that change is left out rather than breaking the whole list.
    if (next[0].length >= ROSTER_MAX_COLUMNS) continue;
    next[0].push(field); fields.push(field);
    for (let i = 1; i < next.length; i++) if (i !== index && !blank(next[i])) next[i].push("");
  }
  const width = next[0].length;
  const row = next[index].slice(0, width);
  while (row.length < width) row.push("");
  for (const [field, value] of Object.entries(changes) as [RosterField, string][]) {
    const column = fields.indexOf(field);
    if (column >= 0) row[column] = value.trim();
  }
  next[index] = row;
  return next;
}

/** Take one person off the list. The row becomes a blank line, so the rows after it keep their numbers. */
export function removeRow(grid: Grid, rowNumber: number): Grid {
  const index = rowNumber - 1;
  if (index < 1 || index >= grid.length) return grid;
  return grid.map((row, i) => i === index ? [""] : [...row]);
}

/** How many people the grid holds now (after fixes and removals). */
export function peopleCount(grid: Grid): number {
  return grid.slice(1).filter(row => !blank(row)).length;
}
