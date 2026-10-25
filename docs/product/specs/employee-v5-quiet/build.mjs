// node build.mjs Name [kitBlobUrl] -> v4/out/Name.html (inline CSS preview) and, with a blob url, canvas/project/V4Name.dc.html
import { readFileSync, writeFileSync } from "node:fs";
const here = new URL(".", import.meta.url).pathname;
const icons = JSON.parse(readFileSync(here + "icons.json", "utf8"));
const kitCss = readFileSync(here + "kit4.css", "utf8");
const icon = (n, k, c) => { if (!icons[n]) throw new Error("missing icon " + n); return `<svg class="ic${c ? " " + c : ""}" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">${icons[n][k]}</svg>`; };
const WM = "/_blob/435aebd8e4e820b753556533270c5517";
const WMLOCAL = "file://" + here + "nevora-wordmark.png";
const wordmark = (color, width, local) => { const src = local ? WMLOCAL : WM; const h = Math.round(width * 112 / 895);
  return `<svg role="img" aria-label="NEVORA" viewBox="5 4 895 112" width="${width}" height="${h}" style="display:block"><defs><filter id="wmc" color-interpolation-filters="sRGB" x="0" y="0" width="100%" height="100%"><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -1 0 0 0 1"></feColorMatrix><feComponentTransfer><feFuncA type="linear" slope="1.08"></feFuncA></feComponentTransfer></filter><mask id="wmm" maskUnits="userSpaceOnUse" x="0" y="0" width="907" height="122" style="mask-type:alpha"><image href="${src}" width="907" height="122" filter="url(#wmc)"></image></mask><clipPath id="wmy"><rect x="812" y="74" width="43" height="42"></rect></clipPath></defs><rect x="0" y="0" width="907" height="122" fill="${color}" mask="url(#wmm)"></rect><image href="${src}" width="907" height="122" filter="url(#wmc)" clip-path="url(#wmy)"></image></svg>`; };
const TABS = [["Home", "House"], ["Schedule", "CalendarBlank"], ["Inbox", "Tray"], ["Team", "UsersThree"], ["More", "DotsThreeCircle"]];
const ETABS = [["Home", "House"], ["Schedule", "CalendarBlank"], ["Requests", "ClipboardText"], ["Pay", "Receipt"], ["More", "DotsThreeCircle"]];
const etabs = a => `<nav class="tabs">${ETABS.map(([l, n]) => `<a${l === a ? ' class="on" aria-current="page"' : ""} href="#">${icon(n, l === a ? "fill" : "regular")}${l}</a>`).join("")}</nav>`;
const tabs = a => `<nav class="tabs">${TABS.map(([l, n]) => `<a${l === a ? ' class="on" aria-current="page"' : ""} href="#">${icon(n, l === a ? "fill" : "regular")}${l}</a>`).join("")}</nav>`;
const [name, blob] = process.argv.slice(2);
let src = readFileSync(here + "src/" + name + ".html", "utf8");
const meta = {}; src = src.replace(/^@(\w+) (.*)\n/gm, (_, k, v) => { meta[k] = v.trim(); return ""; });
let style = ""; src = src.replace(/<style>([\s\S]*?)<\/style>\n?/, (_, s) => { style = s.trim(); return ""; });
const base = src;
const render = local => base.replace(/\{\{wordmark:([^:}]+):(\d+)\}\}/g, (_, c, w) => wordmark(c, Number(w), local)).replace(/\{\{i:(\w+)(?::([\w ]+))?\}\}/g, (_, n, c) => icon(n, "regular", c))
  .replace(/\{\{f:(\w+)(?::([\w ]+))?\}\}/g, (_, n, c) => icon(n, "fill", c))
  .replace(/\{\{tabs:(\w+)\}\}/g, (_, a) => tabs(a)).replace(/\{\{etabs:(\w+)\}\}/g, (_, a) => etabs(a)).trim();
const srcLocal = render(true); src = render(false);
if (/\{\{/.test(src)) throw new Error("unreplaced token");
const title = meta.title || name;
writeFileSync(here + "out/" + name + ".html", `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=390"><title>${title}</title><style>${kitCss}\n${style}\nbody{background:#888}</style></head><body>${srcLocal}</body></html>`);
if (blob) writeFileSync(here + "../canvas/project/V5" + name + ".dc.html", `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<script src="./support.js"></script>
<link rel="stylesheet" href="${blob}">
</head>
<body>
<x-dc>
<helmet><style>body{margin:0}${style ? "\n" + style + "\n" : ""}</style></helmet>
${src}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":390,"height":844}}'>
class Component extends DCLogic {
renderVals() { return {}; }
}
</script>
</body>
</html>
`);
console.log("built", name, blob ? "+canvas" : "preview only");
