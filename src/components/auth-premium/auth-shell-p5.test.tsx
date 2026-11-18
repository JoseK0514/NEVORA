import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
vi.mock('@/components/mobile-access/config.server',()=>({mobileAccessEnabled:()=>false}));
vi.mock('@/lib/legal/policies',async original=>({...(await original<typeof import('@/lib/legal/policies')>()),policiesVisible:()=>true}));
import {AUTH_COPY} from '@/lib/auth-copy';
import {AuthBackNav} from './auth-back-nav';
import {QuietAuthShell} from './auth-shell';
import {SignedOutFooter} from './signed-out-footer';
import {Greeting,greetingFor} from './greeting';
import {PasskeySignInView} from './passkey-slot';
import {PasswordInput} from './password-input';

/* Phase 5 (Nov 17, 2026): the shell every signed-out page shares (review-public PB-015, PB-018, PB-021, PB-031, PB-032,
 * PB-036, PB-037). Markup and styles only. */
const css=readFileSync(join(__dirname,'auth-b.css'),'utf8');

it.each(['en','es'] as const)('a sub-page keeps the wordmark and the language switch, with one way back per width, in %s (PB-021)',lang=>{
 const t=AUTH_COPY[lang],html=renderToStaticMarkup(<QuietAuthShell lang={lang} t={t} back="/login"><form/></QuietAuthShell>);
 const nav=html.slice(html.indexOf('<div class="q-nav q-auth__nav q-auth__nav--rows">'),html.indexOf('</div>',html.indexOf('q-auth__nav--rows')));
 // Reading order: the bar's way back, the wordmark, the language, then the phone's own row. The stylesheet displays
 // exactly one of the two links, so the keyboard order matches what is seen.
 expect(nav).toMatch(/q-auth__back--bar[\s\S]*q-auth__navmark[\s\S]*q-auth__lang[\s\S]*q-auth__back--row/);
 expect(nav.match(/<a [^>]*href="\/login"/g)).toHaveLength(2);
 expect(nav.match(new RegExp(`>${t.signInPill}</a>`,'g'))).toHaveLength(2);
 expect(css).toMatch(/@media \(min-width: 768px\) \{\s*[^{}]*\.q-auth__back--row:not\(#ab-none\) \{ display: none !important; \}/);
 expect(css).toMatch(/\.q-auth__nav--rows > \.q-auth__back--bar:not\(#ab-none\) \{ display: none !important; \}/);
 // Without a language (a caller that has none) the bar is as it was: one link.
 expect(renderToStaticMarkup(<AuthBackNav href="/login" label="Sign in"/>).match(/<a /g)).toHaveLength(1);
});

it.each([['en','© 2026 VELANI LLC · Privacy · Terms · Support'],['es','© 2026 VELANI LLC · Privacidad · Términos · Ayuda']] as const)('the legal line reads the same, with no "(en inglés)", in %s (PB-018; Phase 8: SignedOutFooter)',(lang,line)=>{
 const html=renderToStaticMarkup(<SignedOutFooter lang={lang}/>);
 expect(html.replace(/<span class="so-foot__dot" aria-hidden="true">·<\/span>/g,' · ').replace(/<[^>]+>/g,'')).toContain(line);
 expect(html).not.toContain('(en inglés)');
 expect(html).toContain('<span class="so-foot__owner">© 2026 VELANI LLC</span>');
});

it.each(['en','es'] as const)('the passkey button follows a centred "or", leads with its glyph, and a refusal leads with the alert icon, in %s (PB-031)',lang=>{
 const t=AUTH_COPY[lang];
 const view=(props:Partial<Parameters<typeof PasskeySignInView>[0]>)=>renderToStaticMarkup(<PasskeySignInView t={t} lang={lang} phone={false} busy={false} error={null} cancelled={false} {...props}/>);
 const idle=view({});
 expect(idle).toMatch(new RegExp(`^<div class="q-passkey"><p class="q-passkey__or"><span>${t.or}</span></p><button type="button" class="q-btn q-btn--sec"[^>]*><span class="q-passkey__label"><svg[^>]*aria-hidden="true"[\\s\\S]*?</svg>${t.passkeyDesktop}</span></button>`));
 expect(view({phone:true})).toContain(`</svg>${t.passkeyPhone}</span>`);
 expect(idle).not.toContain('q-passkey__icon');
 for(const error of ['not_found','rate_limited','unavailable','account_disabled'] as const){const html=view({error});expect(html.match(/class="q-passkey__icon"/g)).toHaveLength(1);expect(html).toMatch(/<svg[^>]*class="q-passkey__icon"[^>]*>[\s\S]*<\/svg><\/div><\/div>$/);}
 // One vocabulary (PB-030): "attempts", as on the password form.
 expect(t.passkeyRateLimited).toBe(lang==='en'?'Too many attempts. Wait a minute, then try again.':'Demasiados intentos. Espera un minuto e inténtalo de nuevo.');
 expect(css).toMatch(/\.q-passkey \.q-btn\.q-btn--sec:not\(#ab-none\) \{[^}]*min-height: 48px !important;[^}]*box-shadow: inset 0 0 0 1px var\(--b-teal\) !important;/);
});

it('a password field is never corrected, capitalised or spell-checked, and a caller sets the keyboard key (PB-037)',()=>{
 const html=renderToStaticMarkup(<PasswordInput quiet id="p" name="password" showLabel="Show password" autoComplete="new-password" enterKeyHint="next"/>);
 for(const attribute of ['autoCorrect="off"','autoCapitalize="none"','spellCheck="false"','autoComplete="new-password"','enterKeyHint="next"','type="password"'])expect(html).toContain(attribute);
});

it('the greeting keeps its line and never swaps for a first sign-in (PB-036)',()=>{
 const words=AUTH_COPY.en.greeting;
 expect(renderToStaticMarkup(<Greeting words={words} className=""/>)).toBe('<h1 class="" data-greeting="pending">Welcome back</h1>');
 expect(renderToStaticMarkup(<Greeting words={words} className="" first/>)).toBe('<h1 class="" data-greeting="first">Welcome</h1>');
 expect(renderToStaticMarkup(<Greeting words={AUTH_COPY.es.greeting} className="" first/>)).toContain('>Te damos la bienvenida<');
 expect(greetingFor(9,words)).toBe('Good morning');expect(greetingFor(18,AUTH_COPY.es.greeting)).toBe('Buenas tardes');
 // The hold is one step with no travel; the fade is offered only when motion is allowed.
 expect(css).toMatch(/\[data-greeting="pending"\] \{ animation: q-auth-greeting-hold 0s linear 1\.2s both; \}/);
 expect(css).toMatch(/@media \(prefers-reduced-motion: no-preference\) \{\s*[^{}]*\[data-greeting="ready"\] \{ animation: q-auth-greeting-in var\(--b-dur-hover\) var\(--b-ease-out\) both; \}/);
 expect(css).toMatch(/\.q-hd h1 \{ min-height: 1lh; \}/);
});

it('touch targets and the desktop rhythm are the shell\'s (PB-032, PB-028, PB-015)',()=>{
 expect(css).toMatch(/:is\(\.q-auth__lang, \.ma-language\):not\(#ab-none\)::after \{ inset: -6px 0; \}/);
 expect(css).toMatch(/\.q-auth__top:not\(#ab-none\) \{ padding-top: calc\(var\(--b-space-16\) \+ env\(safe-area-inset-top, 0px\)\) !important; \}/);
 expect(css).toMatch(/\.q-auth__links:not\(#ab-none\) \{ column-gap: var\(--b-space-20\) !important; margin: var\(--b-space-24\) var\(--b-space-16\) 0 !important; \}/);
 for(const rule of [/\.q-hd > p:not\(#ab-none\):not\(#ab-none2\) \{ margin-top: var\(--b-space-8\) !important; \}/,/\.q-hd:not\(#ab-none\):not\(#ab-none2\) \{ margin-bottom: var\(--b-space-24\) !important; \}/,/\.q-fl \+ \.q-fl:not\(#ab-none\):not\(#ab-none2\):not\(#ab-none3\) \{ margin-top: var\(--b-space-20\) !important; \}/,/\+ \.q-btn:not\(#ab-none\):not\(#ab-none2\):not\(#ab-none3\) \{ margin-top: var\(--b-space-24\) !important; \}/])expect(css).toMatch(rule);
});
