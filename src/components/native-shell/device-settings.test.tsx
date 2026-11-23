import { it, expect } from '@rstest/core';
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
// Nov 23 (L1 fix): no repeated wording, one solid main action per state, white secondaries, red-worded turn-off last.
it('each Alerts state has one main action and never repeats its title or a button in its words', async () => {
    const { NativeDeviceSettingsB } = await import('./device-settings');
    const count = (html: string, word: string) => html.split(word).length - 1;
    const solid = (html: string, b: boolean) => b ? count(html, 'b-btn--teal') : count(html, 'class="c-btn"');
    const gen = 'b0eb37ac-e8a2-4f72-9f01-74eaa15eaa11';
    for (const [View, b] of [[NativeDeviceSettingsB, true], [NativeDeviceSettingsView, false]] as const) {
        const draw = (snapshot: Parameters<typeof NativeDeviceSettingsView>[0]['snapshot']) => renderToStaticMarkup(<View {...actions} onReviewSetup={() => { }} snapshot={snapshot}/>);
        const error = draw({ state: 'error' });
        expect(count(error, 'Check again')).toBe(1);
        expect(error).toContain('Review app setup');
        expect(solid(error, b)).toBe(1);
        expect(error.indexOf('Check again')).toBeLessThan(error.indexOf('Review app setup'));
        expect(error).not.toContain('could not verify');
        const checking = draw({ state: 'loading' });
        expect(count(checking, 'Checking')).toBe(1);
        const on = draw({ state: 'enabled', generation: gen });
        expect(solid(on, b)).toBe(1);
        expect(on).toContain('nd-btn-off');
        expect(on.indexOf('Check again')).toBeLessThan(on.indexOf('Turn off alerts'));
        const changed = draw({ state: 'revoked', generation: gen });
        expect(solid(changed, b)).toBe(1);
        expect(changed.indexOf('Review app setup')).toBeLessThan(changed.indexOf('Check again'));
        expect(changed.indexOf('Check again')).toBeLessThan(changed.indexOf('Turn off alerts'));
        expect(count(changed, 'Review app setup')).toBe(1);
        const off = draw({ state: 'ready' });
        expect(solid(off, b)).toBe(1);
        expect(count(off, 'nd-btn-2')).toBe(1);
        const pending = draw({ state: 'error', generation: gen, message: 'Turn-off is still pending. You can also block NEVORA alerts in your phone settings.' });
        expect(count(pending, 'Check again')).toBe(1);
        expect(pending).toContain('role="status"');
        // The live line is in place before any message, so a later failure is announced.
        expect(draw({ state: 'ready' })).toContain('role="status"');
    }
    const confirmOff = renderToStaticMarkup(<NativeDeviceSettingsB {...actions} snapshot={{ state: 'enabled', generation: gen }} review={gen}/>);
    expect(count(confirmOff, 'b-btn--teal')).toBe(0);
    const confirmUse = renderToStaticMarkup(<NativeDeviceSettingsB {...actions} recover snapshot={{ state: 'revoked', generation: gen }}/>);
    expect(count(confirmUse, 'b-btn--teal')).toBe(1);
    expect(count(renderToStaticMarkup(<NativeDeviceSettingsView {...actions} recover snapshot={{ state: 'revoked', generation: gen }}/>), 'class="c-btn"')).toBe(1);
});
