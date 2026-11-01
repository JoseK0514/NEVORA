import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
import {unconfiguredPhotoNoticeProfile,unconfiguredPhotoPolicy} from '@/lib/clocker/photo-server/validation';
import {ClockerPhotoNoticeSettings} from './notice-settings';

it('edits only real assistance fields while keeping the company name and verified lifecycle data read-only',()=>{
 const settings={companyName:'Fictional Company',policy:unconfiguredPhotoPolicy(),profile:unconfiguredPhotoNoticeProfile(),notice:null,readiness:'missing_profile' as const};
 const html=renderToStaticMarkup(<ClockerPhotoNoticeSettings initialSettings={settings} saveAction={vi.fn()} readAction={vi.fn()}/>);
 // Owner premium R13: a closed "Help for your team" row; the company name follows Company profile and is never a field.
 expect(html).toContain('Help for your team');expect(html).toContain('Not set yet');expect(html).not.toContain('name="companyName"');
 expect(html).toContain('Assistance contact');expect(html).toContain('Assistance instructions');
 expect(html).toContain('required=""');expect(html).toContain('Save help details');expect(html).not.toContain('Reload help details');expect(html).not.toContain('type="checkbox"');
 expect(html).toContain('Saving this doesn’t turn on photos or show a notice to your team.');expect(html).not.toContain('immediately deleted');
 expect(html).not.toContain('Your company name is missing');
});
it('does not turn a saved profile into a verified cleanup or backup promise',()=>{
 const settings={companyName:'Fictional Company',policy:unconfiguredPhotoPolicy(),profile:{version:1,assistanceContact:'Fictional Owner desk',assistanceInstructions:'Ask the fictional desk.'},notice:null,readiness:'lifecycle_unverified' as const};
 const html=renderToStaticMarkup(<ClockerPhotoNoticeSettings initialSettings={settings} saveAction={vi.fn()} readAction={vi.fn()}/>);
 expect(html).toContain('Fictional Owner desk');expect(html).toContain('Saving this doesn’t turn on photos');
 expect(html).not.toMatch(/cleanup|backup|deleted/i);
});
