// Owner roster import: the browser's reading of a pasted or uploaded list, held against the server's own parser.
import { describe, expect, it } from '@rstest/core';
import { parseRosterTable, ROSTER_MAX_BYTES as SERVER_MAX_BYTES, ROSTER_MAX_ROWS as SERVER_MAX_ROWS } from "@/lib/onboarding/roster";
import { ROSTER_MAX_BYTES, ROSTER_MAX_ROWS, decodeFile, detectDelimiter, headerField, parseCells, peopleCount, readTable, removeRow, rowValues, serializeGrid, updateRow } from "./table";

const defaults = { primaryLocationId: "cafe" };
const HEADER = "id,firstName,lastName,phone,email";
const server = (text: string) => { const result = parseRosterTable({ format: "csv", text, defaults }); if (result.state !== "ready") throw Error("server refused the table"); return result; };
const grid = (text: string) => { const read = readTable(text); if (!read.ok) throw Error(read.problem); return read.grid; };

describe("the contract's limits and column names", () => {
  it("uses the server's limits", () => {
    expect(ROSTER_MAX_ROWS).toBe(SERVER_MAX_ROWS);
    expect(ROSTER_MAX_BYTES).toBe(SERVER_MAX_BYTES);
  });
  it.each([
    ["id", "id"], ["Employee ID", "id"], ["ID empleado", "id"], ["First name", "firstName"], ["first_name", "firstName"], ["Nombre", "firstName"],
    ["LAST-NAME", "lastName"], ["Apellido", "lastName"], ["Phone", "phone"], ["Teléfono", "phone"], ["Email", "email"], ["Correo", "email"],
    ["Role", "role"], ["Rol de acceso", "role"], ["primaryLocationId", "primaryLocationId"], ["eligibleLocationIds", "eligibleLocationIds"], ["positionIds", "positionIds"],
  ])("reads the header %s as %s", (header, field) => expect(headerField(header)).toBe(field));
  it("leaves other columns unused, an inherited name included", () => {
    expect(headerField("Notes")).toBeNull();
    expect(headerField("constructor")).toBeNull();
    expect(headerField("Position")).toBeNull();
  });
});

describe("reading pasted rows and CSV files", () => {
  it("reads cells pasted from a spreadsheet (tabs), keeping accents", () => {
    const read = readTable("ID\tFirst name\tLast name\tPhone\tEmail\nE-1\tAna María\tPérez\t787-555-0101\tana@example.invalid\nE-2\tLuis\tRivera\t7875550102\t\n");
    expect(read.ok).toBe(true); if (!read.ok) return;
    expect(read.people).toBe(2);
    expect(read.fields).toEqual(["id", "firstName", "lastName", "phone", "email"]);
    expect(rowValues(read.grid, 2)).toEqual({ id: "E-1", firstName: "Ana María", lastName: "Pérez", phone: "787-555-0101", email: "ana@example.invalid" });
    expect(rowValues(read.grid, 3).email).toBe("");
  });
  it("reads quoted CSV: commas, doubled quotes, a line break in a cell, CRLF and a byte order mark", () => {
    const read = readTable(`﻿${HEADER}\r\nE-1,"Pérez, Ana","Jo ""JJ""",7875550101,a@example.invalid\r\nE-2,"Two\nlines",Rivera,7875550102,\r\n`);
    expect(read.ok).toBe(true); if (!read.ok) return;
    expect(read.people).toBe(2);
    expect(rowValues(read.grid, 2)).toMatchObject({ firstName: "Pérez, Ana", lastName: 'Jo "JJ"' });
    expect(read.grid[2][1]).toBe("Two\nlines");
  });
  it("reads a file saved with semicolons", () => {
    expect(detectDelimiter("id;firstName;lastName;phone\nE-1;Ana;Pérez;7875550101")).toBe(";");
    const read = readTable("ID empleado;Nombre;Apellido;Teléfono\nE-1;Ana;Pérez;7875550101");
    expect(read.ok && read.fields).toEqual(["id", "firstName", "lastName", "phone"]);
  });
  it("picks tabs over commas when the header has both, and commas otherwise", () => {
    expect(detectDelimiter("ID\tName, first\tPhone")).toBe("\t");
    expect(detectDelimiter(HEADER)).toBe(",");
    expect(detectDelimiter("id")).toBe(",");
  });
  it("keeps blank lines as rows, so row numbers match the spreadsheet", () => {
    const read = readTable(`${HEADER}\nE-1,Ana,Uno,7875550101,\n\n\nE-2,Luis,Dos,7875550102,\n`);
    expect(read.ok && read.people).toBe(2);
    if (!read.ok) return;
    expect(rowValues(read.grid, 5).id).toBe("E-2");
    expect(server(serializeGrid(read.grid)).rows.map(row => row.rowNumber)).toEqual([2, 5]);
  });
  it.each([
    ["", "EMPTY"], ["  \n ", "EMPTY"],
    [HEADER, "NO_ROWS"], [`${HEADER}\n , ,\n`, "NO_ROWS"],
    ["id,firstName,lastName\nE-1,Ana,Pérez", "REQUIRED_COLUMNS"],
    ["id,firstName,first_name,lastName,phone\nE-1,A,B,C,7875550101", "DUPLICATE_COLUMNS"],
    [`${HEADER}\nE-1,"unclosed,Pérez,7875550101,`, "MALFORMED_TABLE"],
    [`${HEADER}\nE-1,"Ana"oops,Pérez,7875550101,`, "MALFORMED_TABLE"],
    [`${HEADER}\nE-1, "Ana",Pérez,7875550101,`, "MALFORMED_TABLE"],
    [`${HEADER},${Array.from({ length: 16 }, (_, i) => `extra${i}`).join(",")}\nE-1,Ana,Pérez,7875550101,`, "TOO_MANY_COLUMNS"],
    [`${HEADER}\n${Array.from({ length: 51 }, (_, i) => `E-${i},Persona,${i},787555${String(i).padStart(4, "0")},`).join("\n")}`, "TOO_MANY_ROWS"],
    [`${HEADER}\nE-1,${"a".repeat(ROSTER_MAX_BYTES)},Pérez,7875550101,`, "TABLE_TOO_LARGE"],
  ])("refuses a list the server would refuse (%#)", (text, problem) => {
    expect(readTable(text)).toEqual({ ok: false, problem });
  });
  it("accepts exactly 50 people and 20 columns", () => {
    const rows = Array.from({ length: 50 }, (_, i) => `E-${i},Persona,${i},787555${String(i).padStart(4, "0")},`).join("\n");
    expect(readTable(`${HEADER}\n${rows}`).ok).toBe(true);
    expect(readTable(`${HEADER},${Array.from({ length: 15 }, (_, i) => `extra${i}`).join(",")}\nE-1,Ana,Pérez,7875550101,`).ok).toBe(true);
  });
  it("agrees with the server about which tables are unreadable", () => {
    for (const text of [`${HEADER}\nE-1,"Ana" ,Pérez,7875550101,`, `${HEADER}\nE-1,"Ana"x,Pérez,7875550101,`, `${HEADER}\nE-1, "Ana",Pérez,7875550101,`, `${HEADER}\n"E-1",Ana,Pérez,7875550101,x`, `${HEADER}\nE-1,"Ana,Pérez,7875550101,x`]) {
      expect(parseCells(text, ",") === null, text).toBe(parseRosterTable({ format: "csv", text, defaults }).state === "invalid");
    }
  });
  it("keeps a nickname's quotes as text, where the server alone would refuse the whole list", () => {
    const pasted = 'ID\tFirst name\tLast name\tPhone\nE-1\tLuis "Tito"\tRivera\t7875550101';
    expect(parseRosterTable({ format: "tsv", text: pasted, defaults }).state).toBe("invalid");
    const read = readTable(pasted);
    expect(read.ok).toBe(true); if (!read.ok) return;
    expect(serializeGrid(read.grid)).toBe('ID,First name,Last name,Phone\nE-1,"Luis ""Tito""",Rivera,7875550101');
    expect(server(serializeGrid(read.grid)).rows[0].person?.employee.firstName).toBe('Luis "Tito"');
  });
});

describe("writing the list back for the preview", () => {
  it("round-trips through the server's parser with the same values and row numbers", () => {
    const pasted = "ID\tFirst name\tLast name\tPhone\tEmail\tNotes\nE-1\tAna, María\tPérez\t787-555-0101\tana@example.invalid\tkeeps, a comma\n\nE-2\tLuis\tRivera\t7875550102\t\t\n";
    const fromBrowser = server(serializeGrid(grid(pasted)));
    const direct = parseRosterTable({ format: "tsv", text: pasted, defaults });
    expect(direct.state).toBe("ready"); if (direct.state !== "ready") return;
    expect(fromBrowser.rows).toEqual(direct.rows);
    expect(fromBrowser.ignoredColumns).toEqual(["Notes"]);
    expect(fromBrowser.valid).toBe(true);
  });
  it("quotes only the cells that need it and drops blank lines at the end", () => {
    expect(serializeGrid([["id", "name"], ["E-1", 'a "b", c'], [""], ["E-2", "x\ny"], [""], ["", ""]])).toBe('id,name\nE-1,"a ""b"", c"\n\nE-2,"x\ny"');
  });
});

describe("fixing and removing rows", () => {
  const start = grid(`${HEADER}\nE-1,Ana,Pérez,bad,\nE-2,Luis,Rivera,7875550102,\nE-3,Eva,Soto,7875550103,`);
  it("writes a fix into its row and leaves the other rows alone", () => {
    const next = updateRow(start, 2, { phone: " 787-555-0101 ", email: "ana@example.invalid" });
    expect(rowValues(next, 2)).toMatchObject({ phone: "787-555-0101", email: "ana@example.invalid" });
    expect(next[2]).toEqual(start[2]);
    expect(start[1][3]).toBe("bad");
    expect(server(serializeGrid(next)).valid).toBe(true);
  });
  it("adds a column the list did not have, with an empty cell for everyone else", () => {
    const next = updateRow(start, 3, { role: "LEAD", primaryLocationId: "bakery" });
    expect(next[0].slice(-2)).toEqual(["role", "primaryLocationId"]);
    const rows = server(serializeGrid(next)).rows;
    expect(rows.map(row => row.person?.employee.role)).toEqual([undefined, "LEAD", "EMPLOYEE"]);
    expect(rows[1].person?.employee.primaryLocationId).toBe("bakery");
    expect(rows[2].person?.employee.primaryLocationId).toBe("cafe");
    expect(rows.every(row => !row.fieldErrors.some(error => error.code === "COLUMN_COUNT"))).toBe(true);
  });
  it("makes a row with a missing or an extra cell as long as the header when it is saved", () => {
    const uneven = grid(`${HEADER}\nE-1,Ana,Pérez,7875550101\nE-2,Luis,Rivera,7875550102,,extra`);
    expect(server(serializeGrid(uneven)).rows.every(row => row.fieldErrors.some(error => error.code === "COLUMN_COUNT"))).toBe(true);
    const fixed = updateRow(updateRow(uneven, 2, {}), 3, {});
    expect(fixed[1]).toHaveLength(5); expect(fixed[2]).toHaveLength(5);
    expect(server(serializeGrid(fixed)).valid).toBe(true);
  });
  it("removes a person without moving the rows after them", () => {
    const next = removeRow(start, 3);
    expect(peopleCount(next)).toBe(2);
    expect(server(serializeGrid(next)).rows.map(row => [row.rowNumber, row.values.id])).toEqual([[2, "E-1"], [4, "E-3"]]);
  });
  it("never touches the header row or a row that is not there", () => {
    expect(updateRow(start, 1, { id: "X" })).toBe(start);
    expect(removeRow(start, 1)).toBe(start);
    expect(removeRow(start, 99)).toBe(start);
  });
});

describe("a chosen file", () => {
  const bytes = (...values: number[]) => new Uint8Array(values).buffer;
  it("reads UTF-8, and Windows-1252 from a spreadsheet on Windows", () => {
    expect(decodeFile(new TextEncoder().encode("Pérez").buffer as ArrayBuffer)).toBe("Pérez");
    expect(decodeFile(bytes(0x50, 0xe9, 0x72, 0x65, 0x7a))).toBe("Pérez");
  });
  it("refuses a file that is not text", () => {
    expect(decodeFile(bytes(0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0xff))).toBeNull();
    expect(decodeFile(bytes(0xff, 0xfe, 0x69, 0x00, 0x64, 0x00))).toBeNull();
  });
});
