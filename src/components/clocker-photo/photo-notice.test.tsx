import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import type {PhotoNotice} from '@/lib/clocker/photo-server/contracts';
import {unconfiguredPhotoPolicy} from '@/lib/clocker/photo-server/validation';
import {ClockerPresentation} from '../clocker-language';
import {ClockerPhotoNotice} from './photo-notice';

const policy={...unconfiguredPhotoPolicy(),version:4,enabled:true,retentionDays:12};
const notice:PhotoNotice={policyVersion:4,profileVersion:1,companyName:'Fictional & Co',retentionDays:12,
 assistanceContact:'Fictional Owner desk',assistanceInstructions:'Ask the fictional desk for an assisted clock action.',
 cleanupDisclosure:'Fictional byte removal follows the configured test cleanup schedule.',
 backupDisclosure:'Fictional test backups have a separately verified retention period.'};
it('renders actual company retention, Owner-only access and assistance before camera access',()=>{
 const html=renderToStaticMarkup(<ClockerPhotoNotice policy={policy} notice={notice}/>);
 expect(html).toContain('Fictional &amp; Co');expect(html).toContain('12 days');expect(html).toContain('authorized Owner');
 expect(html).toContain('View photo notice');expect(html).toContain('Get help');expect(html).toContain(notice.assistanceContact);
 expect(html).toContain(notice.assistanceInstructions);expect(html).toContain(notice.cleanupDisclosure);expect(html).toContain(notice.backupDisclosure);
 expect(html).not.toContain('type="checkbox"');expect(html).not.toContain('Open camera');expect(html).not.toContain('immediately deleted');
});
it.each([null,{...notice,policyVersion:5},{...notice,retentionDays:30},{...notice,assistanceContact:'[assistance contact]'}])('does not publish unavailable or stale company notice data: %j',value=>{
 const html=renderToStaticMarkup(<ClockerPhotoNotice policy={policy} notice={value}/>);
 expect(html).toContain('company photo notice is unavailable');expect(html).not.toContain('Fictional &amp; Co');expect(html).not.toContain('Fictional Owner desk');
});

it('uses the same complete Spanish language as the shared PIN screen',()=>{const html=renderToStaticMarkup(<ClockerPresentation v2 initialLocale="es"><ClockerPhotoNotice policy={policy} notice={notice}/></ClockerPresentation>);expect(html).toContain('Ver aviso de fotos');expect(html).toContain('12 días');expect(html).not.toContain('View photo notice');expect(html).toContain(notice.assistanceInstructions);});
