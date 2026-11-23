import {useEffect, useRef, useState} from 'react';
import {
  Button,
  Card,
  Dialog,
  Field,
  Notice,
  PhotoCapture,
  PinPad,
  PunchAction,
  PunchReceipt,
  Select,
  Switch,
  TabletFrame,
} from '../../src/components/premium';
import {Pad, Stack} from './controls-demo';

type Screen =
  'setup' | 'id' | 'pin' | 'ready' | 'breaks' | 'photo' | 'receipt' | 'unknown' | 'offline';
type Shift = 'off' | 'working' | 'rest' | 'meal';
type Intent = 'clock-in' | 'clock-out' | 'rest' | 'meal' | 'resume';
const effects: Record<Intent, [Shift, string]> = {
  'clock-in': ['working', 'Clock-in recorded'],
  'clock-out': ['off', 'Clock-out recorded'],
  rest: ['rest', 'Rest break started'],
  meal: ['meal', 'Meal break started'],
  resume: ['working', 'Break ended'],
};
const examples = [
  ['ready', 'Clock in'],
  ['setup', 'Tablet setup'],
  ['id', 'Employee ID and PIN'],
  ['working', 'On shift'],
  ['rest', 'On break'],
  ['breaks', 'Rest and meal'],
  ['photo', 'Punch photo'],
  ['receipt', 'Recorded receipt'],
  ['unknown', 'Unconfirmed punch'],
  ['offline', 'Offline recovery'],
];
export function ClockerDemo() {
  const [screen, setScreen] = useState<Screen>('ready'),
    [shift, setShift] = useState<Shift>('off'),
    [intent, setIntent] = useState<Intent>('clock-in');
  const [id, setId] = useState(''),
    [pin, setPin] = useState(''),
    [code, setCode] = useState(''),
    [error, setError] = useState(''),
    [confirm, setConfirm] = useState(false);
  const [photo, setPhoto] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [scenario, setScenario] = useState('ready');
  const kiosk = useRef<HTMLDivElement>(null),
    previousScreen = useRef(screen);
  useEffect(() => {
    if (previousScreen.current === screen) return;
    previousScreen.current = screen;
    const heading = kiosk.current?.querySelector<HTMLElement>(
      '.np-tablet-body h3, .np-tablet-body .np-result > strong',
    );
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({preventScroll: true});
    }
  }, [screen]);
  function start(value: string) {
    setScenario(value);
    setScreen(value === 'working' || value === 'rest' ? 'ready' : (value as Screen));
    setShift(
      value === 'working' || value === 'breaks' ? 'working' : value === 'rest' ? 'rest' : 'off',
    );
    setIntent('clock-in');
    setId('');
    setPin('');
    setError('');
    setCode('');
    setConfirm(false);
    if (value === 'receipt') setShift('working');
  }
  function record(next: Intent, unconfirmed: boolean) {
    setIntent(next);
    setError('');
    if (unconfirmed) {
      setScreen('unknown');
      return;
    }
    setShift(effects[next][0]);
    setScreen('receipt');
  }
  function punch(next: Intent) {
    setIntent(next);
    if (photo && (next === 'clock-in' || next === 'clock-out')) setScreen('photo');
    else record(next, uncertain);
  }
  function entry() {
    setId('');
    setPin('');
    setError('');
    setScreen('id');
  }
  return (
    <div ref={kiosk} className="studio-kiosk-grid">
      <TabletFrame
        location="Northside · Front desk"
        status={
          screen === 'offline' ? 'Offline' : screen === 'setup' ? 'Setup required' : 'Connected'
        }
        tone={screen === 'offline' || screen === 'setup' ? 'warning' : 'success'}
      >
        {screen === 'ready' && (
          <>
            <h3>Hi, Alex.</h3>
            <p>
              {shift === 'off'
                ? 'You’re ready to clock in.'
                : shift === 'working'
                  ? 'You’re on shift.'
                  : shift === 'rest'
                    ? 'You’re on a rest break.'
                    : 'You’re on a meal break.'}
            </p>
            {shift === 'off' ? (
              <PunchAction
                label="Clock in"
                icon="clock-in"
                description="Start your shift at Northside"
                primary
                onClick={() => punch('clock-in')}
              />
            ) : (
              <>
                {shift === 'working' ? (
                  <PunchAction
                    label="Start break"
                    description="Choose rest or meal"
                    icon="break"
                    primary
                    onClick={() => setScreen('breaks')}
                  />
                ) : (
                  <PunchAction
                    label="End break"
                    icon="resume"
                    primary
                    onClick={() => punch('resume')}
                  />
                )}
                <PunchAction label="Clock out" icon="clock-out" onClick={() => setConfirm(true)} />
              </>
            )}
            <Button variant="quiet" onClick={entry}>
              Return to PIN
            </Button>
          </>
        )}
        {screen === 'setup' && (
          <>
            <h3>Set up this tablet</h3>
            <p>Connect this tablet to the Northside location.</p>
            <form
              className="studio-stack"
              onSubmit={e => {
                e.preventDefault();
                if (code.trim() !== '804206') {
                  setError('Enter the sample setup code 804206.');
                  return;
                }
                entry();
              }}
            >
              <Field
                label="Setup code"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={e => {
                  setCode(e.target.value);
                  setError('');
                }}
                hint="Sample setup code 804206"
                error={error}
              />
              <Button type="submit">Connect tablet</Button>
            </form>
          </>
        )}
        {screen === 'id' && (
          <>
            <h3>Enter your Employee ID</h3>
            <form
              className="studio-stack"
              onSubmit={e => {
                e.preventDefault();
                if (id.trim() !== '1042') {
                  setError('Use the sample ID 1042.');
                  return;
                }
                setError('');
                setScreen('pin');
              }}
            >
              <Field
                label="Employee ID"
                value={id}
                hint="Sample employee 1042"
                onChange={e => {
                  setId(e.target.value);
                  setError('');
                }}
                error={error}
              />
              <Button type="submit">Continue</Button>
            </form>
          </>
        )}
        {screen === 'pin' && (
          <>
            <h3>Enter your PIN</h3>
            <p>Use sample PIN 1357.</p>
            <PinPad
              value={pin}
              onChange={v => {
                setPin(v);
                setError('');
              }}
              error={error}
              onSubmit={() => {
                if (pin !== '1357') {
                  setError('That PIN doesn’t match the sample employee.');
                  setPin('');
                  return;
                }
                setPin('');
                setScreen('ready');
              }}
            />
            <Button variant="quiet" onClick={entry}>
              Back
            </Button>
          </>
        )}
        {screen === 'breaks' && (
          <>
            <h3>Choose a break</h3>
            <p>Your break starts when it is recorded.</p>
            <PunchAction
              label="Rest break"
              description="15 minutes suggested"
              icon="rest"
              onClick={() => punch('rest')}
            />
            <PunchAction
              label="Meal break"
              description="30 minutes suggested"
              icon="meal"
              onClick={() => punch('meal')}
            />
            <Button variant="quiet" onClick={() => setScreen('ready')}>
              Back
            </Button>
          </>
        )}
        {screen === 'photo' && (
          <>
            <h3>Punch photo</h3>
            <p>Use a sample image for this local preview.</p>
            <PhotoCapture
              onAccept={() => record(intent, uncertain)}
              onCancel={() => setScreen('ready')}
            />
          </>
        )}
        {screen === 'receipt' && (
          <PunchReceipt
            confirmed
            title={effects[intent][1]}
            detail="Northside · Sample time 9:41 AM"
            reference="DEMO-1042"
            action="Done"
            onAction={entry}
          />
        )}
        {screen === 'unknown' && (
          <PunchReceipt
            confirmed={false}
            title="Punch unconfirmed"
            detail="The tablet hasn’t received confirmation. Check whether your punch was recorded."
            action="Check status"
            onAction={() => record(intent, false)}
          />
        )}
        {screen === 'offline' && (
          <>
            <h3>Tablet offline</h3>
            <Notice tone="warning" title="Reconnect to check your status">
              Your last confirmed punch is preserved.
            </Notice>
            <Button variant="secondary" onClick={() => setScreen('ready')}>
              Check connection
            </Button>
          </>
        )}
      </TabletFrame>
      <Card title="Tablet scenarios">
        <Pad>
          <Stack>
            <Select label="Preview a screen" value={scenario} onChange={e => start(e.target.value)}>
              {examples.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
            <Switch
              label="Require punch photo"
              description="Preview the photo step for clock-in and clock-out."
              checked={photo}
              onChange={setPhoto}
            />
            <Switch
              label="Simulate lost confirmation"
              description="Check status to resolve the sample punch."
              checked={uncertain}
              onChange={setUncertain}
            />
            <Button variant="secondary" icon="refresh" onClick={() => start(scenario)}>
              Restart scenario
            </Button>
            <small className="studio-muted">
              Uses fictional shifts. Photos stay in this browser and are discarded when you leave
              the photo step.
            </small>
          </Stack>
        </Pad>
      </Card>
      <Dialog
        open={confirm}
        title="Clock out now?"
        onClose={() => setConfirm(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              Keep working
            </Button>
            <Button
              onClick={() => {
                setConfirm(false);
                punch('clock-out');
              }}
            >
              Confirm clock out
            </Button>
          </>
        }
      >
        {shift === 'rest' || shift === 'meal'
          ? 'Clocking out will also end the current break.'
          : 'This ends the current shift at Northside.'}
      </Dialog>
    </div>
  );
}
