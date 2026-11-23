import assert from 'node:assert/strict';
import { createECDH, randomBytes } from 'node:crypto';
import { join } from 'node:path';

export async function checkBrowserDeviceAlerts({ url, login, employee, phone, evidence, record }) {
  const page = await login(employee, phone);
  try {
    const keys = createECDH('prime256v1');
    keys.generateKeys();
    await page.addInitScript(subscription => {
      let permission = 'default';
      let enrolled = false;
      const worker = {
        postMessage(message, ports) {
          ports[0]?.postMessage({ version: 1, type: 'OWNER_STATE', generation: message.generation,
            status: message.type === 'SUPPRESS_OWNER' ? 'suppressed' : 'active' });
        },
      };
      const current = { toJSON: () => subscription, unsubscribe: async () => { enrolled = false; return true; } };
      const registration = { active: worker, waiting: null, getNotifications: async () => [],
        pushManager: { getSubscription: async () => enrolled ? current : null,
          subscribe: async () => { enrolled = true; return current; } } };
      Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: {
        register: async () => registration, ready: Promise.resolve(registration), getRegistration: async () => registration,
        addEventListener() {}, removeEventListener() {},
      } });
      Object.defineProperty(window, 'Notification', { configurable: true, value: {
        get permission() { return permission; },
        requestPermission: async () => { permission = 'granted'; return permission; },
      } });
    }, {
      endpoint: 'https://fcm.googleapis.com/fcm/send/fictional-collab-' + randomBytes(10).toString('hex'),
      expirationTime: null,
      keys: { p256dh: keys.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') },
    });
    await page.goto(url + '/app/profile/device-alerts');
    const ready = name => page.getByText(name, { exact: true }).filter({ visible: true }).waitFor();
    await ready('Alerts are off');
    const enrolled = page.waitForResponse(reply => new URL(reply.url()).pathname === '/app/api/push/subscribe');
    await page.getByRole('button', { name: 'Turn on alerts', exact: true }).click();
    assert.equal((await enrolled).status(), 200);
    await ready('Alerts are on');
    await page.screenshot({ path: join(evidence, 'browser-alerts-enabled-390.png') });

    const revoked = page.waitForResponse(reply => new URL(reply.url()).pathname === '/app/api/push/unsubscribe');
    await page.getByRole('button', { name: 'Turn off alerts', exact: true }).click();
    await page.getByRole('group', { name: 'Turn off alerts here?', exact: true })
      .getByRole('button', { name: 'Turn off alerts', exact: true }).click();
    assert.equal((await revoked).status(), 200);
    await ready('Alerts are off');
    record('I4', 'Employee enabled and turned off browser alerts using the authenticated app and a fictional device subscription');
  } finally {
    await page.context().close();
  }
}
