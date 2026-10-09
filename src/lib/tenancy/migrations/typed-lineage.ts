import { createHash } from 'node:crypto';
import { isIssuedTypedMigrationWireValue, type TypedMigrationSourceType, type TypedMigrationWireValue, type MigrationUtf8Wire } from './typed-wire';
import { parseLosslessTextArrayWire, type LosslessTextArrayDimension } from './lossless-array';
import type { LosslessJsonNode } from './lossless-json';

export type TypedMigrationLineageAddressSegment =
 | Readonly<{kind:'JSON_MEMBER';entryIndex:number;name:string;nameLexeme:string}>
 | Readonly<{kind:'JSON_INDEX';index:number}>
 | Readonly<{kind:'SQL_ARRAY_ELEMENT';ordinal:number;subscripts:readonly number[]}>;
export type TypedMigrationLineageNodeValue =
 | Readonly<{kind:'SQL_NULL'}>
 | Readonly<{kind:'SQL_SCALAR';text:string}>
 | Readonly<{kind:'JSON_NULL'}>
 | Readonly<{kind:'JSON_BOOLEAN';value:boolean}>
 | Readonly<{kind:'JSON_NUMBER';lexeme:string}>
 | Readonly<{kind:'JSON_STRING';text:string;lexeme:string}>
 | Readonly<{kind:'JSON_ARRAY';length:number}>
 | Readonly<{kind:'JSON_OBJECT';memberCount:number}>
 | Readonly<{kind:'SQL_ARRAY';dimensions:readonly LosslessTextArrayDimension[];elementCount:number}>
 | Readonly<{kind:'SQL_ARRAY_NULL'}>
 | Readonly<{kind:'SQL_ARRAY_TEXT';text:string}>;
export type TypedMigrationLineageNode = Readonly<{address:readonly TypedMigrationLineageAddressSegment[];value:TypedMigrationLineageNodeValue}>;
export type TypedMigrationCellLineage = Readonly<{
 source:Readonly<{type:TypedMigrationSourceType;kind:TypedMigrationWireValue['kind'];wire:MigrationUtf8Wire|null;checksum:string}>;
 nodes:readonly TypedMigrationLineageNode[];
 verification:'PURE_TYPED_CELL_LINEAGE_NOT_DATABASE_REFERENCE_OR_OWNERSHIP_VERIFICATION';
}>;
export type TypedMigrationLineageOutcome = Readonly<{status:'TRAVERSED';lineage:TypedMigrationCellLineage}>|Readonly<{status:'BLOCKED';code:string}>;

const issued = new WeakSet<object>();
const rootAddress: readonly TypedMigrationLineageAddressSegment[] = Object.freeze([]);
const blocked = (code: string): TypedMigrationLineageOutcome => Object.freeze({status: 'BLOCKED', code});

function node(address: readonly TypedMigrationLineageAddressSegment[], value: TypedMigrationLineageNodeValue): TypedMigrationLineageNode {
 return Object.freeze({address, value: Object.freeze(value)});
}

function childAddress(address: readonly TypedMigrationLineageAddressSegment[], segment: TypedMigrationLineageAddressSegment): readonly TypedMigrationLineageAddressSegment[] {
 return Object.freeze([...address, Object.freeze(segment)]);
}

/** All containers and leaves, in pre-order. The accepted JSON parser rejects
 * duplicate decoded member names. Entry indices describe retained occurrences,
 * never pre-jsonb input or a second, more permissive duplicate-key parser.
 */
function jsonNodes(root: LosslessJsonNode): TypedMigrationLineageNode[] {
 const nodes: TypedMigrationLineageNode[] = [];
 const pending: {value: LosslessJsonNode; address: readonly TypedMigrationLineageAddressSegment[]}[] = [{value: root, address: rootAddress}];
 while (pending.length) {
  const current = pending.pop()!;
  const {value, address} = current;
  switch (value.kind) {
   case 'JSON_NULL': nodes.push(node(address, {kind: 'JSON_NULL'})); break;
   case 'BOOLEAN': nodes.push(node(address, {kind: 'JSON_BOOLEAN', value: value.value})); break;
   case 'NUMBER': nodes.push(node(address, {kind: 'JSON_NUMBER', lexeme: value.lexeme})); break;
   case 'STRING': nodes.push(node(address, {kind: 'JSON_STRING', text: value.value, lexeme: value.lexeme})); break;
   case 'ARRAY':
    nodes.push(node(address, {kind: 'JSON_ARRAY', length: value.items.length}));
    for (let index = value.items.length - 1; index >= 0; index--) {
     pending.push({value: value.items[index], address: childAddress(address, {kind: 'JSON_INDEX', index})});
    }
    break;
   case 'OBJECT':
    nodes.push(node(address, {kind: 'JSON_OBJECT', memberCount: value.entries.length}));
    for (let entryIndex = value.entries.length - 1; entryIndex >= 0; entryIndex--) {
     const entry = value.entries[entryIndex];
     pending.push({value: entry.value, address: childAddress(address, {kind: 'JSON_MEMBER', entryIndex, name: entry.name, nameLexeme: entry.nameLexeme})});
    }
    break;
   default: throw new Error('Unsupported issued JSON node');
  }
 }
 return nodes;
}

function arraySubscripts(ordinal: number, dimensions: readonly LosslessTextArrayDimension[]): readonly number[] {
 const subscripts: number[] = new Array(dimensions.length);
 let remainder = ordinal;
 for (let axis = dimensions.length - 1; axis >= 0; axis--) {
  const {lowerBound, length} = dimensions[axis];
  subscripts[axis] = lowerBound + remainder % length;
  remainder = Math.floor(remainder / length);
 }
 return Object.freeze(subscripts);
}

/** A pure, complete traversal of an issued cell, without legacy projection.
 *
 * The issuer check precedes every input read; clones, proxies and foreign
 * envelopes cannot supply a cell. SQL scalar text remains exact, JSON numeric
 * lexemes never become Numbers, and native text arrays are parsed by the
 * accepted lossless parser before any lineage is issued. Array ordinals and
 * subscripts are structural metadata, not reference or ownership decisions.
 *
 * Source checksum is SHA256 of the UTF8 JSON encoding of the fixed-depth
 * {format, type, kind, wire} descriptor below. It binds the entire observed wire
 * and source type, including SQL NULL, not a database, row, operator, snapshot,
 * reference, tenant, pre-jsonb spelling or permission to backfill. Output data
 * can be serialized as evidence; deserialization never reissues provenance.
 * No artificial input/depth policy is introduced; traversal is iterative but
 * still allocates all nodes and their complete occurrence addresses.
 */
export function traverseTypedMigrationWireValue(input: unknown): TypedMigrationLineageOutcome {
 try {
  if (!isIssuedTypedMigrationWireValue(input)) return blocked('UNISSUED_TYPED_WIRE_VALUE');
  let nodes: TypedMigrationLineageNode[];
  switch (input.kind) {
   case 'SQL_NULL': nodes = [node(rootAddress, {kind: 'SQL_NULL'})]; break;
   case 'SCALAR': nodes = [node(rootAddress, {kind: 'SQL_SCALAR', text: input.wire.text})]; break;
   case 'JSON': nodes = jsonNodes(input.value); break;
   case 'RAW_SQL_ARRAY': {
    const parsed = parseLosslessTextArrayWire(input.wire.text);
    if (parsed.status === 'BLOCKED') return blocked(parsed.code);
    const {dimensions, elements} = parsed.envelope;
    nodes = [node(rootAddress, {kind: 'SQL_ARRAY', dimensions, elementCount: elements.length})];
    for (let ordinal = 0; ordinal < elements.length; ordinal++) {
     const address = childAddress(rootAddress, {kind: 'SQL_ARRAY_ELEMENT', ordinal, subscripts: arraySubscripts(ordinal, dimensions)});
     const text = elements[ordinal];
     nodes.push(node(address, text === null ? {kind: 'SQL_ARRAY_NULL'} : {kind: 'SQL_ARRAY_TEXT', text}));
    }
    break;
   }
   default: return blocked('UNSUPPORTED_TYPED_CELL_KIND');
  }
  const checksum = createHash('sha256').update(JSON.stringify({format: 'TYPED_CELL_LINEAGE_SOURCE_V1', type: input.sourceType, kind: input.kind, wire: input.wire}), 'utf8').digest('hex');
  const lineage: TypedMigrationCellLineage = Object.freeze({
   source: Object.freeze({type: input.sourceType, kind: input.kind, wire: input.wire, checksum}),
   nodes: Object.freeze(nodes),
   verification: 'PURE_TYPED_CELL_LINEAGE_NOT_DATABASE_REFERENCE_OR_OWNERSHIP_VERIFICATION',
  });
  issued.add(lineage);
  return Object.freeze({status: 'TRAVERSED', lineage});
 } catch {
  return blocked('TYPED_LINEAGE_TRAVERSAL_FAILED');
 }
}

/** Local traversal provenance only. No object reads or proxy traps. */
export function isIssuedTypedMigrationCellLineage(input: unknown): input is TypedMigrationCellLineage {
 return typeof input === 'object' && input !== null && issued.has(input);
}
