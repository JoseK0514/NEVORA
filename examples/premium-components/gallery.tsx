import {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Mark, Navigation, Select, Toast, type NavItem} from '../../src/components/premium';
import {Controls, Forms} from './controls-demo';
import {Feedback, NavigationDemo} from './feedback-demo';
import {Overview, Records} from './records-demo';
import {ClockerDemo} from './clocker-demo';
import {StyleReview} from './style-review';
import './studio.css';

const pages = [
  {
    id: 'compare',
    title: 'Compare styles',
    heading: 'Compare component styles',
    icon: 'controls',
    detail:
      'Try four designs for each component. Pick your favorites and download the list for Claude.',
  },
  {
    id: 'overview',
    title: 'Overview',
    heading: 'Component library',
    icon: 'overview',
    detail: 'Explore the shared controls and workflows for NEVORA Workforce.',
  },
  {
    id: 'controls',
    title: 'Controls',
    heading: 'Controls',
    icon: 'controls',
    detail: 'Buttons, switches and selection in their working states.',
  },
  {
    id: 'forms',
    title: 'Forms',
    heading: 'Forms and inputs',
    icon: 'form',
    detail: 'Edit a shift to try validation, saving and discarding changes.',
  },
  {
    id: 'feedback',
    title: 'Feedback',
    heading: 'Status and feedback',
    icon: 'feedback',
    detail: 'Loading, warnings, saved states and recovery.',
  },
  {
    id: 'navigation',
    title: 'Navigation',
    heading: 'Navigation and menus',
    icon: 'options',
    detail: 'Try the phone tabs, desktop rail, search filters and action sheet.',
  },
  {
    id: 'records',
    title: 'People and records',
    heading: 'People and records',
    icon: 'people',
    detail: 'Review approvals, scheduled shifts, timecards and pay.',
  },
  {
    id: 'clocker',
    title: 'Clocker tablet',
    heading: 'Clocker tablet',
    icon: 'clocker',
    detail: 'Try a punch, take a break or recover an unconfirmed action.',
  },
] as const;
const nav: NavItem[] = pages.map(p => ({...p, href: '#' + p.id}));
function current() {
  const id = location.hash.slice(1).split('/')[0];
  return pages.some(p => p.id === id) ? id : 'compare';
}
function Gallery() {
  const [id, setId] = useState(current),
    [toast, setToast] = useState(''),
    heading = useRef<HTMLHeadingElement>(null);
  function go(next: string) {
    if (next !== id && pages.some(p => p.id === next)) location.hash = next;
  }
  useEffect(() => {
    const change = (event: HashChangeEvent) => {
      if (new URL(event.oldURL).hash.split('/')[0] === new URL(event.newURL).hash.split('/')[0])
        return;
      setId(current());
      setToast('');
      window.scrollTo(0, 0);
      requestAnimationFrame(() => heading.current?.focus({preventScroll: true}));
    };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  const page = pages.find(p => p.id === id) ?? pages[0];
  useEffect(() => {
    document.title = page.heading + ' · NEVORA';
  }, [page]);
  return (
    <div className="np-kit studio">
      <a
        className="studio-skip"
        href="#library-content"
        onClick={e => {
          e.preventDefault();
          heading.current?.focus();
        }}
      >
        Skip to components
      </a>
      <aside className="studio-side">
        <div className="studio-brand">
          <img src="__NEVORA_WORDMARK__" alt="NEVORA" />
          <span>Design library</span>
        </div>
        <div className="studio-side-nav">
          <div className="studio-group-name">Library</div>
          <Navigation
            items={nav.slice(0, 6)}
            current={id}
            label="Component library"
            onNavigate={go}
          />
          <div className="studio-group-name">Workflows</div>
          <Navigation
            items={nav.slice(6)}
            current={id}
            label="Workforce examples"
            onNavigate={go}
          />
        </div>
        <div className="studio-env">
          <span className="studio-env-mark">
            <Mark name="shield" size={18} />
          </span>
          <div>
            <b>Preview workspace</b>
            <small>Fictional data · local only</small>
          </div>
        </div>
      </aside>
      <main className="studio-main" id="library-content">
        <header className="studio-top">
          <span>
            <Mark name="book" weight="duotone" size={18} />
            Workforce <i>/</i> <b>{page.title}</b>
          </span>
          <span className="studio-local">
            <i />
            Local preview
          </span>
        </header>
        <div className="studio-mobile-nav">
          <Select label="Library section" value={id} onChange={e => go(e.target.value)}>
            {nav.map(n => (
              <option key={n.id} value={n.id}>
                {n.title}
              </option>
            ))}
          </Select>
        </div>
        <div className="studio-content">
          <header className="studio-heading">
            <h1 ref={heading} tabIndex={-1}>
              {page.heading}
            </h1>
            <p>{page.detail}</p>
            {id !== 'compare' && (
              <a
                className="nv-compare-link"
                href={
                  '#compare/' +
                  ({
                    overview: 'glass',
                    controls: 'button',
                    forms: 'field',
                    feedback: 'notice',
                    navigation: 'navigation',
                    records: 'timecard',
                    clocker: 'punch',
                  }[id] || 'button')
                }
              >
                Compare styles <Mark name="right" size={14} weight="bold" />
              </a>
            )}
          </header>
          {id === 'compare' ? (
            <StyleReview />
          ) : id === 'overview' ? (
            <Overview go={go} tell={setToast} />
          ) : id === 'controls' ? (
            <Controls tell={setToast} />
          ) : id === 'forms' ? (
            <Forms tell={setToast} />
          ) : id === 'feedback' ? (
            <Feedback tell={setToast} />
          ) : id === 'navigation' ? (
            <NavigationDemo tell={setToast} />
          ) : id === 'records' ? (
            <Records tell={setToast} />
          ) : (
            <ClockerDemo />
          )}
        </div>
      </main>
      {toast && <Toast key={toast} message={toast} onDismiss={() => setToast('')} />}
    </div>
  );
}
createRoot(document.getElementById('root')!).render(<Gallery />);
