'use client';

import {useLayoutEffect, useRef} from 'react';
import {useServerInsertedHTML} from 'next/navigation';

/** Keep the initial document scripts out of React's client element tree.
 * Next's __next_error__ shell recreates <html> and clears its attributes, so
 * initialize that shell once after the commit and before its content paints. */
export function DocumentAppearanceScripts({textScale, theme}: {textScale: string; theme: string}) {
  const inserted = useRef(false);
  const fallback = useRef(typeof document !== 'undefined' && document.documentElement.id === '__next_error__');
  const initialized = useRef(false);
  useServerInsertedHTML(() => {
    if (inserted.current) return null;
    inserted.current = true;
    // A fallback has no page content until React creates its document. Defer
    // only that shell; ordinary server documents still initialize in the head.
    const initial = (source: string) => `if(document.documentElement.id!=='__next_error__'){${source}}`;
    return <>
      <script id="nv-text-scale" dangerouslySetInnerHTML={{__html: initial(textScale)}} />
      <script id="nv-theme" dangerouslySetInnerHTML={{__html: initial(theme)}} />
    </>;
  });
  useLayoutEffect(() => {
    if (!fallback.current || initialized.current) return;
    initialized.current = true;
    for (const source of [textScale, theme]) {
      const script = document.createElement('script');
      script.textContent = source;
      document.head.appendChild(script);
      script.remove();
    }
  }, [textScale, theme]);
  return null;
}
