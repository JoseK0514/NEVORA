import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {LangSwitch} from './lang-switch';

it('does not offer enabled language actions before the client can handle a click',()=>{
  const html=renderToStaticMarkup(<LangSwitch lang="en" label="Language"/>);
  expect(html.match(/disabled=""/g)).toHaveLength(2);
  expect(html).toContain('aria-label="English"');
  expect(html).toContain('aria-label="Español"');
  expect(html).toContain('aria-pressed="true"');
});
