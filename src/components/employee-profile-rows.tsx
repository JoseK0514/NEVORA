'use client';

import {useState} from 'react';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {QuietSheet, SheetCancel} from './quiet/quiet-sheet';
import {switchTo} from './auth-premium/lang-switch';
import {setThemeChoice, useThemeChoice} from './theme-switch';
import type {AuthLang} from '@/lib/auth-copy';
import {usePortalLang} from '@/lib/i18n/portal-lang';
import {employeeTeamCopy} from './employee-team-copy';

/* v5 Profile (mockup E16): Language and Appearance as rows with their value; each opens its choices as a sheet. The
 * choices are the same as before: Language sets the sign-in language cookie and reloads; Appearance is this device's
 * System / Light / Dark. */

function ChoiceSheetRow<T extends string>({title, value, options, current, onPick, note, done}: {done: string; title: string; value: string; options: readonly (readonly [T, string])[]; current: T; onPick: (value: T) => void; note?: string}) {
  const [open, setOpen] = useState(false);
  return <li>
    <button type="button" className="q-row q-row--one q-row--btn" aria-haspopup="dialog" onClick={() => setOpen(true)}>
      <span className="q-rt"><b>{title}</b></span><span className="q-rv q-rv--l">{value}</span><CaretRightIcon weight="bold" className="q-chev" aria-hidden="true"/>
    </button>
    <QuietSheet open={open} label={title} onClose={() => setOpen(false)}>
      <div className="q-nav"><span/><span className="q-nav__t">{title}</span><SheetCancel href="/app/profile" className="q-nav__r q-nav__r--b">{done}</SheetCancel></div>
      <fieldset className="q-fieldset">
        <legend className="nv-sr">{title}</legend>
        <ul className="q-list" style={{marginTop: 16}}>
          {options.map(([option, label]) => <li key={option}><label className="q-row q-row--one q-row--pick">
            <span className="q-rt"><b>{label}</b></span>
            <input className="q-pick" type="radio" name={`profile-${title}`} value={option} checked={current === option} onChange={() => onPick(option)}/>
            <span className="q-radio" aria-hidden="true"/>
          </label></li>)}
        </ul>
      </fieldset>
      {note ? <p className="q-help">{note}</p> : null}
    </QuietSheet>
  </li>;
}

export function ProfileSettingRows({lang}: {lang: AuthLang}) {
  const theme = useThemeChoice();
  const t = employeeTeamCopy(usePortalLang());
  return <>
    <ChoiceSheetRow done={t.done} title={t.language} value={lang === 'es' ? 'Español' : 'English'} current={lang} options={[['en', 'English'], ['es', 'Español']] as const}
      onPick={next => { if (next !== lang) switchTo(next); }} note={t.languageNote}/>
    <ChoiceSheetRow done={t.done} title={t.appearance} value={t.theme[theme]} current={theme} options={[['system', t.theme.system], ['light', t.theme.light], ['dark', t.theme.dark]] as const}
      onPick={setThemeChoice} note={t.appearanceNote}/>
  </>;
}
