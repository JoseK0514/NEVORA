import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {POLICY_DOCUMENTS,POLICY_FACTS,POLICY_OPERATOR,policiesVisible} from '@/lib/legal/policies';
import {BlockView,shortTitle} from '@/components/legal/legal-document';
import {EmployeeProfileDocumentFrame} from '@/components/employee-mobile/profile';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';

export default async function EmployeePolicyPage({params}:{params:Promise<{document:string}>}){
 if(!policiesVisible())notFound();
 const {document}=await params,doc=POLICY_DOCUMENTS.find(item=>item.slug===document);if(!doc)notFound();
 const proof=await requireSessionMutationProof();if(!['EMPLOYEE','LEAD'].includes(proof.employee.role))redirect('/app/profile');
 const sub=doc.effective?`Effective ${POLICY_FACTS.EFFECTIVE_DATE??'[CONFIRM_EFFECTIVE_DATE]'} · ${POLICY_OPERATOR}`:POLICY_OPERATOR;
 return <EmployeeProfileDocumentFrame title={doc.title} sub={sub} back={'/app/profile#profile-'+(doc.slug==='account-deletion'?'privacy':doc.slug)}>
  <p className="em-document-summary">{doc.summary}</p>
  {doc.sections.map((section,index)=><details className="em-document-section" key={section.heading} open={index===0}>
   <summary><span>{section.heading}</span><CaretDownIcon size={20} aria-hidden="true"/></summary>
   <div>{section.blocks.map((block,index)=><BlockView key={index} block={block} context="employee"/>)}</div>
  </details>)}
  {doc.slug==='account-deletion'?<p><Link className="em-request-secondary" href="/app/account/delete">Review deletion request</Link></p>:null}
  <nav className="em-document-links" aria-label="NEVORA policies and help">{POLICY_DOCUMENTS.map(other=>other.slug===doc.slug?<span key={other.slug} aria-current="page">{shortTitle(other)}</span>:<Link key={other.slug} href={'/app/profile/'+other.slug}>{shortTitle(other)}</Link>)}</nav>
 </EmployeeProfileDocumentFrame>;
}
