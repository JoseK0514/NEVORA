// Executed in the browser by locator.evaluate. Conservative sRGB bounds for
// solid/gradient backgrounds and alpha overlays. Unsupported paint fails closed.
export function measureRenderedContrast(element) {
  const rgba = text => {
    const match = text.match(/^rgba?\(([^)]+)\)$/);
    if (!match) throw Error('Unsupported computed color: ' + text);
    const values = match[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    if (values.length === 3) values.push(1);
    if (values.some(value => !Number.isFinite(value))) throw Error('Unsupported computed color');
    return values;
  };
  const over = (front, back) => front.slice(0, 3).map((v, i) => v * front[3] + back[i] * (1 - front[3])).concat(1);
  const luminance = color => color.slice(0, 3).map(v => {v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;}).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
  const layers = [], targetBounds = element.getBoundingClientRect();
  for (let node = element; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.opacity !== '1' || style.mixBlendMode !== 'normal' || style.filter !== 'none') throw Error('Unsupported compositing');
    const layer = {tag: node.tagName, color: style.backgroundColor, image: style.backgroundImage, bounds:node.getBoundingClientRect().toJSON(), overlays: []};
    for (const pseudo of ['::before', '::after']) {
      const p = getComputedStyle(node, pseudo);
      if (p.content === 'none' || p.display === 'none') continue;
      const box = node.getBoundingClientRect(), target = element.getBoundingClientRect();
      if (p.position !== 'absolute' || p.transform !== 'none') {
        if (p.backgroundImage !== 'none' || rgba(p.backgroundColor)[3] !== 0) throw Error('Unbounded pseudo paint');
        continue;
      }
      const width = parseFloat(p.width), height = parseFloat(p.height);
      const left = p.left !== 'auto' ? box.left + parseFloat(p.left) : box.right - parseFloat(p.right) - width;
      const top = p.top !== 'auto' ? box.top + parseFloat(p.top) : box.bottom - parseFloat(p.bottom) - height;
      if (![left,top,width,height].every(Number.isFinite)) throw Error('Unbounded pseudo geometry');
      if (left + width > target.left && left < target.right && top + height > target.top && top < target.bottom) layer.overlays.push({color:p.backgroundColor,image:p.backgroundImage});
    }
    layers.push(layer);
  }
  const colors = layer => {
    if (layer.image === 'none') return [rgba(layer.color)];
    if (!/^(linear|radial)-gradient\(/.test(layer.image) || /url\(|color\(|oklab|oklch|in srgb/i.test(layer.image)) throw Error('Unsupported background image');
    const stops = layer.image.match(/rgba?\([^)]+\)/g);
    if (!stops?.length) throw Error('Unmeasured gradient');
    if (layer.image.startsWith('linear-gradient') && layer.bounds) {
      const match = layer.image.match(/^linear-gradient\(([-\d.]+)deg, (rgba?\([^)]+\)) ([\d.]+)%, (rgba?\([^)]+\)) ([\d.]+)%\)$/);
      if (!match) throw Error('Unsupported linear gradient geometry');
      const angle=Number(match[1])*Math.PI/180,dx=Math.sin(angle),dy=-Math.cos(angle),b=layer.bounds;
      const length=Math.abs(b.width*dx)+Math.abs(b.height*dy),start=Number(match[3])/100,end=Number(match[5])/100;
      if (!(length>0&&end>start)) throw Error('Unsupported gradient range');
      const positions=[targetBounds.left,targetBounds.right].flatMap(x=>[targetBounds.top,targetBounds.bottom].map(y=>((x-b.left-b.width/2)*dx+(y-b.top-b.height/2)*dy)/length+.5));
      const a=rgba(match[2]),z=rgba(match[4]);
      // Alpha gradients interpolate premultiplied colors. Bound the full stop
      // range instead of narrowing with unpremultiplied channel interpolation.
      if (a[3] !== z[3]) return [a,z];
      return [Math.min(...positions),Math.max(...positions)].map(t=>{const f=Math.max(0,Math.min(1,(t-start)/(end-start)));return a.map((v,i)=>v+(z[i]-v)*f);});
    }
    return stops.map(rgba);
  };
  const paint = (layer, backgrounds) => {
    // CSS paints background-color beneath background-image on the same box.
    const base = backgrounds.map(back => over(rgba(layer.color), back));
    return layer.image === 'none' ? base : colors(layer).flatMap(front => base.map(back => over(front, back)));
  };
  let backgrounds = [[255,255,255,1]];
  for (const layer of layers.slice().reverse()) {
    backgrounds = paint(layer, backgrounds);
    for (const overlay of layer.overlays) backgrounds = [ ...backgrounds, ...paint(overlay, backgrounds) ];
    // All sRGB interpolants lie within these channel bounds. Their extreme
    // luminances bound contrast while the foreground stays outside their range.
    backgrounds = [0,1].map(high => [0,1,2].map(i => Math[high?'max':'min'](...backgrounds.map(c => c[i]))).concat(1));
  }
  const foreground = rgba(getComputedStyle(element).color);
  const samples = backgrounds.map(background => {
    const rendered = over(foreground, background), a = luminance(rendered), b = luminance(background);
    return {foreground:rendered,background,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
  });
  const lighter=samples.every(s=>luminance(s.foreground)>luminance(s.background));
  const darker=samples.every(s=>luminance(s.foreground)<luminance(s.background));
  if (!lighter&&!darker) throw Error('Foreground crosses background bounds; measurement unsupported');
  return {ratio:Math.min(...samples.map(s=>s.ratio)),samples,layers,method:'conservative sRGB gradient bounds with alpha compositing'};
}
