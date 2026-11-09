import {createElement,type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {it,expect,vi} from 'vitest';
import {BlockView} from './legal-document';
vi.mock('next/link',()=>({default:({children,...props}:ComponentProps<'a'>)=>createElement('a',props,children)}));
const block={p:[{href:'/privacy',text:'Privacy Policy'},{href:'/terms',text:'Terms of Use'},{href:'/support',text:'Support'},{href:'/account-deletion',text:'Account deletion'},{href:'/forgot-access',text:'Forgot access'},{href:'mailto:support@example.invalid',text:'Email'}]};
it('contextual Employee policy links use fixed protected destinations without changing public defaults',()=>{
 const mobile=renderToStaticMarkup(<BlockView block={block} context="employee"/>);
 for(const path of ['privacy','terms','support','account-deletion'])expect(mobile).toContain('href="/app/profile/'+path+'"');
 expect(mobile).toContain('href="/forgot-access"');expect(mobile).toContain('href="mailto:support@example.invalid"');
 const publicPage=renderToStaticMarkup(<BlockView block={block}/>);
 for(const path of ['privacy','terms','support','account-deletion'])expect(publicPage).toContain('href="/'+path+'"');
 expect(publicPage).not.toContain('/app/profile/');
});
