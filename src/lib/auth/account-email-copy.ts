/** PB-022: one bilingual message, branded HTML and an equivalent text fallback.
 * No tracking or shortened links. Callers provide current workspace/issued-proof facts. */
export type AccountEmailContext = {companyName:string;firstName?:string|null;expiresAt?:string;timeZone?:string};
export type AccountEmail = {subject:string;text:string;html:string};
const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
function textValue(value:string,max:number):string{if(!value.trim()||value.length>max||/[\u0000-\u001f\u007f]/.test(value))throw Error('Invalid account email context');return value.trim();}
function safeLink(value:string):URL{const url=new URL(value);if(url.username||url.password||!(url.protocol==='https:'||(url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname))))throw Error('Invalid account email link');return url;}
function deadline(context:AccountEmailContext|undefined,lang:'en'|'es'):string{
 if(!context?.expiresAt)return '';
 const date=new Date(context.expiresAt);if(!Number.isFinite(date.getTime()))throw Error('Invalid account email expiry');
 const label=new Intl.DateTimeFormat(lang==='en'?'en-US':'es-PR',{dateStyle:'medium',timeStyle:'short',timeZone:context.timeZone??'UTC'}).format(date);
 return `\n${lang==='en'?'Use it before':'Úsalo antes de'} ${label} (${context.timeZone??'UTC'}).`;
}
function build(link:string,subjects:[string,string],bodies:[string,string],buttons:[string,string],context?:AccountEmailContext):AccountEmail{
 const url=safeLink(link),company=context?textValue(context.companyName,200):null;
 const person=context?.firstName?textValue(context.firstName,160):null;
 const subject=company&&!subjects[0].startsWith(company)?`${company}: ${subjects[0]} / ${subjects[1]}`:`${subjects[0]} / ${subjects[1]}`;
 const sections=bodies.map((body,i)=>`${person?(i===0?`Hi ${person},`:`Hola, ${person}:`)+'\n\n':''}${body}`);
 const section=(i:number)=>`<section lang="${i===0?'en':'es'}" style="padding:28px 28px 30px"><h1 style="font-size:23px;line-height:1.3;margin:0 0 18px;color:#173c3a">${escapeHtml(subjects[i])}</h1>${sections[i].split('\n\n').map(p=>p===link?`<p style="margin:24px 0"><a href="${escapeHtml(link)}" style="display:inline-block;background:#0B6E69;color:#fff;text-decoration:none;padding:14px 22px;border-radius:24px;font-weight:600">${escapeHtml(buttons[i])}</a></p><p style="font-size:12px;overflow-wrap:anywhere;word-break:break-word;color:#566460">${escapeHtml(link)}</p>`:`<p style="margin:0 0 16px;line-height:1.6;white-space:pre-line">${escapeHtml(p)}</p>`).join('')}</section>`;
 const logo=new URL('/images/nevora-wordmark.png',url.origin).href;
 return {subject,text:`${company?company+'\n\n':''}${sections[0]}\n\n—\n\n${sections[1]}`,html:`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head><body style="margin:0;background:#F2F5F4;color:#243734;font-family:Inter,Arial,sans-serif;overflow-wrap:anywhere;word-break:break-word"><table role="presentation" style="width:100%;table-layout:fixed;font-family:Inter,Arial,sans-serif;border:0;border-spacing:0"><tr><td style="padding:24px 12px"><table role="presentation" style="width:100%;max-width:580px;table-layout:fixed;font-family:Inter,Arial,sans-serif;margin:auto;border-spacing:0;background:#fff;border-radius:22px"><tr><td><div style="padding:28px;background:#e3f0ec;border-radius:22px 22px 0 0"><img src="${escapeHtml(logo)}" width="148" alt="NEVORA" style="display:block;max-width:100%;height:auto">${company?`<p style="margin:14px 0 0;font-size:15px;color:#173c3a">${escapeHtml(company)}</p>`:''}</div>${section(0)}<hr style="border:0;border-top:1px solid #dce5e1;margin:0 28px">${section(1)}</td></tr></table></td></tr></table></body></html>`};
}
export function invitationEmail(link:string,employeeId?:string,context?:AccountEmailContext):AccountEmail{
 const id=employeeId?textValue(employeeId,200):null,company=context?textValue(context.companyName,200):null;
 return build(link,company?[`${company} invited you to NEVORA`,`${company} te invitó a NEVORA`]:['Activate your NEVORA account','Activa tu cuenta de NEVORA'],[
  `${company??'Your company'} uses NEVORA for schedules, hours and pay. Set up your account to see yours. This link works once and expires in 7 days.${deadline(context,'en')}\n\n${link}\n\n${id?`Employee ID: ${id}\n\n`:''}Choose your password, then sign in normally. If you did not expect this invitation, contact your company.`,
  `${company??'Tu empresa'} usa NEVORA para horarios, horas y pago. Configura tu cuenta para ver los tuyos. Este enlace funciona una sola vez y vence en 7 días.${deadline(context,'es')}\n\n${link}\n\n${id?`ID de empleado: ${id}\n\n`:''}Elige tu contraseña y luego inicia sesión como siempre. Si no esperabas esta invitación, comunícate con tu empresa.`,
 ],['Set up my account','Configurar mi cuenta'],context);
}
export function recoveryEmail(link:string,context?:AccountEmailContext):AccountEmail{
 const company=context?textValue(context.companyName,200):'NEVORA';
 return build(link,['Reset your NEVORA password','Restablece tu contraseña de NEVORA'],[
  `A password reset was requested for your ${company} account. This link works once and expires 15 minutes after it was requested.${deadline(context,'en')}\n\n${link}\n\nIf you did not request this, keep your existing password and contact your manager.`,
  `Se pidió restablecer la contraseña de tu cuenta de ${company}. Este enlace es de un solo uso y vence en 15 minutos desde que se solicitó.${deadline(context,'es')}\n\n${link}\n\nSi no lo pediste, conserva tu contraseña actual y comunícate con tu gerente.`,
 ],['Reset password','Restablecer contraseña'],context);
}
export function passwordChangedEmail(origin:string,context?:AccountEmailContext):AccountEmail{
 const link=safeLink(origin).origin+'/login',company=context?textValue(context.companyName,200):'NEVORA';
 return build(link,['Your NEVORA password was changed','Se cambió tu contraseña de NEVORA'],[
  `The password for your ${company} account was just changed, and every device was signed out.\n\nIf you did this, there's nothing else to do. If you didn't, contact your company right away.\n\n${link}`,
  `Se acaba de cambiar la contraseña de tu cuenta de ${company} y se cerró la sesión en todos los dispositivos.\n\nSi fuiste tú, no tienes que hacer nada más. Si no fuiste tú, comunícate de inmediato con tu empresa.\n\n${link}`,
 ],['Sign in','Iniciar sesión'],context);
}
