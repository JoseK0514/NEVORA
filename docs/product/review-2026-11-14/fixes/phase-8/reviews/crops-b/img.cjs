// Usage:
//  node img.cjs crop <in> <out> x y w h [scale]
//  node img.cjs col <in> x y0 y1        -> prints non-white pixels on column x
//  node img.cjs row <in> y x0 x1        -> prints pixel runs on row y
const sharp = require('/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-CLAUDE-CODEX-COLLAB/d762c6df-53eb-43b4-836f-475a53cde009/scratchpad/wt/p8b/node_modules/sharp');
const [cmd, inp, ...a] = process.argv.slice(2);
(async () => {
  if (cmd === 'crop') {
    const [out, x, y, w, h, s] = a; const sc = Number(s || 2);
    await sharp(inp).extract({left: +x, top: +y, width: +w, height: +h}).resize({width: Math.round(+w * sc), kernel: 'nearest'}).toFile(out);
    return;
  }
  const {data, info} = await sharp(inp).removeAlpha().raw().toBuffer({resolveWithObject: true});
  const px = (x, y) => { const i = (y * info.width + x) * 3; return [data[i], data[i + 1], data[i + 2]]; };
  const hex = p => '#' + p.map(v => v.toString(16).padStart(2, '0')).join('');
  if (cmd === 'col') {
    const [x, y0, y1] = a.map(Number); let prev = null, start = y0;
    for (let y = y0; y <= y1; y++) { const h = hex(px(x, y)); if (h !== prev) { if (prev) console.log(`${start}-${y - 1} ${prev}`); prev = h; start = y; } }
    console.log(`${start}-${y1} ${prev}`);
  } else if (cmd === 'row') {
    const [y, x0, x1] = a.map(Number); let prev = null, start = x0;
    for (let x = x0; x <= x1; x++) { const h = hex(px(x, y)); if (h !== prev) { if (prev) console.log(`${start}-${x - 1} ${prev}`); prev = h; start = x; } }
    console.log(`${start}-${x1} ${prev}`);
  } else if (cmd === 'px') {
    const [x, y] = a.map(Number); console.log(hex(px(x, y)));
  }
})();
