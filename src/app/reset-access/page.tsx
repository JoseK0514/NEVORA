import {AccountRecovery} from '@/components/account-recovery';
import {AuthBrand} from '@/components/auth-brand';
import {BrandLegal} from '@/components/brand-legal';
import {NUVORA_BRAND} from '@/lib/brand';
import {getPublicWorkspaceName} from '@/lib/data/workspaces';
import {ResetVisual} from './reset-visual';
import '../login/login.css';
import './reset.css';
import '../login/auth-refinement.css';
import '../login/auth-support.css';

export const dynamic='force-dynamic';

export default async function ResetAccessPage(){
 const workspaceName=await getPublicWorkspaceName();
 return <main className="auth-page employee-login-page auth-refinement-page auth-support-page reset-page"><div className="employee-login-shell">
  <header className="employee-login-brand"><AuthBrand/><span className="login-workspace">{workspaceName??'Workspace unavailable'}</span></header>
  <div className="employee-login-composition"><ResetVisual/><AccountRecovery kind="reset"/></div>
  <footer className="employee-login-footer"><small>{NUVORA_BRAND.poweredBy}</small><BrandLegal/></footer>
 </div></main>;
}
