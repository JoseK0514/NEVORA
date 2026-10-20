import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';

vi.mock('./api', () => ({ readStatements: vi.fn() }));
const { PaydayMoment } = await import('./my-pay');

it('shows the newest statement as the payday moment without inventing amounts', () => {
  const html = renderToStaticMarkup(<PaydayMoment statement={{ id: 's1', kind: 'EMPLOYEE_STATEMENT', employeeId: 'e', filename: 'statement.pdf', sha256: 'x', downloadUrl: '/api/payroll/documents/s1', published: true, period: { startDate: '2026-10-05', endDate: '2026-10-11' }, payday: '2026-10-16' }} />);
  // Signature: the payday as a long date ("Payday" stays for screen readers), the period in short form.
  expect(html).toContain('Payday </span>October 16');
  expect(html).toContain('Oct 5–11 · PDF');
  expect(html).toContain('/api/payroll/documents/s1');
  expect(html).not.toMatch(/\$\d/);
});
