import {describe, it, expect} from '@rstest/core';
import {renderToStaticMarkup as html} from 'react-dom/server';
import {Button, Field, Switch} from './controls';
import {Notice, Progress} from './feedback';
import {GlassBand, Navigation} from './surfaces';
import {PinPad} from './clocker';
import {PunchReceipt} from './workforce';

const noop = () => {};
describe('premium component contracts', () => {
  it('blocks a second submission while preserving the busy-label slots', () => {
    const markup = html(
      <Button busy busyLabel="Saving">
        Save
      </Button>,
    );
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('disabled');
    expect(markup).toContain('Saving');
    expect(markup).toContain('b-busy__on');
  });
  it('names a switch and exposes its checked and disabled states', () => {
    const markup = html(
      <Switch label="Updates" description="New shifts" checked disabled onChange={noop} />,
    );
    for (const fragment of [
      'role="switch"',
      'aria-checked="true"',
      'disabled',
      'aria-labelledby',
      'aria-describedby',
      'Updates',
    ])
      expect(markup).toContain(fragment);
  });
  it('connects the validation error while retaining an external description', () => {
    const markup = html(
      <Field
        label="Name"
        id="employee"
        aria-describedby="policy"
        hint="Optional"
        error="Enter a name"
      />,
    );
    expect(markup).toContain('aria-describedby="policy employee-note"');
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain('id="employee-note"');
    expect(markup).not.toContain('Optional');
  });
  it('announces dynamic errors without announcing static warnings on mount', () => {
    expect(html(<Notice tone="danger" title="Save failed" announce />)).toContain('role="alert"');
    expect(html(<Notice tone="warning" title="Check hours" />)).not.toContain('role=');
  });
  it('keeps progress in range', () => {
    expect(html(<Progress value={110} label="Preparing" />)).toContain('value="100"');
    expect(html(<Progress value={-1} label="Preparing" />)).toContain('value="0"');
  });
  it('retains zero metrics and the active navigation link', () => {
    const band = html(
      <GlassBand title="Week" metrics={[{label: 'Open shifts', value: '0', icon: 'schedule'}]} />,
    );
    expect(band).toContain('<dd>0</dd>');
    expect(
      html(
        <Navigation
          label="Workspace"
          current="week"
          items={[{id: 'week', href: '/week', title: 'Week', icon: 'schedule'}]}
        />,
      ),
    ).toContain('aria-current="page"');
  });
  it('masks the employee PIN and blocks incomplete entry', () => {
    const pad = html(<PinPad value="1" onChange={noop} onSubmit={noop} />);
    expect(pad).toContain('type="password"');
    expect(pad).toMatch(/type="submit"[^>]*disabled/);
  });
  it('presents an unconfirmed receipt with a status-check action', () => {
    const unknown = html(
      <PunchReceipt
        confirmed={false}
        title="Unconfirmed"
        detail="Waiting for the server"
        action="Check status"
        onAction={noop}
      />,
    );
    expect(unknown).toContain('data-tone="warning"');
    expect(unknown).toContain('Check status');
  });
});
