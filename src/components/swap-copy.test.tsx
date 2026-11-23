// Signed-in Spanish (es-rest): Swap shift, Offer for cover and Can't work's reason check have a Spanish entry for every
// English word; the swap labels and the Offer for cover sheet render in Puerto Rico Spanish inside the person's language.
import {createElement, type ComponentProps, type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, rs} from '@rstest/core';
rs.mock('next/link', () => ({default: ({children, prefetch: _prefetch, ...props}: ComponentProps<'a'> & {prefetch?: boolean}) => createElement('a', props, children)}));
rs.mock('next/navigation', () => ({useRouter: () => ({push() {}, refresh() {}, back() {}}), usePathname: () => '/app/exchange/swap', useSearchParams: () => new URLSearchParams()}));
rs.mock('@/app/app/exchange/actions', () => ({shiftChangeAction: async () => ({}), reconcileShiftChangeAction: async () => null}));
import {PortalLangProvider} from '@/lib/i18n/portal-lang';
import {SWAP_COPY} from './swap-copy';
import {keyPaths} from './copy-key-paths.test-support';
import {swapDateLabel, swapPositionLabel, swapTimeLabel} from './swap-shift-summary';
import {SwapPageContent} from './swap-page-content';

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/[\s ]+/g, ' ').trim();
const es = (node: ReactNode) => text(renderToStaticMarkup(<PortalLangProvider lang="es">{node}</PortalLangProvider>));

it('has a Spanish entry for every English word', () => {
  expect(keyPaths(SWAP_COPY.es)).toEqual(keyPaths(SWAP_COPY.en));
});

it('writes the swap labels in either language', () => {
  const shift = {date: '2026-12-09', startTime: '22:00', endTime: '06:00'};
  expect(swapDateLabel('2026-12-09')).toBe('Wednesday, Dec 9, 2026');
  expect(swapDateLabel('2026-12-09', 'es')).toBe('miércoles, 9 dic 2026');
  expect(swapTimeLabel(shift)).toBe('10:00 PM – 6:00 AM (Thu, Dec 10)');
  expect(swapTimeLabel(shift, 'es').replace(/ /g, ' ')).toBe('10:00 p. m. – 6:00 a. m. (jue, 10 dic)');
  expect(swapPositionLabel({positionName: null, positionId: null}, 'es')).toBe('Sin puesto asignado');
});

it('renders Offer for cover in Spanish', () => {
  const source = {shiftId: 's', date: '2026-12-09', startTime: '09:00', endTime: '17:00', locationName: 'Condado', positionName: 'Barista', isDesignatedLead: false, employeeName: 'Fictional Worker'} as never;
  const spanish = es(<SwapPageContent source={source} sourceFields={{} as never} targets={[]} coverage={{allowed: true, notice: null}} mode="cover" />);
  for (const words of ['Ofrecer para cubrir', 'Ofrecer', 'Tu turno', 'Tu equipo lo ve como turno disponible.']) expect(spanish).toContain(words);
  for (const english of ['Offer for cover', 'Your shift']) expect(spanish).not.toContain(english);
});
