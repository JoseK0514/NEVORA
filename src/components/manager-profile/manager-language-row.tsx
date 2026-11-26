'use client';

import { profileCopy } from '@/components/employee-mobile/profile-copy';
import { useProfileLanguageChange } from '@/components/employee-mobile/use-profile-language-change';
import type { ProfileLang } from './profile-copy';

/** Jose, Nov 26, 2026: Owners and Managers choose their account language on Profile, as Employees do. The same words,
 * the same English/Español control and the same save (PUT /api/account/language, then the page reloads in it). */
export function ManagerLanguageRow({ lang }: { lang: ProfileLang }) {
  const t = profileCopy[lang];
  const { pick, busy, failed } = useProfileLanguageChange();
  return <li><div className="q-row pmp-language">
    <span className="q-rt"><b id="pmp-language">{t.language}</b><i id="pmp-language-hint" role={failed ? 'status' : undefined}>{failed ? t.languageFailed : t.languageHint}</i></span>
    <div className="c-seg pmp-language__seg" role="group" aria-labelledby="pmp-language" aria-describedby="pmp-language-hint" aria-busy={busy || undefined}>
      {([['en', 'English'], ['es', 'Español']] as const).map(([value, name]) => <button key={value} type="button" lang={value} aria-pressed={lang === value} disabled={busy} onClick={() => { if (value !== lang) void pick(value); }}>{name}</button>)}
    </div>
  </div></li>;
}
