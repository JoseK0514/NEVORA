// UI audit in-page rules (tools/ui-audit). Evaluated in the page as `(source)(options)`; returns
// { findings, metrics }. Each finding: { rule, severity, selector, text, rect: [x, y, w, h] in page coordinates, data }.
// Rules that need the keyboard, the network, axe or another media mode run in the driver (driver.integration.mts).
// options: { width, text: 100 | 200, touch, lang, peopleData: string[], exceptions: {rule, width?, selector}[] }
(options) => {
  const findings = [];
  const de = document.documentElement;
  const vw = de.clientWidth;
  const sy = () => window.scrollY, sx = () => window.scrollX;
  const add = (rule, severity, el, data = {}, textOverride) => {
    const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    findings.push({
      rule, severity,
      selector: el && el.nodeType === 1 ? sel(el) : null,
      text: (textOverride ?? (el ? label(el) : '')).slice(0, 120),
      rect: r ? [Math.round(r.left + sx()), Math.round(r.top + sy()), Math.round(r.width), Math.round(r.height)] : null,
      data,
    });
  };
  // ---------- helpers ----------
  const sel = (el) => {
    const parts = [];
    for (let n = el, depth = 0; n && n.nodeType === 1 && depth < 5; n = n.parentElement, depth++) {
      if (n.id && !/^:r|^\d/.test(n.id)) { parts.unshift('#' + CSS.escape(n.id)); break; }
      let p = n.tagName.toLowerCase();
      const cls = [...n.classList].filter(c => !/^(is-|has-|active|open)$/.test(c)).slice(0, 2);
      if (cls.length) p += '.' + cls.map(c => CSS.escape(c)).join('.');
      const sib = n.parentElement ? [...n.parentElement.children].filter(c => c.tagName === n.tagName) : [];
      if (sib.length > 1) p += `:nth-of-type(${sib.indexOf(n) + 1})`;
      parts.unshift(p);
    }
    return parts.join(' > ');
  };
  const label = (el) => (el.getAttribute?.('aria-label') || el.innerText || el.textContent || el.getAttribute?.('title') || el.getAttribute?.('alt') || '').replace(/\s+/g, ' ').trim();
  const cs = (el) => getComputedStyle(el);
  const visible = (el) => {
    if (!(el instanceof Element)) return false;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    if (el.checkVisibility && !el.checkVisibility({checkOpacity: true, checkVisibilityCSS: true})) return false;
    if (el.closest('[aria-hidden="true"],[hidden],[inert]')) return false;
    const closed = el.parentElement && el.parentElement.closest('details:not([open])');
    if (closed && !(el.tagName === 'SUMMARY' && el.parentElement === closed)) return false;
    return true;
  };
  const srOnly = (el) => {
    const s = cs(el), r = el.getBoundingClientRect();
    return (r.width <= 2 && r.height <= 2) || s.clipPath === 'inset(50%)' || s.clip === 'rect(0px, 0px, 0px, 0px)' || /(^|\s)(sr-only|visually-hidden|b-sr)(\s|$)/.test(el.className || '') || !!el.closest('.sr-only,.visually-hidden,.b-sr');
  };
  const excepted = (rule, el) => (options.exceptions || []).some(x => x.rule === rule && (!x.width || x.width.includes(options.width)) && (!x.minWidth || options.width >= x.minWidth) && el.closest(x.selector));
  const isPeople = (text) => { const t = text.replace(/[…\s]+$/u, '').trim(); return !!t && (options.peopleData || []).some(p => p && (p.startsWith(t) || t.startsWith(p) || t.includes(p))); };
  const textNodesOf = (el) => [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim());
  const textRects = (el) => textNodesOf(el).flatMap(n => { const range = document.createRange(); range.selectNodeContents(n); return [...range.getClientRects()].filter(r => r.width > 1 && r.height > 1); });
  const CONTROL = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=tab],[role=switch],[role=checkbox],[role=radio],[role=menuitem],[role=option],[tabindex]:not([tabindex="-1"])';
  const all = [...document.body.querySelectorAll('*')].filter(e => !e.closest('nextjs-portal,[data-nextjs-toast],script,style,noscript,template'));
  const shown = all.filter(visible);
  const leaves = shown.filter(e => textNodesOf(e).length && !srOnly(e));
  const controls = shown.filter(e => e.matches(CONTROL) && !e.matches(':disabled'));
  const metrics = {elements: all.length, textLeaves: leaves.length, controls: controls.length};

  // ---------- overflow-x: the page scrolls sideways ----------
  const over = de.scrollWidth - de.clientWidth;
  if (over > 1) {
    const wide = shown.filter(e => e.getBoundingClientRect().right > vw + 1 && !e.closest('[data-scroll],.scroll-x')).sort((a, b) => b.getBoundingClientRect().right - a.getBoundingClientRect().right);
    // The innermost wide elements are the cause.
    const culprits = wide.filter(e => !wide.some(o => o !== e && e.contains(o))).slice(0, 5);
    add('overflow-x', 'fail', culprits[0] || de, {px: over, culprits: culprits.map(sel)}, `page is ${over}px wider than the viewport`);
  }

  // ---------- text-clipped: text cut or ellipsized ----------
  for (const e of leaves) {
    const s = cs(e);
    const clips = s.textOverflow === 'ellipsis' || ['hidden', 'clip'].includes(s.overflowX) || ['hidden', 'clip'].includes(s.overflowY) || s.webkitLineClamp !== 'none' && s.webkitLineClamp;
    if (!clips || e.clientWidth <= 4 || e.clientHeight <= 4) continue;
    const dx = e.scrollWidth - e.clientWidth, dy = e.scrollHeight - e.clientHeight;
    if (dx <= 1 && dy <= 2) continue;
    if (e.matches('input,textarea,select')) continue;
    const people = e.closest('[data-user-data],[translate="no"]') || isPeople(label(e));
    const severity = people ? (options.text >= 200 ? 'warn' : 'info') : 'fail';
    add('text-clipped', severity, e, {dx, dy, kind: s.textOverflow === 'ellipsis' ? 'ellipsis' : 'clip', userData: !!people});
  }

  // ---------- text-overlap and text-over-control ----------
  const fixedLike = (e) => { for (let n = e; n && n !== document.body; n = n.parentElement) { const p = cs(n).position; if (p === 'fixed' || p === 'sticky') return n; } return null; };
  const boxes = leaves.slice(0, 700).map(e => ({e, rs: textRects(e), fixed: fixedLike(e)}));
  let overlaps = 0;
  for (let i = 0; i < boxes.length && overlaps < 30; i++) for (let j = i + 1; j < boxes.length && overlaps < 30; j++) {
    const a = boxes[i], b = boxes[j];
    if (a.e.contains(b.e) || b.e.contains(a.e) || a.fixed !== b.fixed) continue;
    hit: for (const ra of a.rs) for (const rb of b.rs) {
      const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (ox > 2 && oy > 3) { overlaps++; add('text-overlap', 'fail', a.e, {with: sel(b.e), withText: label(b.e).slice(0, 60), px: [Math.round(ox), Math.round(oy)]}); break hit; }
    }
  }
  let overControls = 0;
  for (const c of controls) {
    if (overControls >= 20) break;
    const cr = c.getBoundingClientRect(), cf = fixedLike(c);
    for (const b of boxes) {
      if (c.contains(b.e) || b.e.contains(c) || b.e.closest('label') && (b.e.closest('label').control === c || b.e.closest('label').contains(c)) || b.fixed !== cf) continue;
      if (b.e.closest(CONTROL)) continue; // text in another control: covered by target spacing
      const r = b.rs.find(r => Math.min(r.right, cr.right) - Math.max(r.left, cr.left) > 4 && Math.min(r.bottom, cr.bottom) - Math.max(r.top, cr.top) > 4);
      if (r) { overControls++; add('text-over-control', 'fail', b.e, {control: sel(c), controlText: label(c).slice(0, 60)}); break; }
    }
  }

  // ---------- offscreen: content past the viewport's sides ----------
  const scrollsX = (e) => { for (let n = e.parentElement; n && n !== document.body; n = n.parentElement) { const s = cs(n); if (['auto', 'scroll'].includes(s.overflowX) && n.scrollWidth > n.clientWidth + 1) return true; if (['hidden', 'clip'].includes(s.overflowX)) return true; } return false; };
  let off = 0;
  for (const e of leaves) {
    if (off >= 20) break;
    const r = e.getBoundingClientRect();
    if ((r.right > vw + 1 || r.left < -1) && !scrollsX(e)) { off++; add('offscreen', 'warn', e, {left: Math.round(r.left), right: Math.round(r.right), viewport: vw}); }
  }

  // ---------- target-size and reach ----------
  const inlineLink = (e) => e.tagName === 'A' && cs(e).display === 'inline' && e.parentElement && [...e.parentElement.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 2);
  const reachMisses = (e, d) => {
    const r = e.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const misses = [];
    for (const [k, x, y] of [['left', cx - d, cy], ['right', cx + d, cy], ['up', cx, cy - d], ['down', cx, cy + d]]) {
      if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
      const t = document.elementFromPoint(x, y);
      if (!t || !(t === e || e.contains(t))) misses.push(k + '→' + (t ? sel(t) : 'nothing'));
    }
    return misses;
  };
  for (const e of controls) {
    const r0 = e.getBoundingClientRect();
    if (r0.width >= 44 && r0.height >= 44) continue;
    const inline = inlineLink(e);
    const tiny = r0.width < 24 || r0.height < 24;
    // Checkbox and radio inputs count with their label.
    const lab = e.matches('input[type=checkbox],input[type=radio]') && e.closest('label');
    if (lab) { const lr = lab.getBoundingClientRect(); if (lr.width >= 44 && lr.height >= 44) continue; }
    if (tiny && !inline) add('target-size', excepted('target-size', e) ? 'info' : 'fail', e, {w: Math.round(r0.width), h: Math.round(r0.height), min: 24});
    else if (!inline) add('target-size', excepted('target-size', e) ? 'info' : 'warn', e, {w: Math.round(r0.width), h: Math.round(r0.height), min: 44});
    else add('target-size', 'info', e, {w: Math.round(r0.width), h: Math.round(r0.height), inlineLink: true});
    if (inline) continue;
    if (!(r0.top >= 40 && r0.bottom <= innerHeight - 40)) e.scrollIntoView({block: 'center', inline: 'nearest'});
    const m12 = reachMisses(e, 12), m215 = reachMisses(e, 21.5);
    if (m12.length) add('reach', excepted('reach', e) ? 'info' : 'fail', e, {radius: 12, misses: m12, input: options.touch ? 'touch' : 'mouse'});
    else if (m215.length) add('reach', excepted('reach', e) ? 'info' : 'warn', e, {radius: 21.5, misses: m215, input: options.touch ? 'touch' : 'mouse'});
  }
  window.scrollTo(0, 0);

  // ---------- hidden-focusable ----------
  for (const e of all) {
    if (!(e instanceof HTMLElement) || e.tabIndex < 0 || e.matches(':disabled') || e.closest('[inert]')) continue;
    const s = cs(e);
    if (s.display === 'none' || s.visibility === 'hidden') continue; // not in the tab order
    const ariaHidden = e.closest('[aria-hidden="true"]');
    let transparent = false; for (let n = e; n; n = n.parentElement) if (parseFloat(cs(n).opacity) < 0.05) { transparent = true; break; }
    const r = e.getBoundingClientRect();
    const zero = r.width < 1 || r.height < 1;
    if (!ariaHidden && !transparent && !zero) continue;
    if (zero && srOnly(e)) {
      // A skip link that appears on focus is fine.
      const before = document.activeElement; e.focus({preventScroll: true}); const fr = e.getBoundingClientRect(); const shows = fr.width > 1 && fr.height > 1; if (before && before.focus) before.focus({preventScroll: true}); else e.blur();
      if (shows) continue;
    }
    add('hidden-focusable', 'fail', e, {ariaHidden: !!ariaHidden, transparent, zeroSize: zero});
  }
  // Hit-testable but invisible: a transparent control on top at its own centre.
  for (const e of all) {
    if (!e.matches(CONTROL)) continue;
    let transparent = false; for (let n = e; n; n = n.parentElement) if (parseFloat(cs(n).opacity) < 0.05) { transparent = true; break; }
    if (!transparent || cs(e).pointerEvents === 'none') continue;
    const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.top > innerHeight) continue;
    const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (t && (t === e || e.contains(t))) add('hidden-focusable', 'fail', e, {hitTestable: true});
  }

  // ---------- label-in-name (WCAG 2.5.3) ----------
  const norm = (t) => t.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  for (const e of controls) {
    const visibleText = norm(e.innerText || (e.matches('input[type=submit],input[type=button]') ? e.value : '') || '');
    if (!visibleText || visibleText.length < 2) continue;
    let name = e.getAttribute('aria-label');
    const lb = e.getAttribute('aria-labelledby');
    if (lb) name = lb.split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ');
    if (!name) continue;
    if (!norm(name).includes(visibleText)) add('label-in-name', 'fail', e, {visible: visibleText, accessibleName: name.slice(0, 120)});
  }

  // ---------- duplicate-id ----------
  const ids = new Map();
  for (const e of document.querySelectorAll('[id]')) { if (!e.id) continue; ids.set(e.id, (ids.get(e.id) || 0) + 1); }
  for (const [id, n] of ids) if (n > 1) add('duplicate-id', 'fail', document.getElementById(id), {id, count: n});

  // ---------- img-alt ----------
  for (const e of document.querySelectorAll('img:not([alt]),input[type=image]:not([alt]),svg[role=img]:not([aria-label]):not([aria-labelledby]),[role=img]:not(svg):not([aria-label]):not([aria-labelledby])')) {
    if (e.closest('[aria-hidden="true"]')) continue;
    if (e.matches('svg[role=img]') && e.querySelector('title')) continue;
    add('img-alt', 'fail', e, {tag: e.tagName.toLowerCase(), src: (e.getAttribute('src') || '').slice(0, 80)});
  }

  // ---------- button-like controls: row heights and wrapped labels ----------
  const buttonLike = controls.filter(e => {
    if (!e.matches('button,[role=button],a[href],input[type=submit],input[type=button]')) return false;
    if (inlineLink(e)) return false;
    const s = cs(e);
    const filled = s.backgroundColor && !/rgba\(0, 0, 0, 0\)|transparent/.test(s.backgroundColor);
    const bordered = parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== 'none';
    return (filled || bordered) && /flex|block|grid/.test(s.display);
  });
  const rows = new Map();
  for (const e of buttonLike) {
    const r = e.getBoundingClientRect();
    const key = e.parentElement;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push({e, r});
  }
  for (const [parent, list] of rows) {
    // Same row: tops within 4px.
    const used = new Set();
    for (const a of list) {
      if (used.has(a)) continue;
      const row = list.filter(b => Math.abs(b.r.top - a.r.top) <= 4 || Math.abs(b.r.top + b.r.height / 2 - (a.r.top + a.r.height / 2)) <= 2);
      row.forEach(b => used.add(b));
      if (row.length < 2) continue;
      const hs = row.map(b => Math.round(b.r.height));
      if (Math.max(...hs) - Math.min(...hs) > 1) add('row-button-heights', 'warn', row[0].e, {parent: sel(parent), heights: hs, labels: row.map(b => label(b.e).slice(0, 30))});
    }
  }
  if (options.text < 200) for (const e of buttonLike) {
    const tops = new Set(textRects(e).concat(...[...e.querySelectorAll('*')].filter(c => !srOnly(c)).map(textRects)).map(r => Math.round(r.top)));
    if (tops.size > 1) add('button-wrap', 'warn', e, {lines: tops.size});
  }

  // ---------- card-align: rows' first text left edges within a card ----------
  for (const card of shown.filter(e => e.matches('.b-card, .c-card, .q-list'))) {
    const rowsIn = [...card.querySelectorAll(':scope > li, :scope > ul > li, :scope .b-list > li, :scope .c-rows > li')].filter(visible);
    const lefts = rowsIn.map(li => { const t = [...li.querySelectorAll('*')].find(x => textNodesOf(x).length && visible(x) && !srOnly(x) && !x.closest('.b-av, .c-av, .q-av, .b-day, .b-ico, .c-sched-row__time, .c-row__lead, .b-chip, .c-pill')); return t ? Math.round(t.getBoundingClientRect().left) : null; }).filter(x => x !== null);
    const s = [...new Set(lefts)];
    if (s.length > 1 && Math.max(...s) - Math.min(...s) > 1) add('card-align', 'warn', card, {lefts: s});
  }

  // ---------- tabular-nums: figures in a value column ----------
  const numeric = leaves.filter(e => { const t = (e.innerText || '').trim(); return t.length <= 24 && /\d.*\d|\d{2,}/.test(t) && /^[\s\d$€£%.,:+\-–—/()hmsinrtaxpd]*$/i.test(t) && !e.closest('time, input, select, textarea, [role=heading], h1, h2, h3'); });
  const columns = new Map();
  for (const e of numeric) { const r = e.getBoundingClientRect(); const k = Math.round(r.right / 2) * 2; if (!columns.has(k)) columns.set(k, []); columns.get(k).push(e); }
  for (const [, col] of columns) {
    if (col.length < 3) continue;
    const bad = col.filter(e => !/tabular-nums/.test(cs(e).fontVariantNumeric));
    if (bad.length) add('tabular-nums', 'warn', bad[0], {column: col.length, without: bad.length, samples: bad.slice(0, 4).map(e => (e.innerText || '').trim())});
  }

  // ---------- reduced-motion (the context runs with prefers-reduced-motion: reduce) ----------
  const MOVING = /(^|,\s*)(all|transform|translate|scale|rotate|top|left|right|bottom|inset|margin[\w-]*|offset[\w-]*|width|height)(\s*,|$)/;
  const secs = (v) => Math.max(...v.split(',').map(x => (x.trim().endsWith('ms') ? parseFloat(x) / 1000 : parseFloat(x)) || 0));
  let motion = 0;
  for (const e of shown) {
    if (motion >= 15) break;
    const s = cs(e);
    if (secs(s.transitionDuration) > 0.01 && MOVING.test(s.transitionProperty)) { motion++; add('reduced-motion', 'fail', e, {transition: s.transitionProperty.slice(0, 60), duration: s.transitionDuration}); }
  }
  for (const a of document.getAnimations ? document.getAnimations() : []) {
    if (motion >= 15) break;
    const t = a.effect && a.effect.getTiming ? a.effect.getTiming() : {};
    const kf = a.effect && a.effect.getKeyframes ? a.effect.getKeyframes() : [];
    const moves = kf.some(k => ['transform', 'translate', 'scale', 'rotate', 'top', 'left', 'right', 'bottom', 'marginTop', 'marginLeft'].some(p => p in k));
    if (moves && (Number(t.duration) || 0) > 10 && a.playState !== 'finished') { motion++; add('reduced-motion', 'fail', a.effect.target || null, {animation: a.animationName || a.id || 'animation', duration: t.duration}); }
  }

  // ---------- html-lang and language leaks ----------
  const lang = (de.getAttribute('lang') || '').toLowerCase();
  if (!lang.startsWith(options.lang)) add('html-lang', 'fail', de, {lang, expected: options.lang}, `<html lang="${lang}">`);
  if (options.lang === 'es') {
    // English UI words that are not Spanish words. People data, brand names and marked-up English are left out.
    const EN = new Set(('the and your you with for from this that these those will would should could have has had are was were been be is not ' +
      'save cancel close back next done edit delete remove search settings schedule team home time payroll request requests open add new view ' +
      'today tomorrow yesterday week weeks month hours hour shift shifts people person sign out in up to of on off more less all none ' +
      'loading error try again approve approved decline declined pending send sent update updates notifications profile help account ' +
      'manager owner employee employees lead leads location locations please continue submit start stop clock break breaks pay statement statements ' +
      'what when where which who why how there here than then only also just about after before between during without ').split(/\s+/).filter(Boolean));
    const BRAND = /^(nevora|rondo|velani|workforce|stripe|csv|pdf|ok|id|pin|qa|am|pm)$/i;
    const leaks = [];
    for (const e of leaves) {
      if (e.closest('[lang^="en"],[translate="no"],[data-user-data],code,kbd,samp')) continue;
      const t = textNodesOf(e).map(n => n.textContent).join(' ');
      if (isPeople(t.trim())) continue;
      const words = t.split(/[^A-Za-zÀ-ÿ']+/).filter(w => w.length > 1 && !BRAND.test(w));
      const en = words.filter(w => EN.has(w.toLowerCase()) && !(options.peopleData || []).some(p => p.includes(w)));
      // One stray short word can be a name or a shared word: flag when the English share is real.
      if (en.length >= 2 || (en.length === 1 && words.length <= 2 && en[0].length >= 4)) leaks.push([e, en]);
    }
    for (const [e, en] of leaks.slice(0, 25)) add('spanish-leak', 'fail', e, {englishWords: en.slice(0, 6)});
  }
  return {findings, metrics};
}
