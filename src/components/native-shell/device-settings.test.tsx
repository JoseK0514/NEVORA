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
