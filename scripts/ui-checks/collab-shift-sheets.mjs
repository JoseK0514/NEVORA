import { join } from 'node:path';

const actions = [
  { id: 'C14', path: '/app/exchange/swap', mode: null, title: 'Swap shift' },
  { id: 'C14', path: '/app/exchange/swap', mode: 'cover', title: 'Offer for cover' },
  { id: 'C15', path: '/app/exchange/callout', mode: null, title: 'Can’t work this shift' },
];

export async function checkShiftSheets({ url, week, shift, profile, page, viewport, evidence, record }) {
  const schedule = '/app/schedule?week=' + encodeURIComponent(week);
  const shiftLink = page.locator('main a[aria-haspopup="dialog"][href$="&shift=' + encodeURIComponent(shift) + '"]')
    .filter({ visible: true });
  for (const { id, path, mode, title } of actions) {
    await page.goto(url + schedule);
    await shiftLink.click();
    const details = page.locator('dialog[open]').filter({ has: page.getByRole('heading') });
    const links = details.locator('a[href^="' + path + '?"]');
    await (mode === 'cover' ? links.and(page.locator('[href$="&mode=cover"]')) :
      links.and(page.locator(':not([href$="&mode=cover"])'))).click();
    await page.waitForURL(target => target.pathname === path && target.searchParams.get('mode') === mode);
    const sheet = page.getByRole('dialog', { name: 'Change a shift' });
    await sheet.getByRole('heading', { name: title, exact: true }).waitFor();
    await sheet.locator('[data-creation-state="ready"]').waitFor();
    if (title === 'Swap shift') await sheet.locator('input[name="targetShiftId"]').first().waitFor();
    if (title === 'Can’t work this shift') await sheet.locator('input[name="reasonCode"]').first().waitFor();
    if (mode === 'cover') await sheet.getByText('Who can take it', { exact: true }).waitFor();
    await page.screenshot({ animations: 'disabled', path: join(evidence, 'shift-' + profile + '-' + viewport.width + '-' + (mode ?? path.split('/').at(-1)) + '.png') });
    await page.keyboard.press('Escape');
    await page.waitForURL(target => target.pathname === '/app/schedule');
    await sheet.waitFor({ state: 'hidden' });
    record(id, profile + ' opened and dismissed ' + title + ' from Schedule at ' + viewport.width + ' px');
  }
}
