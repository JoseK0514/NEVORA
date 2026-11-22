import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import {expect,it,rs} from '@rstest/core';

rs.mock('next/navigation',()=>({useRouter:()=>({refresh:rs.fn(),replace:rs.fn()})}));
rs.mock('../app-navigation',()=>({useAppNavigation:()=>null}));

import {ScopedReadFrame,STUCK_MS,frameStateWords} from './scoped-read-frame';

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

// QA S-01 (Nov 21, 2026): on Fast 3G a check still running after STUCK_MS read "Couldn’t check your access", a failure that
// hadn't happened. Only a check that answered unavailable is a failure.
it('a slow check says it is still checking; only an answered failure says it could not check', () => {
  expect(frameStateWords('expired',false,false)).toEqual({kind:'loading',title:'Still checking your access',line:'This connection is slow. The page appears when the check finishes.'});
  expect(frameStateWords('expired',false,true)).toMatchObject({kind:'failed',title:'Couldn’t check your access'});
  expect(frameStateWords('paused',true,false)).toMatchObject({kind:'offline',title:'You’re offline'});
  expect(frameStateWords('paused',false,true)).toMatchObject({kind:'paused',title:'View paused'});
});
