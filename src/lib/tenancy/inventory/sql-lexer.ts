import { createHash } from 'node:crypto';
import type { Diagnostic, JournalPart, LexResult } from './types';

// PostgreSQL identifiers permit non-ASCII bytes; dollar tags use the same
// envelope without '$' in the tag itself. No names are ownership classifications.
const startsIdentifier = (c: string | undefined) => c !== undefined && /[A-Za-z_\u0080-\uFFFF]/.test(c);
const continuesIdentifier = (c: string | undefined) => c !== undefined && /[A-Za-z_0-9$\u0080-\uFFFF]/.test(c);

/** Partitions inert SQL text. This is neither a SQL parser nor an executor. */
export function lexSql(text: string): LexResult {
  const parts: JournalPart[] = [];
  const diagnostics: Diagnostic[] = [];
  const byteOffsets = new Array<number>(text.length + 1);
  const lineStarts = [0];
  let bytes = 0;
  for (let n = 0; n < text.length;) {
    byteOffsets[n] = bytes;
    const point = text.codePointAt(n)!;
    const width = point > 0xffff ? 2 : 1;
    if (width === 2) byteOffsets[n + 1] = bytes;
    bytes += Buffer.byteLength(String.fromCodePoint(point), 'utf8');
    if (text[n] === '\r') lineStarts.push(n + (text[n + 1] === '\n' ? 2 : 1));
    else if (text[n] === '\n' && text[n - 1] !== '\r') lineStarts.push(n + 1);
    n += width;
  }
  byteOffsets[text.length] = bytes;
  const lineAt = (offset: number) => {
    let low = 0, high = lineStarts.length;
    while (low + 1 < high) {
      const middle = (low + high) >>> 1;
      if (lineStarts[middle] <= offset) low = middle; else high = middle;
    }
    return low + 1;
  };
  const diagnose = (code: string, severity: Diagnostic['severity'], start: number, end: number) => {
    diagnostics.push({ code, severity, startOffset: start, endOffset: end, startByte: byteOffsets[start], endByte: byteOffsets[end], line: lineAt(start) });
  };
  // NUL is invalid even in a quoted body. Preserve it in the journal.
  for (let n = 0; n < text.length; n++) if (text[n] === '\0') diagnose('INVALID_NUL', 'ERROR', n, n + 1);

  const lineCommentEnd = (start: number) => {
    const lf = text.indexOf('\n', start), cr = text.indexOf('\r', start);
    return lf === -1 ? cr : cr === -1 ? lf : Math.min(lf, cr);
  };
  // PostgreSQL concatenates quoted literals separated by whitespace containing
  // a newline. The original E-string escape mode persists across the join.
  const continuedQuoteAt = (start: number): number | undefined => {
    let cursor = start, newline = false;
    while (cursor < text.length) {
      if (/[ \t\n\r\f\v]/.test(text[cursor])) {
        if (text[cursor] === '\n' || text[cursor] === '\r') newline = true;
        cursor++; continue;
      }
      if (text.startsWith('--', cursor)) {
        const end = lineCommentEnd(cursor + 2);
        if (end === -1) return undefined;
        cursor = end; continue;
      }
      break;
    }
    return newline && text[cursor] === "'" ? cursor : undefined;
  };

  let partStart = 0, i = 0, hasCode = false;
  let words: string[] = [];
  const emit = (end: number, terminated: boolean) => {
    if (end <= partStart) return;
    const raw = text.slice(partStart, end);
    const part: JournalPart = {
      kind: hasCode ? 'statement' : 'trivia', text: raw,
      startOffset: partStart, endOffset: end, startByte: byteOffsets[partStart], endByte: byteOffsets[end],
      startLine: lineAt(partStart), endLine: lineAt(end - 1), terminated,
      sha256: createHash('sha256').update(raw, 'utf8').digest('hex'),
    };
    if (hasCode && words[0]) part.leadingKeyword = words[0];
    if (words[0] === 'COPY' && words.some((word, index) => word === 'FROM' && words[index + 1] === 'STDIN')) {
      diagnose('UNSUPPORTED_COPY_STDIN', 'UNSUPPORTED', partStart, end);
    }
    if ((words[0] === 'SET' || words[0] === 'RESET') && words.includes('STANDARD_CONFORMING_STRINGS')) {
      diagnose('UNSUPPORTED_LEXICAL_SETTING', 'UNSUPPORTED', partStart, end);
    }
    parts.push(part);
    partStart = end;
    hasCode = false;
    words = [];
  };

  while (i < text.length) {
    const c = text[i];
    if (/[ \t\n\r\f\v]/.test(c) || (c === '\ufeff' && i === 0)) { i++; continue; }
    if (text.startsWith('--', i)) {
      const end = lineCommentEnd(i + 2);
      i = end === -1 ? text.length : end;
      continue;
    }
    if (text.startsWith('/*', i)) {
      const start = i;
      let depth = 1;
      i += 2;
      while (i < text.length && depth > 0) {
        if (text.startsWith('/*', i)) { depth++; i += 2; }
        else if (text.startsWith('*/', i)) { depth--; i += 2; }
        else i++;
      }
      if (depth !== 0) diagnose('UNTERMINATED_BLOCK_COMMENT', 'ERROR', start, text.length);
      continue;
    }
    if (c === ';') { i++; emit(i, true); continue; }
    hasCode = true;
    if (c === "'" || c === '"') {
      const start = i, quote = c;
      const escapeString = quote === "'" && (text[i - 1] === 'e' || text[i - 1] === 'E') && !continuesIdentifier(text[i - 2]);
      let closed = false;
      i++;
      const contentStart = i;
      while (i < text.length) {
        if (escapeString && text[i] === '\\') { i = Math.min(i + 2, text.length); continue; }
        if (text[i] === quote) {
          if (text[i + 1] === quote) { i += 2; continue; }
          if (quote === '"') words.push(text.slice(contentStart, i).replaceAll('""', '"').toUpperCase());
          i++;
          const continuation = quote === "'" ? continuedQuoteAt(i) : undefined;
          if (continuation !== undefined) { i = continuation + 1; continue; }
          closed = true; break;
        }
        i++;
      }
      if (!closed) diagnose(quote === "'" ? 'UNTERMINATED_STRING' : 'UNTERMINATED_IDENTIFIER', 'ERROR', start, text.length);
      continue;
    }
    if (c === '$' && !continuesIdentifier(text[i - 1])) {
      const tag = text.slice(i).match(/^\$(?:[A-Za-z_\u0080-\uFFFF][A-Za-z_0-9\u0080-\uFFFF]*)?\$/)?.[0];
      if (tag) {
        const start = i;
        const end = text.indexOf(tag, i + tag.length);
        if (end === -1) { diagnose('UNTERMINATED_DOLLAR_BODY', 'ERROR', start, text.length); i = text.length; }
        else i = end + tag.length;
        continue;
      }
    }
    if (c === '\\') diagnose('UNSUPPORTED_PSQL_META_COMMAND', 'UNSUPPORTED', i, i + 1);
    if (startsIdentifier(c)) {
      const start = i++;
      while (continuesIdentifier(text[i])) i++;
      words.push(text.slice(start, i).toUpperCase());
    } else i++;
  }
  emit(text.length, false);
  diagnostics.sort((a, b) => a.startOffset - b.startOffset || (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));
  return { parts, diagnostics, complete: diagnostics.length === 0, semanticAnalysis: 'NOT_PERFORMED' };
}
