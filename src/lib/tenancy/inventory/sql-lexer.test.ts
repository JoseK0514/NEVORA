import { describe, expect, it } from 'vitest';
import { lexSql } from './sql-lexer';

describe('lossless SQL lexical journal', () => {
  it('keeps dollar function bodies and nested comments intact across inner semicolons', () => {
    const text = '/* outer /* CREATE TABLE fake(x text); */ still comment */\nCREATE FUNCTION f() RETURNS void AS $body$ BEGIN PERFORM 1; PERFORM \'x;\'; END $body$ LANGUAGE plpgsql;\nSELECT 2;';
    const result = lexSql(text);
    expect(result.diagnostics).toEqual([]);
    expect(result.parts.filter(p => p.kind === 'statement').map(p => p.text)).toEqual([
      text.slice(0, text.indexOf('\nSELECT')), '\nSELECT 2;',
    ]);
    expect(result.parts.map(p => p.text).join('')).toBe(text);
  });

  it('does not split semicolons inside doubled strings, E strings or quoted identifiers', () => {
    const text = String.raw`SELECT 'a'';b', E'c\';d', "quoted"";name";SELECT 3;`;
    const result = lexSql(text);
    expect(result.diagnostics).toEqual([]);
    expect(result.parts.filter(p => p.kind === 'statement')).toHaveLength(2);
    expect(result.parts.map(p => p.text).join('')).toBe(text);
  });

  it('preserves UTF-8 byte spans, CRLF lines and trailing trivia', () => {
    const text = '-- é\r\nSELECT \'😀\';\r\n/* tail */';
    const result = lexSql(text);
    expect(result.parts.map(p => p.text).join('')).toBe(text);
    const [statement, trivia] = result.parts;
    expect(statement).toMatchObject({ kind: 'statement', startByte: 0, endByte: Buffer.byteLength("-- é\r\nSELECT '😀';"), startLine: 1, endLine: 2 });
    expect(trivia).toMatchObject({ kind: 'trivia', startByte: statement.endByte, endByte: Buffer.byteLength(text), startLine: 2, endLine: 3 });
  });

  it('ends CR-only line comments and records their statement line spans (ROOT-J01)', () => {
    const text = '-- comment\rSELECT 1;\rSELECT 2;';
    const result = lexSql(text);
    expect(result.diagnostics).toEqual([]);
    expect(result.parts.filter(p => p.kind === 'statement').map(p => p.text)).toEqual(['-- comment\rSELECT 1;', '\rSELECT 2;']);
    expect(result.parts[0]).toMatchObject({ startLine: 1, endLine: 2 });
    expect(result.parts[1]).toMatchObject({ startLine: 2, endLine: 3 });
  });

  it('counts CRLF once and accepts mixed newline forms in comments', () => {
    const text = '-- a\r\nSELECT 1;\r-- b\nSELECT 2;';
    const result = lexSql(text);
    expect(result.diagnostics).toEqual([]);
    expect(result.parts.filter(p => p.kind === 'statement')).toHaveLength(2);
    expect(result.parts[0]).toMatchObject({ startLine: 1, endLine: 2 });
    expect(result.parts[1]).toMatchObject({ startLine: 2, endLine: 4 });
  });

  it('retains comment-only and empty-semicolon trivia without invented SQL', () => {
    const text = ' ; -- CREATE TABLE fake(x int);\n/* comment */';
    const result = lexSql(text);
    expect(result.parts.every(p => p.kind === 'trivia')).toBe(true);
    expect(result.parts.map(p => p.text).join('')).toBe(text);
  });

  it('accepts a lexically closed EOF statement without asserting SQL validity', () => {
    const result = lexSql('SELECT 1');
    expect(result.parts).toHaveLength(1);
    expect(result.parts[0]).toMatchObject({ kind: 'statement', terminated: false });
    expect(result.diagnostics).toEqual([]);
    expect(result.semanticAnalysis).toBe('NOT_PERFORMED');
  });

  it.each([
    ["SELECT 'broken", 'UNTERMINATED_STRING', 7],
    ['SELECT "broken', 'UNTERMINATED_IDENTIFIER', 7],
    ['SELECT 1; /* outer /* inner */', 'UNTERMINATED_BLOCK_COMMENT', 10],
    ['DO $tag$ BEGIN NULL;', 'UNTERMINATED_DOLLAR_BODY', 3],
  ])('reports a blocking lexical diagnostic for %s', (text, code, startOffset) => {
    const result = lexSql(text);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code, severity: 'ERROR', startOffset }));
    expect(result.complete).toBe(false);
    expect(result.parts.map(p => p.text).join('')).toBe(text);
  });

  it.each([
    [String.raw`\\include other.sql`, 'UNSUPPORTED_PSQL_META_COMMAND'],
    ['COPY x FROM STDIN;\n1\n\\.', 'UNSUPPORTED_COPY_STDIN'],
    ["SET standard_conforming_strings = off;SELECT 'x';", 'UNSUPPORTED_LEXICAL_SETTING'],
  ])('fails closed on unsupported lexical envelopes %s', (text, code) => {
    const result = lexSql(text);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code, severity: 'UNSUPPORTED' }));
    expect(result.complete).toBe(false);
  });

  it('treats parameters and identifier dollar characters as ordinary tokens', () => {
    const result = lexSql('SELECT $1, name$tag$, \'$not_a_body$\';');
    expect(result.diagnostics).toEqual([]);
    expect(result.parts.filter(p => p.kind === 'statement')).toHaveLength(1);
  });

  it('handles non-ASCII dollar tags and identifier prefixes without inventing a dollar body', () => {
    const text = 'DO $é$ BEGIN PERFORM 1; END $é$;SELECT é$tag$;';
    const result = lexSql(text);
    expect(result.diagnostics).toEqual([]);
    expect(result.parts.filter(p => p.kind === 'statement').map(p => p.text)).toEqual([
      'DO $é$ BEGIN PERFORM 1; END $é$;', 'SELECT é$tag$;',
    ]);
    expect(result.parts.map(p => p.text).join('')).toBe(text);
  });

  it('diagnoses the two-backslash E-string envelope whose quote is actually closed', () => {
    const text = String.raw`SELECT E'c\\';d'`;
    const result = lexSql(text);
    expect(result.complete).toBe(false);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'UNTERMINATED_STRING' }));
    expect(result.parts.map(p => p.text).join('')).toBe(text);
  });

  it('retains E-string escape semantics across a PostgreSQL newline literal continuation', () => {
    const text = String.raw`SELECT E'a'
-- continuation
 'b\';c';SELECT 2;`;
    const result = lexSql(text);
    expect(result.diagnostics).toEqual([]);
    expect(result.parts.filter(p => p.kind === 'statement').map(p => p.text)).toEqual([
      String.raw`SELECT E'a'
-- continuation
 'b\';c';`, 'SELECT 2;',
    ]);
  });

  it('does not continue E-string escape mode through a block comment', () => {
    const text = String.raw`SELECT E'a'
/* break */ 'b\';c';`;
    const result = lexSql(text);
    expect(result.complete).toBe(false);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'UNTERMINATED_STRING' }));
    expect(result.parts.map(p => p.text).join('')).toBe(text);
  });

  it('reports NUL explicitly and keeps source bytes', () => {
    const text = 'SELECT 1;\0';
    const result = lexSql(text);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'INVALID_NUL', startOffset: 9 }));
    expect(result.parts.map(p => p.text).join('')).toBe(text);
  });
});
