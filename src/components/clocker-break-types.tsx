'use client';

import ownerStyles from './clocker-owner.module.css';
import {ClockerOwnerNav} from './clocker-owner-nav';
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
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { Status } from './kit/kit';
import { toast } from './toaster';
import { breakCategories, type BreakType } from '../lib/clocker/break-types';
import type { BreakTypeResult } from '../app/app/settings/breaks/actions';
import { EmptyState, Notice, SettingsFrame } from '../app/app/settings/wave-c-kit';
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
  // Quiet (v4): open on Archived when nothing is active, so archived breaks aren't hidden behind an empty tab.
  const [filter, setFilter] = useState<Filter>(() => initialTypes.some(type => type.active) || !initialTypes.length ? 'Active' : 'Archived');
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
    (element?.querySelector<HTMLElement>('[data-autofocus]') ?? element?.querySelector<HTMLElement>('input[name="name"], button[type="submit"]'))?.focus({ preventScroll: true });
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
      setError({ message: 'It may not have saved. Reload break types before you try again.', refresh: true });
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

  // Quiet (v4, approved Oct 23): Active and Archived, one row per break (name, kind, reference time). A row opens its editor.
  return <SettingsFrame className={ownerStyles.owner} title="Break types"
    bandAside={<button ref={addButton} type="button" className="q-nav__r q-nav__r--ink" aria-label="Add break type" onClick={event => open({ operation: 'CREATE' }, event)}><PlusIcon className="q-ic" aria-hidden="true" /></button>}>
    <ClockerOwnerNav current="breaks"/>
    {types.length ? <div className="q-seg" role="group" aria-label="Filter break types">
      {(['Active', 'Archived'] as const).map(item => <button key={item} type="button" aria-pressed={filter === item} aria-label={`${item}, ${counts[item]}`} onClick={() => setFilter(item)}>
        {item === 'Active' ? `Active · ${counts.Active}` : 'Archived'}</button>)}
    </div> : null}
    <p className="q-sr" role="status">Showing {visibleTypes.length} of {types.length} {types.length === 1 ? 'break type' : 'break types'}</p>
    {visibleTypes.length ? <ul className="q-list" aria-label="Configured break types" style={{ marginTop: 16 }}>{visibleTypes.map(type => <li key={type.id}>
      <button type="button" className="q-row" data-break-type={type.id} aria-label={`Edit ${type.name}`} onClick={event => open({ operation: 'EDIT', type }, event)}>
        <span className="q-rt"><b>{type.name}</b><i>{categoryLabel(type.category)}{type.active ? '' : ' · Archived'}</i></span>
        {type.targetMinutes === null ? null : <span className="q-rv q-rv--l">{`${type.targetMinutes}\u00a0min`}</span>}
        <CaretRightIcon className="q-chev" aria-hidden="true" />
      </button>
    </li>)}</ul> : <EmptyState headingLevel={3} icon={null} title={types.length ? (filter === 'Archived' ? 'No archived break types' : 'No active break types') : 'No break types yet'}
      action={types.length ? null : <button className="q-btn" type="button" onClick={event => open({ operation: 'CREATE' }, event)}>Add break type</button>}>
      {types.length ? '' : 'Add the breaks your team takes.'}
    </EmptyState>}
    <dialog ref={dialog} className="wc-dialog" aria-labelledby="break-editor-title" aria-describedby="break-editor-description" onCancel={event => { event.preventDefault(); close(); }}>
      {selection ? <form noValidate key={selection.operation + '-' + (selection.type?.id ?? 'new')} onSubmit={submit} aria-busy={pending} className="wc-dialog__form" {...handlers}>
        <div className="wc-dialog__head">
          <div><h2 className="wc-dialog__title" id="break-editor-title">{title}</h2>
            <p className="wc-dialog__text" id="break-editor-description">{selection.operation === 'CREATE' ? 'It’s offered for new breaks as soon as you create it.' : editing ? 'Changes apply to future breaks only.' : selection.operation === 'ARCHIVE' ? 'It won’t be offered for new breaks.' : 'It will be offered for new breaks again.'}</p></div>
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
        {error ? <div ref={errorMessage} role="alert" tabIndex={-1} className="wc-feedback"><Notice tone="urgent" title={error.message.startsWith('It may not have saved') ? 'Not saved yet' : 'Not saved'}>{error.message}</Notice></div> : null}
        <p role="status" className="nv-sr">{pending ? 'Saving your changes…' : ''}</p>
        <FormActions>
          {error?.refresh ? <button type="button" className="q-btn" onClick={() => window.location.reload()}>Reload</button>
            : <button className={selection.operation === 'ARCHIVE' ? 'q-btn q-btn--danger' : 'q-btn'} type="submit" disabled={pending}><ButtonLabel pending={pending} idle={saveLabel} busy="Saving…" /></button>}
          {selection.operation === 'EDIT' && selection.type ? <button className="q-btn q-btn--danger" type="button" disabled={pending}
            onClick={() => { clear(); setError(null); setSelection({ operation: selection.type!.active ? 'ARCHIVE' : 'REACTIVATE', type: selection.type }); }}>{selection.type.active ? 'Archive break type' : 'Reactivate break type'}</button> : null}
          <button className="q-btn q-btn--sec" type="button" disabled={pending} onClick={close} data-autofocus={selection.operation === 'ARCHIVE' ? '' : undefined}>Cancel</button>
        </FormActions>
      </form> : null}
    </dialog>
  </SettingsFrame>;
}
