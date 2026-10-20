import {AccountRecovery} from '@/components/account-recovery';
import {getPublicWorkspaceName} from '@/lib/data/workspaces';
import {AUTH_COPY} from '@/lib/auth-copy';
import {readAuthLang} from '@/lib/auth-lang.server';
import {AuthShell} from '@/components/auth-premium/auth-shell';
import '../login/auth-premium.css';

export const dynamic='force-dynamic';

export default async function ForgotAccessPage(){
 const [,lang]=await Promise.all([getPublicWorkspaceName(),readAuthLang()]);
 const t=AUTH_COPY[lang];
 return <AuthShell lang={lang} t={t} variant="sub" back="/login"><AccountRecovery kind="request" lang={lang}/></AuthShell>;
}
