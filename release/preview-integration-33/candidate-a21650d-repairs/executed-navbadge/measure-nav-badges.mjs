// Passive browser measurement only. No navigation, DOM/style changes, or requests.
export async function measureNavBadges(page) {
  return page.evaluate(() => {
    const box = element => element?.getBoundingClientRect().toJSON() ?? null;
    const shown = element => {
      const r = element.getBoundingClientRect(), s = getComputedStyle(element);
      return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
    };
    const style = element => {
      const s = getComputedStyle(element);
      return Object.fromEntries(['fontSize','lineHeight','fontWeight','fontFamily','width','height','minWidth','minHeight','padding','border','boxSizing','position','top','left','right','bottom','overflowX','overflowY','whiteSpace','display','alignItems','justifyContent','flexShrink','gap'].map(key => [key,s[key]]));
    };
    const intersection = (a,b) => {
      const x = Math.max(a.left,b.left), y = Math.max(a.top,b.top);
      const width = Math.max(0,Math.min(a.right,b.right)-x), height = Math.max(0,Math.min(a.bottom,b.bottom)-y);
      return {x,y,width,height,area:width*height};
    };
    const textRects = element => {
      const result = [], walker = document.createTreeWalker(element,NodeFilter.SHOW_TEXT);
      for (let n=walker.nextNode(); n; n=walker.nextNode()) {
        if (!n.textContent.trim()) continue;
        const range = document.createRange(); range.selectNodeContents(n);
        result.push({text:n.textContent,rects:[...range.getClientRects()].map(r=>r.toJSON())});
      }
      return result;
    };
    const selector = element => element.tagName.toLowerCase()+(element.id?'#'+element.id:'.'+String(element.className?.baseVal??element.className).trim().split(/\s+/).join('.'));
    const links = [...document.querySelectorAll('.mobile-nav-link,.sidebar .nav-link')].filter(shown);
    const badges = [...document.querySelectorAll('.mobile-nav-count,.sidebar .nav-count')].filter(shown).map(badge => {
      const link = badge.closest('a'), bounds = box(badge), ranges = textRects(badge), ancestors = [];
      for (let e=badge.parentElement; e; e=e.parentElement) {
        const s=getComputedStyle(e);
        if (['hidden','clip','auto','scroll'].includes(s.overflowX)||['hidden','clip','auto','scroll'].includes(s.overflowY)) ancestors.push({selector:selector(e),box:box(e),clientWidth:e.clientWidth,clientHeight:e.clientHeight,scrollWidth:e.scrollWidth,scrollHeight:e.scrollHeight,overflowX:s.overflowX,overflowY:s.overflowY});
      }
      const neighbors = links.filter(e=>e!==link&&e.closest('.mobile-nav,.sidebar')===link?.closest('.mobile-nav,.sidebar')).map(e=>{
        const icons=[...e.querySelectorAll('svg')].filter(shown).map(icon=>({box:box(icon),pillIntersection:intersection(bounds,box(icon)),textRangeIntersections:ranges.flatMap(t=>t.rects.map(r=>({text:t.text,intersection:intersection(r,box(icon))})))}));
        return {label:e.getAttribute('aria-label')??e.textContent.trim(),href:e.getAttribute('href'),box:box(e),pillIntersection:intersection(bounds,box(e)),icons};
      });
      return {selector:selector(badge),text:badge.textContent.trim(),box:bounds,style:style(badge),textRanges:ranges,link:link?{label:link.getAttribute('aria-label'),href:link.getAttribute('href'),box:box(link),style:style(link),icons:[...link.querySelectorAll('svg')].filter(shown).map(icon=>({box:box(icon),pillIntersection:intersection(bounds,box(icon))}))}:null,clipAncestors:ancestors,neighbors};
    });
    return {observedAt:new Date().toISOString(),url:location.href,viewport:{width:innerWidth,height:innerHeight},rootFont:getComputedStyle(document.documentElement).fontSize,textStep:document.documentElement.dataset.textStep,badges,note:'Text Range rectangles are typographic bounds, not painted pixel outlines. Corroborate visible overlap/clipping with the same-state crop. aria-hidden badges are included when visually rendered.'};
  });
}
