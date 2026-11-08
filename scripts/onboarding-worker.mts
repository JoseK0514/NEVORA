import {runProvisionerOnce} from '../src/lib/onboarding/provisioning/runtime.server';
// One bounded invocation. Scheduling and hosted enablement are separate controls.
if(process.argv.slice(2).join(' ')!=='--once')throw Error('Use onboarding:worker for one explicitly configured provisioning invocation.');
try{const report=await runProvisionerOnce();process.stdout.write(JSON.stringify(report)+'\n');}
catch{process.stderr.write('Onboarding worker could not confirm this invocation. Inspect private operation status.\n');process.exitCode=1;}
