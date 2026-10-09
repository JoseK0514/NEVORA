import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArguments, writeExclusiveOutput } from '../src/lib/tenancy/inventory/cli.ts';
import { loadPinnedMigrations } from '../src/lib/tenancy/inventory/source.ts';
import { serializeJournal } from '../src/lib/tenancy/inventory/serialize.ts';

export { parseArguments, writeExclusiveOutput };

export function main(args) {
  const request = parseArguments(args);
  const input = loadPinnedMigrations(request);
  const journal = serializeJournal(input);
  writeExclusiveOutput(request.repo, request.out, journal);
  const summary = JSON.parse(journal);
  process.stdout.write(JSON.stringify({
    status: summary.status, source: summary.source, schemaDigest: summary.schemaDigest,
    migrations: summary.migrations.length, F10: summary.readiness.F10,
  }) + '\n');
  return summary.status === 'LEXICAL_JOURNAL_COMPLETE' ? 0 : 2;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch (error) {
    // Do not print child-process stderr, environment values, SQL, or credentials.
    const message = error?.status !== undefined ? 'Pinned Git read failed' : error instanceof Error ? error.message : 'Inventory failed';
    process.stderr.write(message + '\n');
    process.exitCode = 1;
  }
}
