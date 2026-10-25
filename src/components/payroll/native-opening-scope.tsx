'use client';
import { useState, type FormEvent } from 'react';
import { WarningCircleIcon } from '@phosphor-icons/react/ssr';
import type { NativeProfilesResponse } from '@/lib/payroll/native/contracts';
import type { usePayrollOperation } from './use-payroll';
import { scopeFromForm } from './native-profile-form';
import { PendingLabel } from '../employee-submit-button';

/** Owner-issued Manager payroll access for explicit locations (unchanged rules, Quiet form). */
export function NativeScopeForm({ employeeId, scope, locations, operation }: { employeeId: string; scope: NativeProfilesResponse['managerScopes'][number] | null; locations: { id: string; name: string; active: boolean }[]; operation: ReturnType<typeof usePayrollOperation> }) {
  const [error, setError] = useState('');
  const [review, setReview] = useState(scope?.review ?? false);
  const [approve, setApprove] = useState(scope?.approve ?? false);
  const save = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setError('');
    try { void operation.submit({ action: 'SET_MANAGER_SCOPE', employeeId, expectedRevision: scope?.revision ?? 0, reason: 'Manager payroll access updated', ...scopeFromForm(new FormData(e.currentTarget)) }); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Check Manager payroll access.'); }
  };
  return <form className="q-ps-form" noValidate onSubmit={save} aria-label="Manager payroll access"><fieldset disabled={operation.locked} className="q-pset-fields wb-form">
    <label className="wb-check"><input name="review" type="checkbox" checked={review} onChange={e => { setReview(e.target.checked); if (!e.target.checked) setApprove(false); }} /><span>Review pay and statements</span></label>
    <label className="wb-check"><input name="approve" type="checkbox" checked={approve} onChange={e => { setApprove(e.target.checked); if (e.target.checked) setReview(true); }} /><span>Approve payroll</span></label>
    <fieldset className="q-ps-locs"><legend className="q-ps-h">Locations</legend>{locations.map(l => <label className="wb-check" key={l.id}><input type="checkbox" name="scopeLocations" value={l.id} defaultChecked={scope?.locationIds.includes(l.id)} /><span>{l.name}{l.active ? '' : ' (inactive)'}</span></label>)}</fieldset>
    <p className="wb-note">Approving needs review and at least one location. Clear both to remove access.</p>
    {error && <p className="wb-error" role="alert"><WarningCircleIcon size={18} aria-hidden /><span>{error}</span></p>}
    <button className="q-btn" type="submit" aria-disabled={operation.locked}><PendingLabel pending={operation.busy} pendingText="Saving…">Save Manager access</PendingLabel></button>
  </fieldset></form>;
}
