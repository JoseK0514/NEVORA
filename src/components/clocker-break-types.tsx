'use client';

import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { CoffeeIcon } from '@phosphor-icons/react/dist/ssr/Coffee';
import { ForkKnifeIcon } from '@phosphor-icons/react/dist/ssr/ForkKnife';
import { TimerIcon } from '@phosphor-icons/react/dist/ssr/Timer';
import { PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { ArchiveIcon } from '@phosphor-icons/react/dist/ssr/Archive';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { InfoIcon } from '@phosphor-icons/react/dist/ssr/Info';
import { XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { ActionMenu } from './action-menu';
import { SelectField } from './select-field';
import { StatusPill } from './status-pill';
import { breakCategories, type BreakType } from '../lib/clocker/break-types';
import type { BreakTypeResult } from '../app/app/settings/breaks/actions';
import styles from './clocker-break-types.module.css';

gsap.registerPlugin(useGSAP);
type Selection = { operation: 'CREATE' | 'EDIT' | 'ARCHIVE' | 'REACTIVATE'; type?: BreakType };
type Filter = 'All' | 'Active' | 'Archived';
const categoryIcons = { REST: CoffeeIcon, MEAL: ForkKnifeIcon, OTHER: TimerIcon };

export function ClockerBreakTypes({ initialTypes, action }: {
  initialTypes: BreakType[];
  action(data: FormData): Promise<BreakTypeResult>;
}) {
  const [types, setTypes] = useState(initialTypes);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [filter, setFilter] = useState<Filter>('All');
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; refresh: boolean } | null>(null);
  const [notice, setNotice] = useState('');
  const container = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const errorMessage = useRef<HTMLParagraphElement>(null);
  const filterTrigger = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const busy = useRef(false);

  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo('[data-break-entrance]', { y: 8 }, {
        y: 0, duration: .35, stagger: .045, ease: 'power2.out', clearProps: 'transform',
      });
    });
    return () => media.revert();
  }, { scope: container });

  useEffect(() => {
    if (!selection) return;
    const element = dialog.current;
    const fallbackTrigger = filterTrigger.current;
    const previous = document.body.style.overflow;
    element?.showModal();
    element?.querySelector<HTMLInputElement>('input[name="name"]')?.focus({ preventScroll: true });
    document.body.style.overflow = 'hidden';
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(element, { y: 12 }, { y: 0, duration: .25, ease: 'power2.out', clearProps: 'transform' });
    });
    return () => {
      media.revert();
      if (element?.open) element.close();
      document.body.style.overflow = previous;
      const target = trigger.current;
      (target?.isConnected ? target : fallbackTrigger)?.focus({ preventScroll: true });
    };
  }, [selection]);

  useEffect(() => { if (error) errorMessage.current?.focus(); }, [error]);

  function open(next: Selection, event: MouseEvent<HTMLButtonElement>) {
    trigger.current = event.currentTarget.closest('[data-break-type]')?.querySelector<HTMLElement>('[popovertarget]') ?? event.currentTarget;
    const popover = event.currentTarget.closest<HTMLElement>('[popover]');
    if (popover?.matches(':popover-open')) popover.hidePopover();
    setError(null);
    setSelection(next);
  }

  function close() {
    if (busy.current) return;
    dialog.current?.close();
    setSelection(null);
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || !selection) return;
    const data = new FormData(event.currentTarget);
    const existing = selection.type;
    data.set('id', existing?.id ?? '');
    data.set('expectedVersion', String(existing?.version ?? 0));
    if (selection.operation === 'ARCHIVE' || selection.operation === 'REACTIVATE') {
      data.set('name', existing!.name);
      data.set('category', existing!.category);
      data.set('targetMinutes', existing!.targetMinutes === null ? '' : String(existing!.targetMinutes));
    }
    data.set('active', String(selection.operation === 'ARCHIVE' ? false : selection.operation === 'REACTIVATE' ? true : existing?.active ?? true));
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await action(data);
      if (!result.ok) { setError({ message: result.error, refresh: result.refresh }); return; }
      setTypes(current => current.some(type => type.id === result.breakType.id)
        ? current.map(type => type.id === result.breakType.id ? result.breakType : type)
        : [...current, result.breakType]);
      setNotice(selection.operation === 'ARCHIVE' ? 'Break type archived. Existing records stay unchanged.'
        : selection.operation === 'REACTIVATE' ? 'Break type reactivated.'
          : existing ? 'Break settings saved. Previous breaks keep their recorded settings.' : 'Break type created.');
      busy.current = false;
      close();
    } catch {
      setError({ message: 'The update could not be confirmed. Reload Break Types before trying again.', refresh: true });
    } finally { busy.current = false; setPending(false); }
  }

  const activeCount = types.filter(type => type.active).length;
  const counts = { All: types.length, Active: activeCount, Archived: types.length - activeCount };
  const search = query.trim().toLocaleLowerCase();
  const visibleTypes = types.filter(type =>
    (filter === 'All' || type.active === (filter === 'Active')) &&
    (!search || type.name.toLocaleLowerCase().includes(search) || type.category.toLowerCase().includes(search)));
  const editing = selection?.operation === 'CREATE' || selection?.operation === 'EDIT';
  const title = selection?.operation === 'CREATE' ? 'Add Break Type' : selection?.operation === 'EDIT' ? 'Edit Break Type'
    : selection?.operation === 'ARCHIVE' ? 'Archive Break Type?' : 'Reactivate Break Type?';
  const saveLabel = selection?.operation === 'CREATE' ? 'Create Break Type' : selection?.operation === 'EDIT' ? 'Save Changes'
    : selection?.operation === 'ARCHIVE' ? 'Archive Break Type' : 'Reactivate Break Type';

  return <div ref={container} className={styles.manager}>
    <div className={styles.toolbar} data-break-entrance>
      <div><h2>Your break types</h2><p>Choose what employees can start at the Clocker.</p></div>
      <div className={styles.actions}>
        <button className="button secondary" type="button" onClick={() => window.location.reload()}>
          <ArrowClockwiseIcon size={18} aria-hidden="true" />Reload Break Types
        </button>
        <button className="button primary" type="button" onClick={event => open({ operation: 'CREATE' }, event)}>
          <PlusIcon size={18} aria-hidden="true" />Add Break Type
        </button>
      </div>
    </div>
    {notice ? <div className={styles.notice} role="status"><CheckCircleIcon size={20} aria-hidden="true" /><p>{notice}</p></div> : null}
    <section className={styles.catalog} aria-label="Configured break types" data-break-entrance>
      <div className={styles.listTools}>
        <div className={styles.filters} role="group" aria-label="Filter break types">
          {(['All', 'Active', 'Archived'] as const).map(item => <button key={item} ref={item === filter ? filterTrigger : undefined}
            type="button" aria-pressed={filter === item} onClick={() => setFilter(item)}>
            {item}<span>{counts[item]}</span>
          </button>)}
        </div>
        <label className={styles.search}><MagnifyingGlassIcon size={19} aria-hidden="true" />
          <span className={styles.srOnly}>Search break types</span>
          <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search break types" />
        </label>
      </div>
      <div className={styles.columnLabels} aria-hidden="true"><span>Break type</span><span>Classification</span><span>Reference time</span><span>Availability</span><span /></div>
      {visibleTypes.length ? <div className={styles.rows}>{visibleTypes.map(type => {
        const Icon = categoryIcons[type.category];
        return <article key={type.id} data-break-type={type.id} className={styles.row}>
          <div className={styles.name}><span className={styles.categoryIcon}><Icon size={24} weight="regular" aria-hidden="true" /></span><h3>{type.name}</h3></div>
          <span className={styles.classification}><span className={styles.mobileLabel}>Classification</span>{breakCategories.find(category => category.value === type.category)?.label}</span>
          <span className={styles.duration}><span className={styles.mobileLabel}>Reference time</span>{type.targetMinutes === null ? 'No reference duration' : <><strong>{type.targetMinutes}</strong> min</>}</span>
          <div className={styles.availability}><StatusPill tone={type.active ? 'success' : 'neutral'}>{type.active ? 'Active' : 'Archived'}</StatusPill></div>
          <div className={styles.rowActions}><ActionMenu id={'break-' + type.id} label="Manage" ariaLabel={'Manage ' + type.name}>
            <button type="button" className="nevora-action-menu-item" onClick={event => open({ operation: 'EDIT', type }, event)}><PencilSimpleIcon size={18} aria-hidden="true" />Edit</button>
            <button type="button" className="nevora-action-menu-item" onClick={event => open({ operation: type.active ? 'ARCHIVE' : 'REACTIVATE', type }, event)}>
              {type.active ? <ArchiveIcon size={18} aria-hidden="true" /> : <ArrowClockwiseIcon size={18} aria-hidden="true" />}{type.active ? 'Archive' : 'Reactivate'}
            </button>
          </ActionMenu></div>
        </article>;
      })}</div> : <div className={styles.empty}>
        <span className={styles.emptyIcon}><CoffeeIcon size={32} weight="duotone" aria-hidden="true" /></span>
        <h3>{types.length ? 'No matching break types' : 'No break types yet'}</h3>
        <p>{types.length ? 'Try another name or view all your break types.' : 'Add the break options your team uses. Each type has a name, classification and optional reference time.'}</p>
        {types.length ? <button className="button secondary" type="button" onClick={() => { setFilter('All'); setQuery(''); }}>Clear filters</button>
          : <button className="button secondary" type="button" onClick={event => open({ operation: 'CREATE' }, event)}><PlusIcon size={18} aria-hidden="true" />Add your first break type</button>}
      </div>}
      <div className={styles.listFooter}><span role="status">{visibleTypes.length} of {types.length} break {types.length === 1 ? 'type' : 'types'}</span><span>Changes apply to future breaks.</span></div>
    </section>
    <details className={styles.explanation} data-break-entrance>
      <summary><InfoIcon size={21} aria-hidden="true" /><span><strong>How break settings work</strong><small>Reference time is a guide, never an automatic stop.</small></span><CaretDownIcon size={18} aria-hidden="true" /></summary>
      <div><p>Reference minutes are informational. They never end a break automatically or deduct worked time.</p><p>Each break keeps the name and settings used when it began. Archiving removes a type from new break options; breaks already in progress can still end.</p></div>
    </details>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="break-editor-title" aria-describedby="break-editor-description" onCancel={event => { event.preventDefault(); close(); }}>
      {selection ? <form key={selection.operation + '-' + (selection.type?.id ?? 'new')} onSubmit={submit} aria-busy={pending}>
        <div className={styles.dialogHeading}><div><h2 id="break-editor-title">{title}</h2><p id="break-editor-description">{editing ? 'Changes apply to future breaks only.' : selection.operation === 'ARCHIVE' ? 'Remove this option from new breaks.' : 'Make this option available for new breaks again.'}</p></div>
          <button type="button" className={styles.close} aria-label="Close break editor" disabled={pending} onClick={close}><XIcon size={21} aria-hidden="true" /></button>
        </div>
        <fieldset className={styles.fields} disabled={pending || Boolean(error?.refresh)}>
          {editing ? <>
            <label className={styles.field}>Break name<input name="name" defaultValue={selection.type?.name ?? ''} required maxLength={80} autoComplete="off" autoFocus placeholder="e.g. Afternoon break" /></label>
            <SelectField name="category" label="Classification" required defaultValue={selection.type?.category ?? ''} options={[{ value: '', label: 'Choose a classification', disabled: true }, ...breakCategories]} />
            <label className={styles.field}><span>Reference minutes <span className={styles.optional} aria-hidden="true">Optional</span></span><span className={styles.inputUnit}><input name="targetMinutes" type="text" inputMode="numeric" pattern="[0-9]+" maxLength={4} defaultValue={selection.type?.targetMinutes ?? ''} aria-label="Reference minutes" aria-describedby="break-duration-help" placeholder="e.g. 15" /><span aria-hidden="true">min</span></span></label>
            <p id="break-duration-help" className={styles.hint}>1–1,440 minutes. Leave blank for no reference duration. This does not stop a break automatically.</p>
          </> : <div className={styles.confirmation}><span className={styles.categoryIcon}>{selection.operation === 'ARCHIVE' ? <ArchiveIcon size={24} aria-hidden="true" /> : <ArrowClockwiseIcon size={24} aria-hidden="true" />}</span><div><strong>{selection.type?.name}</strong><p>{selection.operation === 'ARCHIVE' ? 'Breaks already in progress can still end. Recorded settings stay unchanged.' : 'Previous records stay unchanged.'}</p></div></div>}
        </fieldset>
        {error ? <p ref={errorMessage} role="alert" tabIndex={-1} className={styles.error}>{error.message}</p> : null}
        {pending ? <p role="status" className={styles.pending}>Saving your changes…</p> : null}
        <div className={styles.dialogFooter}>
          <button className="button secondary" type="button" disabled={pending} onClick={close}>Cancel</button>
          {error?.refresh ? <button type="button" className="button primary" onClick={() => window.location.reload()}><ArrowClockwiseIcon size={18} aria-hidden="true" />Reload Break Types</button>
            : <button className={'button primary' + (selection.operation === 'ARCHIVE' ? ' ' + styles.archiveButton : '')} type="submit" disabled={pending}>{pending ? 'Saving…' : saveLabel}</button>}
        </div>
      </form> : null}
    </dialog>
  </div>;
}
