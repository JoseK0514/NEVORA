import {expect, it, rs} from '@rstest/core';
import {readAuthLang} from '@/lib/auth-lang.server';
import * as plans from './page';

rs.mock('@/lib/auth-lang.server', () => ({readAuthLang: rs.fn()}));

it.each([
  ['en', 'Plan and billing · NEVORA', 'Workforce scheduling and operations'],
  ['es', 'Plan y facturación · NEVORA', 'Horarios y operaciones del personal'],
] as const)('serves the public plans browser title in %s before hydration', async (lang, title, description) => {
  rs.mocked(readAuthLang).mockResolvedValue(lang);
  expect(await plans.generateMetadata()).toMatchObject({
    title,
    description,
    robots: {index: false, follow: false},
    referrer: 'no-referrer',
  });
});
