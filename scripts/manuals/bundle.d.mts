export type ManualFileHash = { path: string; sha256: string };
export type ManualPublication = {
  schemaVersion: 1; date: string; scope: string; sourceSha: string; applicationHash: string;
  sourceIndex: ManualFileHash;
  guides: {
    id: string; title: string; markdown: ManualFileHash; evidence: ManualFileHash[];
    pdf: ManualFileHash & { pageCount: number };
  }[];
};
/** Browser-free verification; rejects malformed or stale source/artifact records. */
export function verifyBundle(options: { repoRoot: string; publicationDir?: string }): Promise<ManualPublication>;
