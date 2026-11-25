'use client';
/* The kiosk's name picker (Clocker UI step 3, Option C, Jose's pick Nov 25, 2026): every name as a tile with its
 * initials, alphabetical, a search field only above 12 names, and "Use employee ID" always reachable. On a phone the button
 * sticks to the bottom of the card while the names scroll (Jose, Nov 25); the hint above it stays in the flow, so at 200%
 * text the sticky part is one button, not a third of the screen. Names only, never photos or phone numbers. */
import { useMemo, useState } from 'react';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import styles from './clocker.module.css';
import { CLOCKER_ROSTER_COPY } from './clocker-roster-copy';
import { ROSTER_SEARCH_THRESHOLD, rosterInitials, rosterMatches, rosterSorted, type RosterPerson } from './clocker-roster';
import './clocker-name-picker.css';

export function ClockerNamePicker({ people, lang, disabled, notice, onPick, onUseId, onSearch }: {
  people: RosterPerson[]; lang: 'en' | 'es'; disabled?: boolean; notice?: 'stale' | null;
  onPick: (person: RosterPerson) => void; onUseId: () => void; onSearch?: (query: string) => void;
}) {
  const t = CLOCKER_ROSTER_COPY[lang];
  const [query, setQuery] = useState('');
  const sorted = useMemo(() => rosterSorted(people, lang), [people, lang]);
  const searchable = sorted.length > ROSTER_SEARCH_THRESHOLD;
  const shown = searchable ? rosterMatches(sorted, query) : sorted;
  const none = searchable && query.trim() !== '' && shown.length === 0;
  return <div className="np" data-clocker-names="">
    {notice === 'stale' ? <p className="np-notice" role="status">{t.stale}</p> : null}
    {searchable ? <label className="np-search">
      <span className={styles.sr}>{t.search}</span>
      <MagnifyingGlassIcon size={20} weight="bold" aria-hidden="true" />
      <input type="search" value={query} placeholder={t.search} autoComplete="off" autoCorrect="off" spellCheck={false} enterKeyHint="search"
        disabled={disabled} onChange={event => { setQuery(event.currentTarget.value); onSearch?.(event.currentTarget.value); }} />
    </label> : null}
    <ul className="np-tiles" aria-label={t.names}>
      {shown.map(person => <li key={person.selection}>
        <button type="button" className="np-tile" data-selection={person.selection} disabled={disabled} onClick={() => onPick(person)}>
          <span className="np-initials" aria-hidden="true">{rosterInitials(person.displayName)}</span>
          <span className="np-name">{person.displayName}</span>
        </button>
      </li>)}
    </ul>
    <p className="np-hint" role="status">{none ? t.noMatch : t.notListed}</p>
    <div className="np-foot">
      <button type="button" className={`${styles.btn} np-useid`} data-kind="secondary" disabled={disabled} onClick={onUseId}>{t.useId}</button>
    </div>
  </div>;
}
