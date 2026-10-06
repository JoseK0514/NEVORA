import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';

it('waits for the Lead Home private snapshot before navigating to My Time in browser QA', async () => {
  const source = await readFile('scripts/phase-c-employee-time-ui-qa.mjs', 'utf8');
  const leadFlow = source.match(/const leadContext=[\s\S]*?checked\(engine\+': current Lead self-service supported'\);/)?.[0] ?? '';
  expect(leadFlow).toContain("await state(l,'Off Clock');await l.goto(app.url+'/app/my-time')");
});
