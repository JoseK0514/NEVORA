import { readFile, rename, writeFile, access } from 'node:fs/promises';
import {existsSync} from 'node:fs';
import { join } from 'node:path';
import type { LocalTransportHooks } from './owned-pg-transport';

/** Scratch-runtime IO barriers only; never alter source data or return fake rows. */
export function ownedAppBarriers(directory: string): LocalTransportHooks {
  async function pause(stage: 'before' | 'after', text: string) {
    const path = join(directory, 'armed.json');
    let gate: { id: string; stage: string; contains: string };
    try { gate = JSON.parse(await readFile(path, 'utf8')); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
    if (gate.stage !== stage || !text.includes(gate.contains)) return;
    if (!/^[a-z0-9-]{1,80}$/.test(gate.id)) throw new Error('Invalid owned test gate identity');
    try { await rename(path, join(directory, `${gate.id}.claimed.json`)); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
    await writeFile(join(directory, `${gate.id}.reached`), stage);
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      try { await access(join(directory, `${gate.id}.release`)); return; }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new Error(`Owned application barrier timed out: ${gate.id}`);
  }
  return { beforeQuery: text => pause('before', text), afterQuery: text => pause('after', text),
    observeHomeEnabled:()=>existsSync(join(directory,'home-diagnostic.enabled')),
    observeHome: sample => console.log('[Owned Home SQL] '+JSON.stringify(sample)) };
}
