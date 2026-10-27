import {mobileAccessMetadata} from "@/components/mobile-access/metadata.server";
import {mobileAccessEnabled} from "@/components/mobile-access/config.server";
import {AccountRecovery} from '@/components/account-recovery';
import {getPublicWorkspaceName} from '@/lib/data/workspaces';
import {AUTH_COPY} from '@/lib/auth-copy';
import {readAuthLang} from '@/lib/auth-lang.server';
import {QuietAuthShell} from "@/components/auth-premium/auth-shell";
import '../login/auth-premium.css';
import '../login/auth-signature.css';

export const dynamic='force-dynamic';

export default async function ResetAccessPage(){
 const [,lang]=await Promise.all([getPublicWorkspaceName(),readAuthLang()]);
 const t=AUTH_COPY[lang];
 return <QuietAuthShell helpFrom="reset" lang={lang} t={t} back="/login"><AccountRecovery mobileAccess={mobileAccessEnabled()} kind="reset" lang={lang}/></QuietAuthShell>;
}

export const generateMetadata=()=>mobileAccessMetadata("reset");
