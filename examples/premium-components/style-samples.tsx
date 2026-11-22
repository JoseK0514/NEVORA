import {useId, useState} from 'react';
import {
  ApprovalRow,
  Avatar,
  Button,
  Card,
  Choice,
  Dialog,
  Disc,
  Field,
  GlassBand,
  IconButton,
  Mark,
  Navigation,
  Notice,
  Options,
  Overflow,
  PhotoCapture,
  PinPad,
  Progress,
  PunchAction,
  PunchReceipt,
  Result,
  Row,
  Select,
  ShiftRow,
  Skeleton,
  Spinner,
  StatusLabel,
  Switch,
  TabletFrame,
  Timecard,
  Toast,
  WeekControl,
  type ComponentPart,
  type NavItem,
  type Treatment,
  type Tone,
  type ResultKind,
} from '../../src/components/premium';
import {useDelay} from './controls-demo';

const calendar: NavItem[] = [
  {id: 'week', href: '#compare/navigation', title: 'Schedule', icon: 'schedule'},
  {id: 'time', href: '#compare/navigation', title: 'Time', icon: 'clock'},
  {id: 'team', href: '#compare/navigation', title: 'Team', icon: 'team'},
];
const weeks = ['Nov 9–15', 'Nov 16–22', 'Nov 23–29', 'Nov 30–Dec 6'];
const places = ['Northside', 'Westside'];
const options = (labels: string[]) => labels.map(label => ({label, value: label}));
export const recoveryCopy: Record<ResultKind, [string, string, string]> = {
  empty: ['No shifts yet', 'Published shifts will appear here.', 'View schedule'],
  'no-results': ['No matching employees', 'Try clearing your current filters.', 'Clear filters'],
  offline: ['You’re offline', 'Your last saved schedule is available.', 'Check connection'],
  stale: ['Earlier schedule', 'Refresh to see the latest changes.', 'Refresh'],
  denied: ['Owner access required', 'Contact the owner to review access.', 'Back to requests'],
  error: ['Schedule couldn’t load', 'You can retry the last request.', 'Try again'],
  saved: ['Schedule saved', 'This week’s schedule is ready.', 'View schedule'],
  unconfirmed: [
    'Punch unconfirmed',
    'Check the recorded status before trying again.',
    'Check status',
  ],
};
export const toneLabels: Record<Tone, string> = {
  neutral: 'Draft',
  info: 'Scheduled',
  success: 'Approved',
  warning: 'Needs review',
  danger: 'Blocked',
};
export const titles: Record<Tone, string> = {
  neutral: 'Draft schedule',
  info: 'Schedule updated',
  success: 'Coverage confirmed',
  warning: 'Coverage needs review',
  danger: 'Clock-in blocked',
};
export const details: Record<Tone, string> = {
  neutral: 'This week has unpublished shifts.',
  info: 'Monday’s opening shift has changed.',
  success: 'Every closing shift has a lead.',
  warning: 'One closing shift still needs a lead.',
  danger: 'Reconnect this tablet to its location.',
};
const markWeights = {original: 'fill', line: 'bold', soft: 'duotone', accent: 'regular'} as const;

export function StyleSample({
  part,
  look,
  state,
}: {
  part: ComponentPart;
  look: Treatment;
  state: string;
}) {
  const [active, setActive] = useState(false),
    [value, setValue] = useState(''),
    [busy, setBusy] = useState(false),
    [pos, setPos] = useState(1),
    [modal, setModal] = useState(false),
    [message, setMessage] = useState(''),
    id = useId();
  const delay = useDelay();
  const note = message && (
    <small role="status" className="nv-sample-note">
      {message}
    </small>
  );
  const setMessageFor = (m: string) => () => setMessage(m);
  const simpleOptions = (labels: string[], chips = false) => (
    <Options
      label={chips ? 'Shift filter' : 'Calendar view'}
      value={value || labels[0]}
      options={options(labels)}
      style={chips ? 'chips' : 'segment'}
      onChange={setValue}
    />
  );
  const summary = (pay: boolean) => (
    <Timecard
      title={pay ? 'Pay statement' : 'Alex Rivera'}
      period="Nov 16–22"
      rows={
        pay
          ? [
              {label: 'Regular earnings', value: '$650.00'},
              {label: 'Overtime', value: '$0.00'},
            ]
          : [
              {label: 'Regular hours', value: '32.5 h'},
              {label: 'Overtime', value: '0.0 h'},
            ]
      }
      total={
        pay ? {label: 'Gross pay', value: '$650.00'} : {label: 'Recorded time', value: '32.5 h'}
      }
    />
  );
  const tone = (Object.hasOwn(toneLabels, state) ? state : 'warning') as Tone;
  switch (part) {
    case 'button':
    case 'busy-button': {
      const destructive = state === 'destructive',
        label = destructive
          ? 'Discard draft'
          : state === 'secondary'
            ? 'View schedule'
            : state === 'quiet'
              ? 'View details'
              : 'Publish schedule';
      return (
        <>
          <Button
            icon={
              destructive
                ? 'close'
                : state === 'secondary' || state === 'quiet'
                  ? 'schedule'
                  : 'check'
            }
            variant={
              destructive
                ? 'danger'
                : state === 'secondary'
                  ? 'secondary'
                  : state === 'quiet'
                    ? 'quiet'
                    : 'primary'
            }
            busy={busy}
            disabled={state === 'disabled'}
            busyLabel={part === 'busy-button' ? 'Saving…' : undefined}
            onClick={() => {
              if (part === 'busy-button') {
                setBusy(true);
                delay(() => {
                  setBusy(false);
                  setMessage('Changes saved');
                }, 1600);
              } else
                setMessage(
                  destructive
                    ? 'Sample draft discarded'
                    : state === 'secondary'
                      ? 'Schedule opened'
                      : state === 'quiet'
                        ? 'Details opened'
                        : 'Sample schedule published',
                );
            }}
          >
            {part === 'busy-button' ? 'Save changes' : label}
          </Button>
          {note}
        </>
      );
    }
    case 'icon-button':
      return (
        <>
          <IconButton
            label="Next week"
            icon="right"
            onClick={() => {
              setPos((pos + 1) % 4);
              setMessage(weeks[(pos + 1) % 4]);
            }}
          />
          {note}
        </>
      );
    case 'switch':
      return (
        <Switch
          label="Shift reminders"
          description="Notify me before my shift."
          checked={!active}
          onChange={next => setActive(!next)}
        />
      );
    case 'checkbox':
      return (
        <Choice
          type="checkbox"
          label="Include open shifts"
          checked={!active}
          onChange={() => setActive(!active)}
        />
      );
    case 'radio':
      return (
        <div className="nv-choice-set" role="radiogroup" aria-label="Schedule range">
          {['This week', 'Next week'].map((v, i) => (
            <Choice
              key={v}
              type="radio"
              name={id}
              label={v}
              checked={active === !!i}
              onChange={() => setActive(!!i)}
            />
          ))}
        </div>
      );
    case 'segments':
      return simpleOptions(['Day', 'Week', 'Month']);
    case 'spinner':
      return <Spinner label="Loading shifts…" />;
    case 'skeleton':
      return <Skeleton rows={2} label="Loading roster" />;
    case 'progress':
      return (
        <>
          <Progress label="Exporting timecards" value={pos === 1 ? 40 : pos} />
          <button
            className="nv-inline-action"
            onClick={() =>
              setPos((pos === 1 ? 40 : pos) >= 100 ? 0 : Math.min((pos === 1 ? 40 : pos) + 20, 100))
            }
          >
            {pos === 100 ? 'Restart export' : 'Advance export'}
          </button>
        </>
      );
    case 'status':
      return (
        <div className="nv-badges">
          <StatusLabel tone={tone}>{toneLabels[tone]}</StatusLabel>
          <StatusLabel tone="neutral">Draft</StatusLabel>
        </div>
      );
    case 'notice':
      return (
        <Notice tone={tone} title={titles[tone]}>
          {details[tone]}
        </Notice>
      );
    case 'toast':
      return active ? (
        <Button variant="quiet" onClick={() => setActive(false)}>
          Show saved message
        </Button>
      ) : (
        <Toast message="Shift changes saved" onDismiss={() => setActive(true)} />
      );
    case 'card':
      return (
        <Card title="Closing shift">
          <div className="nv-card-body">
            <strong>4:00 PM – 10:00 PM</strong>
            <span>Northside · Front desk</span>
          </div>
        </Card>
      );
    case 'row':
      return (
        <>
          <Row
            title="Time-off requests"
            detail={active ? 'María Rivera · Nov 24' : '2 pending requests'}
            leading={<Disc icon="request" />}
            onClick={() => setActive(!active)}
          />
        </>
      );
    case 'avatar':
      return (
        <div className="nv-avatar-example">
          <Avatar name="María Rivera" size={44} />
          <span>María Rivera</span>
        </div>
      );
    case 'disc':
      return (
        <div className="nv-glyph-set">
          {(['schedule', 'team', 'clock'] as const).map(i => (
            <Disc key={i} icon={i} />
          ))}
        </div>
      );
    case 'mark':
      return (
        <div className="nv-glyph-set" role="img" aria-label="Schedule, team and time icons">
          {(['schedule', 'team', 'clock'] as const).map(i => (
            <Mark key={i} name={i} size={30} weight={markWeights[look]} />
          ))}
        </div>
      );
    case 'glass':
      return (
        <GlassBand
          title="Shift overview"
          context="Northside"
          metrics={[
            {label: 'Hours', value: '32.5', icon: 'clock'},
            {label: 'Team', value: '12', icon: 'team'},
          ]}
        />
      );
    case 'week':
      return (
        <WeekControl
          label={weeks[pos]}
          onNext={() => setPos((pos + 1) % 4)}
          onPrevious={() => setPos((pos + 3) % 4)}
        />
      );
    case 'field':
    case 'search':
    case 'setup':
    case 'employee-id': {
      const label =
        part === 'field'
          ? 'Employee name'
          : part === 'search'
            ? 'Find an employee'
            : part === 'setup'
              ? 'Tablet setup code'
              : 'Employee ID';
      const placeholder =
        part === 'field'
          ? 'María Rivera'
          : part === 'search'
            ? 'Search by name'
            : part === 'setup'
              ? '804206'
              : '1042';
      return (
        <>
          <Field
            label={label}
            type={part === 'search' ? 'search' : 'text'}
            inputMode={part === 'setup' || part === 'employee-id' ? 'numeric' : undefined}
            value={value}
            onChange={e => {
              setValue(e.target.value);
              setMessage('');
            }}
            placeholder={placeholder}
            error={state === 'error' && !value ? 'Enter a value to continue.' : undefined}
            disabled={state === 'disabled'}
          />
          {(part === 'setup' || part === 'employee-id') && (
            <button
              className="nv-inline-action"
              onClick={() =>
                setMessage(
                  value === placeholder
                    ? 'Sample accepted'
                    : 'Enter the sample code ' + placeholder,
                )
              }
            >
              Continue
            </button>
          )}
          {note}
        </>
      );
    }
    case 'select-input':
      return (
        <Select
          label="Location"
          disabled={state === 'disabled'}
          value={value || places[0]}
          onChange={e => setValue(e.target.value)}
        >
          {places.map(v => (
            <option key={v}>{v}</option>
          ))}
        </Select>
      );
    case 'datetime':
      return (
        <div className="nv-choice-set">
          <Field label="Shift date" type="date" defaultValue="2026-11-23" />
          <Field label="Starts at" type="time" defaultValue="09:00" />
        </div>
      );
    case 'navigation':
      return (
        <Navigation
          items={calendar}
          current={value || 'week'}
          mode={state === 'sidebar' ? 'sidebar' : state === 'rail' ? 'rail' : 'phone'}
          label="Preview navigation"
          onNavigate={setValue}
        />
      );
    case 'filters':
      return simpleOptions(['All', 'On shift', 'On break'], true);
    case 'overflow':
      return (
        <>
          <div className="nv-overflow-row">
            <strong>Weekly schedule</strong>
            <Overflow
              label="Schedule actions"
              actions={[
                {
                  label: 'View hours',
                  icon: 'clock',
                  onSelect: setMessageFor('32.5 scheduled hours'),
                },
                {label: 'View team', icon: 'team', onSelect: setMessageFor('12 team members')},
              ]}
            />
          </div>
          {note}
        </>
      );
    case 'dialog':
    case 'sheet': {
      const sheet = part === 'sheet',
        title = sheet ? 'Schedule options' : 'Publish schedule?',
        close = () => setModal(false);
      const action = (s: string) => {
        setMessage(s);
        close();
      };
      const content = sheet ? (
        <>
          <Row
            title="View hours"
            leading={<Disc icon="clock" />}
            onClick={() => action('32.5 scheduled hours')}
          />
          <Row
            title="View team"
            leading={<Disc icon="team" />}
            onClick={() => action('12 team members')}
          />
        </>
      ) : (
        'The team will see the shifts for Nov 16–22.'
      );
      const actions = sheet ? undefined : (
        <>
          <Button variant="quiet" onClick={() => action('Kept as draft')}>
            Cancel
          </Button>
          <Button onClick={() => action('Sample schedule published')}>Publish</Button>
        </>
      );
      return (
        <>
          <Dialog
            open={false}
            embedded
            title={title}
            sheet={sheet}
            actions={actions}
            onClose={() => action('Preview closed')}
          >
            {content}
          </Dialog>
          <button className="nv-inline-action" onClick={() => setModal(true)}>
            {sheet ? 'Open sheet' : 'Open dialog'}
          </button>
          {note}
          <Dialog open={modal} title={title} sheet={sheet} actions={actions} onClose={close}>
            {content}
          </Dialog>
        </>
      );
    }
    case 'result': {
      const kind = (Object.hasOwn(recoveryCopy, state) ? state : 'offline') as ResultKind;
      const [title, description, action] = recoveryCopy[kind];
      return (
        <>
          <Result
            kind={kind}
            title={title}
            description={description}
            action={
              <Button
                variant="secondary"
                onClick={setMessageFor(
                  kind === 'unconfirmed' ? 'Sample status checked' : 'Sample action completed',
                )}
              >
                {action}
              </Button>
            }
          />
          {note}
        </>
      );
    }
    case 'shift':
      return (
        <ShiftRow
          name="María Rivera"
          detail="Northside · Lead"
          time="10 PM – 6 AM"
          status={<StatusLabel>Overnight</StatusLabel>}
        />
      );
    case 'timecard':
    case 'pay':
      return summary(part === 'pay');
    case 'approval':
      return (
        <ApprovalRow
          name="María Rivera"
          request="Time off · Nov 24"
          detail="Morning shift · 8 hours"
          label={active ? 'Approved' : 'Pending'}
          tone={active ? 'success' : 'warning'}
          actions={
            <Button variant="secondary" onClick={() => setActive(!active)}>
              {active ? 'Reset sample' : 'Approve'}
            </Button>
          }
        />
      );
    case 'tablet':
      return (
        <TabletFrame location="Northside" status="Connected">
          <h3>Hi, Alex.</h3>
          <p>You’re ready to clock in.</p>
        </TabletFrame>
      );
    case 'pin':
      return (
        <>
          <PinPad
            value={value}
            onChange={setValue}
            onSubmit={() => {
              setValue('');
              setMessage('Sample PIN entered');
            }}
          />
          {note}
        </>
      );
    case 'punch':
    case 'break': {
      const kind =
        part === 'punch' ? (active ? 'clock-out' : 'clock-in') : active ? 'meal' : 'rest';
      return (
        <>
          <PunchAction
            icon={kind}
            primary
            label={
              kind === 'clock-in'
                ? 'Clock in'
                : kind === 'clock-out'
                  ? 'Clock out'
                  : kind === 'meal'
                    ? 'Meal break'
                    : 'Rest break'
            }
            description={part === 'punch' ? 'Northside · Front desk' : 'Choose your break'}
            onClick={() => {
              setActive(!active);
              setMessage(part === 'punch' ? 'Sample punch recorded' : 'Sample break selected');
            }}
          />
          {note}
        </>
      );
    }
    case 'photo':
      return (
        <>
          <PhotoCapture
            onAccept={() => setMessage('Sample photo accepted locally')}
            onCancel={() => setMessage('Capture canceled')}
          />
          {note}
        </>
      );
    case 'receipt':
    case 'unconfirmed': {
      const confirmed = part === 'receipt' || active;
      return (
        <>
          <PunchReceipt
            confirmed={confirmed}
            title={confirmed ? 'Clock-in recorded' : 'Punch unconfirmed'}
            detail={
              confirmed ? 'Northside · 9:41 AM' : 'Check the recorded status before punching again.'
            }
            reference={confirmed ? 'DEMO-1042' : undefined}
            action={confirmed ? 'Done' : 'Check status'}
            onAction={() => {
              if (!confirmed) setActive(true);
              else setMessage('Receipt closed');
            }}
          />
          {note}
        </>
      );
    }
  }
}
