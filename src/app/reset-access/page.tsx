import {AccountRecovery} from '@/components/account-recovery';
import {BrandLockup} from '@/components/brand-lockup';
import {BrandLegal} from '@/components/brand-legal';
import {NUVORA_BRAND} from '@/lib/brand';
import {getPublicWorkspaceName} from '@/lib/data/workspaces';
import {ResetVisual} from './reset-visual';
import '../login/login.css';
import './reset.css';

export const dynamic='force-dynamic';

export default async function ResetAccessPage(){
 const workspaceName=await getPublicWorkspaceName();
 return <main className="auth-page employee-login-page reset-page"><div className="employee-login-shell">
  <header className="employee-login-brand"><BrandLockup variant="large"/><span className="login-workspace">{workspaceName??'Workspace unavailable'}</span></header>
  <div className="employee-login-composition"><ResetVisual/><AccountRecovery kind="reset"/></div>
  <footer className="employee-login-footer"><small>{NUVORA_BRAND.poweredBy}</small><BrandLegal/></footer>
 </div></main>;
}
