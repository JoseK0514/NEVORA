// PTO screens (Nov 20, 2026): the Owner's policies, a person's balance and cancelling an approval, in English and Spanish.
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, rs } from '@rstest/core';
rs.mock("next/link", () => ({ default: ({ href, children, prefetch: _prefetch, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => createElement("a", { href, ...props }, children) }));
rs.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }) }));
rs.mock("@/app/app/requests/actions", () => ({ reviewTimeOffAction: async () => {} }));
import { hoursInput, minutesFromHours, parseAccount, type PtoPolicy } from "@/lib/workforce/pto-client";
import { PoliciesScreen, policyDraft, policyProblems } from "./policies-screen";
import { AccountScreen, draftDelta, draftProblems, entryDetail, type AccountScreenProps as AccountProps } from "./account-screen";
import { CancelApproval } from "./cancel-approval";
import { hoursText, ptoCopy } from "./copy";

const vacation: PtoPolicy = { id: "11111111-1111-4111-8111-111111111111", code: "VACATION", label: "Vacation", revision: 2, enabled: true, fullDayMinutes: 480, earnedMinutesPer100Hours: 277, carryoverCapMinutes: 7200 };
const sick: PtoPolicy = { id: "22222222-2222-4222-8222-222222222222", code: "SICK", label: "Sick", revision: 1, enabled: false, fullDayMinutes: 480, earnedMinutesPer100Hours: 0, carryoverCapMinutes: 0 };

describe('hours', () => {
  it('reads hours the way people type them and writes them back', () => {
    expect(minutesFromHours('8')).toBe(480);
    expect(minutesFromHours('7.5')).toBe(450);
    expect(minutesFromHours('7:30')).toBe(450);
    expect(minutesFromHours('7 h 30')).toBe(450);
    expect(minutesFromHours('0,25')).toBe(15);
    for (const bad of ['', 'x', '-2', '7:75']) expect(minutesFromHours(bad), bad).toBeNull();
    expect(hoursInput(480)).toBe('8'); expect(hoursInput(450)).toBe('7.5'); expect(hoursInput(440)).toBe('7:20');
    expect(hoursText(450)).toBe('7 h 30 min'); expect(hoursText(-240, true)).toBe('−4 h'); expect(hoursText(480, true)).toBe('+8 h'); expect(hoursText(0)).toBe('0 h');
  });
});

describe('policies', () => {
  const t = ptoCopy('en');
  it('checks names, codes, hours and a taken code', () => {
    expect(policyProblems(policyDraft(null, 'VACATION', t), [])).toEqual([]);
    expect(policyProblems(policyDraft(null, 'VACATION', t), [vacation])).toEqual(['codeTaken']);
    expect(policyProblems({ ...policyDraft(null, 'OTHER', t), label: '', day: '25', rate: '101', cap: 'x' }, [])).toEqual(['label', 'code', 'day', 'rate', 'cap']);
    expect(policyDraft(vacation, 'OTHER', t)).toMatchObject({ revision: 2, kind: 'VACATION', code: 'VACATION', day: '8', cap: '120' });
  });
  it('lists policies with what they mean, on or off, and adds what is missing', () => {
    const html = renderToStaticMarkup(<PoliciesScreen initial={{ load: { state: 'ready', policies: [vacation, sick] } }} />);
    expect(html).toContain('Time off policies');
    expect(html).toContain('8 h a day · earns 4 h 37 min per 100 h worked · carries over up to 120 h');
    expect(html).toContain('not earned from hours worked · no carryover');
    expect(html.indexOf('>On<')).toBeLessThan(html.indexOf('>Off<'));
    expect(html).toContain('Add another policy');
    expect(html).not.toContain('Add Vacation');
  });
  it('starts empty with Vacation and Sick, and speaks Spanish', () => {
    const html = renderToStaticMarkup(<PoliciesScreen initial={{ load: { state: 'ready', policies: [] } }} />);
    expect(html).toContain('No time off policies yet'); expect(html).toContain('Add Vacation'); expect(html).toContain('Add Sick');
    const es = renderToStaticMarkup(<PoliciesScreen lang="es" initial={{ load: { state: 'ready', policies: [vacation] } }} />);
    expect(es).toContain('Políticas de días libres'); expect(es).toContain('8 h al día'); expect(es).toContain('lang="es"');
  });
  it('edits with every field, the code fixed after creation, and an unconfirmed save kept', () => {
    const html = renderToStaticMarkup(<PoliciesScreen initial={{ load: { state: 'ready', policies: [vacation] }, draft: policyDraft(vacation, 'OTHER', t) }} />);
    for (const text of ['Edit policy', 'Hours in a full day', 'Hours earned per 100 hours worked', 'Most hours carried into a new year', 'People can use it', 'role="switch"']) expect(html, text).toContain(text);
    expect(html).toMatch(/id="pto-code"[^>]*disabled=""/);
    const command = { kind: 'PTO_POLICY' as const, operationId: '00000000-0000-4000-8000-000000000001', code: 'VACATION', label: 'Vacation', enabled: true, fullDayMinutes: 480, earnedMinutesPer100Hours: 0, carryoverCapMinutes: 0, expectedRevision: 2 };
    expect(renderToStaticMarkup(<PoliciesScreen initial={{ load: { state: 'ready', policies: [vacation] }, draft: policyDraft(vacation, 'OTHER', t), custody: { command, status: 'unknown' } }} />)).toContain('Check again');
  });
  it('has loading, failed and closed states', () => {
    expect(renderToStaticMarkup(<PoliciesScreen initial={{ load: { state: 'loading' } }} />)).toContain('aria-busy="true"');
    expect(renderToStaticMarkup(<PoliciesScreen initial={{ load: { state: 'failed' } }} />)).toContain('Try again');
    expect(renderToStaticMarkup(<PoliciesScreen initial={{ load: { state: 'denied' } }} />)).toContain('Only Owners manage time off balances');
  });
});

describe('balance', () => {
  const t = ptoCopy('en');
  const account = parseAccount({ state: 'ready', data: { employeeId: 'E1', historyTruncated: false,
    balances: [{ code: 'VACATION', label: 'Vacation', enabled: true, balanceMinutes: 1920 }],
    entries: [
      { id: 'a', policyCode: 'VACATION', kind: 'EARNED', minutes: 240, effectiveDate: '2026-11-16', recordedAt: '2026-11-16T12:00:00Z', policyId: vacation.id, requestId: null,
        accrual: { startDate: '2026-11-01', endDate: '2026-11-15', qualifyingMinutes: 4800, policyRevision: 2, awardMinutes: 240, changeMinutes: 240 } },
      { id: 'b', policyCode: 'VACATION', kind: 'USAGE', minutes: -480, effectiveDate: '2026-11-10', recordedAt: '2026-11-09T12:00:00Z', policyId: vacation.id, requestId: 'r1' },
      { id: 'c', policyCode: 'VACATION', kind: 'OPENING', minutes: 2160, effectiveDate: '2026-11-01', recordedAt: '2026-11-01T12:00:00Z', policyId: vacation.id, requestId: null, actorEmployeeId: 'OWN', note: 'Balance from paper records' },
    ] } }, 'E1');
  const base: AccountProps = { employeeId: 'E1', name: 'Ana Torres', firstName: 'Ana', backHref: '/app/employees/E1', today: '2026-11-20', actors: { OWN: 'Jose Natal' }, actorId: 'X' };
  const ready = { state: 'ready' as const, data: { account, policies: [vacation, sick] } };
  it('reads the account strictly', () => {
    expect(() => parseAccount({ state: 'ready', data: { employeeId: 'E2', balances: [], entries: [], historyTruncated: false } }, 'E1')).toThrow();
    expect(account.entries[0].accrual?.qualifyingMinutes).toBe(4800);
  });
  it('explains each entry: from timecards, approved time off, who opened it', () => {
    expect(entryDetail(account.entries[0], t, base.actors, base.actorId)).toBe('Nov 16, 2026 · From finalized timecards, Nov 1, 2026–Nov 15, 2026: 80 h worked');
    expect(entryDetail(account.entries[2], t, base.actors, base.actorId)).toBe('Nov 1, 2026 · by Jose Natal');
    const html = renderToStaticMarkup(<AccountScreen {...base} initial={{ load: ready }} />);
    for (const text of ['Time off balance', 'Ana Torres', '32 h', 'Earned · Vacation', '+4 h', 'Time off approved · Vacation', '−8 h', 'Opening balance · Vacation', 'Balance from paper records', 'Adjust balance']) expect(html, text).toContain(text);
  });
  it('validates an adjustment and refuses a negative balance before sending', () => {
    const d = { code: 'VACATION', mode: 'remove' as const, amount: '40', date: '2026-11-20', note: 'Payout' };
    expect(draftDelta(d)).toBe(-2400);
    expect(draftProblems(d, 1920, '2026-11-20')).toEqual(['below']);
    expect(draftProblems({ ...d, amount: '0', date: '2026-11-21', note: ' ' }, 1920, '2026-11-20')).toEqual(['amount', 'date', 'note']);
    expect(draftProblems({ ...d, amount: '8' }, 1920, '2026-11-20')).toEqual([]);
  });
  it('reviews now, change and after, in Spanish too', () => {
    const draft = { code: 'VACATION', mode: 'add' as const, amount: '8', date: '2026-11-20', note: 'Holiday worked' };
    const html = renderToStaticMarkup(<AccountScreen {...base} initial={{ load: ready, step: 'review', draft }} />);
    expect(html).toContain('Ana’s Vacation balance'); expect(html).toContain('+8 h'); expect(html).toContain('40 h'); expect(html).toContain('Save change');
    const es = renderToStaticMarkup(<AccountScreen {...base} lang="es" initial={{ load: ready, step: 'edit', draft }} />);
    expect(es).toContain('Ajustar balance'); expect(es).toContain('Añadir tiempo'); expect(es).toContain('Quitar tiempo');
  });
});

describe('cancel approval', () => {
  it('names the request and opens a confirmation in place', () => {
    const html = renderToStaticMarkup(<CancelApproval requestId="r1" name="Ana Torres" when="Dec 2" />);
    expect(html).toContain('Cancel approval');
    expect(html).toContain('aria-label="Cancel approval: Ana Torres, Dec 2"');
  });
});
