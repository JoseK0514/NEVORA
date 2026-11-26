import * as actualReact from 'react' with { rstest: 'importActual' };
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, rs } from '@rstest/core';
import { PortalLangProvider, type PortalLang } from '@/lib/i18n/portal-lang';
import { PayrollExportReceipts } from './payroll-export-receipts';

rs.mock('react', () => ({
  ...actualReact,
  useState(initial: unknown) {
    if (initial && typeof initial === 'object' && 'state' in initial && initial.state === 'loading') {
      return actualReact.useState({
        state: 'ready',
        receipts: [{ operationId: 'fictional-receipt', people: 2, period: { startDate: '2026-12-07', endDate: '2026-12-13' }, createdAt: '2026-12-14T16:20:00Z' }],
      });
    }
    return actualReact.useState(initial);
  },
}));

const render = (lang: PortalLang) => renderToStaticMarkup(
  <PortalLangProvider lang={lang}><PayrollExportReceipts actorId="fictional-owner" refreshKey={0} /></PortalLangProvider>,
);

it('shows the file name Jose chose and announces its period on both download controls', () => {
  const html = render('es');
  expect(html).toContain('>Tiempo registrado</button>');
  expect(html).toContain('aria-label="Tiempo registrado de 7–13 dic"');
  expect(html).toContain('aria-label="Descargar CSV de 7–13 dic"');
  expect(html).toContain('Exportado el ');
  expect(html).toContain('2 personas');
});

it('retains the original English receipt controls and period formatting', () => {
  const html = render('en');
  expect(html).toContain('aria-label="Time record for Dec 7 – Dec 13"');
  expect(html).toContain('>Time record</button>');
  expect(html).toContain('aria-label="Download CSV for Dec 7 – Dec 13"');
  expect(html).toContain('Exported ');
  expect(html).toContain('2 people');
});
