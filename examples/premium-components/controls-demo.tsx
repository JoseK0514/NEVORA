import {useRef, useState, useEffect} from 'react';
import {
  Button,
  Card,
  Choice,
  Dialog,
  Disc,
  Field,
  IconButton,
  Notice,
  Options,
  Row,
  Select,
  StatusLabel,
  Switch,
} from '../../src/components/premium';
import type {ReactNode} from 'react';

export type Tell = (message: string) => void;
export function Pad({children}: {children: ReactNode}) {
  return <div className="studio-pad">{children}</div>;
}
export function Stack({children}: {children: ReactNode}) {
  return <div className="studio-stack">{children}</div>;
}
export function useDelay() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return (fn: () => void, ms = 850) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(fn, ms);
  };
}
export function SettingsCard({advanced = false}: {advanced?: boolean}) {
  const [updates, setUpdates] = useState(true),
    [reminders, setReminders] = useState(false),
    [busy, setBusy] = useState(false);
  const [fail, setFail] = useState(false),
    [error, setError] = useState(false),
    delay = useDelay();
  function change(next: boolean) {
    const old = updates;
    setUpdates(next);
    setBusy(true);
    setError(false);
    delay(() => {
      if (fail) {
        setUpdates(old);
        setError(true);
      }
      setBusy(false);
    });
  }
  return (
    <Card title="Employee settings">
      <Pad>
        <Switch
          label="Schedule updates"
          description={busy ? 'Saving your preference…' : 'Notify me when my shifts change.'}
          checked={updates}
          onChange={change}
          busy={busy}
        />
        <Switch
          label="Shift reminders"
          description="Remind me before my shift starts."
          checked={reminders}
          onChange={setReminders}
        />
        {advanced && (
          <Switch
            label="Payroll notifications"
            description="Managed by your workplace."
            checked
            disabled
            onChange={() => {}}
          />
        )}
        {error && (
          <Notice tone="danger" title="Preference couldn’t be saved" announce>
            Your previous setting was restored.
          </Notice>
        )}
        {advanced && (
          <div className="studio-tail">
            <Choice
              type="checkbox"
              label="Simulate a failed save"
              checked={fail}
              onChange={e => setFail(e.target.checked)}
            />
          </div>
        )}
      </Pad>
    </Card>
  );
}
export function ActionsCard({tell}: {tell: Tell}) {
  const [busy, setBusy] = useState(false),
    [dialog, setDialog] = useState(false),
    delay = useDelay();
  return (
    <Card title="Button hierarchy">
      <Pad>
        <div className="studio-action-list">
          <div>
            <span>Primary</span>
            <Button
              icon="check"
              busy={busy}
              busyLabel="Saving…"
              onClick={() => {
                setBusy(true);
                delay(() => {
                  setBusy(false);
                  tell('Changes saved');
                });
              }}
            >
              Save changes
            </Button>
          </div>
          <div>
            <span>Secondary</span>
            <Button variant="secondary" onClick={() => setDialog(true)}>
              View details
            </Button>
          </div>
          <div>
            <span>Quiet</span>
            <Button variant="quiet" onClick={() => setDialog(true)}>
              Learn more
            </Button>
          </div>
        </div>
      </Pad>
      <Dialog
        open={dialog}
        title="Schedule preference"
        onClose={() => setDialog(false)}
        actions={<Button onClick={() => setDialog(false)}>Done</Button>}
      >
        Changes apply to your personal notification preferences.
      </Dialog>
    </Card>
  );
}
export function Controls({tell}: {tell: Tell}) {
  const [mode, setMode] = useState('Week'),
    [channel, setChannel] = useState('In app'),
    [email, setEmail] = useState(false);
  const [confirm, setConfirm] = useState(false),
    [deleted, setDeleted] = useState(false);
  return (
    <div className="studio-grid">
      <ActionsCard tell={tell} />
      <SettingsCard advanced />
      <Card title="Selection">
        <Pad>
          <Stack>
            <Options
              label="Calendar view"
              value={mode}
              options={['Day', 'Week', 'Month'].map(value => ({value, label: value}))}
              onChange={setMode}
            />
            <fieldset>
              <legend>Preferred channel</legend>
              {['In app', 'Email'].map(x => (
                <Choice
                  key={x}
                  type="radio"
                  name="channel"
                  label={x}
                  checked={channel === x}
                  onChange={() => setChannel(x)}
                />
              ))}
            </fieldset>
            <Choice
              type="checkbox"
              label="Include schedule summaries"
              checked={email}
              onChange={e => setEmail(e.target.checked)}
            />
          </Stack>
        </Pad>
      </Card>
      <Card title="Action states">
        <Pad>
          <Stack>
            <Row
              title={deleted ? 'Draft discarded' : 'Unpublished draft'}
              detail="Week of November 16"
              leading={<Disc icon="schedule" />}
              trailing={<StatusLabel>{deleted ? 'Discarded' : 'Draft'}</StatusLabel>}
            />
            <div className="np-actions">
              <Button variant="danger" disabled={deleted} onClick={() => setConfirm(true)}>
                Discard draft
              </Button>
              <IconButton
                icon="refresh"
                label="Restore sample draft"
                onClick={() => {
                  setDeleted(false);
                  tell('Sample draft restored');
                }}
              />
            </div>
            <Button variant="secondary" disabled>
              Publish schedule
            </Button>
            <small className="studio-muted">Publishing becomes available after review.</small>
          </Stack>
        </Pad>
      </Card>
      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Discard this draft?"
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              Keep draft
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setDeleted(true);
                setConfirm(false);
                tell('Draft discarded');
              }}
            >
              Discard draft
            </Button>
          </>
        }
      >
        The unpublished changes for this week will be removed.
      </Dialog>
    </div>
  );
}

const initial = {
  name: 'Alex Rivera',
  location: 'Northside',
  date: '2026-11-23',
  start: '09:00',
  end: '17:00',
};
export function Forms({tell}: {tell: Tell}) {
  const [saved, setSaved] = useState(initial),
    [draft, setDraft] = useState(initial),
    [tried, setTried] = useState(false),
    [discard, setDiscard] = useState(false),
    [busy, setBusy] = useState(false);
  const delay = useDelay(),
    form = useRef<HTMLFormElement>(null);
  const error = tried && !draft.name.trim() ? 'Enter an employee name.' : undefined;
  const [contact, setContact] = useState('alex@');
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const edit = (key: keyof typeof initial, value: string) => setDraft({...draft, [key]: value});
  const missingTime = tried && (!draft.start || !draft.end);
  return (
    <div className="studio-grid">
      <Card title="Shift details">
        <Pad>
          <form
            ref={form}
            className="studio-stack"
            noValidate
            onSubmit={e => {
              e.preventDefault();
              if (busy) return;
              setTried(true);
              if (!draft.name.trim() || !draft.date || !draft.start || !draft.end) {
                const name = !draft.name.trim()
                  ? 'name'
                  : !draft.date
                    ? 'date'
                    : !draft.start
                      ? 'start'
                      : 'end';
                form.current?.querySelector<HTMLInputElement>('[name="' + name + '"]')?.focus();
                return;
              }
              setBusy(true);
              delay(() => {
                setSaved(draft);
                setBusy(false);
                setTried(false);
                tell('Shift details saved');
              });
            }}
          >
            <Field
              name="name"
              label="Employee name"
              required
              value={draft.name}
              disabled={busy}
              onChange={e => edit('name', e.target.value)}
              error={error}
            />
            <Select
              label="Location"
              value={draft.location}
              disabled={busy}
              onChange={e => edit('location', e.target.value)}
            >
              <option>Northside</option>
              <option>Westside</option>
            </Select>
            <Field
              label="Shift date"
              name="date"
              type="date"
              required
              disabled={busy}
              value={draft.date}
              onChange={e => edit('date', e.target.value)}
              error={tried && !draft.date ? 'Choose a date.' : undefined}
            />
            <div className="studio-pair">
              <Field
                label="Start time"
                name="start"
                type="time"
                required
                disabled={busy}
                value={draft.start}
                onChange={e => edit('start', e.target.value)}
                error={missingTime && !draft.start ? 'Enter a start time.' : undefined}
              />
              <Field
                label="End time"
                name="end"
                type="time"
                required
                disabled={busy}
                value={draft.end}
                onChange={e => edit('end', e.target.value)}
                error={missingTime && !draft.end ? 'Enter an end time.' : undefined}
              />
            </div>
            {draft.end && draft.start && draft.end <= draft.start && (
              <Notice title="Overnight shift">The shift ends the following day.</Notice>
            )}
            <div className="np-actions">
              <Button type="submit" disabled={!dirty} busy={busy} busyLabel="Saving…">
                Save changes
              </Button>
              <Button variant="quiet" disabled={!dirty || busy} onClick={() => setDiscard(true)}>
                Discard
              </Button>
            </div>
          </form>
        </Pad>
      </Card>
      <Card title="Field states">
        <Pad>
          <Stack>
            <Field
              label="Employee ID"
              value="NV-1042"
              readOnly
              hint="Assigned by your workplace."
            />
            <Field label="Payroll group" value="Hourly" disabled />
            <Field
              label="Contact email"
              value={contact}
              onChange={e => setContact(e.target.value)}
              type="email"
              error={
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)
                  ? 'Enter a complete email address.'
                  : undefined
              }
            />
            <Notice tone="info" title="Sample schedule">
              All changes stay in this gallery session.
            </Notice>
          </Stack>
        </Pad>
      </Card>
      <Dialog
        open={discard}
        title="Discard your edits?"
        onClose={() => setDiscard(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDiscard(false)}>
              Keep editing
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setDraft(saved);
                setTried(false);
                setDiscard(false);
                tell('Edits discarded');
              }}
            >
              Discard edits
            </Button>
          </>
        }
      >
        Your last saved shift details will be restored.
      </Dialog>
    </div>
  );
}
