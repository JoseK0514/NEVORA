import {readFileSync} from 'node:fs';
import {expect,it} from '@rstest/core';

// Gap closure (Nov 23, 2026): the employee title bars' back and cancel links prefetch on intent (NavigationLink), as
// the corp title bar does, so the open page's access renewals don't fetch the parent page again every 10 s.
it.each(['hours-corp.tsx','pay-corp.tsx','planning-frame.tsx'])('%s: every title-bar link prefetches on intent',file=>{
 const source=readFileSync(new URL('./'+file,import.meta.url),'utf8');
 const links=source.match(/<(?:Navigation)?Link\b[^>]*className="c-nav__back[^"]*"[^>]*>/g)??[];
 expect(links.length).toBeGreaterThan(0);
 for(const link of links)expect(link).toMatch(/^<NavigationLink\b[\s\S]*\bintent="auto"/);
});
