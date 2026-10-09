import { lexSql } from './sql-lexer';

export type DdlSpan = { startOffset: number; endOffset: number; startByte: number; endByte: number; startLine: number; endLine: number };
export type DdlIdentifier = { raw: string; normalized: string; quoted: boolean; span: DdlSpan };
export type DdlName = { identifiers: DdlIdentifier[]; normalized: string[]; raw: string; span: DdlSpan };
export type DdlConstraint = {
  kind: 'PRIMARY_KEY' | 'UNIQUE' | 'FOREIGN_KEY' | 'CHECK' | 'NOT_NULL' | 'NULL' | 'DEFAULT';
  scope: 'COLUMN' | 'TABLE'; name?: DdlIdentifier; columns: DdlIdentifier[];
  reference?: { table: DdlName; columns: DdlIdentifier[] | null; optionsRaw: string };
  expression?: { raw: string; span: DdlSpan; analysis: 'NOT_PERFORMED' };
  raw: string; span: DdlSpan;
};
export type DdlColumn = {
  name: DdlIdentifier; dataType: { raw: string; span: DdlSpan };
  nullability: { explicit: 'NOT_NULL' | 'NULL' | 'UNSPECIFIED'; primaryKey: boolean };
  constraints: DdlConstraint[]; raw: string; span: DdlSpan;
};
export type CreateTableDeclaration = {
  kind: 'CREATE_TABLE'; name: DdlName; ifNotExists: boolean;
  persistence: 'PERMANENT' | 'TEMPORARY' | 'UNLOGGED';
  columns: DdlColumn[]; constraints: DdlConstraint[]; raw: string; span: DdlSpan;
};
export type DdlDiagnostic = { code: string; severity: 'ERROR' | 'UNSUPPORTED' | 'UNRESOLVED'; span: DdlSpan };
export type UnresolvedDdlStatement = { kind: string; code: string; raw: string; span: DdlSpan };
export type DdlJournal = {
  tables: CreateTableDeclaration[]; unresolved: UnresolvedDdlStatement[]; diagnostics: DdlDiagnostic[];
  effectiveSchema: 'NOT_COMPUTED'; tenantOwnership: 'NOT_CLASSIFIED'; syntaxValidation: 'BOUNDED_DECLARATIONS_ONLY';
};

export type Token = { kind: 'word' | 'identifier' | 'literal' | 'symbol'; raw: string; start: number; end: number };
const asciiFold = (text: string) => text.replace(/[A-Z]/g, c => c.toLowerCase());
const isWordChar = (c: string | undefined) => c !== undefined && /[A-Za-z_0-9$\u0080-\uFFFF]/.test(c);

export class ParseFault extends Error {
  constructor(readonly code: string, readonly severity: 'ERROR' | 'UNSUPPORTED', readonly token?: Token) { super(code); }
}

export function tokenizeDdl(text: string, base = 0): Token[] {
  const result: Token[] = [];
  const lineEnd = (from: number) => {
    const cr = text.indexOf('\r', from), lf = text.indexOf('\n', from);
    return cr < 0 ? lf : lf < 0 ? cr : Math.min(cr, lf);
  };
  const continuation = (from: number) => {
    let n = from, newline = false;
    while (n < text.length) {
      if (/[ \t\n\r\f\v]/.test(text[n])) { newline ||= text[n] === '\r' || text[n] === '\n'; n++; }
      else if (text.startsWith('--', n)) { const end = lineEnd(n + 2); if (end < 0) return -1; n = end; }
      else break;
    }
    return newline && text[n] === "'" ? n : -1;
  };
  for (let n = 0; n < text.length;) {
    const start = n, c = text[n];
    if (/[ \t\n\r\f\v]/.test(c) || (c === '\ufeff' && n === 0)) { n++; continue; }
    if (text.startsWith('--', n)) { const end = lineEnd(n + 2); n = end < 0 ? text.length : end; continue; }
    if (text.startsWith('/*', n)) {
      let depth = 1; n += 2;
      while (n < text.length && depth) {
        if (text.startsWith('/*', n)) { depth++; n += 2; }
        else if (text.startsWith('*/', n)) { depth--; n += 2; }
        else n++;
      }
      continue;
    }
    let kind: Token['kind'] = 'symbol';
    if (c === "'" || c === '"') {
      kind = c === '"' ? 'identifier' : 'literal';
      const escaped = c === "'" && /[eE]/.test(text[n - 1] ?? '') && !isWordChar(text[n - 2]);
      n++;
      while (n < text.length) {
        if (escaped && text[n] === '\\') { n += 2; continue; }
        if (text[n] === c) {
          if (text[n + 1] === c) { n += 2; continue; }
          n++;
          const next = c === "'" ? continuation(n) : -1;
          if (next >= 0) { n = next + 1; continue; }
          break;
        }
        n++;
      }
    } else if (c === '$' && !isWordChar(text[n - 1]) && text.slice(n).match(/^\$(?:[A-Za-z_\u0080-\uFFFF][A-Za-z_0-9\u0080-\uFFFF]*)?\$/)) {
      const tag = text.slice(n).match(/^\$(?:[A-Za-z_\u0080-\uFFFF][A-Za-z_0-9\u0080-\uFFFF]*)?\$/)![0];
      kind = 'literal'; n = text.indexOf(tag, n + tag.length) + tag.length;
    } else if (/[A-Za-z_\u0080-\uFFFF]/.test(c)) {
      kind = 'word'; n++; while (isWordChar(text[n])) n++;
    } else n++;
    result.push({ kind, raw: text.slice(start, n), start: base + start, end: base + n });
  }
  return result;
}

export class Cursor {
  index = 0;
  constructor(readonly tokens: Token[]) {}
  get current() { return this.tokens[this.index]; }
  word(word: string, offset = 0) { const token = this.tokens[this.index + offset]; return token?.kind === 'word' && token.raw.toUpperCase() === word; }
  eat(word: string) { if (!this.word(word)) return false; this.index++; return true; }
  require(word: string) { if (!this.eat(word)) throw new ParseFault('DDL_EXPECTED_' + word, 'ERROR', this.current); }
  symbol(symbol: string) { return this.current?.kind === 'symbol' && this.current.raw === symbol; }
  requireSymbol(symbol: string) { if (!this.symbol(symbol)) throw new ParseFault('DDL_EXPECTED_DELIMITER', 'ERROR', this.current); this.index++; }
}

function constraintStart(c: Cursor) {
  return ['CONSTRAINT', 'DEFAULT', 'CHECK', 'PRIMARY', 'UNIQUE', 'REFERENCES', 'GENERATED', 'COLLATE'].some(word => c.word(word))
    || c.word('NULL') || (c.word('NOT') && c.word('NULL', 1));
}

export function closeGroup(tokens: Token[], opening: number): number {
  const stack: string[] = [];
  for (let n = opening; n < tokens.length; n++) {
    const token = tokens[n];
    if (token.kind !== 'symbol') continue;
    if (token.raw === '(' || token.raw === '[') stack.push(token.raw);
    else if (token.raw === ')' || token.raw === ']') {
      if (stack.pop() !== (token.raw === ')' ? '(' : '[')) throw new ParseFault('DDL_UNBALANCED_DELIMITER', 'ERROR', token);
      if (stack.length === 0) return n;
    }
  }
  throw new ParseFault('DDL_UNBALANCED_DELIMITER', 'ERROR', tokens[opening]);
}

/**
 * Inert declaration extraction, not a schema reducer or SQL validity proof.
 * Unquoted ASCII spelling is folded for PostgreSQL UTF-8 declarations; quoted
 * spelling/case is retained. Catalog truncation, domains and expression semantics
 * are not resolved. Nullability records explicit syntax separately from PK
 * membership; ALTER/DROP/body statements never change these declarations.
 */
export function createDdlParser(text: string) {
  const lineStarts = [0];
  for (let n = 0; n < text.length; n++) {
    if (text[n] === '\r') lineStarts.push(n + (text[n + 1] === '\n' ? 2 : 1));
    else if (text[n] === '\n' && text[n - 1] !== '\r') lineStarts.push(n + 1);
  }
  const lineAt = (offset: number) => {
    let low = 0, high = lineStarts.length;
    while (low + 1 < high) {
      const middle = (low + high) >>> 1;
      if (lineStarts[middle] <= offset) low = middle; else high = middle;
    }
    return low + 1;
  };
  const span = (start: number, end: number): DdlSpan => ({
    startOffset: start, endOffset: end, startByte: Buffer.byteLength(text.slice(0, start)), endByte: Buffer.byteLength(text.slice(0, end)),
    startLine: lineAt(start), endLine: lineAt(Math.max(start, end - 1)),
  });
  const tokenSpan = (tokens: Token[]) => span(tokens[0].start, tokens[tokens.length - 1].end);
  const rawTokens = (tokens: Token[]) => text.slice(tokens[0].start, tokens[tokens.length - 1].end);
  const identifier = (c: Cursor): DdlIdentifier => {
    const token = c.current;
    if (c.word('U') && c.tokens[c.index + 1]?.raw === '&') throw new ParseFault('UNSUPPORTED_IDENTIFIER_ESCAPE', 'UNSUPPORTED', token);
    if (!token || (token.kind !== 'word' && token.kind !== 'identifier')) throw new ParseFault('DDL_EXPECTED_IDENTIFIER', 'ERROR', token);
    c.index++;
    return { raw: token.raw, normalized: token.kind === 'identifier' ? token.raw.slice(1, -1).replace(/""/g, '"') : asciiFold(token.raw), quoted: token.kind === 'identifier', span: span(token.start, token.end) };
  };
  const name = (c: Cursor): DdlName => {
    const identifiers = [identifier(c)];
    while (c.symbol('.')) { c.index++; identifiers.push(identifier(c)); }
    const start = identifiers[0].span.startOffset, end = identifiers[identifiers.length - 1].span.endOffset;
    return { identifiers, normalized: identifiers.map(id => id.normalized), raw: text.slice(start, end), span: span(start, end) };
  };
  const columnList = (c: Cursor): DdlIdentifier[] => {
    c.requireSymbol('(');
    const ids = [identifier(c)];
    while (c.symbol(',')) { c.index++; ids.push(identifier(c)); }
    c.requireSymbol(')');
    if (new Set(ids.map(id => id.normalized)).size !== ids.length) throw new ParseFault('DDL_DUPLICATE_CONSTRAINT_COLUMN', 'ERROR', c.current);
    return ids;
  };
  const group = (c: Cursor) => {
    if (!c.symbol('(')) throw new ParseFault('DDL_EXPECTED_DELIMITER', 'ERROR', c.current);
    const end = closeGroup(c.tokens, c.index); c.index = end + 1;
  };
  const deferrability = (c: Cursor) => {
    while (c.current) {
      if (c.eat('DEFERRABLE')) continue;
      if (c.word('NOT') && c.word('DEFERRABLE', 1)) { c.index += 2; continue; }
      if (c.eat('INITIALLY')) {
        if (!c.eat('DEFERRED') && !c.eat('IMMEDIATE')) throw new ParseFault('DDL_INVALID_CONSTRAINT_OPTION', 'ERROR', c.current);
        continue;
      }
      break;
    }
  };
  const referenceOptions = (c: Cursor) => {
    const start = c.index;
    while (c.current) {
      if (c.eat('ON')) {
        if (!c.eat('DELETE') && !c.eat('UPDATE')) throw new ParseFault('DDL_INVALID_REFERENCE_OPTION', 'ERROR', c.current);
        if (c.eat('NO')) c.require('ACTION');
        else if (c.eat('SET')) {
          if (!c.eat('NULL') && !c.eat('DEFAULT')) throw new ParseFault('DDL_INVALID_REFERENCE_OPTION', 'ERROR', c.current);
          if (c.symbol('(')) columnList(c);
        } else if (!c.eat('CASCADE') && !c.eat('RESTRICT')) throw new ParseFault('DDL_INVALID_REFERENCE_OPTION', 'ERROR', c.current);
      } else if (c.eat('MATCH')) {
        if (!c.eat('SIMPLE') && !c.eat('FULL')) throw new ParseFault('UNSUPPORTED_REFERENCE_MATCH', 'UNSUPPORTED', c.current);
      } else {
        const before = c.index; deferrability(c);
        if (before === c.index) break;
      }
    }
    return c.index > start ? rawTokens(c.tokens.slice(start, c.index)) : '';
  };
  const constraint = (c: Cursor, column?: DdlIdentifier): DdlConstraint => {
    const start = c.index;
    const named = c.eat('CONSTRAINT') ? identifier(c) : undefined;
    let kind: DdlConstraint['kind'], columns: DdlIdentifier[] = column ? [column] : [];
    let reference: DdlConstraint['reference'], expression: DdlConstraint['expression'];
    if (c.eat('PRIMARY')) { c.require('KEY'); kind = 'PRIMARY_KEY'; if (!column) columns = columnList(c); deferrability(c); }
    else if (c.eat('UNIQUE')) { kind = 'UNIQUE'; if (!column) columns = columnList(c); deferrability(c); }
    else if (c.eat('FOREIGN')) {
      if (column) throw new ParseFault('UNSUPPORTED_COLUMN_CONSTRAINT', 'UNSUPPORTED', c.current);
      c.require('KEY'); kind = 'FOREIGN_KEY'; columns = columnList(c); c.require('REFERENCES');
      const table = name(c), target = c.symbol('(') ? columnList(c) : null;
      reference = { table, columns: target, optionsRaw: referenceOptions(c) };
    } else if (c.eat('REFERENCES')) {
      if (!column) throw new ParseFault('UNSUPPORTED_TABLE_CONSTRAINT', 'UNSUPPORTED', c.current);
      kind = 'FOREIGN_KEY';
      const table = name(c), target = c.symbol('(') ? columnList(c) : null;
      reference = { table, columns: target, optionsRaw: referenceOptions(c) };
    } else if (c.eat('CHECK')) {
      kind = 'CHECK'; const expressionStart = c.index; group(c);
      const tokens = c.tokens.slice(expressionStart, c.index);
      expression = { raw: rawTokens(tokens), span: tokenSpan(tokens), analysis: 'NOT_PERFORMED' };
    } else if (column && c.eat('NOT')) { c.require('NULL'); kind = 'NOT_NULL'; }
    else if (column && c.eat('NULL')) kind = 'NULL';
    else if (column && c.eat('DEFAULT')) {
      kind = 'DEFAULT'; const expressionStart = c.index;
      if (!c.current) throw new ParseFault('DDL_MISSING_DEFAULT', 'ERROR');
      while (c.current) {
        if (c.index > expressionStart && constraintStart(c)) break;
        if (c.word('CASE') || c.word('SELECT') || c.word('IS') || c.word('AND') || c.word('OR') || c.word('NOT')) throw new ParseFault('UNSUPPORTED_DEFAULT_EXPRESSION', 'UNSUPPORTED', c.current);
        if (c.symbol('(') || c.symbol('[')) { c.index = closeGroup(c.tokens, c.index) + 1; }
        else c.index++;
      }
      const tokens = c.tokens.slice(expressionStart, c.index);
      expression = { raw: rawTokens(tokens), span: tokenSpan(tokens), analysis: 'NOT_PERFORMED' };
    } else throw new ParseFault('UNSUPPORTED_DECLARATION_CLAUSE', 'UNSUPPORTED', c.current);
    const tokens = c.tokens.slice(start, c.index);
    return { kind, scope: column ? 'COLUMN' : 'TABLE', ...(named ? { name: named } : {}), columns, ...(reference ? { reference } : {}), ...(expression ? { expression } : {}), raw: rawTokens(tokens), span: tokenSpan(tokens) };
  };
  const dataType = (c: Cursor): DdlColumn['dataType'] => {
    const typeStart = c.index;
    const typeName = name(c);
    if (typeName.identifiers.length === 1 && !typeName.identifiers[0].quoted) {
      const head = typeName.normalized[0];
      if (head === 'double') c.require('PRECISION');
      if ((head === 'character' || head === 'bit') && c.word('VARYING')) c.index++;
    }
    if (c.symbol('(')) group(c);
    if (typeName.identifiers.length === 1 && ['time', 'timestamp'].includes(typeName.normalized[0]) && (c.word('WITH') || c.word('WITHOUT'))) {
      c.index++; c.require('TIME'); c.require('ZONE');
    }
    while (c.symbol('[')) {
      const close = closeGroup(c.tokens, c.index);
      const inside = c.tokens.slice(c.index + 1, close);
      if (inside.some(t => t.kind !== 'symbol' || !/^[0-9]$/.test(t.raw))) throw new ParseFault('UNSUPPORTED_ARRAY_BOUND', 'UNSUPPORTED', c.current);
      c.index = close + 1;
    }
    const typeTokens = c.tokens.slice(typeStart, c.index);
    return { raw: rawTokens(typeTokens), span: tokenSpan(typeTokens) };
  };
  const column = (tokens: Token[]): DdlColumn => {
    const c = new Cursor(tokens), columnName = identifier(c), declaredType = dataType(c);
    if (c.current && !constraintStart(c)) throw new ParseFault('UNSUPPORTED_DATA_TYPE', 'UNSUPPORTED', c.current);
    const constraints: DdlConstraint[] = [];
    while (c.current) constraints.push(constraint(c, columnName));
    const nulls = constraints.filter(c => c.kind === 'NOT_NULL' || c.kind === 'NULL');
    if (nulls.length > 1) throw new ParseFault('DDL_CONFLICTING_NULLABILITY', 'ERROR', tokens[0]);
    if (constraints.filter(c => c.kind === 'DEFAULT').length > 1) throw new ParseFault('DDL_MULTIPLE_DEFAULTS', 'ERROR', tokens[0]);
    return { name: columnName, dataType: declaredType, nullability: { explicit: nulls[0]?.kind === 'NOT_NULL' ? 'NOT_NULL' : nulls[0]?.kind === 'NULL' ? 'NULL' : 'UNSPECIFIED', primaryKey: false }, constraints, raw: rawTokens(tokens), span: tokenSpan(tokens) };
  };
  const createTable = (tokens: Token[]): CreateTableDeclaration => {
    const c = new Cursor(tokens); c.require('CREATE');
    let persistence: CreateTableDeclaration['persistence'] = 'PERMANENT';
    if (c.eat('UNLOGGED')) persistence = 'UNLOGGED';
    else if (c.eat('TEMP') || c.eat('TEMPORARY')) persistence = 'TEMPORARY';
    c.require('TABLE');
    const ifNotExists = c.eat('IF'); if (ifNotExists) { c.require('NOT'); c.require('EXISTS'); }
    const tableName = name(c);
    if (!c.symbol('(')) throw new ParseFault('UNSUPPORTED_CREATE_TABLE_FORM', 'UNSUPPORTED', c.current);
    const opening = c.index, closing = closeGroup(tokens, opening), elements: Token[][] = [];
    let start = opening + 1;
    for (let n = start; n < closing; n++) {
      if (tokens[n].kind === 'symbol' && (tokens[n].raw === '(' || tokens[n].raw === '[')) { n = closeGroup(tokens, n); continue; }
      if (tokens[n].kind === 'symbol' && tokens[n].raw === ',') { elements.push(tokens.slice(start, n)); start = n + 1; }
    }
    if (start < closing || elements.length) elements.push(tokens.slice(start, closing));
    c.index = closing + 1;
    if (c.symbol(';')) c.index++;
    if (c.current) throw new ParseFault('UNSUPPORTED_CREATE_TABLE_TAIL', 'UNSUPPORTED', c.current);
    const columns: DdlColumn[] = [], constraints: DdlConstraint[] = [];
    for (const element of elements) {
      if (!element.length) throw new ParseFault('DDL_EMPTY_TABLE_ELEMENT', 'ERROR', tokens[opening]);
      const item = new Cursor(element);
      if (['CONSTRAINT', 'PRIMARY', 'UNIQUE', 'FOREIGN', 'CHECK'].some(word => item.word(word))) {
        const declared = constraint(item);
        if (item.current) throw new ParseFault('UNSUPPORTED_CONSTRAINT_TAIL', 'UNSUPPORTED', item.current);
        constraints.push(declared);
      } else {
        const declared = column(element); columns.push(declared); constraints.push(...declared.constraints);
      }
    }
    const local = new Map(columns.map(col => [col.name.normalized, col]));
    if (local.size !== columns.length) throw new ParseFault('DDL_DUPLICATE_COLUMN', 'ERROR', tokens[opening]);
    if (constraints.filter(c => c.kind === 'PRIMARY_KEY').length > 1) throw new ParseFault('DDL_MULTIPLE_PRIMARY_KEYS', 'ERROR', tokens[opening]);
    for (const declared of constraints) {
      if (declared.reference?.columns && declared.columns.length !== declared.reference.columns.length) throw new ParseFault('DDL_FOREIGN_KEY_ARITY', 'ERROR', tokens[opening]);
      for (const id of declared.columns) {
        const col = local.get(id.normalized);
        if (!col) throw new ParseFault('DDL_UNKNOWN_LOCAL_COLUMN', 'ERROR', tokens[opening]);
        if (declared.kind === 'PRIMARY_KEY') {
          if (col.nullability.explicit === 'NULL') throw new ParseFault('DDL_CONFLICTING_NULLABILITY', 'ERROR', tokens[opening]);
          col.nullability.primaryKey = true;
        }
      }
    }
    return { kind: 'CREATE_TABLE', name: tableName, ifNotExists, persistence, columns, constraints, raw: rawTokens(tokens), span: tokenSpan(tokens) };
  };

  return { span, tokenSpan, rawTokens, identifier, name, columnList, group, constraint, column, dataType, createTable };
}

/** Keeps the existing declaration-only API and output contract unchanged. */
export function parseDdlDeclarations(text: string): DdlJournal {
  const result: DdlJournal = { tables: [], unresolved: [], diagnostics: [], effectiveSchema: 'NOT_COMPUTED', tenantOwnership: 'NOT_CLASSIFIED', syntaxValidation: 'BOUNDED_DECLARATIONS_ONLY' };
  const { span, createTable } = createDdlParser(text);
  const lexical = lexSql(text);
  if (!lexical.complete) {
    result.diagnostics = lexical.diagnostics.map(d => ({ code: d.code, severity: d.severity, span: span(d.startOffset, d.endOffset) }));
    result.unresolved.push({ kind: 'LEXICAL_SOURCE', code: 'LEXICAL_SOURCE_BLOCKED', raw: text, span: span(0, text.length) });
    return result;
  }
  for (const part of lexical.parts) {
    if (part.kind !== 'statement') continue;
    const tokens = tokenizeDdl(part.text, part.startOffset);
    const c = new Cursor(tokens);
    const isCreateTable = c.word('CREATE') && (c.word('TABLE', 1) || (['TEMP', 'TEMPORARY', 'UNLOGGED'].some(word => c.word(word, 1)) && c.word('TABLE', 2)));
    const partSpan = span(part.startOffset, part.endOffset);
    if (!isCreateTable) {
      const code = c.word('ALTER') ? 'ALTER_NOT_REDUCED' : c.word('DROP') ? 'DROP_NOT_REDUCED' : c.word('DO') || c.word('BEGIN') ? 'BODY_NOT_INTERPRETED' : c.word('CREATE') ? 'UNSUPPORTED_CREATE_FORM' : 'STATEMENT_OUTSIDE_CREATE_TABLE';
      result.unresolved.push({ kind: c.current?.raw.toUpperCase() ?? 'UNKNOWN', code, raw: part.text, span: partSpan });
      result.diagnostics.push({ code, severity: 'UNSUPPORTED', span: partSpan });
      continue;
    }
    try {
      const table = createTable(tokens);
      result.tables.push(table);
      for (const declared of table.constraints) if (declared.reference?.columns === null) result.diagnostics.push({ code: 'REFERENCE_COLUMNS_UNSPECIFIED', severity: 'UNRESOLVED', span: declared.span });
    } catch (error) {
      if (!(error instanceof ParseFault)) throw error;
      result.unresolved.push({ kind: 'CREATE_TABLE', code: error.code, raw: part.text, span: partSpan });
      result.diagnostics.push({ code: error.code, severity: error.severity, span: error.token ? span(error.token.start, error.token.end) : partSpan });
    }
  }
  return result;
}
