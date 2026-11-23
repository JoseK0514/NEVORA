import {useEffect, useId, useMemo, useRef, useState} from 'react';
import {
  AlertDialog,
  AspectRatio,
  Avatar,
  Badge,
  Box,
  Button,
  Callout,
  Card,
  Dialog,
  DropdownMenu,
  Flex,
  Grid,
  Heading,
  IconButton,
  Separator,
  TabNav,
  Text,
  TextField,
} from '@radix-ui/themes';
import {NevoraRadixTheme} from '../../src/components/premium/radix-theme';
import {Mark, type ComponentPart, type ResultKind} from '../../src/components/premium';
import {ClockerIcon} from '../../src/components/clocker-icon';
import {recoveryCopy} from './style-samples';
import type {RadixPart} from './style-sources';

type Pattern = Exclude<ComponentPart, RadixPart>;
const weeks = ['Nov 9–15', 'Nov 16–22', 'Nov 23–29', 'Nov 30–Dec 6'];
function CameraField() {
  const [file, setFile] = useState<File | null>(null),
    [message, setMessage] = useState(''),
    id = useId(),
    input = useRef<HTMLInputElement>(null);
  const url = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  function clear() {
    setFile(null);
    if (input.current) input.current.value = '';
  }
  return (
    <Flex direction="column" gap="2">
      <AspectRatio ratio={1.8}>
        <div className="nv-camera-frame">
          {url ? (
            <img src={url} alt="Selected photo" />
          ) : (
            <ClockerIcon name="camera" weight="fill" size={30} />
          )}
        </div>
      </AspectRatio>
      <Text as="label" size="2" htmlFor={id}>
        Take or choose a photo
      </Text>
      <input
        ref={input}
        id={id}
        type="file"
        accept="image/*"
        capture="user"
        onChange={e => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (!f.type.startsWith('image/')) {
            clear();
            setMessage('Choose an image file.');
            return;
          }
          setFile(f);
          setMessage('');
        }}
      />
      <Flex gap="2" wrap="wrap">
        <Button
          variant="surface"
          onClick={() => {
            clear();
            setMessage('Capture canceled');
          }}
        >
          Cancel
        </Button>
        <Button
          disabled={!file}
          onClick={() => {
            clear();
            setMessage('Sample photo accepted locally');
          }}
        >
          Use this photo
        </Button>
      </Flex>
      {message && (
        <Text size="1" role="status">
          {message}
        </Text>
      )}
    </Flex>
  );
}
function TabletPin() {
  const [v, setV] = useState(''),
    [message, setMessage] = useState(''),
    id = useId();
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        if (v.length === 4) {
          setV('');
          setMessage('Sample PIN entered');
        }
      }}
    >
      <Flex direction="column" gap="3">
        <Text as="label" size="2" htmlFor={id}>
          Employee PIN
        </Text>
        <TextField.Root
          id={id}
          type="password"
          inputMode="numeric"
          maxLength={4}
          autoComplete="off"
          value={v}
          onChange={e => setV(e.target.value.replace(/\D/g, '').slice(0, 4))}
        />
        <Grid columns="3" gap="2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'].map(k =>
            k === '' ? (
              <span key="blank" />
            ) : (
              <Button
                type="button"
                key={k}
                variant="surface"
                disabled={k === 'delete' ? !v : v.length === 4}
                aria-label={k === 'delete' ? 'Delete last digit' : undefined}
                onClick={() => setV(k === 'delete' ? v.slice(0, -1) : v + k)}
              >
                {k === 'delete' ? <Mark name="backspace" size={17} /> : k}
              </Button>
            ),
          )}
        </Grid>
        <Button type="submit" disabled={v.length !== 4}>
          Continue
        </Button>
        {message && (
          <Text size="1" role="status">
            {message}
          </Text>
        )}
      </Flex>
    </form>
  );
}
function RadixDecision({sheet}: {sheet: boolean}) {
  const [message, setMessage] = useState('');
  const title = sheet ? 'Schedule options' : 'Publish schedule?',
    body = sheet ? 'Choose a schedule view.' : 'The team will see the shifts for Nov 16–22.';
  const actions = (close: (message: string) => void) => (
    <Flex wrap="wrap" gap="2">
      {(sheet ? ['View hours', 'View team'] : ['Cancel', 'Publish']).map((s, i) => (
        <Button key={s} variant={i === 1 ? 'solid' : 'surface'} onClick={() => close(s)}>
          {s}
        </Button>
      ))}
    </Flex>
  );
  const [open, setOpen] = useState(false);
  const record = (s: string) => {
    setMessage(
      s === 'Publish'
        ? 'Sample schedule published'
        : s === 'Cancel'
          ? 'Kept as draft'
          : s === 'View hours'
            ? '32.5 scheduled hours'
            : '12 team members',
    );
    setOpen(false);
  };
  return (
    <Flex direction="column" align="start" gap="2">
      <Card size="2" style={{width: '100%'}}>
        <Heading size="3">{title}</Heading>
        <Text as="p" size="2" color="gray" my="2">
          {body}
        </Text>
        {actions(record)}
      </Card>
      {sheet ? (
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger>
            <Button variant="ghost">Open sheet</Button>
          </Dialog.Trigger>
          <Dialog.Content className="nv-upstream-sheet" maxWidth="420px">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Description mb="3">{body}</Dialog.Description>
            {actions(record)}
            <Dialog.Close>
              <Button mt="3" variant="ghost">
                Close
              </Button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Root>
      ) : (
        <AlertDialog.Root open={open} onOpenChange={setOpen}>
          <AlertDialog.Trigger>
            <Button variant="ghost">Open dialog</Button>
          </AlertDialog.Trigger>
          <AlertDialog.Content maxWidth="420px">
            <AlertDialog.Title>{title}</AlertDialog.Title>
            <AlertDialog.Description mb="3">{body}</AlertDialog.Description>
            <Flex gap="2">
              <AlertDialog.Cancel>
                <Button variant="surface" onClick={() => record('Cancel')}>
                  Cancel
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action>
                <Button onClick={() => record('Publish')}>Publish</Button>
              </AlertDialog.Action>
            </Flex>
          </AlertDialog.Content>
        </AlertDialog.Root>
      )}
      {message && (
        <Text role="status" size="1">
          {message}
        </Text>
      )}
    </Flex>
  );
}
export function RadixPattern({part, state}: {part: Pattern; state: string}) {
  const [on, setOn] = useState(false),
    [dest, setDest] = useState('Schedule'),
    [idx, setIdx] = useState(1),
    [msg, setMsg] = useState('');
  const note = msg ? (
    <Text as="div" size="1" color="gray" mt="2" role="status">
      {msg}
    </Text>
  ) : null;
  function sample() {
    switch (part) {
      case 'mark':
        return (
          <div className="nv-glyph-set" role="img" aria-label="Schedule, team and time icons">
            {(['schedule', 'team', 'clock'] as const).map(v => (
              <Mark key={v} name={v} size={30} weight="fill" />
            ))}
          </div>
        );
      case 'disc':
        return (
          <Flex justify="center" gap="3">
            {(['schedule', 'team', 'clock'] as const).map(v => (
              <Badge
                key={v}
                aria-hidden="true"
                variant="soft"
                radius="full"
                size="3"
                style={{padding: 9}}
              >
                <Mark name={v} size={20} />
              </Badge>
            ))}
          </Flex>
        );
      case 'row':
        return (
          <Card asChild variant="classic">
            <button type="button" onClick={() => setOn(!on)}>
              <Flex gap="3" align="center" justify="between">
                <Mark name="request" />
                <Box flexGrow="1">
                  <Text as="div" size="2" weight="bold">
                    Time-off requests
                  </Text>
                  <Text as="div" size="1" color="gray">
                    {on ? 'María Rivera · Nov 24' : '2 pending requests'}
                  </Text>
                </Box>
                <Mark name="right" size={16} />
              </Flex>
            </button>
          </Card>
        );
      case 'toast':
        return on ? (
          <Button variant="ghost" onClick={() => setOn(false)}>
            Show saved message
          </Button>
        ) : (
          <Callout.Root role="status" color="teal">
            <Callout.Icon>
              <Mark name="approve" size={18} />
            </Callout.Icon>
            <Callout.Text>
              <Flex align="center" gap="3">
                Shift changes saved
                <IconButton
                  variant="ghost"
                  aria-label="Dismiss saved message"
                  onClick={() => setOn(true)}
                >
                  <Mark name="close" size={16} />
                </IconButton>
              </Flex>
            </Callout.Text>
          </Callout.Root>
        );
      case 'week':
        return (
          <Flex gap="2" align="center" justify="center">
            <IconButton
              variant="soft"
              aria-label="Previous week"
              onClick={() => setIdx((idx + 3) % 4)}
            >
              <Mark name="left" />
            </IconButton>
            <Text size="2" weight="medium" aria-live="polite">
              {weeks[idx]}
            </Text>
            <IconButton variant="soft" aria-label="Next week" onClick={() => setIdx((idx + 1) % 4)}>
              <Mark name="right" />
            </IconButton>
          </Flex>
        );
      case 'glass':
        return (
          <Card size="3" className="nv-radix-glass">
            <Text size="1" weight="medium">
              Northside
            </Text>
            <Heading size="4" mb="3">
              Shift overview
            </Heading>
            <Grid columns="2" gap="2">
              {[
                ['Hours', '32.5'],
                ['Team', '12'],
              ].map(([k, v]) => (
                <div key={k} className="nv-glass-stat">
                  <Text as="div" size="1">
                    {k}
                  </Text>
                  <Text size="5" weight="bold">
                    {v}
                  </Text>
                </div>
              ))}
            </Grid>
          </Card>
        );
      case 'datetime':
        return (
          <Flex direction="column" gap="2">
            {(['date', 'time'] as const).map(t => (
              <Text as="label" size="2" weight="medium" key={t}>
                {t === 'date' ? 'Shift date' : 'Starts at'}
                <TextField.Root
                  type={t}
                  defaultValue={t === 'date' ? '2026-11-23' : '09:00'}
                  mt="1"
                  size="3"
                />
              </Text>
            ))}
          </Flex>
        );
      case 'navigation':
        return (
          <TabNav.Root aria-label="Preview navigation" className={'nv-tabnav-' + state}>
            {(['Schedule', 'Time', 'Team'] as const).map((v, i) => (
              <TabNav.Link
                key={v}
                active={dest === v}
                href="#compare/navigation"
                aria-label={v}
                onClick={e => {
                  e.preventDefault();
                  setDest(v);
                }}
              >
                <Mark name={(['schedule', 'clock', 'team'] as const)[i]} size={17} />
                {state !== 'rail' && v}
              </TabNav.Link>
            ))}
          </TabNav.Root>
        );
      case 'overflow':
        return (
          <>
            <Flex align="center" justify="between">
              <Text weight="bold" size="2">
                Weekly schedule
              </Text>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                  <IconButton variant="surface" aria-label="Schedule actions">
                    <Mark name="more" />
                  </IconButton>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content>
                  <DropdownMenu.Item onSelect={() => setMsg('32.5 scheduled hours')}>
                    View hours
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={() => setMsg('12 team members')}>
                    View team
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            </Flex>
            {note}
          </>
        );
      case 'dialog':
      case 'sheet':
        return <RadixDecision sheet={part === 'sheet'} />;
      case 'result': {
        const kind = (Object.hasOwn(recoveryCopy, state) ? state : 'offline') as ResultKind,
          [title, detail, action] = recoveryCopy[kind];
        return (
          <Card>
            <Flex direction="column" align="start" gap="2">
              <Badge
                size="2"
                color={
                  kind === 'saved'
                    ? 'green'
                    : kind === 'error' || kind === 'denied'
                      ? 'red'
                      : 'gray'
                }
              >
                <Mark
                  name={kind === 'saved' ? 'approve' : kind === 'denied' ? 'lock' : 'info'}
                  size={16}
                />
              </Badge>
              <Heading size="3">{title}</Heading>
              <Text color="gray" size="2">
                {detail}
              </Text>
              <Button variant="surface" onClick={() => setMsg('Sample status checked')}>
                {action}
              </Button>
              {note}
            </Flex>
          </Card>
        );
      }
      case 'shift':
      case 'approval': {
        const approval = part === 'approval';
        return (
          <Card size="2">
            <Flex gap="3" align="center">
              <Avatar size="2" fallback="MR" />
              <Box flexGrow="1">
                <Text size="2" weight="bold" as="div">
                  María Rivera
                </Text>
                <Text size="1" color="gray">
                  {approval ? 'Time off · Nov 24' : 'Northside · Lead'}
                </Text>
              </Box>
            </Flex>
            <Separator size="4" my="2" />
            <Flex align="center" justify="between" wrap="wrap" gap="2">
              <Text size="2">{approval ? 'Morning shift · 8 hours' : '10 PM – 6 AM'}</Text>
              <Badge color={approval ? (on ? 'green' : 'amber') : 'gray'}>
                {approval ? (on ? 'Approved' : 'Pending') : 'Overnight'}
              </Badge>
            </Flex>
            {approval && (
              <Button mt="2" variant="surface" onClick={() => setOn(!on)}>
                {on ? 'Reset sample' : 'Approve'}
              </Button>
            )}
          </Card>
        );
      }
      case 'tablet':
        return (
          <Card size="3">
            <Flex align="center" justify="between" gap="2">
              <Text size="2" weight="medium">
                Northside
              </Text>
              <Badge color="green">Connected</Badge>
            </Flex>
            <Separator size="4" my="3" />
            <Heading size="5">Hi, Alex.</Heading>
            <Text color="gray" size="2">
              You’re ready to clock in.
            </Text>
          </Card>
        );
      case 'pin':
        return <TabletPin />;
      case 'photo':
        return <CameraField />;
      case 'punch':
      case 'break': {
        const k = part === 'punch' ? (on ? 'clock-out' : 'clock-in') : on ? 'meal' : 'rest';
        return (
          <>
            <Button
              size="4"
              variant="solid"
              className="nv-radix-punch"
              onClick={() => {
                setOn(!on);
                setMsg(part === 'punch' ? 'Sample punch recorded' : 'Sample break selected');
              }}
            >
              <ClockerIcon name={k} weight="fill" size={22} />
              <Box>
                <Text as="span" weight="bold">
                  {k === 'clock-in'
                    ? 'Clock in'
                    : k === 'clock-out'
                      ? 'Clock out'
                      : k === 'meal'
                        ? 'Meal break'
                        : 'Rest break'}
                </Text>
                <Text as="span" size="1">
                  {part === 'punch' ? 'Northside · Front desk' : 'Choose your break'}
                </Text>
              </Box>
            </Button>
            {note}
          </>
        );
      }
      case 'receipt':
      case 'unconfirmed': {
        const ok = part === 'receipt' || on;
        return (
          <Card size="2">
            <Flex gap="2" direction="column" align="start">
              <Badge size="2" color={ok ? 'green' : 'amber'}>
                <ClockerIcon name={ok ? 'check' : 'unknown'} weight="bold" size={17} />
                {ok ? 'Recorded' : 'Unconfirmed'}
              </Badge>
              <Heading size="3">{ok ? 'Clock-in recorded' : 'Punch unconfirmed'}</Heading>
              <Text color="gray" size="2">
                {ok ? 'Northside · 9:41 AM' : 'Check the recorded status before punching again.'}
              </Text>
              {ok && <Text size="1">DEMO-1042</Text>}
              <Button
                variant="surface"
                onClick={() => {
                  if (ok) setMsg('Receipt closed');
                  else setOn(true);
                }}
              >
                {ok ? 'Done' : 'Check status'}
              </Button>
              {note}
            </Flex>
          </Card>
        );
      }
    }
  }
  return <NevoraRadixTheme>{sample()}</NevoraRadixTheme>;
}
