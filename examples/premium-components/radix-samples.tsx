import {useId, useState} from 'react';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Callout,
  Card,
  Checkbox,
  DataList,
  Flex,
  IconButton,
  Progress,
  RadioGroup,
  SegmentedControl,
  Select,
  Skeleton,
  Spinner,
  Switch,
  Text,
  TextField,
} from '@radix-ui/themes';
import {NevoraRadixTheme} from '../../src/components/premium/radix-theme';
import {Mark, type Tone} from '../../src/components/premium';
import {useDelay} from './controls-demo';
import {type RadixPart} from './style-sources';
import {toneLabels, titles, details} from './style-samples';

const toneColors = {
  neutral: 'gray',
  info: 'teal',
  success: 'green',
  warning: 'amber',
  danger: 'red',
} as const;
export function RadixSample({part, state}: {part: RadixPart; state: string}) {
  const [value, setValue] = useState(''),
    [checked, setChecked] = useState(true),
    [busy, setBusy] = useState(false),
    [msg, setMsg] = useState(''),
    [percent, setPercent] = useState(40),
    [week, setWeek] = useState(1);
  const id = useId(),
    delay = useDelay();
  const note = msg ? (
    <small className="nv-sample-note" role="status">
      {msg}
    </small>
  ) : null;
  const tone = (Object.hasOwn(toneLabels, state) ? state : 'warning') as Tone;
  function sample() {
    switch (part) {
      case 'button':
      case 'busy-button': {
        const danger = state === 'destructive',
          secondary = state === 'secondary',
          quiet = state === 'quiet';
        return (
          <>
            <Button
              size="3"
              color={danger ? 'red' : 'teal'}
              variant={quiet ? 'ghost' : secondary ? 'surface' : 'solid'}
              disabled={state === 'disabled'}
              loading={busy}
              aria-busy={busy || undefined}
              aria-label={busy ? 'Saving…' : undefined}
              onClick={() => {
                if (part === 'busy-button') {
                  setBusy(true);
                  delay(() => {
                    setBusy(false);
                    setMsg('Changes saved');
                  }, 1600);
                } else
                  setMsg(
                    danger
                      ? 'Sample draft discarded'
                      : quiet
                        ? 'Details opened'
                        : secondary
                          ? 'Schedule opened'
                          : 'Sample schedule published',
                  );
              }}
            >
              <Mark
                name={danger ? 'close' : quiet || secondary ? 'schedule' : 'check'}
                size={17}
                weight="bold"
              />
              {part === 'busy-button'
                ? 'Save changes'
                : danger
                  ? 'Discard draft'
                  : quiet
                    ? 'View details'
                    : secondary
                      ? 'View schedule'
                      : 'Publish schedule'}
            </Button>
            {note}
          </>
        );
      }
      case 'icon-button':
        return (
          <>
            <IconButton
              size="3"
              variant="ghost"
              aria-label="Next week"
              onClick={() => {
                setWeek((week + 1) % 4);
                setMsg(['Nov 9–15', 'Nov 16–22', 'Nov 23–29', 'Nov 30–Dec 6'][(week + 1) % 4]);
              }}
            >
              <Mark name="right" weight="bold" />
            </IconButton>
            {note}
          </>
        );
      case 'switch':
        return (
          <Flex gap="4" justify="between" align="center">
            <span className="np-row-copy">
              <strong id={id}>Shift reminders</strong>
              <small id={id + '-hint'}>Notify me before my shift.</small>
            </span>
            <Switch
              size="3"
              aria-labelledby={id}
              aria-describedby={id + '-hint'}
              checked={checked}
              onCheckedChange={setChecked}
            />
          </Flex>
        );
      case 'checkbox':
        return (
          <Text as="label" size="2">
            <Flex as="span" align="center" gap="2" className="nv-radix-label">
              <Checkbox size="3" checked={checked} onCheckedChange={v => setChecked(v === true)} />
              Include open shifts
            </Flex>
          </Text>
        );
      case 'radio':
        return (
          <RadioGroup.Root aria-label="Schedule range" defaultValue="This week">
            {['This week', 'Next week'].map(v => (
              <Text key={v} as="label" size="2">
                <Flex as="span" gap="2" align="center" className="nv-radix-label">
                  <RadioGroup.Item value={v} />
                  {v}
                </Flex>
              </Text>
            ))}
          </RadioGroup.Root>
        );
      case 'segments':
      case 'filters': {
        const labels =
          part === 'filters' ? ['All', 'On shift', 'On break'] : ['Day', 'Week', 'Month'];
        return (
          <SegmentedControl.Root
            size="2"
            aria-label={part === 'filters' ? 'Shift filter' : 'Calendar view'}
            defaultValue={labels[0]}
          >
            {labels.map(v => (
              <SegmentedControl.Item key={v} value={v}>
                {v}
              </SegmentedControl.Item>
            ))}
          </SegmentedControl.Root>
        );
      }
      case 'spinner':
        return (
          <Flex gap="2" align="center" role="status">
            <Spinner size="3" />
            <Text size="2">Loading shifts…</Text>
          </Flex>
        );
      case 'skeleton':
        return (
          <Flex direction="column" gap="3" role="status" aria-label="Loading roster">
            {[1, 2].map(n => (
              <Flex key={n} gap="3" align="center">
                <Skeleton width="36px" height="36px" style={{borderRadius: '50%'}} />
                <Flex direction="column" gap="2" flexGrow="1">
                  <Skeleton height="9px" width="78%" />
                  <Skeleton height="7px" width="50%" />
                </Flex>
              </Flex>
            ))}
          </Flex>
        );
      case 'progress':
        return (
          <>
            <Flex justify="between" mb="2">
              <Text size="2" id={id}>
                Exporting timecards
              </Text>
              <Text size="2">{percent}%</Text>
            </Flex>
            <Progress aria-labelledby={id} value={percent} size="3" />
            <button
              className="nv-inline-action"
              onClick={() => setPercent(percent === 100 ? 0 : Math.min(percent + 20, 100))}
            >
              {percent === 100 ? 'Restart export' : 'Advance export'}
            </button>
          </>
        );
      case 'status':
        return (
          <Flex gap="2" align="center">
            <Badge variant="soft" size="2" color={toneColors[tone]}>
              {toneLabels[tone]}
            </Badge>
            <Badge variant="soft" size="2" color="gray">
              Draft
            </Badge>
          </Flex>
        );
      case 'notice':
        return (
          <Callout.Root variant="soft" color={toneColors[tone]}>
            <Callout.Icon>
              <Mark
                name={
                  tone === 'warning'
                    ? 'warning'
                    : tone === 'danger'
                      ? 'blocked'
                      : tone === 'success'
                        ? 'approve'
                        : 'info'
                }
                size={18}
              />
            </Callout.Icon>
            <Callout.Text>
              <strong>{titles[tone]}</strong>
              <br />
              {details[tone]}
            </Callout.Text>
          </Callout.Root>
        );
      case 'card':
        return (
          <Card size="2">
            <Flex direction="column" gap="3">
              <Text as="div" size="2" weight="bold">
                Closing shift
              </Text>
              <Box>
                <Text as="div" weight="medium">
                  4:00 PM – 10:00 PM
                </Text>
                <Text size="2" color="gray">
                  Northside · Front desk
                </Text>
              </Box>
            </Flex>
          </Card>
        );
      case 'avatar':
        return (
          <Flex gap="3" align="center">
            <Avatar size="3" color="teal" radius="full" fallback="MR" />
            <Text size="2" weight="medium">
              María Rivera
            </Text>
          </Flex>
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
                  : 'Employee ID',
          placeholder =
            part === 'field'
              ? 'María Rivera'
              : part === 'search'
                ? 'Search by name'
                : part === 'setup'
                  ? '804206'
                  : '1042',
          error = state === 'error' && !value;
        return (
          <>
            <Text size="2" as="label" htmlFor={id} weight="medium">
              {label}
            </Text>
            <TextField.Root
              mt="1"
              id={id}
              placeholder={placeholder}
              type={part === 'search' ? 'search' : 'text'}
              inputMode={part === 'setup' || part === 'employee-id' ? 'numeric' : undefined}
              size="3"
              aria-invalid={error || undefined}
              aria-describedby={error ? id + '-error' : undefined}
              disabled={state === 'disabled'}
              value={value}
              onChange={e => {
                setValue(e.target.value);
                setMsg('');
              }}
            >
              {part === 'search' && (
                <TextField.Slot>
                  <Mark name="search" size={16} />
                </TextField.Slot>
              )}
            </TextField.Root>
            {error && (
              <Text as="div" color="red" size="1" id={id + '-error'}>
                Enter a value to continue.
              </Text>
            )}
            {(part === 'setup' || part === 'employee-id') && (
              <button
                className="nv-inline-action"
                onClick={() =>
                  setMsg(
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
          <Flex direction="column" gap="1">
            <Text as="label" size="2" htmlFor={id} weight="medium">
              Location
            </Text>
            <Select.Root size="3" disabled={state === 'disabled'} defaultValue="Northside">
              <Select.Trigger id={id} variant="surface" />
              <Select.Content>
                {['Northside', 'Westside'].map(v => (
                  <Select.Item key={v} value={v}>
                    {v}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>
        );
      case 'timecard':
      case 'pay': {
        const pay = part === 'pay';
        const records = pay
          ? [
              ['Regular earnings', '$650.00'],
              ['Overtime', '$0.00'],
              ['Gross pay', '$650.00'],
            ]
          : [
              ['Regular hours', '32.5 h'],
              ['Overtime', '0.0 h'],
              ['Recorded time', '32.5 h'],
            ];
        return (
          <Flex direction="column" gap="3">
            <Box>
              <Text as="div" weight="bold">
                {pay ? 'Pay statement' : 'Alex Rivera'}
              </Text>
              <Text size="2" color="gray">
                Nov 16–22
              </Text>
            </Box>
            <DataList.Root size="2">
              {records.map(([label, value], index) => (
                <DataList.Item key={label}>
                  <DataList.Label>{label}</DataList.Label>
                  <DataList.Value>
                    <Text weight={index === 2 ? 'bold' : 'regular'}>{value}</Text>
                  </DataList.Value>
                </DataList.Item>
              ))}
            </DataList.Root>
          </Flex>
        );
      }
    }
  }
  return <NevoraRadixTheme>{sample()}</NevoraRadixTheme>;
}
