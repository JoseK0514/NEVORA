import {build} from 'esbuild';
import {readFile, writeFile, mkdir, readdir} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const dest = resolve(process.argv[2] ?? join(here, 'component-library.html'));
const image = (await readFile(join(root, 'public/images/nevora-wordmark.png'))).toString('base64');
const inter = (await readFile(join(root, 'public/fonts/typeface/inter/variable.woff2'))).toString(
  'base64',
);
const mono = (
  await readFile(join(root, 'public/fonts/typeface/jetbrains-mono/variable.ttf'))
).toString('base64');
const tokens = await readFile(join(root, 'src/app/b-tokens.css'), 'utf8');
const result = await build({
  absWorkingDir: root,
  entryPoints: [join(here, 'gallery.tsx')],
  bundle: true,
  write: false,
  metafile: true,
  outdir: join(here, 'compiled'),
  jsx: 'automatic',
  target: ['es2022', 'safari17'],
  minify: true,
  charset: 'utf8',
  legalComments: 'inline',
  define: {'process.env.NODE_ENV': '"production"'},
  plugins: [
    {
      name: 'standalone-gallery',
      setup(b) {
        // Imported BAvatar and BBusyLabel receive local presentation in this gallery.
        b.onResolve({filter: /^\.\/owner-b\.css$/}, () => ({
          path: 'shell-css',
          namespace: 'gallery',
        }));
        b.onLoad({filter: /shell-css/, namespace: 'gallery'}, () => ({
          contents: '',
          loader: 'css',
        }));
        // The selected shared primitives render no Next links in this standalone entry.
        b.onResolve({filter: /^next\/link$/}, () => ({path: 'anchor', namespace: 'gallery'}));
        b.onLoad({filter: /anchor/, namespace: 'gallery'}, () => ({
          contents: 'export default "a"',
          loader: 'js',
        }));
      },
    },
  ],
});
const js = result.outputFiles
  .find(f => f.path.endsWith('.js'))
  .text.replace('__NEVORA_WORDMARK__', 'data:image/png;base64,' + image)
  .replace(/<\/script/gi, '<\\/script');
const css = result.outputFiles.find(f => f.path.endsWith('.css')).text;
// Carry the font and library licenses with an offline copy of the gallery.
const packages = new Set();
for (const output of Object.values(result.metafile.outputs)) {
  for (const [file, data] of Object.entries(output.inputs)) {
    const match = file.match(/^(.+?node_modules\/|node_modules\/)((?:@[^/]+\/)?[^/]+)/);
    if (match && data.bytesInOutput) packages.add(match[1] + match[2]);
  }
}
const notices = [];
for (const dir of [...packages].sort()) {
  const names = await readdir(join(root, dir));
  const license = names.find(name => /^licen[cs]e(\.(txt|md))?$/i.test(name));
  if (license)
    notices.push({
      name: dir.split('node_modules/').pop(),
      license: await readFile(join(root, dir, license), 'utf8'),
    });
}
for (const font of ['inter', 'jetbrains-mono'])
  notices.push({
    name: font,
    license: await readFile(join(root, 'public/fonts/typeface', font, 'OFL.txt'), 'utf8'),
  });
const licenseJson = JSON.stringify(notices).replaceAll('<', '\\u003c');
await mkdir(dirname(dest), {recursive: true});
await writeFile(
  dest,
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>Component library · NEVORA</title><style>@font-face{font-family:Inter;font-style:normal;font-weight:100 900;font-display:swap;src:url(data:font/woff2;base64,${inter}) format("woff2")}@font-face{font-family:"JetBrains Mono";font-weight:100 800;src:url(data:font/ttf;base64,${mono}) format("truetype")}:root{--design-font-mono:"JetBrains Mono"}${tokens}\n${css}</style></head><body><div id="root"></div><script type="application/json" id="third-party-notices">${licenseJson}</script><script>${js}</script></body></html>`,
);
console.log(dest);
