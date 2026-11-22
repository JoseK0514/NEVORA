import {useState} from 'react';
import {
  ApprovalRow,
  Button,
  Card,
  Dialog,
  Disc,
  GlassBand,
  Notice,
  Options,
  Row,
  ShiftRow,
  StatusLabel,
  Timecard,
  WeekControl,
} from '../../src/components/premium';
import {ActionsCard, Pad, SettingsCard, Stack, type Tell} from './controls-demo';
import {Labels} from './feedback-demo';

function weekLabel(offset: number, locale = 'en-US') {
  const start = new Date(Date.UTC(2026, 10, 16 + offset * 7)),
    end = new Date(Date.UTC(2026, 10, 22 + offset * 7));
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).formatRange(start, end);
}
export function Overview({go, tell}: {go: (value: string) => void; tell: Tell}) {
  const [week, setWeek] = useState(0);
  const metrics = [
    {
      label: 'Scheduled hours',
      value: ['32.5', '40.0', '36.0'][Math.abs(week) % 3],
      icon: 'clock' as const,
    },
    {label: 'Team members', value: String(12 + (Math.abs(week) % 3)), icon: 'team' as const},
    {label: 'Open shifts', value: String([2, 0, 3][Math.abs(week) % 3]), icon: 'schedule' as const},
  ];
  return (
    <Stack>
      <GlassBand
        title="Shift overview"
        context="Northside · San Juan"
        metrics={metrics}
        action={
          <WeekControl
            label={weekLabel(week)}
            onPrevious={() => setWeek(week - 1)}
            onNext={() => setWeek(week + 1)}
          />
        }
      />
      <div className="studio-grid">
        <ActionsCard tell={tell} />
        <SettingsCard />
        <Card title="Workflows">
          <Pad>
            <Row
              title="Review requests"
              detail="Manager approvals and timecards"
              leading={<Disc icon="request" />}
              onClick={() => go('records')}
            />
            <Row
              title="Clocker tablet"
              detail="PIN, breaks and punch receipts"
              leading={<Disc icon="pin" />}
              onClick={() => go('clocker')}
            />
          </Pad>
        </Card>
        <Card title="Status and feedback">
          <Pad>
            <Stack>
              <Labels />
              <Notice tone="warning" title="Coverage needs review">
                One closing shift still needs a lead.
              </Notice>
            </Stack>
          </Pad>
        </Card>
      </div>
    </Stack>
  );
}
type Decision = 'Pending' | 'Approved' | 'Declined';
const staff = [
  {
    name: 'María José Rivera Santiago',
    request: 'Time off · November 24',
    detail: 'Morning shift · 8 hours',
  },
  {
    name: 'Alex Rivera',
    request: 'Shift swap · November 25',
    detail: 'Jordan Lee offered to cover the closing shift.',
  },
];
export function Records({tell}: {tell: Tell}) {
  const [decisions, setDecisions] = useState<Decision[]>(['Pending', 'Pending']),
    [pending, setPending] = useState<number | null>(null),
    [finalize, setFinalize] = useState(false),
    [finalized, setFinalized] = useState<number[]>([]),
    [week, setWeek] = useState(0),
    [locale, setLocale] = useState('en');
  const es = locale === 'es',
    final = finalized.includes(week);
  function decide(index: number, outcome: Decision) {
    setDecisions(decisions.map((x, i) => (i === index ? outcome : x)));
    tell(outcome === 'Approved' ? 'Request approved' : 'Request declined');
  }
  const weekControl = (
    <WeekControl
      label={weekLabel(week, es ? 'es-PR' : 'en-US')}
      onPrevious={() => setWeek(week - 1)}
      onNext={() => setWeek(week + 1)}
      previousLabel={es ? 'Semana anterior' : undefined}
      nextLabel={es ? 'Semana siguiente' : undefined}
    />
  );
  return (
    <Stack>
      <div className="studio-line">
        <span className="studio-muted">Header language</span>
        <Options
          label="Header language"
          value={locale}
          onChange={setLocale}
          options={[
            {value: 'en', label: 'English'},
            {value: 'es', label: 'Español'},
          ]}
        />
      </div>
      <GlassBand
        context="Northside · San Juan"
        title={es ? 'Resumen de la semana' : 'Week at a glance'}
        action={weekControl}
        metrics={[
          {
            label: es ? 'Horas programadas' : 'Scheduled hours',
            value: String(week === 0 ? 32.5 : 36),
            icon: 'clock',
          },
          {
            label: es ? 'Solicitudes pendientes de aprobación' : 'Pending requests',
            value: String(decisions.filter(x => x === 'Pending').length),
            icon: 'request',
          },
          {label: es ? 'Turnos disponibles' : 'Open shifts', value: '0', icon: 'schedule'},
        ]}
      />
      <div className="studio-grid">
        <Card title="Approval queue">
          <Pad>
            {staff.map((s, i) => (
              <ApprovalRow
                key={s.name}
                {...s}
                label={decisions[i]}
                tone={
                  decisions[i] === 'Approved'
                    ? 'success'
                    : decisions[i] === 'Declined'
                      ? 'neutral'
                      : 'warning'
                }
                actions={
                  decisions[i] === 'Pending' ? (
                    <>
                      <Button variant="secondary" onClick={() => decide(i, 'Approved')}>
                        Approve
                      </Button>
                      <Button variant="quiet" onClick={() => setPending(i)}>
                        Decline
                      </Button>
                    </>
                  ) : undefined
                }
              />
            ))}
          </Pad>
        </Card>
        <Card title="Timecard">
          <Pad>
            <Stack>
              <Timecard
                title="Alex Rivera"
                period={weekLabel(week)}
                rows={[
                  {label: 'Regular hours', value: week === 0 ? '32.5 h' : '36.0 h'},
                  {label: 'Overtime', value: '0.0 h'},
                ]}
                total={{label: 'Recorded time', value: week === 0 ? '32.5 h' : '36.0 h'}}
              />
              <Button variant="secondary" disabled={final} onClick={() => setFinalize(true)}>
                {final ? 'Timecard finalized' : 'Finalize timecard'}
              </Button>
            </Stack>
          </Pad>
        </Card>
        <Card title="Scheduled shifts">
          <Pad>
            <ShiftRow
              name="María José Rivera Santiago"
              detail="Northside · Lead"
              time="10 PM – 6 AM"
              status={<StatusLabel>Overnight</StatusLabel>}
            />
            <ShiftRow
              name="Jordan Lee"
              detail="Westside · Employee"
              time="9 AM – 5 PM"
              status={<StatusLabel tone="success">Confirmed</StatusLabel>}
            />
          </Pad>
        </Card>
        <Card title="Pay summary">
          <Pad>
            <Timecard
              title="Sample pay statement"
              period="November 16–22"
              rows={[
                {label: 'Regular earnings', value: '$650.00'},
                {label: 'Overtime earnings', value: '$0.00'},
              ]}
              total={{label: 'Gross pay', value: '$650.00'}}
            />
          </Pad>
        </Card>
      </div>
      <Dialog
        open={pending !== null}
        title="Decline this request?"
        onClose={() => setPending(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setPending(null)}>
              Keep request
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (pending !== null) decide(pending, 'Declined');
                setPending(null);
              }}
            >
              Decline request
            </Button>
          </>
        }
      >
        {pending !== null && staff[pending].name} will see the decision on their request.
      </Dialog>
      <Dialog
        open={finalize}
        title="Finalize this timecard?"
        onClose={() => setFinalize(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setFinalize(false)}>
              Keep open
            </Button>
            <Button
              onClick={() => {
                setFinalize(false);
                setFinalized([...finalized, week]);
                tell('Timecard finalized');
              }}
            >
              Finalize
            </Button>
          </>
        }
      >
        Confirm the hours for {weekLabel(week)} before sending the timecard to payroll.
      </Dialog>
    </Stack>
  );
}
