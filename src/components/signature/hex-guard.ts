import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/* Raw-hex guard for the Signature stylesheets (review section 3, item 4). Colours belong in tokens.css; a sheet reads
 * them with var(--sig-*). Custom-property declarations and comments are not counted (a token may be declared with a
 * literal value, and a fallback inside var(--sig-x, #...) is allowed). Everything else that spells a colour as #hex is. */

const SIGNATURE_SHEET = /(?:-signature\.module\.css|\/signature\/signature\.module\.css|\/signature\/system-state\.module\.css|\/employee-home-today\.module\.css|\/employee-my-schedule\.module\.css|\/request-hub\.module\.css|\/signature\/components\.css)$/;

export function signatureSheets(root: string): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) { if (name !== 'node_modules') walk(path); continue; }
      if (SIGNATURE_SHEET.test(path)) found.push(relative(root, path));
    }
  };
  walk(join(root, 'src'));
  return found.sort();
}

/** Raw hex colours in a stylesheet, ignoring comments, custom-property declarations and var() fallbacks. */
export function rawHexCount(css: string): number {
  const code = css.replace(/\/\*[\s\S]*?\*\//g, '');
  let count = 0;
  for (const declaration of code.split(/[;{}]/)) {
    if (/^\s*--[\w-]+\s*:/.test(declaration)) continue;
    const withoutFallbacks = declaration.replace(/var\(\s*--[\w-]+\s*,[^()]*(?:\([^()]*\)[^()]*)*\)/g, '');
    count += (withoutFallbacks.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).length;
  }
  return count;
}

export function readHexCounts(root: string): Record<string, number> {
  return Object.fromEntries(signatureSheets(root).map(file => [file, rawHexCount(readFileSync(join(root, file), 'utf8'))]));
}
