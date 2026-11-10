export {compiledHostedSourceSha} from './source';
import {createScheduledHandler,observedFetch} from './handlers';
import {runProvisionerOnce} from '../../../src/lib/onboarding/provisioning/runtime.server';
import {canonicalCompanyManifest} from '../../../src/lib/company-bootstrap/server';
import {bootstrapManifest} from '../../../src/lib/company-bootstrap/manifest.generated';
import {compiledHostedSourceSha} from './source';
import {createProvisionerRun} from './provisioner-dispatch';
import {runWorkerEnrollmentIssuerOnce} from '../../../src/lib/operations/worker-enrollment-issuer';
import {provisionerEnvironment} from './capabilities';

/** Build/operator preflight, also checked before any runtime job is claimed. */
export async function verifyProvisionerBundle(){
 const manifest=await canonicalCompanyManifest();
 if(manifest.hash!==bootstrapManifest.hash)throw Error('provisioner_source_manifest_mismatch');
 return {hash:manifest.hash,files:manifest.base.length+manifest.final.length};
}
const handler={fetch:observedFetch('provisioner',createScheduledHandler('provisioner',process.env,async()=>{
 await verifyProvisionerBundle();return createProvisionerRun(process.env,compiledHostedSourceSha(),{normal:()=>runProvisionerOnce(provisionerEnvironment(process.env)),enroll:()=>runWorkerEnrollmentIssuerOnce(process.env,compiledHostedSourceSha())})();
}))};

export default handler;
