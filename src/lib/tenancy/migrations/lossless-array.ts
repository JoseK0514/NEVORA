import { createHash } from 'node:crypto';

export type LosslessTextArrayDimension = Readonly<{ lowerBound: number; length: number }>;
export type LosslessTextArrayEnvelope = Readonly<{
 kind: 'TEXT_ARRAY';
 wire: Readonly<{ encoding: 'UTF8'; text: string; bytesBase64: string; byteLength: number; sha256: string }>;
 dimensions: readonly LosslessTextArrayDimension[];
 elements: readonly (string | null)[];
 verification: 'PURE_ARRAY_PARSE_NOT_DATABASE_VERIFICATION';
}>;
export type LosslessTextArrayParseOutcome =
 | Readonly<{ status: 'PARSED'; envelope: LosslessTextArrayEnvelope }>
 | Readonly<{ status: 'BLOCKED'; code: string }>;

// REL_17_STABLE/REL_18_STABLE src/include/utils/array.h: MAXDIM.
// Backend grammar/domain constraints, not newly selected product limits.
const MAX_DIMENSIONS = 6;
const INT32_MAX = 2147483647;
const issued = new WeakSet<object>();
const blocked = (code: string) => Object.freeze({ status: 'BLOCKED' as const, code });
class NativeArrayParseFailure extends Error {
 constructor(readonly code: string) { super(code); }
}
function fail(code = 'INVALID_ARRAY_WIRE'): never { throw new NativeArrayParseFailure(code); }

// PostgreSQL scanner_isspace(), not JavaScript Unicode whitespace.
function isSpace(character: string | undefined): boolean {
 return character === ' ' || character === '\t' || character === '\n' ||
  character === '\r' || character === '\v' || character === '\f';
}
function unicodeProblem(text: string): string | null {
 for (let index = 0; index < text.length; index++) {
  const code = text.charCodeAt(index);
  if (code === 0) return 'SQL_NUL_UNSUPPORTED';
  if (code >= 0xd800 && code <= 0xdbff) {
   const next = text.charCodeAt(++index);
   if (!(next >= 0xdc00 && next <= 0xdfff)) return 'INVALID_UNICODE';
  } else if (code >= 0xdc00 && code <= 0xdfff) return 'INVALID_UNICODE';
 }
 return null;
}

class NativeTextArrayParser {
 private position = 0;
 readonly elements: (string | null)[] = [];
 constructor(private readonly text: string) {}
 private skipSpace(): void {
  while (isSpace(this.text[this.position])) this.position++;
 }
 private readBound(): number {
  const negative = this.text[this.position] === '-';
  if (negative || this.text[this.position] === '+') this.position++;
  const start = this.position;
  while (this.text[this.position] >= '0' && this.text[this.position] <= '9') this.position++;
  if (this.position === start) fail();
  const digits = this.text.slice(start, this.position).replace(/^0+/, '') || '0';
  const limit = negative ? '2147483648' : '2147483647';
  if (digits.length > limit.length || (digits.length === limit.length && digits > limit)) fail('ARRAY_BOUND_LIMIT');
  // Exact conversion only AFTER checking PostgreSQL's signed32 domain.
  return digits === '0' ? 0 : Number((negative ? '-' : '') + digits);
 }
 private readDimensions(): LosslessTextArrayDimension[] {
  const dimensions: LosslessTextArrayDimension[] = [];
  this.skipSpace();
  while (this.text[this.position] === '[') {
   if (dimensions.length === MAX_DIMENSIONS) fail('ARRAY_DIMENSION_LIMIT');
   this.position++;
   const first = this.readBound();
   let lowerBound = 1, upperBound = first;
   if (this.text[this.position] === ':') {
    this.position++;
    lowerBound = first;
    upperBound = this.readBound();
   }
   if (this.text[this.position++] !== ']') fail();
   if (upperBound < lowerBound) fail('INVALID_ARRAY_BOUNDS');
   // ReadArrayDimensions / ArrayCheckBounds reject INT_MAX even for length 1.
   if (upperBound === INT32_MAX) fail('ARRAY_BOUND_LIMIT');
   const length = upperBound - lowerBound + 1;
   if (length > INT32_MAX) fail('ARRAY_BOUND_LIMIT');
   dimensions.push({ lowerBound, length });
   this.skipSpace();
  }
  if (dimensions.length > 0) {
   if (this.text[this.position++] !== '=') fail();
   this.skipSpace();
  }
  return dimensions;
 }
 private readElement(): string | null {
  this.skipSpace();
  const quoted = this.text[this.position] === '"';
  if (quoted) this.position++;
  const parts: string[] = [];
  let escaped = false, significantLength = 0, outputLength = 0;
  while (this.position < this.text.length) {
   const character = this.text[this.position++];
   if (character === '\\') {
    if (this.position === this.text.length) fail();
    const next = this.text[this.position++];
    parts.push(next);
    escaped = true;
    significantLength = ++outputLength;
    continue;
   }
   if (quoted) {
    if (character === '"') {
     this.skipSpace();
     const next = this.text[this.position];
     if (next !== ',' && next !== '}') fail();
     return parts.join('');
    }
    parts.push(character);
   } else {
    if (character === ',' || character === '}') {
     this.position--;
     const value = parts.join('').slice(0, significantLength);
     if (!value.length) fail();
     return !escaped && /^[nN][uU][lL][lL]$/.test(value) ? null : value;
    }
    if (character === '{' || character === '"') fail();
    parts.push(character);
    outputLength++;
    if (!isSpace(character)) significantLength = outputLength;
   }
  }
  fail();
 }
 private readLevel(depth: number): number[] {
  if (depth > MAX_DIMENSIONS) fail('ARRAY_DIMENSION_LIMIT');
  if (this.text[this.position++] !== '{') fail();
  this.skipSpace();
  if (this.text[this.position] === '}') { this.position++; return [0]; }
  const children = this.text[this.position] === '{';
  let count = 0;
  let childShape: number[] | undefined;
  while (true) {
   this.skipSpace();
   if (this.text[this.position] === ',' || this.text[this.position] === '}' || this.position === this.text.length) fail();
   if ((this.text[this.position] === '{') !== children) fail();
   if (children) {
    const shape = this.readLevel(depth + 1);
    if (childShape && (shape.length !== childShape.length || shape.some((length, index) => length !== childShape![index]))) fail();
    childShape = shape;
   } else this.elements.push(this.readElement());
   if (++count > INT32_MAX) fail('ARRAY_BOUND_LIMIT');
   this.skipSpace();
   const separator = this.text[this.position++];
   if (separator === '}') return childShape ? [count, ...childShape] : [count];
   if (separator !== ',') fail();
  }
 }
 parse(): LosslessTextArrayDimension[] {
  const declared = this.readDimensions();
  const shape = this.readLevel(1);
  this.skipSpace();
  if (this.position !== this.text.length) fail();
  if (declared.length && (declared.length !== shape.length || shape.some((length, index) => length !== declared[index].length))) fail();
  // array_in constructs zero-dimensional empty arrays, discarding inferred
  // empty shape. Raw supplied wire remains separately preserved.
  return this.elements.length === 0 ? [] : shape.map((length, index) => ({ lowerBound: declared[index]?.lowerBound ?? 1, length }));
 }
}

/** Pure native PostgreSQL text[] wire parser, using the documented comma text
 * delimiter and ReadArrayDimensions/ReadArrayToken/ReadArrayStr grammar.
 * Sources: postgresql.org/docs/18/arrays.html#ARRAYS-IO and PostgreSQL
 * REL_17_STABLE/REL_18_STABLE src/backend/utils/adt/arrayfuncs.c;
 * scanner whitespace: src/backend/parser/scansup.c.
 *
 * Primitive string input only. No coercion, property access, SQL execution or
 * DB verification. Exact supplied UTF8 is preserved before interpretation;
 * no pre-output literal, array_nulls input GUC, DB allocator acceptance,
 * source/OID, operator, tenant, reference or ownership authority is established.
 * Elements are row-major; dimensions retain native lower bounds. Empty arrays
 * have zero dimensions. SQL NULL belongs to the external typed envelope;
 * native unquoted NULL is distinct from quoted/escaped text NULL. No legacy
 * JSON-array bridge is provided. Six dimensions and signed32 bounds are backend
 * constraints, not arbitrary operational limits. Host allocation failures,
 * when catchable, return a sanitized blocked result.
 */
export function parseLosslessTextArrayWire(raw: unknown): LosslessTextArrayParseOutcome {
 try {
  if (typeof raw !== 'string') return blocked('INVALID_WIRE_TYPE');
  const problem = unicodeProblem(raw);
  if (problem) return blocked(problem);
  const parser = new NativeTextArrayParser(raw);
  const dimensions = Object.freeze(parser.parse().map(dimension => Object.freeze(dimension)));
  const elements = Object.freeze(parser.elements);
  const bytes = Buffer.from(raw, 'utf8');
  const wire = Object.freeze({ encoding: 'UTF8' as const, text: raw, bytesBase64: bytes.toString('base64'), byteLength: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  const envelope: LosslessTextArrayEnvelope = Object.freeze({
   kind: 'TEXT_ARRAY', wire, dimensions, elements,
   verification: 'PURE_ARRAY_PARSE_NOT_DATABASE_VERIFICATION',
  });
  issued.add(envelope);
  return Object.freeze({ status: 'PARSED', envelope });
 } catch (error) {
  return blocked(error instanceof NativeArrayParseFailure ? error.code : 'ARRAY_WIRE_PARSE_FAILED');
 }
}

/** Local parsing provenance only. Serialized clones/proxies remain unissued;
 * identity never authenticates a DB observation, operator or tenant. No caller
 * properties, getters or proxy traps are accessed.
 */
export function isIssuedLosslessTextArrayEnvelope(input: unknown): input is LosslessTextArrayEnvelope {
 return typeof input === 'object' && input !== null && issued.has(input);
}
