export function collectionPolicy(cell){
 const critical=['320','390','844x390','1440'].includes(cell.size),desktop=['768','1024'].includes(cell.size),primary=['QAOWNER','AUDIT-M','AUDIT-LEAD','AUDIT-E','AUDIT-LONG','payroll-qa-owner','payroll-qa-reviewer'].includes(cell.account);
 if(cell.engine==='chromium'&&(critical||desktop&&['QAOWNER','AUDIT-M','payroll-qa-reviewer'].includes(cell.account)))return {purpose:'five-area-measurement-input',screenshots:primary&&critical&&[100,200].includes(cell.text)};
 if(cell.engine==='webkit'&&(cell.size==='390'&&[100,200].includes(cell.text)||cell.size==='320'&&cell.text===200))return {purpose:'webkit-spot-measurement-input',screenshots:primary};
 return null;
}
