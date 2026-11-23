// Z3 (A4-05, Nov 23, 2026): under forced colours (Windows contrast themes) Chromium drops backgrounds and shadows, so the
// switches, the branding swatch, the Add person step dots, the Clocker tablet rows' focus and "Add a passkey" vanished or
// lost their edges. The browser check (Chromium, emulateMedia forcedColors active) is the evidence; these guards keep the
// rules that fixed it.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from '@rstest/core';

const read = (path: string) => readFileSync(join(__dirname, '..', '..', path), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const forced = (css: string) => {
  const blocks: string[] = [];
  let at = css.indexOf('@media (forced-colors: active)');
  while (at >= 0) {
    let depth = 0, end = at;
    for (let index = css.indexOf('{', at); index < css.length; index++) {
      if (css[index] === '{') depth++;
      else if (css[index] === '}' && --depth === 0) { end = index; break; }
    }
    blocks.push(css.slice(at, end + 1));
    at = css.indexOf('@media (forced-colors: active)', end);
  }
  return blocks.join('\n');
};

describe('forced colours keep controls visible (Z3)', () => {
  it('draws Settings switches with a system-colour edge, thumb and Highlight when on', () => {
    const css = forced(read('src/app/app/settings/settings-b.css'));
    expect(css).toMatch(/\.c-switch:not\(#fc1\)[^{]*\{ border: 1px solid ButtonText !important; forced-color-adjust: none !important;/);
    expect(css).toMatch(/\.c-switch:not\(#fc1\)[^{]*::after \{ forced-color-adjust: none !important; background-color: ButtonText !important;/);
    expect(css).toMatch(/\.c-switch:is\(:checked, \[aria-checked="true"\]\)[^{]*\{ background-color: Highlight !important;/);
    expect(css).toMatch(/\.c-switch:disabled:checked[^{]*\{ background-color: GrayText !important; \}/);
    expect(css).toMatch(/:is\(\.c-setb-swatch, \.c-setb-swatches button\)[^{]*\{ forced-color-adjust: none !important; border: 1px solid CanvasText !important; \}/);
  });
  it('draws the Profile notification switches the same way', () => {
    const css = forced(read('src/components/manager-profile/manager-profile-upscale.css'));
    expect(css).toMatch(/\.pmp-switch-row > \.q-tog:not\(#fc1\)[^{]*\{ border: 1px solid ButtonText !important;/);
    expect(css).toMatch(/\.pmp-switch-row > \.q-tog\[aria-checked="true"\][^{]*\{ background-color: Highlight !important;/);
  });
  it('gives the Clocker tablet rows a focus outline and the setup code button an edge', () => {
    const css = forced(read('src/components/clocker-owner-b.css'));
    expect(css).toMatch(/\.ck-trow__main:focus-visible[^{]*\{ outline: 2px solid Highlight !important;/);
    expect(css).toMatch(/\.b-btn\.ck-trow__go[^{]*\{ border: 1px solid ButtonText !important; \}/);
  });
  it('keeps the Add person step dots and the Add a passkey button', () => {
    expect(forced(read('src/components/team/team-forms.css'))).toMatch(/\.c-formhead__dots > i \{ border: 1\.5px solid CanvasText; box-shadow: none; \}/);
    expect(forced(read('src/components/passkeys/passkeys.css'))).toMatch(/\.pk-add \{ border: 1px solid ButtonText; \}/);
  });
  it('shows which language is chosen on the Profile language switch', () => {
    const css = forced(read('src/components/employee-b/account.css'));
    expect(css).toMatch(/\.eb-lseg \{ border: 1px solid ButtonText; \}/);
    expect(css).toMatch(/\.eb-lseg button\[aria-pressed="true"\] \{ forced-color-adjust: none; background: Highlight; color: HighlightText; \}/);
  });
  it('keeps the billing and Clocker paused actions as buttons', () => {
    expect(forced(read('src/components/commerce-recovery/recovery.module.css'))).toMatch(/\.action, \.secondary, \.lang \{ border: 1px solid ButtonText; \}/);
  });
  it('keeps the page-loading bar and the skeleton blocks visible (shell and kit)', () => {
    expect(forced(read('src/app/app/corp-shell.css'))).toMatch(/\.c-progress > i \{ forced-color-adjust: none; background: Highlight; \}/);
    expect(forced(read('src/app/app/b-shimmer.css'))).toMatch(/\.b-screen\[data-b-load\] \.b-skel, \.b-skel-card \.b-skel,[^{]*\{ border: 1px solid GrayText; \}/);
    // Outside forced colours neither file draws these.
    for (const path of ['src/app/app/corp-shell.css', 'src/app/app/b-shimmer.css']) {
      const plain = read(path).replace(/@media \(forced-colors: active\) \{[\s\S]*?\n\}\n?/g, '');
      expect(plain).not.toMatch(/Highlight;|GrayText/);
    }
  });
});
