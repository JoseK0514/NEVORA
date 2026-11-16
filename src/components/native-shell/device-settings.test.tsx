import { it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NativeDeviceSettingsView } from './device-settings';
const actions = { onEnable() { }, onRefresh() { }, onReview() { }, onKeep() { }, onTurnOff() { } };
it('native controls describe the app without browser installation or delivery claims', () => {
    const html = renderToStaticMarkup(<NativeDeviceSettingsView {...actions} snapshot={{ state: 'ready' }}/>);
    expect(html).toContain('Turn on alerts');
    expect(html).toContain('NEVORA app');
    expect(html).not.toContain('Home Screen');
    expect(html).not.toContain('Test notification');
});
it('turn-off requires the currently reviewed generation and pending controls stay disabled', () => {
    expect(renderToStaticMarkup(<NativeDeviceSettingsView {...actions} snapshot={{ state: 'enabled', generation: 'fictional' }} review='fictional'/>)).toContain('Keep current setup');
    expect(renderToStaticMarkup(<NativeDeviceSettingsView {...actions} snapshot={{ state: 'enabled', generation: 'new' }} review='old'/>)).not.toContain('Keep current setup');
    const html = renderToStaticMarkup(<NativeDeviceSettingsView {...actions} snapshot={{ state: 'pending' }}/>);
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain('Turn on alerts');
});
// Direction B (Nov 9, 2026): the phone app's Alerts page draws the same states in NativeDeviceSettingsB; it must keep
// the card view's words, the data-native-* hooks and the same guards.
it('the Direction B Alerts page keeps the native words, hooks and turn-off guard', async () => {
    const { NativeDeviceSettingsB, NativeAlertsUnavailableB } = await import('./device-settings');
    const ready = renderToStaticMarkup(<NativeDeviceSettingsB {...actions} snapshot={{ state: 'ready' }}/>);
    expect(ready).toContain('Turn on alerts');
    expect(ready).toContain('NEVORA app');
    expect(ready).toContain('data-native-status');
    expect(ready).not.toContain('Home Screen');
    expect(ready).not.toContain('Test notification');
    expect(renderToStaticMarkup(<NativeDeviceSettingsB {...actions} snapshot={{ state: 'enabled', generation: 'fictional' }} review='fictional'/>)).toContain('Keep current setup');
    expect(renderToStaticMarkup(<NativeDeviceSettingsB {...actions} snapshot={{ state: 'enabled', generation: 'new' }} review='old'/>)).not.toContain('Keep current setup');
    const pending = renderToStaticMarkup(<NativeDeviceSettingsB {...actions} snapshot={{ state: 'pending' }}/>);
    expect(pending).toContain('aria-busy="true"');
    expect(pending).not.toContain('Turn on alerts');
    expect(renderToStaticMarkup(<NativeAlertsUnavailableB/>)).toContain('Your workplace has not made app alerts available.');
});
