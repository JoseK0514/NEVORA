'use client';

import {useState, type MouseEvent, type ReactNode} from 'react';
import {AuthBrand} from '../auth-brand';
import {NavIcon} from '../nav-icon';
import {ActionMenu} from '../action-menu';
import {ManagerDashboard} from '../manager-dashboard';
import {ActionCenterSurface} from '../manager-action-center';
import {ClockMonitorCard} from '../manager-clock-monitor';
import {EmployeeHomeReviewedView} from '../employee-home-reviewed';
import {EmployeeTimeView} from '../employee-time-panel';
import {navigationForRole, managementNavigationGroups} from '@/lib/navigation';
import {NUVORA_BRAND} from '@/lib/brand';
import {ListIcon, UserCircleIcon, XIcon} from '@phosphor-icons/react/ssr';
import {homePreviewRecords, previewActionCenter, previewEmployeeHome, previewManagerHome, previewMonitor, previewOwnTime} from './home-fixtures';

type PreviewRole = 'OWNER' | 'MANAGER' | 'EMPLOYEE';
type Category = 'all' | 'scheduling' | 'requests' | 'timekeeping';

/** Uses the app's brand, navigation and CSS; never mounts its authenticated
 * shell, private readers, signout action or notification/device controllers. */
function PreviewShell({role, notice, children}: {role: PreviewRole; notice: (message: string) => void; children: ReactNode}) {
  const employee = role === 'EMPLOYEE';
  const navigation = navigationForRole(role);
  const profile = homePreviewRecords.people.find(person => person.id === (role === 'OWNER' ? 'QAOWNER' : role === 'MANAGER' ? 'AUDIT-M' : 'AUDIT-E'))!;
  const primary = employee ? navigation.filter(item => ['/app', '/app/schedule', '/app/my-time'].includes(item.href)) : navigation.slice(0, 5);
  const secondary = navigation.filter(item => !primary.includes(item));
  const navLink = (item: (typeof navigation)[number], mobile = false) => <a key={item.href} href={item.href}
    className={`${mobile ? 'mobile-nav-link' : 'nav-link'}${item.href === '/app' ? ' active' : ''}`}
    aria-current={item.href === '/app' ? 'page' : undefined}>
    <span className={mobile ? undefined : 'nav-icon'}><NavIcon name={item.icon} employee={employee} size={mobile ? 22 : 20}/></span>
    <span className={mobile ? undefined : 'nav-label'}>{item.href === '/app' ? 'Home' : item.href === '/app/schedule' ? 'Schedule' : mobile && item.href === '/app/exchange' ? 'Shifts' : item.label}</span>
  </a>;
  return <div className={`${employee ? 'app-shell employee-shell nevora-portal' : 'app-shell nevora-portal'} ui-preview-shell`}>
    <aside className="sidebar">
      <div className="sidebar-heading"><a href="/app" className="brand sidebar-brand" aria-label={NUVORA_BRAND.homeAriaLabel}><AuthBrand/></a></div>
      <nav className="sidebar-nav" aria-label="Primary navigation">
        {(employee ? [{label: '', items: navigation}] : managementNavigationGroups(navigation)).map(group => <div className="sidebar-nav-group" key={group.label}>
          {group.label ? <h2 className="sidebar-group-label">{group.label}</h2> : null}{group.items.map(item => navLink(item))}
        </div>)}
      </nav>
      <div className="sidebar-profile"><div className="avatar">{profile.first_name[0]}{profile.last_name[0]}</div><div className="sidebar-profile-copy"><strong>{profile.first_name} {profile.last_name}</strong></div></div>
      <div className="sidebar-platform-footer"><span>{homePreviewRecords.workspace.name}</span><small>{NUVORA_BRAND.poweredBy}</small></div>
    </aside>
    <main className="app-main">
      <header className="mobile-header">
        <span className="portal-workspace-name">{homePreviewRecords.workspace.name}</span>
        <a href="/app" className="brand compact" aria-label={NUVORA_BRAND.homeAriaLabel}><AuthBrand/></a>
        <div className="mobile-header-actions">
          <button type="button" className="portal-header-notifications" aria-label="Sample notifications" onClick={() => notice('This is a frozen sample. Notifications are not connected.')}><NavIcon name="notifications" size={22}/></button>
          {!employee ? <ActionMenu id="preview-manager-menu" label="Menu" ariaLabel="More navigation" triggerIcon={<><ListIcon className="management-menu-list-symbol" size={22} aria-hidden="true"/><UserCircleIcon className="mobile-home-menu-symbol" size={24} aria-hidden="true"/></>} iconOnly>
            {secondary.map(item => <a key={item.href} href={item.href} className="nevora-action-menu-item">{item.label}</a>)}
          </ActionMenu> : null}
        </div>
      </header>
      <div className="page-frame">{children}</div>
      <nav className="mobile-nav" aria-label="Mobile navigation">{primary.map(item => navLink(item, true))}
        {employee ? <><button type="button" popoverTarget="preview-employee-menu" className="mobile-nav-link employee-more-trigger" aria-label="More"><NavIcon name="more" employee size={22}/><span>More</span></button>
          <div id="preview-employee-menu" className="employee-more-navigation" popover="auto"><p className="employee-more-label">More</p>{secondary.map(item => <a key={item.href} href={item.href} className="employee-more-link"><NavIcon name={item.icon} employee size={22}/><span>{item.label}</span></a>)}
            <button type="button" className="mobile-workforce-sheet-close" aria-label="Close actions" onClick={event => event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover()}><XIcon size={20} aria-hidden="true"/><span>Close actions</span></button>
          </div></> : null}
      </nav>
    </main>
  </div>;
}

export function HomePreview() {
  const [role, setRole] = useState<PreviewRole>('OWNER');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<Category>('all');
  const [expanded, setExpanded] = useState(false);
  const refresh = () => setMessage('Sample data is frozen at October 13, 2026. No live records were requested.');
  function stayInPreview(event: MouseEvent<HTMLDivElement>) {
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!link) return;
    event.preventDefault(); event.stopPropagation();
    setMessage(`${link.getAttribute('aria-label') ?? link.textContent?.trim() ?? 'Navigation'} is outside this Home-only preview.`);
  }
  return <div onClickCapture={stayInPreview}>
    <div className="ui-preview-tools"><div><strong>Home preview</strong><p>Fictional data · No login or database needed</p></div>
      <label className="ui-preview-role">View <select aria-label="Preview account" value={role} onChange={event => {setRole(event.target.value as PreviewRole); setMessage(''); setCategory('all'); setExpanded(false);}}>
        <option value="OWNER">Owner</option><option value="MANAGER">Manager</option><option value="EMPLOYEE">Employee</option>
      </select></label>
    </div>
    {message ? <p role="status" className="ui-preview-notice">{message}</p> : null}
    <PreviewShell key={role} role={role} notice={setMessage}>
      {role === 'EMPLOYEE' ? <div className="employee-dashboard employee-home"><EmployeeHomeReviewedView home={previewEmployeeHome}
        status="ready" refreshing={false} onRetry={refresh} displayName="Alexandra"
        ownTimeSlot={<EmployeeTimeView compact state={{time: previewOwnTime, paused: false, refreshing: false}} onRefresh={refresh}/>}/></div>
        : <ManagerDashboard {...previewManagerHome} role={role} firstName={role === 'OWNER' ? 'Fictional' : 'Morgan'}
          overviewSlots={{actions: <ActionCenterSurface snapshot={previewActionCenter} connection="ready" timeZone={homePreviewRecords.workspace.time_zone}
            category={category} onCategoryChange={setCategory} expanded={expanded} onExpand={() => setExpanded(true)} onRefresh={refresh}/>,
          activity: <div className="manager-monitor-block"><ClockMonitorCard state={{monitor: previewMonitor, paused: false, refreshing: false}} onRefresh={refresh}/><a className="manager-attendance-link" href="/app?view=attendance"><NavIcon name="clock" size={18}/>Review attendance</a></div>}}/>}
    </PreviewShell>
  </div>;
}
