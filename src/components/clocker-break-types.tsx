'use client';

import { FormDiscardGuard } from './kit/discard-dialog';
import { leaveWithDiscardGuard } from './kit/use-discard-guard';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArchiveIcon } from '@phosphor-icons/react/dist/ssr/Archive';
import { ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { toast } from './toaster';
import { CorpCard, CorpEmpty, CorpEmptyRow, CorpRow, CorpRows } from './corp/corp';
import { breakCategories, type BreakType } from '../lib/clocker/break-types';
import type { BreakTypeResult } from '../app/app/settings/breaks/actions';
import { FieldB, ResultB } from '../app/app/settings/settings-b-form';
import { FieldErrors, lockPageScroll, useFieldErrors } from '../app/app/settings/wave-c-form';

type Selection = { operation: 'CREATE' | 'EDIT' | 'ARCHIVE' | 'REACTIVATE'; type?: BreakType };

const categoryLabel = (value: BreakType['category']) => breakCategories.find(category => category.value === value)?.label ?? 'Other';

/** J9 Break types in Direction B (Nov 23, 2026). The editor's root is a fragment, so its cards are direct children of the
 * Settings page (SettingsPageB): an Active card (a row per break: name, reference time, kind; the "Add break type" row;
 * the card's one note), then an Archived card when there are any. A row opens one dialog (a sheet on phones) for Edit,
 * Archive and Reactivate. The action takes exactly the fields the server expects; every sentence is the approved one. */
export function ClockerBreakTypes({ initialTypes, action }: {
  initialTypes: BreakType[];
  action(data: FormData): Promise<BreakTypeResult>;
}) {
  const [types, setTypes] = useState(initialTypes);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; refresh: boolean } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const errorMessage = useRef<HTMLDivElement>(null);
  const trigger = useRef<string | null>(null);
  const busy = useRef(false);
  const { errors, handlers, clear } = useFieldErrors({
    name: { missing: 'Enter a break name' },
    category: { missing: 'Choose a classification' },
    targetMinutes: { pattern: 'Enter whole minutes, from 1 to 1,440', length: 'Enter whole minutes, from 1 to 1,440' },
  });

  useEffect(() => {
    if (!selection) return;
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    // A destructive confirm starts on Cancel; other dialogs start on their first field or action.
    (element?.querySelector<HTMLElement>('[data-autofocus]') ?? element?.querySelector<HTMLElement>('input[name="name"], button[type="submit"]'))?.focus({ preventScroll: true });
    const unlock = lockPageScroll();
    return () => {
      if (element?.open) element.close();
      unlock();
    };
  }, [selection]);

  useEffect(() => { if (error) errorMessage.current?.focus(); }, [error]);

  function open(next: Selection, triggerId: string) {
    trigger.current = triggerId;
    setError(null);
    clear();
    setSelection(next);
  }

  function close() {
    if (busy.current) return;
    dialog.current?.close();
    setSelection(null);
    setError(null);
    const target = trigger.current ? document.getElementById(trigger.current) : null;
    (target ?? document.getElementById('break-add'))?.focus({ preventScroll: true });
  }

  // Closing the editor with typed changes that are not saved asks first (Nov 21, 2026); a save closes it directly.
  const askClose = () => leaveWithDiscardGuard(close);

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
          : existing ? 'Break settings saved. They apply to new breaks.' : 'Break type created.');
      busy.current = false;
      close();
    } catch {
      setError({ message: 'It may not have saved. Reload break types before you try again.', refresh: true });
    } finally { busy.current = false; setPending(false); }
  }

  const activeCount = types.filter(type => type.active).length;
  const editing = selection?.operation === 'CREATE' || selection?.operation === 'EDIT';
  const title = selection?.operation === 'CREATE' ? 'Add break type' : selection?.operation === 'EDIT' ? 'Edit break type'
    : selection?.operation === 'ARCHIVE' ? 'Archive this break type?' : 'Reactivate this break type?';
  const saveLabel = selection?.operation === 'CREATE' ? 'Create break type' : selection?.operation === 'EDIT' ? 'Save changes'
    : selection?.operation === 'ARCHIVE' ? 'Archive break type' : 'Reactivate break type';

  const row = (type: BreakType) => <li key={type.id}>
    <CorpRow id={`break-type-${type.id}`} title={type.name} detail={type.targetMinutes === null ? undefined : `${type.targetMinutes}\u00a0min`}
      value={categoryLabel(type.category)} onClick={() => open({ operation: 'EDIT', type }, `break-type-${type.id}`)} />
  </li>;
  const archived = types.filter(type => !type.active);
  return <>
    <p className="c-sr" role="status">Showing {activeCount} of {types.length} {types.length === 1 ? 'break type' : 'break types'}</p>
    {types.length ? <CorpCard id="break-types-active" label="Active" count={activeCount}>
      <CorpRows label="Configured break types">
        {types.filter(type => type.active).map(row)}
        {!activeCount ? <CorpEmptyRow as="li">No active break types</CorpEmptyRow> : null}
        <li><CorpRow id="break-add" title="Add break type" icon={<PlusIcon weight="bold" />} one chevron={false} onClick={() => open({ operation: 'CREATE' }, 'break-add')} /></li>
      </CorpRows>
      <p className="c-setb-cardnote">Changes apply to new breaks only.</p>
    </CorpCard> : <CorpEmpty title="No break types yet" body="Add the breaks your team takes, like a 30-minute meal."
      action={<button id="break-add" type="button" className="c-btn" onClick={() => open({ operation: 'CREATE' }, 'break-add')}>Add break type</button>} />}
    {archived.length ? <CorpCard id="break-types-archived" label="Archived" count={archived.length}>
      <CorpRows label="Archived break types">{archived.map(row)}</CorpRows>
    </CorpCard> : null}
    {/* The dialog is not a child of the page itself, so the page's card rules (full width, the gap between cards) never
      reach it; display: contents gives its holder no box. */}
    <div style={{ display: 'contents' }}><dialog ref={dialog} className="c-setb-dlg wc-dialog" aria-labelledby="break-editor-title" aria-describedby="break-editor-description" onCancel={event => { event.preventDefault(); askClose(); }}>
      {selection ? <form noValidate key={selection.operation + '-' + (selection.type?.id ?? 'new')} onSubmit={submit} aria-busy={pending} {...handlers}>
        <FormDiscardGuard />
        <div className="c-setb-dlg__head">
          <div><h2 className="c-setb-dlg__title" id="break-editor-title">{title}</h2>
            <p className="c-setb-dlg__text" id="break-editor-description">{selection.operation === 'CREATE' ? 'It’s offered for new breaks as soon as you create it.' : editing ? 'Changes apply to future breaks only.' : selection.operation === 'ARCHIVE' ? 'It won’t be offered for new breaks.' : 'It will be offered for new breaks again.'}</p></div>
          <button type="button" className="c-setb-dlg__close" aria-label="Close break editor" disabled={pending} onClick={askClose}><XIcon weight="bold" aria-hidden="true" /></button>
        </div>
        <div className="c-setb-dlg__body">
          <fieldset className="c-setb-fieldset" disabled={pending || Boolean(error?.refresh)}>
            {editing ? <FieldErrors errors={errors}>
              <FieldB label="Break name" id="break-name" name="name" defaultValue={selection.type?.name ?? ''} required maxLength={80} autoComplete="off" placeholder="e.g. Afternoon break" />
              <FieldB kind="select" label="Classification" id="break-category" name="category" required defaultValue={selection.type?.category ?? ''}>
                <option value="" disabled>Choose a classification</option>
                {breakCategories.map(category => <option key={category.value} value={category.value}>{category.label}</option>)}
              </FieldB>
              <FieldB label="Reference time" optional unit="min" helpId="break-duration-help"
                help="1 to 1,440 minutes. Leave blank for no reference time. It never stops a break on its own."
                id="break-minutes" name="targetMinutes" type="text" inputMode="numeric" pattern="(?:[1-9][0-9]{0,2}|1[0-3][0-9]{2}|14[0-3][0-9]|1440)" maxLength={4}
                defaultValue={selection.type?.targetMinutes ?? ''} placeholder="e.g. 15" />
            </FieldErrors> : <>
              <ul className="c-rows"><li><CorpRow title={selection.type?.name} one
                icon={selection.operation === 'ARCHIVE' ? <ArchiveIcon weight="bold" /> : <ArrowClockwiseIcon weight="bold" />} /></li></ul>
              <p className="c-setb-dlg__text">{selection.operation === 'ARCHIVE' ? 'Breaks already in progress can still end. Recorded settings stay unchanged.' : 'Earlier records stay unchanged.'}</p>
            </>}
          </fieldset>
        </div>
        {error ? <ResultB innerRef={errorMessage} tone="urgent" title={error.message.startsWith('It may not have saved') ? 'Not saved yet' : 'Not saved'}>{error.message}</ResultB> : null}
        <p role="status" className="c-sr">{pending ? 'Saving your changes…' : ''}</p>
        <div className="c-setb-dlg__acts">
          {selection.operation === 'EDIT' && selection.type ? <button className="c-btn c-btn--secondary c-setb-dlg__danger" type="button" disabled={pending}
            onClick={() => { clear(); setError(null); setSelection({ operation: selection.type!.active ? 'ARCHIVE' : 'REACTIVATE', type: selection.type }); }}>{selection.type.active ? 'Archive break type' : 'Reactivate break type'}</button> : null}
          <button className="c-btn c-btn--secondary" type="button" disabled={pending} onClick={askClose} data-autofocus={selection.operation === 'ARCHIVE' ? '' : undefined}>Cancel</button>
          {error?.refresh ? <button type="button" className="c-btn" onClick={() => window.location.reload()}>Reload</button>
            : <button className={selection.operation === 'ARCHIVE' ? 'c-btn c-btn--danger' : 'c-btn'} type="submit" disabled={pending}>{pending ? 'Saving…' : saveLabel}</button>}
        </div>
      </form> : null}
    </dialog></div>
  </>;
}
