import {createScheduledHandler,observedFetch} from './handlers';
import {runProvisionerOnce} from '../../../src/lib/onboarding/provisioning/runtime.server';
import {canonicalCompanyManifest} from '../../../src/lib/company-bootstrap/server';
import {bootstrapManifest} from '../../../src/lib/company-bootstrap/manifest.generated';

/** Build/operator preflight, also checked before any runtime job is claimed. */
export async function verifyProvisionerBundle(){
 const manifest=await canonicalCompanyManifest();
 if(manifest.hash!==bootstrapManifest.hash)throw Error('provisioner_source_manifest_mismatch');
 return {hash:manifest.hash,files:manifest.base.length+manifest.final.length};
}
const handler={fetch:observedFetch('provisioner',createScheduledHandler('provisioner',process.env,async()=>{
 await verifyProvisionerBundle();return runProvisionerOnce();
}))};

export default handler;
