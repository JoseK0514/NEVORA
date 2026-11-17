import { QuietLegal } from '@/components/brand-legal';
import { readAuthLang } from '@/lib/auth-lang.server';
import { ClockerNotFoundBody } from './not-found-body';
import '../../not-found.css';

/** A tablet whose Clocker link is wrong (an unknown or inactive key). The public 404's band and 560px state card, in the
 * tablet's language (Phase 6, Nov 17, 2026; before: the sign-in language, three VELANI lines and a "Go to sign in" link).
 * The card says who can fix the link and what staff do meanwhile; a shared tablet never offers a personal sign-in.
 * The footer is the one legal line the other public pages use, rendered here for each language (it reads server
 * configuration) and shown by the body in the tablet's language. Other unknown addresses keep the app's own 404. */
export default async function ClockerNotFound() {
  return <ClockerNotFoundBody initialLocale={await readAuthLang()} legal={{ en: <QuietLegal lang="en" />, es: <QuietLegal lang="es" /> }} />;
}
