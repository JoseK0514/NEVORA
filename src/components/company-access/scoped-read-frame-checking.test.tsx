import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import {expect,it,vi} from 'vitest';

vi.mock('next/navigation',()=>({useRouter:()=>({refresh:vi.fn(),replace:vi.fn()})}));
vi.mock('../app-navigation',()=>({useAppNavigation:()=>null}));

import {ScopedReadFrame,STUCK_MS} from './scoped-read-frame';

// Oct 25, 2026: every tab tap on the hosted preview flashed "Current view needs a fresh check" and a Refresh button for
// about a second, because the frame showed its words whenever a check was required (which every check is). A check in
// progress draws the page's own quiet shape; the words only follow a check that stays unresolved.
it('draws the quiet page shape while a check runs, keeping its words for assistive technology only', () => {
  const html=renderToStaticMarkup(createElement(ScopedReadFrame,{observation:{authority:'fictional-authority',observedAt:new Date().toISOString(),validForMs:15000}},'Fictional page'));
  expect(html).toContain('data-checking=""');
  expect(html).toContain('q-skel-page');
  expect(html).not.toContain('Fictional page');
  expect(html).toContain('Current view needs a fresh check');
});

it('waits long enough that a normal hosted check never shows the words', () => {
  expect(STUCK_MS).toBeGreaterThanOrEqual(2000);
});
