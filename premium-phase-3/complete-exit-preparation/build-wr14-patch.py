import subprocess,pathlib,difflib,json
root=pathlib.Path('/workspace/NEVORA');out=pathlib.Path(__file__).parent;base='e8e947eafabc61b9ed62a08c1762e8c896737c0b';patch='';files=[]
def edit(p,fn):
 global patch
 a=subprocess.check_output(['git','show',f'{base}:{p}'],cwd=root,text=True);b=fn(a);assert a!=b,p;patch+=''.join(difflib.unified_diff(a.splitlines(True),b.splitlines(True),fromfile='a/'+p,tofile='b/'+p));files.append(p)
def change(s,a,b):
 assert a in s,a
 return s.replace(a,b,1)
def updates(s):
 a='<button type="button" className="updates-refresh" disabled={paused || refreshing} onClick={onRefresh}><NavIcon name="refresh" /><span>{refreshing ? \'Checking…\' : unavailableReason && unavailableReason !== \'access_denied\' ? \'Try again\' : \'Refresh\'}</span></button>'
 b='{unavailableReason !== \'access_denied\' ? <button type="button" className={unavailableReason ? "nv-btn" : "updates-refresh"} data-kind={unavailableReason ? "primary" : undefined} disabled={paused || refreshing} onClick={onRefresh}><NavIcon name="refresh" /><span>{refreshing ? \'Checking…\' : unavailableReason ? \'Try again\' : \'Refresh\'}</span></button> : null}'
 return change(s,a,b)
edit('src/components/employee-updates.tsx',updates)
def cards(s):
 a='<button type="button" className={corporate?employeeButtonClass(\'secondary\',\'button secondary\'):\'button secondary\'} aria-label={readFailed?\'Try again to load timecards\':\'Refresh timecards\'} disabled={paused||busy} onClick={()=>void refresh(period)}>{readFailed?\'Try again\':corporate?'
 b='{!signInRequired?<button type="button" className={corporate?employeeButtonClass(readFailed?\'primary\':\'secondary\',readFailed?\'button primary\':\'button secondary\'):readFailed?\'button primary\':\'button secondary\'} aria-label={readFailed?\'Try again to load timecards\':\'Refresh timecards\'} disabled={paused||busy} onClick={()=>void refresh(period)}>{readFailed?<><NavIcon name="refresh" size={18}/>Try again</>:corporate?'
 s=change(s,a,b)
 s=change(s,"<span className={styles.phoneCopy}>Refresh</span></>}</button>","<span className={styles.phoneCopy}>Refresh</span></>}</button>:null}")
 return change(s,'<Link href="/login">Sign in</Link>','<Link className="nv-btn" data-kind="primary" href="/login">Sign in</Link>')
edit('src/components/timecards.tsx',cards)
edit('src/components/payroll/payroll-ui.tsx',lambda s:change(s,'className="pw-button pw-secondary" onClick={() => { retry();','className="pw-button" onClick={() => { retry();'))
edit('src/components/notification-inbox.tsx',lambda s:change(s,'{denied?<Link className={styles.refresh} href="/login">Sign in</Link>','{denied?<Link className="nv-btn" data-kind="primary" href="/login">Sign in</Link>'))
def home(s):
 s=change(s,'<EmployeeTimeView compact state={{','<EmployeeTimeView compact showRecovery={false} state={{')
 return change(s,'<Link className={styles.textLink} href="/login">Sign in <Arrow forward/></Link>','<Link className="nv-btn" data-kind="primary" href="/login">Sign in <Arrow forward/></Link>')
edit('src/components/employee-home-reviewed.tsx',home)
def time(s):
 s=change(s,'{state,compact=false,corporate=false,onRefresh}:{state:EmployeeTimePanelState;compact?:boolean;corporate?:boolean;onRefresh:()=>void}','{state,compact=false,corporate=false,showRecovery=true,onRefresh}:{state:EmployeeTimePanelState;compact?:boolean;corporate?:boolean;showRecovery?:boolean;onRefresh:()=>void}')
 s=change(s,'{denied?<Link className={corporate?employeeButtonClass', '{showRecovery?(denied?<Link className={corporate?employeeButtonClass')
 return change(s,"{unavailable?'Try again':'Refresh'}</button>}","{unavailable?'Try again':'Refresh'}</button>):null}")
edit('src/components/employee-time-panel.tsx',time)
(out/'P3-WR-14-recovery-controls.patch').write_text(patch)
(out/'P3-WR-14-recovery-controls.json').write_text(json.dumps({'finding':'P3-WR-14','base':base,'sourceCitation':'docs/product/specs/premium-phase-3/inspection/widths-roles-consistency.md:1063 on227150b','files':files,'scope':['Updates failed-read retry uses primary kit action and existing icon; signed-out toolbar refresh hidden.','Timecards failed-read retry primary with refresh icon; signed-out refresh hidden and existing Signin primary.','MyPay primary retry by removing secondary class from shared PayrollState; manager PayrollState already primary via existingCSS. No pay/legal/copy change.','Notifications existing Signin link uses primary kit control.','Home signed-out footer Signin primary; Home placeholder compact clock omits redundant recovery while Mytime link stays and globalHome recovery stays. New optional showRecovery prop defaults true everywhere else.','All existing authority/lifecycle/command paths unchanged; no auth/period validation change.','Apply after WR12 may require resolving adjacent imports/employee-time-view parameter and clock JSX context, preserving both changes.','No source edit or runtime/test executed.'],'applicationFilesEdited':False,'testsOrRuntimeRun':False},indent=2)+'\n')
print('\n'.join(files))
