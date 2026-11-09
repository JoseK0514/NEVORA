import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {CoverageFigures,percentText} from './coverage-minutes';
import {summarizeCoverageMinutes} from '@/lib/scheduling/coverage-minutes';

// \s also folds the no-break spaces that keep each figure whole.
const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();

it('shows staffing, positions and lead apart from canonical coverage minutes, never summed',()=>{
 const html=text(renderToStaticMarkup(<CoverageFigures coverage={{state:'ready',staffing:{required:480,covered:240,percent:50},positions:{required:480,covered:360,percent:75},lead:{required:240,covered:0,percent:0}}}/>));
 expect(html).toContain('Staffing 50% 4 h of 8 h');
 expect(html).toContain('Positions 75% 6 h of 8 h');
 expect(html).toContain('Lead 0% 0 min of 4 h');
 expect(html).not.toMatch(/12 h|1200|125%/);
});
it('says "—" with no denominator and "Not set up" when coverage isn’t configured, never 0% or 100%',()=>{
 expect(percentText({required:0,covered:0,percent:null})).toBe('—');
 const html=text(renderToStaticMarkup(<CoverageFigures coverage={{state:'ready',staffing:{required:480,covered:480,percent:100},positions:{required:0,covered:0,percent:null},lead:{required:0,covered:0,percent:null}}}/>));
 expect(html).toContain('Positions — No positions required');
 expect(html).toContain('Lead — No lead required');
 const none=text(renderToStaticMarkup(<CoverageFigures coverage={summarizeCoverageMinutes([],false)}/>));
 expect(none).toBe('Coverage this week Not set up');
 expect(none).not.toMatch(/%/);
});
it('never rounds a shortfall up to 100% or a sliver down to 0%',()=>{
 expect(percentText({required:10000,covered:9990,percent:99.9})).toBe('99%');
 expect(percentText({required:10000,covered:10,percent:0.1})).toBe('<1%');
});
