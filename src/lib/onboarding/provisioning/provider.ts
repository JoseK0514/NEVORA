import type {BootstrapClient} from '../../company-bootstrap/server';
import type {ResourceRequest,ResourceIdentity,ProvisionedResource} from './model';
/** Provider metadata/credential operations. No caller may supply a database URL,
 * parent branch, organization, region or SQL identifier from browser fields. */
export type ProvisioningProvider={
 find(request:ResourceRequest,identity:ResourceIdentity):Promise<ProvisionedResource[]>;
 create(request:ResourceRequest,identity:ResourceIdentity):Promise<ProvisionedResource>;
 bootstrapCredential(resource:ProvisionedResource):Promise<string>;
};
export type BootstrapConnection={client:BootstrapClient;close():Promise<void>};
export type BootstrapConnector=(resource:ProvisionedResource,url:string)=>Promise<BootstrapConnection>;
