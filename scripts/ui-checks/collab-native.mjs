import { join } from 'node:path';

const generation = '11111111-1111-4111-8111-111111111111';

export async function checkNativeAlerts({ url, login, employee, evidence, record }) {
  const page = await login(employee, { width: 390, height: 844 }, 'NEVORA-Native/iOS/1');
  try {
    await page.bringToFront();
    await page.addInitScript(generation => {
      const scenario = sessionStorage.getItem('collab-native-scenario') || 'off';
      const bridge = {
        postMessage(raw) {
          const request = JSON.parse(raw);
          if (scenario === 'asking') return;
          const response = request.method === 'hello' ? {
            state: 'ready', nonce: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', platform: 'ios',
            spki: 'fictional-public-key', keyFingerprint: 'a'.repeat(64),
            permission: scenario === 'blocked' ? 'denied' : 'granted',
            generation: scenario === 'on' ? generation : null,
            revision: scenario === 'on' ? generation : null,
          } : { state: 'unavailable' };
          queueMicrotask(() => bridge.onmessage?.({ data: JSON.stringify({ ...response, version: 1, id: request.id }) }));
        },
      };
      window.nevoraCapabilities = bridge;
    }, generation);

    const titles = {
      off: 'Alerts are off', asking: 'Checking this device…',
      on: 'Alerts are on', blocked: 'Permission is blocked',
    };
    let scenario = 'off';
    await page.route('**/api/mobile/v1/notifications/*', route => route.fulfill({
      json: scenario === 'on' ? { state: 'active', generation } : { state: 'off' },
    }));
    await page.goto(url + '/app/profile/device-alerts');
    for (const [name, title] of Object.entries(titles)) {
      scenario = name;
      await page.evaluate(value => sessionStorage.setItem('collab-native-scenario', value), name);
      await page.reload();
      await page.locator('[data-native-status]').and(page.getByText(title, { exact: true })).filter({ visible: true }).first().waitFor();
      await page.screenshot({ path: join(evidence, 'native-alerts-' + name + '-390.png') });
      record('L1', 'Phone app Alerts ' + name + ' state using a simulated bridge');
    }
  } finally {
    await page.context().close();
  }
}
