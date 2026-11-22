import {useEffect, useRef, useState} from 'react';
import {
  Button,
  Card,
  Dialog,
  Disc,
  Field,
  IconButton,
  Navigation,
  Notice,
  Options,
  Overflow,
  Progress,
  Result,
  Row,
  Select,
  Skeleton,
  Spinner,
  StatusLabel,
  type NavItem,
  type ResultKind,
} from '../../src/components/premium';
import {Pad, Stack, type Tell} from './controls-demo';

const cases: Record<ResultKind, [string, string, string]> = {
  empty: [
    'No shifts yet',
    'Your shifts will appear here when the schedule is published.',
    'View sample schedule',
  ],
  'no-results': [
    'No matching employees',
    'Try a different name or clear your filters.',
    'Clear filters',
  ],
  offline: ['You’re offline', 'This view shows your last saved schedule.', 'Reconnect'],
  stale: [
    'Showing an earlier schedule',
    'Last updated at 9:30 AM. Refresh to check for changes.',
    'Refresh',
  ],
  denied: [
    'Owner access required',
    'Your manager can review this request with you.',
    'Back to requests',
  ],
  error: [
    'Schedule couldn’t load',
    'Your changes are safe. Try loading the schedule again.',
    'Try again',
  ],
  saved: ['Schedule saved', 'The current week is ready for your team.', 'View schedule'],
  unconfirmed: [
    'Clock-in unconfirmed',
    'Check the recorded status before taking another action.',
    'Check status',
  ],
};
export function Labels() {
  return (
    <div className="studio-labels">
      <StatusLabel>Draft</StatusLabel>
      <StatusLabel tone="warning">Needs review</StatusLabel>
      <StatusLabel tone="success">Approved</StatusLabel>
      <StatusLabel tone="danger">Blocked</StatusLabel>
      <StatusLabel tone="info">Scheduled</StatusLabel>
    </div>
  );
}
export function Feedback({tell}: {tell: Tell}) {
  const [kind, setKind] = useState<ResultKind>('offline'),
    [result, setResult] = useState(false),
    [pct, setPct] = useState(0),
    [running, setRunning] = useState(false),
    [loading, setLoading] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timeout.current) clearTimeout(timeout.current);
    },
    [],
  );
  const active = running && pct < 100;
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setPct(n => Math.min(100, n + 10)), 200);
    return () => clearInterval(timer);
  }, [active]);
  const [title, detail, label] = cases[kind];
  return (
    <div className="studio-grid">
      <Card title="Status labels">
        <Pad>
          <Labels />
          <hr className="studio-rule" />
          <Stack>
            <Notice tone="warning" title="Coverage needs review">
              One closing shift still needs a lead.
            </Notice>
            <Notice tone="danger" title="Clock-in blocked">
              This tablet must be connected to the correct location.
            </Notice>
            <Notice tone="success" title="Timecard approved">
              The week is ready for payroll.
            </Notice>
          </Stack>
        </Pad>
      </Card>
      <Card title="Results and recovery">
        <Pad>
          <Select
            label="State"
            value={kind}
            onChange={e => {
              setKind(e.target.value as ResultKind);
              setResult(false);
            }}
          >
            {Object.keys(cases).map(key => (
              <option key={key} value={key}>
                {cases[key as ResultKind][0]}
              </option>
            ))}
          </Select>
          {result ? (
            <div className="studio-tail">
              <Notice
                tone="success"
                title={
                  kind === 'unconfirmed'
                    ? 'Clock-in recorded'
                    : kind === 'denied'
                      ? 'Returned to requests'
                      : kind === 'no-results'
                        ? 'Filters cleared'
                        : 'Schedule available'
                }
              >
                Sample workspace updated.
              </Notice>
              <Button variant="quiet" onClick={() => setResult(false)}>
                Show state again
              </Button>
            </div>
          ) : (
            <Result
              kind={kind}
              title={title}
              description={detail}
              action={
                <Button variant="secondary" onClick={() => setResult(true)}>
                  {label}
                </Button>
              }
            />
          )}
        </Pad>
      </Card>
      <Card title="Loading and progress">
        <Pad>
          <Stack>
            {loading ? (
              <>
                <Skeleton label="Loading the roster" />
                <Spinner label="Loading roster…" />
              </>
            ) : (
              <Row
                title="Roster available"
                detail="12 team members"
                leading={<Disc icon="team" />}
              />
            )}
            <Button
              variant="secondary"
              disabled={loading}
              onClick={() => {
                setLoading(true);
                timeout.current = setTimeout(() => setLoading(false), 1800);
              }}
            >
              Reload roster
            </Button>
            <Progress value={pct} label="Preparing export" />
            <Button
              variant="secondary"
              disabled={active}
              onClick={() => {
                setPct(0);
                setRunning(true);
              }}
            >
              {pct === 100 ? 'Prepare again' : 'Start export'}
            </Button>
          </Stack>
        </Pad>
      </Card>
      <Card title="Saved feedback">
        <Pad>
          <Stack>
            <StatusLabel tone="warning">Pending approval</StatusLabel>
            <p className="studio-muted">Your manager will review this request.</p>
            <Button variant="secondary" onClick={() => tell('Your request was saved')}>
              Show saved message
            </Button>
          </Stack>
        </Pad>
      </Card>
    </div>
  );
}

const demoNav: NavItem[] = [
  {id: 'schedule', title: 'Schedule', href: '#schedule', icon: 'schedule'},
  {id: 'requests', title: 'Requests', href: '#requests', icon: 'request'},
  {id: 'time', title: 'Time', href: '#time', icon: 'clock'},
  {id: 'more', title: 'More', href: '#more', icon: 'more'},
];
const destinations: Record<string, string> = {
  schedule: 'Weekly schedule',
  requests: 'Shift requests',
  time: 'Hours this week',
  more: 'Profile and settings',
};
export function NavigationDemo({tell}: {tell: Tell}) {
  const [mode, setMode] = useState<'sidebar' | 'rail' | 'phone'>('phone'),
    [dest, setDest] = useState('schedule'),
    [previous, setPrevious] = useState<string[]>([]);
  const [sheet, setSheet] = useState(false),
    [q, setQ] = useState(''),
    [filter, setFilter] = useState('All');
  function go(id: string) {
    if (id !== dest) {
      setPrevious([...previous, dest]);
      setDest(id);
    }
  }
  const matches = testRows.filter(
    ([name, status]) =>
      name.toLowerCase().includes(q.toLowerCase()) && (filter === 'All' || status === filter),
  );
  return (
    <div className="studio-grid">
      <Card title="Navigation patterns">
        <Pad>
          <Stack>
            <Options
              label="Navigation layout"
              value={mode}
              onChange={setMode}
              options={[
                {value: 'phone', label: 'Phone tabs'},
                {value: 'sidebar', label: 'Sidebar'},
                {value: 'rail', label: 'Rail'},
              ]}
            />
            <div className="studio-navdemo" data-layout={mode}>
              <Navigation
                label="Workspace destinations"
                mode={mode}
                items={demoNav}
                current={dest}
                onNavigate={go}
              />
              <div>
                <strong>{destinations[dest]}</strong>
                <IconButton
                  icon="back"
                  label="Go back"
                  disabled={!previous.length}
                  onClick={() => {
                    setDest(previous[previous.length - 1]);
                    setPrevious(previous.slice(0, -1));
                  }}
                />
              </div>
            </div>
          </Stack>
        </Pad>
      </Card>
      <Card
        title="Menus and sheets"
        action={
          <Overflow
            label="More schedule actions"
            actions={[
              {label: 'View options', icon: 'options', onSelect: () => setSheet(true)},
              {label: 'Save a copy', icon: 'receipt', onSelect: () => tell('Schedule copy saved')},
            ]}
          />
        }
      >
        <Pad>
          <Row
            title="Weekly schedule"
            detail="Northside · November 16–22"
            leading={<Disc icon="schedule" />}
          />
          <Button variant="secondary" onClick={() => setSheet(true)}>
            Schedule options
          </Button>
        </Pad>
      </Card>
      <Card title="Search and filters">
        <Pad>
          <Stack>
            <Field
              type="search"
              label="Find an employee"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search by name"
            />
            <Options
              label="Shift filter"
              style="chips"
              value={filter}
              onChange={setFilter}
              options={['All', 'On shift', 'On break'].map(value => ({value, label: value}))}
            />
            <div>
              {matches.length ? (
                matches.map(([name, status]) => (
                  <Row
                    key={name}
                    title={name}
                    trailing={
                      <StatusLabel tone={status === 'On break' ? 'warning' : 'success'}>
                        {status}
                      </StatusLabel>
                    }
                  />
                ))
              ) : (
                <Result
                  kind="no-results"
                  title="No matching employees"
                  description="Try another name or clear the filters."
                  action={
                    <Button
                      variant="quiet"
                      onClick={() => {
                        setQ('');
                        setFilter('All');
                      }}
                    >
                      Clear filters
                    </Button>
                  }
                />
              )}
            </div>
          </Stack>
        </Pad>
      </Card>
      <Dialog open={sheet} sheet title="Schedule options" onClose={() => setSheet(false)}>
        <Row
          title="Show requests"
          leading={<Disc icon="request" />}
          onClick={() => {
            setSheet(false);
            go('requests');
          }}
        />
        <Row
          title="Show hours"
          leading={<Disc icon="clock" />}
          onClick={() => {
            setSheet(false);
            go('time');
          }}
        />
      </Dialog>
    </div>
  );
}
const testRows = [
  ['Alex Rivera', 'On shift'],
  ['María Santiago', 'On break'],
  ['Jordan Lee', 'On shift'],
];
