// UI audit self-test (tools/ui-audit): one known defect per rule. `npm run ui:audit -- --selftest` audits each target view
// twice, clean and with the defect injected into the rendered page (no app code changes), and report.mjs checks that the
// rule reports more findings on the injected view than on the clean one. Each `apply` runs in the page.
const tail = (html) => () => { const d = document.createElement('div'); d.setAttribute('data-ui-audit-selftest', ''); d.innerHTML = html; (document.querySelector('main') || document.body).append(d); };

export const INJECTIONS = [
  {rule: 'overflow-x', apply: tail('<div style="width:2000px;height:20px;background:#eee">wide strip</div>')},
  {rule: 'text-clipped', apply: tail('<p style="width:80px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">This product sentence is far too long for its box</p>')},
  {rule: 'text-overlap', apply: tail('<div style="position:relative;height:40px"><span style="position:absolute;left:0;top:0">First label text</span><span style="position:absolute;left:10px;top:4px">Second label text</span></div>')},
  {rule: 'text-over-control', apply: tail('<div style="position:relative;height:60px"><button style="width:160px;height:48px">Real button</button><span style="position:absolute;left:20px;top:14px;pointer-events:none">Stray caption</span></div>')},
  {rule: 'offscreen', apply: tail('<p style="position:relative;left:-400px">Text pushed off the left edge</p>')},
  {rule: 'target-size', apply: tail('<button style="width:16px;height:16px;padding:0;min-width:0;min-height:0">x</button>')},
  {rule: 'reach', apply: tail('<div style="display:flex;gap:0"><button style="width:20px;height:20px;padding:0;min-width:0;min-height:0" aria-label="One">1</button><button style="width:20px;height:20px;padding:0;min-width:0;min-height:0" aria-label="Two">2</button></div>')},
  {rule: 'hidden-focusable', apply: tail('<div aria-hidden="true"><button>Hidden yet focusable</button></div>')},
  {rule: 'focus-ring', apply: () => { const s = document.createElement('style'); s.textContent = '[data-uia-noring],[data-uia-noring]:focus,[data-uia-noring]:focus-visible{outline:none!important;box-shadow:none!important}'; document.head.append(s); const b = document.createElement('button'); b.setAttribute('data-uia-noring', ''); b.textContent = 'No ring'; document.body.prepend(b); }},
  {rule: 'focus-order', apply: tail('<button tabindex="1">Jumps the queue A</button><button tabindex="2">Jumps the queue B</button>')},
  {rule: 'focus-trap', apply: () => { const i = document.createElement('input'); i.setAttribute('aria-label', 'Trap'); i.addEventListener('keydown', e => { if (e.key === 'Tab') e.preventDefault(); }); document.body.prepend(i); }},
  {rule: 'label-in-name', apply: tail('<button aria-label="Submit the form">Send now</button>')},
  {rule: 'duplicate-id', apply: tail('<div id="uia-dup">a</div><div id="uia-dup">b</div>')},
  {rule: 'img-alt', apply: tail('<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" width="20" height="20">')},
  {rule: 'row-button-heights', apply: tail('<div style="display:flex;gap:8px;align-items:flex-start"><button style="height:40px;border:1px solid #333;background:#fff">Short</button><button style="height:52px;border:1px solid #333;background:#fff">Tall</button></div>')},
  {rule: 'button-wrap', apply: tail('<button style="display:block;width:70px;border:1px solid #333;background:#fff;white-space:normal">Approve all requests</button>')},
  {rule: 'card-align', apply: tail('<div class="b-card"><ul><li><span>Row one</span></li><li style="padding-left:20px"><span>Row two</span></li></ul></div>')},
  {rule: 'tabular-nums', apply: tail('<div style="width:200px;text-align:right;font-variant-numeric:normal"><div>1,111.10</div><div>8,888.80</div><div>4,567.89</div></div>')},
  {rule: 'reduced-motion', apply: tail('<div style="transition:transform 0.4s ease;width:40px;height:10px;background:#ccc">m</div>')},
  {rule: 'forced-colors', apply: tail('<button style="border:none;outline:none;background:#0b6;color:#fff;padding:12px">Borderless</button>')},
  {rule: 'html-lang', apply: () => { document.documentElement.lang = 'fr'; }},
  {rule: 'spanish-leak', lang: 'es', apply: tail('<p>Save your changes before you close this page</p>')},
  {rule: 'axe:color-contrast', apply: tail('<p style="color:#c8c8c8;background:#fff;font-size:14px">Faint grey words on white</p>')},
  {rule: 'console-error', apply: () => { console.error('ui-audit self-test console error'); }},
  {rule: 'page-error', apply: () => { setTimeout(() => { throw new Error('ui-audit self-test page error'); }, 0); }},
  {rule: 'network', apply: () => { void fetch('/api/ui-audit-self-test-missing').catch(() => {}); }},
  {rule: 'cls', apply: () => { const d = document.createElement('div'); d.style.height = '600px'; d.textContent = 'late banner'; document.body.prepend(d); }},
  {rule: 'known-g69', browser: 'webkit', apply: () => { console.error('Fetch API cannot load /api/x due to access control checks.'); }},
];
