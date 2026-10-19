'use client';

import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { ArchiveIcon } from '@phosphor-icons/react/dist/ssr/Archive';
import { ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { CoffeeIcon } from '@phosphor-icons/react/dist/ssr/Coffee';
import { ForkKnifeIcon } from '@phosphor-icons/react/dist/ssr/ForkKnife';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { TimerIcon } from '@phosphor-icons/react/dist/ssr/Timer';
import { XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { Status } from './kit/kit';
import { toast } from './toaster';
import { breakCategories, type BreakType } from '../lib/clocker/break-types';
import type { BreakTypeResult } from '../app/app/settings/breaks/actions';
import { EmptyState, GuideCard, Notice, SettingsFrame } from '../app/app/settings/wave-c-kit';
import { ButtonLabel, Field, FieldErrors, FormActions, lockPageScroll, useFieldErrors } from '../app/app/settings/wave-c-form';

type Selection = { operation: 'CREATE' | 'EDIT' | 'ARCHIVE' | 'REACTIVATE'; type?: BreakType };
type Filter = 'All' | 'Active' | 'Archived';
const categoryIcons = { REST: CoffeeIcon, MEAL: ForkKnifeIcon, OTHER: TimerIcon };
const categoryLabel = (value: BreakType['category']) => breakCategories.find(category => category.value === value)?.label ?? 'Other';

/** Wave C: Break types on the kit. Rows say what each break is; Edit and Archive open one dialog
 * (a bottom sheet on phones). The action takes exactly the fields the server expects. */
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
  const dialog = useRef<HTMLDialogElement>(null);
  const errorMessage = useRef<HTMLDivElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const busy = useRef(false);
  const { errors, handlers, clear } = useFieldErrors({
    name: { missing: 'Enter a break name.' },
    category: { missing: 'Choose a classification.' },
    targetMinutes: { pattern: 'Enter whole minutes, from 1 to 1,440.', length: 'Enter whole minutes, from 1 to 1,440.' },
  });

  useEffect(() => {
    if (!selection) return;
    const element = dialog.current;
    const fallback = addButton.current;
    element?.showModal();
    // A destructive confirm starts on Cancel; other dialogs start on their first field or action.
    element?.querySelector<HTMLElement>('input[name="name"], [data-autofocus], button[type="submit"]')?.focus({ preventScroll: true });
    const unlock = lockPageScroll();
    return () => {
      if (element?.open) element.close();
      unlock();
      const target = trigger.current;
      (target?.isConnected ? target : fallback)?.focus({ preventScroll: true });
    };
  }, [selection]);

  useEffect(() => { if (error) errorMessage.current?.focus(); }, [error]);

  function open(next: Selection, event: MouseEvent<HTMLButtonElement>) {
    trigger.current = event.currentTarget;
    setError(null);
    clear();
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
    if (!event.currentTarget.checkValidity()) return;
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
      toast(selection.operation === 'ARCHIVE' ? 'Break type archived. Existing records stay unchanged.'
        : selection.operation === 'REACTIVATE' ? 'Break type reactivated.'
          : existing ? 'Break settings saved. Earlier breaks keep their recorded settings.' : 'Break type created.');
      busy.current = false;
      close();
    } catch {
      setError({ message: 'The update could not be confirmed. Reload break types before trying again.', refresh: true });
    } finally { busy.current = false; setPending(false); }
  }

  const activeCount = types.filter(type => type.active).length;
  const counts = { All: types.length, Active: activeCount, Archived: types.length - activeCount };
  const search = query.trim().toLocaleLowerCase();
  const visibleTypes = types.filter(type =>
    (filter === 'All' || type.active === (filter === 'Active')) &&
    (!search || type.name.toLocaleLowerCase().includes(search) || type.category.toLowerCase().includes(search)));
  const editing = selection?.operation === 'CREATE' || selection?.operation === 'EDIT';
  const title = selection?.operation === 'CREATE' ? 'Add break type' : selection?.operation === 'EDIT' ? 'Edit break type'
    : selection?.operation === 'ARCHIVE' ? 'Archive this break type?' : 'Reactivate this break type?';
  const saveLabel = selection?.operation === 'CREATE' ? 'Create break type' : selection?.operation === 'EDIT' ? 'Save changes'
    : selection?.operation === 'ARCHIVE' ? 'Archive break type' : 'Reactivate break type';

  return <SettingsFrame title="Break types" eyebrow={`${types.length} ${types.length === 1 ? 'break type' : 'break types'} · ${activeCount} active`}
    summary="The breaks your team can start at the Clocker."
    bandAside={<button ref={addButton} type="button" className="nv-band-control" onClick={event => open({ operation: 'CREATE' }, event)}><PlusIcon size={18} weight="bold" aria-hidden="true" />Add break type</button>}
    aside={<GuideCard title="How break settings work">
      <p>A reference time is a guide. It never ends a break on its own or takes time off what was worked.</p>
      <p>Each break keeps the name and settings it started with. Archiving removes a type from new breaks; breaks already in progress can still end.</p>
    </GuideCard>}>
    {types.length ? <section className="nv-card" aria-labelledby="break-find-title">
      <div className="nv-card__head"><h2 className="nv-card__title" id="break-find-title">Find break types</h2></div>
      <div className="wc-find">
        <label className="nv-sr" htmlFor="break-search">Search break types</label>
        <span className="wc-search"><MagnifyingGlassIcon size={20} aria-hidden="true" />
          <input id="break-search" className="wc-control" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search break types" autoComplete="off" />
        </span>
        <div className="wc-pills" role="group" aria-label="Filter break types">
          {(['All', 'Active', 'Archived'] as const).map(item => <button key={item} type="button" className="nv-filter" aria-pressed={filter === item}
            aria-label={`${item}, ${counts[item]}`} onClick={() => setFilter(item)}>{item} <span className="wc-count" aria-hidden="true">{counts[item]}</span></button>)}
        </div>
      </div>
    </section> : null}
    <section className="nv-card" aria-label="Configured break types">
      <div className="nv-card__head">
        <h2 className="nv-card__title">Your break types</h2>
        <span className="nv-card__meta" role="status">Showing {visibleTypes.length} of {types.length} {types.length === 1 ? 'break type' : 'break types'}</span>
      </div>
      {visibleTypes.length ? <ul className="nv-rows">{visibleTypes.map(type => {
        const Icon = categoryIcons[type.category];
        return <li key={type.id}>
          <div className="nv-row wc-action-row" data-leading="true" data-break-type={type.id}>
            <span className="nv-tile" data-tone={type.active ? 'accent' : 'neutral'} aria-hidden="true"><Icon size={22} /></span>
            <span className="nv-row__text">
              <span className="nv-row__title">{type.name}</span>
              <span className="nv-row__meta"><span className="nv-keep">{categoryLabel(type.category)}&nbsp;·</span> <span className="nv-keep">{type.targetMinutes === null ? 'No reference time' : `Reference time ${type.targetMinutes}\u00a0min`}</span></span>
              {type.active ? null : <span className="nv-row__status"><Status tone="neutral">Archived</Status></span>}
              <span className="wc-row-actions">
                <button type="button" className="nv-link" aria-label={`Edit ${type.name}`} onClick={event => open({ operation: 'EDIT', type }, event)}><PencilSimpleIcon size={18} aria-hidden="true" />Edit</button>
                <button type="button" className="nv-link" aria-label={`${type.active ? 'Archive' : 'Reactivate'} ${type.name}`} onClick={event => open({ operation: type.active ? 'ARCHIVE' : 'REACTIVATE', type }, event)}>
                  {type.active ? <ArchiveIcon size={18} aria-hidden="true" /> : <ArrowClockwiseIcon size={18} aria-hidden="true" />}{type.active ? 'Archive' : 'Reactivate'}
                </button>
              </span>
            </span>
          </div>
        </li>;
      })}</ul> : <EmptyState headingLevel={3} icon={<CoffeeIcon size={22} weight="bold" />} title={types.length ? 'No matching break types' : 'No break types yet'}
        action={types.length ? <button className="nv-btn" data-kind="secondary" type="button" onClick={() => { setFilter('All'); setQuery(''); document.getElementById('break-search')?.focus(); }}><XIcon size={18} aria-hidden="true" />Clear filters</button>
          : <button className="nv-btn" data-kind="primary" type="button" onClick={event => open({ operation: 'CREATE' }, event)}><PlusIcon size={18} aria-hidden="true" />Add your first break type</button>}>
        {types.length ? 'Try another name, or view all your break types.' : 'Add the breaks your team takes. Each has a name, a classification and an optional reference time.'}
      </EmptyState>}
      <p className="nv-card__foot">Changes apply to future breaks.</p>
    </section>
    <dialog ref={dialog} className="wc-dialog" aria-labelledby="break-editor-title" aria-describedby="break-editor-description" onCancel={event => { event.preventDefault(); close(); }}>
      {selection ? <form noValidate key={selection.operation + '-' + (selection.type?.id ?? 'new')} onSubmit={submit} aria-busy={pending} className="wc-dialog__form" {...handlers}>
        <div className="wc-dialog__head">
          <div><h2 className="wc-dialog__title" id="break-editor-title">{title}</h2>
            <p className="wc-dialog__text" id="break-editor-description">{editing ? 'Changes apply to future breaks only.' : selection.operation === 'ARCHIVE' ? 'It won’t be offered for new breaks.' : 'It will be offered for new breaks again.'}</p></div>
          <button type="button" className="wc-dialog__close" aria-label="Close break editor" disabled={pending} onClick={close}><XIcon size={22} aria-hidden="true" /></button>
        </div>
        <fieldset className="wc-fieldset" disabled={pending || Boolean(error?.refresh)}>
          {editing ? <FieldErrors errors={errors}><div className="wc-fields">
            <Field label="Break name" id="break-name" name="name" defaultValue={selection.type?.name ?? ''} required maxLength={80} autoComplete="off" placeholder="e.g. Afternoon break" />
            <Field kind="select" label="Classification" id="break-category" name="category" required defaultValue={selection.type?.category ?? ''}>
              <option value="" disabled>Choose a classification</option>
              {breakCategories.map(category => <option key={category.value} value={category.value}>{category.label}</option>)}
            </Field>
            <Field label="Reference time" optional unit="min" helpId="break-duration-help"
              help="1 to 1,440 minutes. Leave blank for no reference time. It never stops a break on its own."
              id="break-minutes" name="targetMinutes" type="text" inputMode="numeric" pattern="(?:[1-9][0-9]{0,2}|1[0-3][0-9]{2}|14[0-3][0-9]|1440)" maxLength={4}
              defaultValue={selection.type?.targetMinutes ?? ''} placeholder="e.g. 15" />
          </div></FieldErrors> : <div className="wc-fact">
            <span className="wc-fact__icon" aria-hidden="true">{selection.operation === 'ARCHIVE' ? <ArchiveIcon size={20} /> : <ArrowClockwiseIcon size={20} />}</span>
            <div><span className="wc-fact__value">{selection.type?.name}</span>
              <span className="wc-fact__note">{selection.operation === 'ARCHIVE' ? 'Breaks already in progress can still end. Recorded settings stay unchanged.' : 'Earlier records stay unchanged.'}</span></div>
          </div>}
        </fieldset>
        {error ? <div ref={errorMessage} role="alert" tabIndex={-1} className="wc-feedback"><Notice tone="urgent" title="Not saved">{error.message}</Notice></div> : null}
        <p role="status" className="nv-sr">{pending ? 'Saving your changes…' : ''}</p>
        <FormActions>
          {error?.refresh ? <button type="button" className="nv-btn" data-kind="primary" onClick={() => window.location.reload()}><ArrowClockwiseIcon size={18} aria-hidden="true" />Reload break types</button>
            : <button className="nv-btn" data-kind={selection.operation === 'ARCHIVE' ? 'danger' : 'primary'} type="submit" disabled={pending}><ButtonLabel pending={pending} idle={saveLabel} busy="Saving…" /></button>}
          <button className="nv-btn" data-kind="secondary" type="button" disabled={pending} onClick={close} data-autofocus={selection.operation === 'ARCHIVE' ? '' : undefined}>Cancel</button>
        </FormActions>
      </form> : null}
    </dialog>
  </SettingsFrame>;
}
