import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
import {unconfiguredPhotoNoticeProfile,unconfiguredPhotoPolicy} from '@/lib/clocker/photo-server/validation';
import {ClockerPhotoNoticeSettings} from './notice-settings';

it('edits only real assistance fields while keeping actual company name and verified lifecycle data read-only',()=>{
 const settings={companyName:'Fictional Company',policy:unconfiguredPhotoPolicy(),profile:unconfiguredPhotoNoticeProfile(),notice:null,readiness:'missing_profile' as const};
 const html=renderToStaticMarkup(<ClockerPhotoNoticeSettings initialSettings={settings} saveAction={vi.fn()} readAction={vi.fn()}/>);
 expect(html).toContain('Fictional Company');expect(html).toContain('Assistance contact');expect(html).toContain('Assistance instructions');
 expect(html).toContain('required=""');expect(html).toContain('Save assistance settings');expect(html).not.toContain('type="checkbox"');
 expect(html).toContain('does not publish a notice or activate photo collection');expect(html).not.toContain('immediately deleted');
});
it('does not turn a saved profile into a verified cleanup or backup promise',()=>{
 const settings={companyName:'Fictional Company',policy:unconfiguredPhotoPolicy(),profile:{version:1,assistanceContact:'Fictional Owner desk',assistanceInstructions:'Ask the fictional desk.'},notice:null,readiness:'lifecycle_unverified' as const};
 const html=renderToStaticMarkup(<ClockerPhotoNoticeSettings initialSettings={settings} saveAction={vi.fn()} readAction={vi.fn()}/>);
 expect(html).toContain('cleanup and backup details are still being verified');expect(html).toContain('photo collection remains unavailable');
});
