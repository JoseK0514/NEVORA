import { createHash } from 'node:crypto';
import { lexSql } from './sql-lexer';
import { Cursor, ParseFault, closeGroup, createDdlParser, tokenizeDdl } from './ddl';
import type { CreateTableDeclaration, Token } from './ddl';
import type { DdlColumn, DdlConstraint, DdlSpan } from './ddl';

export type SchemaInput = { path: string; text: string; sha256?: string };
export type SchemaOrigin = { sourcePath: string; sourceSha256: string; sourceIndex: number; statementIndex: number; actionIndex: number; raw: string; span: DdlSpan };
export type SchemaUnknown = { code: string; severity: 'UNSUPPORTED' | 'CONFLICT' | 'UNRESOLVED'; origin: SchemaOrigin; table?: string[] };
export type SchemaColumn = { name: string; typeRaw: string; nullability: { explicit: 'NOT_NULL' | 'NULL' | 'UNSPECIFIED'; primaryKey: boolean; notNull: boolean | null }; defaultExpression: string | null; declaration: DdlColumn; provenance: SchemaOrigin[]; retiredBy?: SchemaOrigin };
export type SchemaConstraint = { name: string | null; kind: DdlConstraint['kind']; columns: string[]; reference?: { table: string[]; columns: string[] | null; optionsRaw: string }; validation: 'UNSPECIFIED' | 'NOT_VALID'; declaration: DdlConstraint; provenance: SchemaOrigin[]; retiredBy?: SchemaOrigin };
export type SchemaTable = { name: string[]; active: boolean; lifetimeId: string; columns: SchemaColumn[]; constraints: SchemaConstraint[]; retiredColumns: SchemaColumn[]; retiredConstraints: SchemaConstraint[]; provenance: SchemaOrigin[]; unknowns: SchemaUnknown[] };
export type SchemaEvent = { operation: string; status: 'APPLIED_EXPLICIT' | 'SKIPPED_GUARD' | 'UNRESOLVED'; table?: string[]; origin: SchemaOrigin };
export type SchemaFold = {
  tables: SchemaTable[]; events: SchemaEvent[]; unknowns: SchemaUnknown[];
  sources: { path: string; sha256: string }[]; sourceDigest: string;
  scope: 'PARTIAL_EXPLICIT_DDL_FOLD'; effectiveSchema: 'NOT_COMPUTED'; rowOwnership: 'NOT_CLASSIFIED';
  startingCatalog: 'NOT_PROVIDED'; transactionEffects: 'NOT_MODELED';
};

type Operation =
  | { kind: 'ADD_COLUMN'; column: DdlColumn; ifNotExists: boolean }
  | { kind: 'ADD_CONSTRAINT'; constraint: DdlConstraint; validation: 'NOT_VALID' | 'UNSPECIFIED' }
  | { kind: 'DROP_COLUMN'; column: string; ifExists: boolean; cascade: boolean }
  | { kind: 'DROP_CONSTRAINT'; constraint: string; ifExists: boolean; cascade: boolean }
  | { kind: 'RENAME_COLUMN'; column: string; to: string }
  | { kind: 'RENAME_CONSTRAINT'; constraint: string; to: string }
  | { kind: 'RENAME_TABLE'; to: string }
  | { kind: 'SET_TYPE'; column: string; typeRaw: string }
  | { kind: 'SET_NOT_NULL' | 'DROP_NOT_NULL'; column: string }
  | { kind: 'SET_DEFAULT'; column: string; expression: string }
  | { kind: 'DROP_DEFAULT'; column: string }
  | { kind: 'DROP_TABLE'; name: string[]; ifExists: boolean; cascade: boolean };
type Action = { operation: Operation; origin: SchemaOrigin };
class FoldFault extends Error {
  constructor(readonly code: string, readonly severity: SchemaUnknown['severity'] = 'CONFLICT') { super(code); }
}
const key = (name: readonly string[]) => JSON.stringify(name);
const sameName = (a: readonly string[], b: readonly string[]) => key(a) === key(b);
const structural = (constraint: DdlConstraint) => !['NOT_NULL', 'NULL', 'DEFAULT'].includes(constraint.kind);
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const canonical = (raw: string) => JSON.stringify(tokenizeDdl(raw).map(t => t.kind === 'word' ? t.raw.replace(/[A-Z]/g, c => c.toLowerCase()) : t.raw));

function makeColumn(declaration: DdlColumn, origin: SchemaOrigin): SchemaColumn {
  const pk = declaration.nullability.primaryKey || declaration.constraints.some(c => c.kind === 'PRIMARY_KEY');
  return {
    name: declaration.name.normalized, typeRaw: declaration.dataType.raw,
    nullability: { ...declaration.nullability, primaryKey: pk, notNull: pk || declaration.nullability.explicit === 'NOT_NULL' ? true : declaration.nullability.explicit === 'NULL' ? false : null },
    defaultExpression: declaration.constraints.find(c => c.kind === 'DEFAULT')?.expression?.raw ?? null,
    declaration, provenance: [origin],
  };
}
function makeConstraint(declaration: DdlConstraint, origin: SchemaOrigin, validation: SchemaConstraint['validation'] = 'UNSPECIFIED'): SchemaConstraint {
  return {
    name: declaration.name?.normalized ?? null, kind: declaration.kind, columns: declaration.columns.map(c => c.normalized),
    ...(declaration.reference ? { reference: { table: [...declaration.reference.table.normalized], columns: declaration.reference.columns?.map(c => c.normalized) ?? null, optionsRaw: declaration.reference.optionsRaw } } : {}),
    validation, declaration, provenance: [origin],
  };
}
function constraintSignature(constraint: SchemaConstraint) {
  return { name: constraint.name, kind: constraint.kind, columns: constraint.columns, reference: constraint.reference, validation: constraint.validation, expression: constraint.declaration.expression ? canonical(constraint.declaration.expression.raw) : null };
}
function columnSignature(column: SchemaColumn) {
  return { name: column.name, type: canonical(column.typeRaw), nullability: column.nullability, default: column.defaultExpression === null ? null : canonical(column.defaultExpression) };
}
function tableSignature(table: SchemaTable) {
  return JSON.stringify({ columns: table.columns.map(columnSignature), constraints: table.constraints.map(constraintSignature) });
}
function refresh(table: SchemaTable): void {
  if (new Set(table.columns.map(c => c.name)).size !== table.columns.length) throw new FoldFault('COLUMN_ALREADY_DECLARED');
  const named = table.constraints.filter(c => c.name !== null).map(c => c.name);
  if (new Set(named).size !== named.length) throw new FoldFault('CONSTRAINT_ALREADY_DECLARED');
  if (table.constraints.filter(c => c.kind === 'PRIMARY_KEY').length > 1) throw new FoldFault('MULTIPLE_PRIMARY_KEYS');
  for (const column of table.columns) column.nullability.primaryKey = false;
  for (const constraint of table.constraints) {
    if (constraint.reference?.columns && constraint.columns.length !== constraint.reference.columns.length) throw new FoldFault('FOREIGN_KEY_ARITY_CONFLICT');
    for (const name of constraint.columns) {
      const column = table.columns.find(c => c.name === name);
      if (!column) throw new FoldFault('CONSTRAINT_LOCAL_COLUMN_UNRESOLVED', 'UNRESOLVED');
      if (constraint.kind === 'PRIMARY_KEY') { column.nullability.primaryKey = true; column.nullability.notNull = true; }
    }
  }
}
function makeTable(declaration: CreateTableDeclaration, origin: SchemaOrigin): SchemaTable {
  const table: SchemaTable = {
    name: [...declaration.name.normalized], active: true, lifetimeId: origin.sourceIndex + ':' + origin.statementIndex,
    columns: declaration.columns.map(c => makeColumn(c, origin)), constraints: declaration.constraints.filter(structural).map(c => makeConstraint(c, origin)),
    retiredColumns: [], retiredConstraints: [], provenance: [origin], unknowns: [],
  };
  refresh(table); return table;
}
function activeTable(tables: SchemaTable[], name: string[]) { return tables.find(t => t.active && sameName(t.name, name)); }
function retireConstraint(table: SchemaTable, constraint: SchemaConstraint, origin: SchemaOrigin) {
  table.constraints = table.constraints.filter(c => c !== constraint);
  constraint.retiredBy = origin; table.retiredConstraints.push(constraint);
}
function hasOpaqueExpressions(table: SchemaTable) { return table.constraints.some(c => c.declaration.expression) || table.columns.some(c => c.defaultExpression !== null); }

/**
 * Pure source-order fold of a bounded explicit table grammar. It is not a
 * PostgreSQL catalog or execution model. Anonymous generated constraint names,
 * expressions, dynamic/transaction effects and search paths stay unresolved.
 * Actions are a descriptive source-order fold. PostgreSQL work-pass ordering,
 * catalogs, row validation and statement execution are not modeled.
 */
export function reduceExplicitSchema(inputs: readonly SchemaInput[]): SchemaFold {
  const result: SchemaFold = {
    tables: [], events: [], unknowns: [], sources: inputs.map(s => ({ path: s.path, sha256: createHash('sha256').update(s.text).digest('hex') })), sourceDigest: '',
    scope: 'PARTIAL_EXPLICIT_DDL_FOLD', effectiveSchema: 'NOT_COMPUTED', rowOwnership: 'NOT_CLASSIFIED', startingCatalog: 'NOT_PROVIDED', transactionEffects: 'NOT_MODELED',
  };
  result.sourceDigest = createHash('sha256').update(JSON.stringify(result.sources)).digest('hex');
  const unknown = (code: string, severity: SchemaUnknown['severity'], origin: SchemaOrigin, table?: string[]) => {
    const entry = { code, severity, origin, ...(table ? { table: [...table] } : {}) };
    result.unknowns.push(entry); if (table) activeTable(result.tables, table)?.unknowns.push(entry);
    return entry;
  };
  const sourceOrigin = (sourceIndex: number): SchemaOrigin => ({
    sourcePath: inputs[sourceIndex]?.path ?? '', sourceSha256: result.sources[sourceIndex]?.sha256 ?? '',
    sourceIndex, statementIndex: 0, actionIndex: 0, raw: inputs[sourceIndex]?.text ?? '',
    span: createDdlParser(inputs[sourceIndex]?.text ?? '').span(0, inputs[sourceIndex]?.text.length ?? 0),
  });
  const seen = new Set<string>();
  if (inputs.length === 0) { unknown('EMPTY_SOURCE_CAPTURE', 'UNRESOLVED', sourceOrigin(0)); return result; }
  for (let n = 0; n < inputs.length; n++) {
    if (seen.has(inputs[n].path)) unknown('DUPLICATE_SOURCE_PATH', 'CONFLICT', sourceOrigin(n));
    if (!inputs[n].path) unknown('SOURCE_PATH_REQUIRED', 'CONFLICT', sourceOrigin(n));
    if (inputs[n].sha256 !== undefined && inputs[n].sha256 !== result.sources[n].sha256) unknown('SOURCE_HASH_MISMATCH', 'CONFLICT', sourceOrigin(n));
    seen.add(inputs[n].path);
  }
  if (result.unknowns.length) return result;

  const applyActions = (name: string[], actions: Action[], statementOrigin: SchemaOrigin) => {
    const draft = clone(result.tables), events: SchemaEvent[] = [], pendingUnknowns: SchemaUnknown[] = [];
    const dropTargets = actions.filter(a => a.operation.kind === 'DROP_TABLE').map(a => key((a.operation as Extract<Operation, { kind: 'DROP_TABLE' }>).name));
    const note = (code: string, origin: SchemaOrigin, table: SchemaTable) => {
      const entry: SchemaUnknown = { code, severity: 'UNRESOLVED', origin, table: [...table.name] };
      pendingUnknowns.push(entry); table.unknowns.push(entry);
    };
    const incoming = (target: string[], column?: string) => draft.flatMap(owner => owner.active ? owner.constraints.filter(c => c.reference && sameName(c.reference.table, target) && (column === undefined || c.reference.columns === null || c.reference.columns.includes(column))).map(constraint => ({ owner, constraint })) : []);
    try {
      for (const action of actions) {
        const op = action.operation, origin = action.origin;
        const targetName = op.kind === 'DROP_TABLE' ? op.name : name;
        const table = activeTable(draft, targetName);
        if (!table) {
          if (op.kind === 'DROP_TABLE' && op.ifExists) { events.push({ operation: op.kind, status: 'SKIPPED_GUARD', table: targetName, origin }); continue; }
          throw new FoldFault('TABLE_TARGET_UNRESOLVED', 'UNRESOLVED');
        }
        let status: SchemaEvent['status'] = 'APPLIED_EXPLICIT';
        const requireColumn = (name: string) => { const col = table.columns.find(c => c.name === name); if (!col) throw new FoldFault('COLUMN_TARGET_UNRESOLVED', 'UNRESOLVED'); return col; };
        switch (op.kind) {
          case 'ADD_COLUMN': {
            const candidate = makeColumn(op.column, origin), existing = table.columns.find(c => c.name === candidate.name);
            if (existing) {
              if (!op.ifNotExists) throw new FoldFault('COLUMN_ALREADY_DECLARED');
              const oldInline = table.constraints.filter(c => c.declaration.scope === 'COLUMN' && c.columns.includes(existing.name)).map(constraintSignature);
              const newInline = op.column.constraints.filter(structural).map(c => constraintSignature(makeConstraint(c, origin)));
              if (JSON.stringify(columnSignature(existing)) !== JSON.stringify(columnSignature(candidate)) || JSON.stringify(oldInline) !== JSON.stringify(newInline)) throw new FoldFault('GUARDED_COLUMN_DRIFT', 'UNRESOLVED');
              status = 'SKIPPED_GUARD'; break;
            }
            table.columns.push(candidate); table.constraints.push(...op.column.constraints.filter(structural).map(c => makeConstraint(c, origin))); break;
          }
          case 'ADD_CONSTRAINT': table.constraints.push(makeConstraint(op.constraint, origin, op.validation)); break;
          case 'SET_TYPE': {
            const col = requireColumn(op.column); col.typeRaw = op.typeRaw; col.provenance.push(origin);
            note('TYPE_CHANGE_DEPENDENCIES_UNVERIFIED', origin, table); break;
          }
          case 'SET_NOT_NULL': {
            const col = requireColumn(op.column); col.nullability.explicit = 'NOT_NULL'; col.nullability.notNull = true; col.provenance.push(origin); break;
          }
          case 'DROP_NOT_NULL': {
            const col = requireColumn(op.column); if (col.nullability.primaryKey) throw new FoldFault('PRIMARY_KEY_NOT_NULL_REQUIRED');
            col.nullability.explicit = 'UNSPECIFIED'; col.nullability.notNull = false; col.provenance.push(origin); break;
          }
          case 'SET_DEFAULT': { const col = requireColumn(op.column); col.defaultExpression = op.expression; col.provenance.push(origin); break; }
          case 'DROP_DEFAULT': { const col = requireColumn(op.column); col.defaultExpression = null; col.provenance.push(origin); break; }
          case 'RENAME_COLUMN': {
            const col = requireColumn(op.column); if (table.columns.some(c => c.name === op.to)) throw new FoldFault('COLUMN_RENAME_CONFLICT');
            if (hasOpaqueExpressions(table)) note('OPAQUE_EXPRESSION_DEPENDENCY_UNRESOLVED', origin, table);
            col.name = op.to; col.provenance.push(origin);
            for (const constraint of table.constraints) {
              if (constraint.columns.includes(op.column)) { constraint.columns = constraint.columns.map(c => c === op.column ? op.to : c); constraint.provenance.push(origin); }
            }
            for (const entry of incoming(table.name, op.column)) if (entry.constraint.reference?.columns) {
              entry.constraint.reference.columns = entry.constraint.reference.columns.map(c => c === op.column ? op.to : c);
              entry.constraint.provenance.push(origin);
            }
            break;
          }
          case 'RENAME_TABLE': {
            const to = [...table.name.slice(0, -1), op.to];
            if (activeTable(draft, to)) throw new FoldFault('TABLE_RENAME_CONFLICT');
            for (const entry of incoming(table.name)) { entry.constraint.reference!.table = [...to]; entry.constraint.provenance.push(origin); }
            table.name = to; break;
          }
          case 'RENAME_CONSTRAINT': {
            const constraint = table.constraints.find(c => c.name === op.constraint);
            if (!constraint) throw new FoldFault('CONSTRAINT_TARGET_UNRESOLVED', 'UNRESOLVED');
            if (table.constraints.some(c => c.name === op.to)) throw new FoldFault('CONSTRAINT_RENAME_CONFLICT');
            constraint.name = op.to; constraint.provenance.push(origin); break;
          }
          case 'DROP_COLUMN': {
            const col = table.columns.find(c => c.name === op.column);
            if (!col) { if (op.ifExists) { status = 'SKIPPED_GUARD'; break; } throw new FoldFault('COLUMN_TARGET_UNRESOLVED', 'UNRESOLVED'); }
            const allDependencies = incoming(table.name, op.column);
            if (allDependencies.some(entry => entry.constraint.reference?.columns === null && !(entry.owner === table && entry.constraint.columns.includes(op.column)))) throw new FoldFault('DROP_REFERENCE_COLUMNS_UNRESOLVED', 'UNRESOLVED');
            const dependencies = allDependencies.filter(entry => entry.owner !== table);
            if (dependencies.length && !op.cascade) throw new FoldFault('DROP_COLUMN_REFERENCED');
            if (op.cascade) {
              note('CASCADE_DEPENDENCIES_UNMODELED', origin, table);
              for (const entry of dependencies) retireConstraint(entry.owner, entry.constraint, origin);
            }
            if (hasOpaqueExpressions(table)) note('OPAQUE_DROP_DEPENDENCIES_UNRESOLVED', origin, table);
            table.columns = table.columns.filter(c => c !== col); col.retiredBy = origin; table.retiredColumns.push(col);
            for (const constraint of [...table.constraints]) if (constraint.columns.includes(op.column) || (constraint.reference && sameName(constraint.reference.table, table.name) && constraint.reference.columns?.includes(op.column))) retireConstraint(table, constraint, origin);
            break;
          }
          case 'DROP_CONSTRAINT': {
            const constraint = table.constraints.find(c => c.name === op.constraint);
            if (!constraint) {
              if (op.ifExists && table.constraints.every(c => c.name !== null)) { status = 'SKIPPED_GUARD'; break; }
              throw new FoldFault('CONSTRAINT_TARGET_UNRESOLVED', 'UNRESOLVED');
            }
            if (['PRIMARY_KEY', 'UNIQUE'].includes(constraint.kind) && incoming(table.name).some(entry => entry.constraint.reference?.columns && JSON.stringify(entry.constraint.reference.columns) === JSON.stringify(constraint.columns))) throw new FoldFault('REFERENCED_CONSTRAINT_DEPENDENCY_UNRESOLVED', 'UNRESOLVED');
            if (op.cascade) note('CASCADE_DEPENDENCIES_UNMODELED', origin, table);
            retireConstraint(table, constraint, origin); break;
          }
          case 'DROP_TABLE': {
            const dependencies = incoming(table.name).filter(entry => entry.owner !== table && !dropTargets.includes(key(entry.owner.name)));
            if (dependencies.length && !op.cascade) throw new FoldFault('DROP_TABLE_REFERENCED');
            if (op.cascade) { note('CASCADE_DEPENDENCIES_UNMODELED', origin, table); for (const entry of dependencies) retireConstraint(entry.owner, entry.constraint, origin); }
            table.active = false; break;
          }
        }
        if (status === 'APPLIED_EXPLICIT') table.provenance.push(origin);
        for (const candidate of draft) if (candidate.active) refresh(candidate);
        events.push({ operation: op.kind, status, table: [...table.name], origin });
      }
      result.tables = draft; result.events.push(...events); result.unknowns.push(...pendingUnknowns);
    } catch (error) {
      if (!(error instanceof FoldFault)) throw error;
      unknown(error.code, error.severity, statementOrigin, name);
      result.events.push({ operation: 'ALTER_OR_DROP_STATEMENT', status: 'UNRESOLVED', table: [...name], origin: statementOrigin });
    }
  };

  for (let sourceIndex = 0; sourceIndex < inputs.length; sourceIndex++) {
    const source = inputs[sourceIndex], parser = createDdlParser(source.text), lexical = lexSql(source.text);
    if (!lexical.complete) {
      for (const diagnostic of lexical.diagnostics) unknown(diagnostic.code, diagnostic.severity === 'ERROR' ? 'CONFLICT' : 'UNSUPPORTED', { ...sourceOrigin(sourceIndex), raw: source.text.slice(diagnostic.startOffset, diagnostic.endOffset), span: parser.span(diagnostic.startOffset, diagnostic.endOffset) });
      const origin = sourceOrigin(sourceIndex);
      unknown('LEXICAL_SOURCE_BLOCKED', 'UNRESOLVED', origin);
      result.events.push({ operation: 'LEXICAL_SOURCE', status: 'UNRESOLVED', origin });
      continue;
    }
    let statementIndex = 0;
    for (const part of lexical.parts) {
      if (part.kind !== 'statement') continue;
      const tokens = tokenizeDdl(part.text, part.startOffset), c = new Cursor(tokens);
      const statementOrigin: SchemaOrigin = { sourcePath: source.path, sourceSha256: result.sources[sourceIndex].sha256, sourceIndex, statementIndex: statementIndex++, actionIndex: 0, raw: part.text, span: parser.span(part.startOffset, part.endOffset) };
      const actionOrigin = (tokens: Token[], actionIndex: number): SchemaOrigin => ({ ...statementOrigin, actionIndex, raw: parser.rawTokens(tokens), span: parser.tokenSpan(tokens) });
      let target: string[] | undefined;
      try {
        if (c.word('CREATE') && (c.word('TABLE', 1) || (['TEMP', 'TEMPORARY', 'UNLOGGED'].some(word => c.word(word, 1)) && c.word('TABLE', 2)))) {
          const declaration = parser.createTable(tokens); target = declaration.name.normalized;
          const origin = { ...statementOrigin, raw: declaration.raw, span: declaration.span }, candidate = makeTable(declaration, origin), existing = activeTable(result.tables, target);
          if (existing) {
            if (!declaration.ifNotExists) throw new FoldFault('TABLE_ALREADY_DECLARED');
            if (tableSignature(existing) !== tableSignature(candidate)) throw new FoldFault('GUARDED_TABLE_DRIFT', 'UNRESOLVED');
            result.events.push({ operation: 'CREATE_TABLE', status: 'SKIPPED_GUARD', table: [...target], origin });
          } else {
            result.tables.push(candidate); result.events.push({ operation: 'CREATE_TABLE', status: 'APPLIED_EXPLICIT', table: [...target], origin });
          }
          continue;
        }
        if (c.word('ALTER') && c.word('TABLE', 1)) {
          c.index++;
          c.require('TABLE');
          let ifExists = false; if (c.eat('IF')) { c.require('EXISTS'); ifExists = true; }
          if (c.word('ONLY')) throw new FoldFault('UNSUPPORTED_ALTER_TABLE_MODIFIER', 'UNSUPPORTED');
          target = parser.name(c).normalized;
          if (ifExists && !activeTable(result.tables, target)) { result.events.push({ operation: 'ALTER_TABLE', status: 'SKIPPED_GUARD', table: target, origin: statementOrigin }); continue; }
          let actionTokens = tokens.slice(c.index);
          if (actionTokens[actionTokens.length - 1]?.raw === ';') actionTokens = actionTokens.slice(0, -1);
          const chunks: Token[][] = []; let start = 0;
          for (let n = 0; n < actionTokens.length; n++) {
            if (actionTokens[n].kind === 'symbol' && ['(', '['].includes(actionTokens[n].raw)) { n = closeGroup(actionTokens, n); continue; }
            if (actionTokens[n].raw === ',' && actionTokens[n].kind === 'symbol') { chunks.push(actionTokens.slice(start, n)); start = n + 1; }
          }
          chunks.push(actionTokens.slice(start));
          const actions: Action[] = chunks.map((chunk, actionIndex) => {
            if (chunk.length === 0) throw new FoldFault('EMPTY_ALTER_ACTION', 'CONFLICT');
            const a = new Cursor(chunk), origin = actionOrigin(chunk, actionIndex);
            let operation: Operation;
            if (a.eat('ADD')) {
              if (a.word('CONSTRAINT') || ['PRIMARY', 'UNIQUE', 'FOREIGN', 'CHECK'].some(word => a.word(word))) {
                const declared = parser.constraint(a); let validation: SchemaConstraint['validation'] = 'UNSPECIFIED';
                if (a.eat('NOT')) { a.require('VALID'); validation = 'NOT_VALID'; }
                operation = { kind: 'ADD_CONSTRAINT', constraint: declared, validation };
              } else {
                a.eat('COLUMN'); let ifNotExists = false;
                if (a.eat('IF')) { a.require('NOT'); a.require('EXISTS'); ifNotExists = true; }
                operation = { kind: 'ADD_COLUMN', column: parser.column(chunk.slice(a.index)), ifNotExists }; a.index = chunk.length;
              }
            } else if (a.eat('DROP')) {
              const isConstraint = a.eat('CONSTRAINT'); if (!isConstraint) a.eat('COLUMN');
              let ifExists = false; if (a.eat('IF')) { a.require('EXISTS'); ifExists = true; }
              const name = parser.identifier(a).normalized, cascade = a.eat('CASCADE'); if (!cascade) a.eat('RESTRICT');
              operation = isConstraint ? { kind: 'DROP_CONSTRAINT', constraint: name, ifExists, cascade } : { kind: 'DROP_COLUMN', column: name, ifExists, cascade };
            } else if (a.eat('RENAME')) {
              if (a.eat('TO')) operation = { kind: 'RENAME_TABLE', to: parser.identifier(a).normalized };
              else {
                const isConstraint = a.eat('CONSTRAINT'); if (!isConstraint) a.eat('COLUMN');
                const from = parser.identifier(a).normalized; a.require('TO'); const to = parser.identifier(a).normalized;
                operation = isConstraint ? { kind: 'RENAME_CONSTRAINT', constraint: from, to } : { kind: 'RENAME_COLUMN', column: from, to };
              }
            } else if (a.eat('ALTER')) {
              a.eat('COLUMN'); const declaredColumn = parser.identifier(a), column = declaredColumn.normalized;
              if (a.eat('TYPE')) {
                const type = parser.dataType(a);
                if (a.word('USING')) throw new FoldFault('UNSUPPORTED_ALTER_TYPE_USING', 'UNSUPPORTED');
                operation = { kind: 'SET_TYPE', column, typeRaw: type.raw };
              } else if (a.eat('SET')) {
                if (a.eat('NOT')) { a.require('NULL'); operation = { kind: 'SET_NOT_NULL', column }; }
                else {
                  const declared = parser.constraint(a, declaredColumn);
                  if (declared.kind !== 'DEFAULT' || !declared.expression) throw new FoldFault('UNSUPPORTED_ALTER_ACTION', 'UNSUPPORTED');
                  operation = { kind: 'SET_DEFAULT', column, expression: declared.expression.raw };
                }
              } else if (a.eat('DROP')) {
                if (a.eat('NOT')) { a.require('NULL'); operation = { kind: 'DROP_NOT_NULL', column }; }
                else { a.require('DEFAULT'); operation = { kind: 'DROP_DEFAULT', column }; }
              } else throw new FoldFault('UNSUPPORTED_ALTER_ACTION', 'UNSUPPORTED');
            } else throw new FoldFault('UNSUPPORTED_ALTER_ACTION', 'UNSUPPORTED');
            if (a.current) throw new FoldFault('UNSUPPORTED_ALTER_ACTION_TAIL', 'UNSUPPORTED');
            return { operation, origin };
          });
          applyActions(target, actions, statementOrigin); continue;
        }
        if (c.word('DROP') && c.word('TABLE', 1)) {
          c.index += 2;
          let ifExists = false; if (c.eat('IF')) { c.require('EXISTS'); ifExists = true; }
          const names = [parser.name(c).normalized];
          while (c.symbol(',')) { c.index++; names.push(parser.name(c).normalized); }
          const cascade = c.eat('CASCADE'); if (!cascade) c.eat('RESTRICT'); if (c.symbol(';')) c.index++;
          if (c.current) throw new FoldFault('UNSUPPORTED_DROP_TABLE_TAIL', 'UNSUPPORTED');
          target = names[0]; applyActions(target, names.map(name => ({ operation: { kind: 'DROP_TABLE', name, ifExists, cascade }, origin: statementOrigin })), statementOrigin); continue;
        }
        unknown('STATEMENT_EFFECT_UNMODELED', 'UNSUPPORTED', statementOrigin);
        result.events.push({ operation: c.current?.raw.toUpperCase() ?? 'UNKNOWN', status: 'UNRESOLVED', origin: statementOrigin });
      } catch (error) {
        if (!(error instanceof FoldFault) && !(error instanceof ParseFault)) throw error;
        unknown(error.code, error instanceof FoldFault ? error.severity : error.severity === 'ERROR' ? 'CONFLICT' : 'UNSUPPORTED', statementOrigin, target);
        result.events.push({ operation: 'STATEMENT_NOT_FOLDED', status: 'UNRESOLVED', ...(target ? { table: [...target] } : {}), origin: statementOrigin });
      }
    }
  }
  // Resolve only literal declared identities/columns, without catalog search-path
  // or generated-name inference. This is evidence of an explicit reference pair,
  // not proof that statements succeeded against a database.
  for (const table of result.tables.filter(t => t.active)) for (const constraint of table.constraints) if (constraint.reference) {
    const origin = constraint.provenance[constraint.provenance.length - 1], target = activeTable(result.tables, constraint.reference.table);
    if (!target) unknown('REFERENCE_TABLE_UNRESOLVED', 'UNRESOLVED', origin, table.name);
    if (constraint.reference.columns === null) unknown('REFERENCE_COLUMNS_UNSPECIFIED', 'UNRESOLVED', origin, table.name);
    else if (target && constraint.reference.columns.some(name => !target.columns.some(c => c.name === name))) unknown('REFERENCE_COLUMN_UNRESOLVED', 'UNRESOLVED', origin, table.name);
  }
  return result;
}
