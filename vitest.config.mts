import {defineConfig,mergeConfig} from 'vitest/config';
import shared from './vitest.shared.mts';
import projects from './scripts/vitest-projects.json' with {type:'json'};
/** Load only the selected project: owned configs must keep their admission
 * guards and must never be evaluated as a side effect of an ordinary unit run. */
const selected=process.env.NEVORA_TEST_PROJECT??'unit';
const project=projects.find(p=>p.name===selected);
if(!project)throw Error('Unknown NEVORA_TEST_PROJECT; see scripts/vitest-projects.json');
export default mergeConfig(shared,defineConfig({test:{projects:['./'+project.config]}}));
