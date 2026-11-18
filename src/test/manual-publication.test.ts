import { fileURLToPath } from 'node:url';
import { expect, it } from '@rstest/core';
import { verifyBundle } from '../../scripts/manuals/bundle.mjs';

// Qualification reads the complete tracked application inventory and all six PDFs.
it('qualifies the actual checked-in web manuals and PDFs against current application and source bytes', async () => {
  const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
  const manifest = await verifyBundle({ repoRoot });
  expect(manifest.guides.map((guide: {id: string}) => guide.id).sort()).toEqual(['developer', 'employee', 'manager-lead', 'operations', 'owner', 'rondo']);
}, 15_000);
