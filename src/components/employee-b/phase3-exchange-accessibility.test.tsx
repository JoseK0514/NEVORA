import {createElement, type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, rs} from '@rstest/core';
import {PortalLangProvider} from '@/lib/i18n/portal-lang';
import {ExchangeListB, type ExchangeRowB} from './exchange-b';
import {hours} from '../employee-my-schedule';
import {rosterCopy} from '../manager-weekly-roster-copy';
rs.mock('next/link', () => ({default: ({children, prefetch: _p, scroll: _s, ...props}: ComponentProps<'a'> & {prefetch?: boolean; scroll?: boolean}) => createElement('a', props, children)}));

it('Spanish request links take their accessible name from the visible row and English retains its original label', () => {
  for (const lang of ['en', 'es'] as const) {
    const item: ExchangeRowB = {row: {id: 'fictional-request', kind: 'swap', viewer: 'requester', status: 'EMPLOYEE_PENDING', date: '2026-11-24', createdAt: '2026-11-23T15:00:00Z', counterparty: 'Ana R.', revision: 1, releaseApplies: null}, href: '/app/exchange?requestId=fictional-request', title: lang === 'es' ? 'Cambio de turno' : 'Swap request', sub: 'Tue, Nov 24', status: 'Waiting on teammate', chip: {tone: 'grey', text: 'With teammate'}};
    const html = renderToStaticMarkup(<PortalLangProvider lang={lang}><ExchangeListB mode="mine" state={null} enabled recoveries={null} rows={[item]}/></PortalLangProvider>);
    const row = html.match(/<a[^>]*id="b-exchange-request-fictional-request"[^>]*>[\s\S]*?<\/a>/)?.[0];
    expect(row).toBeDefined();
    if (lang === 'es') {
      expect(row).not.toMatch(/^<a[^>]*aria-label=/);
      expect(row).toContain(item.title);
      expect(row).toContain('Con compañero');
    } else {
      expect(row).toContain('aria-label="Swap request, Tue, Nov 24, Waiting on teammate"');
    }
  }
});

it('Spanish shift ranges protect the suffix but allow a break after the number; English is unchanged', () => {
  const shift = {startTime: '08:00', endTime: '16:00'} as Parameters<typeof hours>[0];
  expect(hours(shift, 'es')).toBe('8:00 a.\u00a0m. – 4:00 p.\u00a0m.');
  expect(hours(shift, 'en')).toBe('8:00\u00a0AM\u00a0– 4:00\u00a0PM');
});

it('the compact weekly grid keeps approved abbreviations and full spoken counts', () => {
  const t = rosterCopy('es');
  expect(t.gridOpen).toBe('Disponibles');
  expect(t.openChip(2)).toBe('2 disp.');
  expect(t.gridPeople(2)).toBe('2 pers.');
  expect(t.openShiftsCount(2)).toBe('2 turnos disponibles');
  expect(t.people(2)).toBe('2 personas');
});
