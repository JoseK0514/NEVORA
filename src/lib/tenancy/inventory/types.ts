export type Diagnostic = { code: string; severity: 'ERROR' | 'UNSUPPORTED'; startOffset: number; endOffset: number; startByte: number; endByte: number; line: number };
export type JournalPart = { kind: 'statement' | 'trivia'; text: string; startOffset: number; endOffset: number; startByte: number; endByte: number; startLine: number; endLine: number; terminated: boolean; leadingKeyword?: string; sha256: string };
export type LexResult = { parts: JournalPart[]; diagnostics: Diagnostic[]; complete: boolean; semanticAnalysis: 'NOT_PERFORMED' };
export type MigrationBlob = { path: string; gitBlobId: string; text: string; sha256: string; byteLength: number };
export type PinnedMigrations = { source: string; tree: string; migrations: MigrationBlob[] };
export type SourceRequest = { repo: string; source: string; tree: string };
export type GitReader = (repo: string, args: readonly string[]) => Buffer;
