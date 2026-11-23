import { expect } from '@rstest/core';
import { join } from 'node:path';
import { withOwnedTestResources } from './owned-test-resources';

export type ProductionWorkspaceScreen = { engine: string; screen: string; width: number; screenshot: string };
type Selector = {
  waitFor(): Promise<void>; fill(value: string): Promise<void>; selectOption(value: string): Promise<unknown>;
  click(): Promise<void>; first(): Selector; isEnabled(): Promise<boolean>; getAttribute(name: string): Promise<string | null>;
};
type Page = {
  context(): BrowserContext; goto(url: string): Promise<unknown>; url(): string;
  getByRole(role: string, options: { name: string | RegExp; exact?: boolean }): Selector;
  getByText(text: string, options: { exact: boolean }): Selector;
  getByLabel(text: string, options: { exact: boolean }): Selector;
  waitForURL(test: (url: URL) => boolean): Promise<void>; setDefaultTimeout(value: number): void;
  setViewportSize(size: { width: number; height: number }): Promise<void>;
  screenshot(options: { path: string; animations: 'disabled' }): Promise<unknown>;
};
type BrowserContext = {
  newPage(): Promise<Page>; close(): Promise<void>; clearCookies(): Promise<void>;
  on(event: string, listener: (page: { on(event: string, task: (error: Error) => void): unknown; url(): string }) => void): unknown;
};
type ContextOptions = { serviceWorkers: 'block'; proxy: { server: string }; ignoreHTTPSErrors: boolean };
type Browser = { newContext(options: ContextOptions): Promise<BrowserContext>; close(): Promise<void> };

/** Browser evidence for the three routed screens in the isolated production build. */
export async function checkProductionWorkspaceScreens(options: {
  runtime: { webkit: { launch(options: { headless: boolean }): Promise<Browser> } };
  browser: Browser;
  page: Page;
  contextOptions: Parameters<Browser['newContext']>[0];
  origin: string;
  password: string;
  location: { id: string; clockerKey: string };
  directory: string;
  pause: () => Promise<void>;
  verifyImport: (id: string) => Promise<void>;
  watch: (context: BrowserContext, label: string) => Promise<void>;
  results: ProductionWorkspaceScreen[];
}) {
  const { runtime, browser, page, contextOptions, origin, password, location, directory, results } = options;
  const route = '/clocker/' + location.clockerKey;
  const capture = async (engine: string, screen: string, target: Page) => {
    for (const width of [390, 1440]) {
      await target.setViewportSize({ width, height: 900 });
      const screenshot = `${engine}-${screen}-${width}.png`;
      await target.screenshot({ path: join(directory, screenshot), animations: 'disabled' });
      results.push({ engine, screen, width, screenshot });
    }
  };
  const login = async (target: Page, destination: string) => {
    await target.context().clearCookies();
    await target.goto(origin + '/login?returnTo=' + encodeURIComponent(destination));
    await target.getByLabel('Employee ID', { exact: true }).fill('OWNER-1');
    await target.getByLabel('Password', { exact: true }).fill(password);
    await target.getByRole('button', { name: 'Sign in', exact: true }).click();
    await target.waitForURL(url => url.pathname === destination);
  };
  const billing = async (target: Page, state: 'Trial' | 'Access paused') => {
    await target.getByRole('heading', { name: 'Workplace billing', exact: true }).waitFor();
    await target.getByText(state, { exact: true }).waitFor();
    await expect.poll(() => target.getByRole('button', { name: 'Open billing in Velani', exact: true }).isEnabled()).toBe(true);
  };

  await withOwnedTestResources(async defer => {
    const webkit = await runtime.webkit.launch({ headless: true });
    defer(() => webkit.close());
    const webkitContext = await webkit.newContext(contextOptions);
    await options.watch(webkitContext, 'production-webkit-owner');
    const webkitPage = await webkitContext.newPage();
    webkitPage.setDefaultTimeout(15000);
    await login(webkitPage, '/app');

    const owners = [['chromium', browser, page], ['webkit', webkit, webkitPage]] as const;
    for (const [engine, , owner] of owners) {
      await owner.goto(origin + '/app/employees');
      await owner.getByRole('link', { name: /Import a staff list/, exact: false }).first().click();
      await owner.waitForURL(url => url.pathname === '/app/employees/import');
      await owner.getByRole('heading', { name: 'Import a staff list', exact: true }).first().waitFor();
      const staffList = owner.getByRole('textbox', { name: 'Staff list', exact: true });
      await staffList.waitFor();
      await capture(engine, 'staff-list', owner);

      const [employeeId, phone] = engine === 'chromium' ? ['QA-CSV-1', '7875550105'] : ['QA-CSV-2', '7875550106'];
      await staffList.fill('ID,First name,Last name,Phone\n' + employeeId + ',Fictional,Import,' + phone);
      await owner.getByLabel('Location for this list', { exact: true }).selectOption(location.id);
      await owner.getByRole('button', { name: 'Check list', exact: true }).click();
      await owner.getByText('This person is ready to import.', { exact: true }).waitFor();
      await capture(engine, 'staff-list-review', owner);
      await owner.getByRole('button', { name: 'Import 1 person', exact: true }).click();
      await owner.getByText('1 person added', { exact: true }).first().waitFor();
      await options.verifyImport(employeeId);
      await capture(engine, 'staff-list-receipt', owner);
      await owner.goto(origin + '/app/billing');
      await billing(owner, 'Trial');
      await capture(engine, 'workplace-billing-trial', owner);
    }
    await options.pause();
    for (const [engine, currentBrowser, owner] of owners) {
      await login(owner, '/app/billing');
      await billing(owner, 'Access paused');
      await capture(engine, 'workplace-billing-paused', owner);

      const tablet = await currentBrowser.newContext(contextOptions);
      defer(() => tablet.close());
      await options.watch(tablet, 'production-' + engine + '-clocker');
      const paused = await tablet.newPage();
      paused.setDefaultTimeout(15000);
      await paused.goto(origin + route);
      await paused.waitForURL(url => url.pathname === '/clocker/access/paused' &&
        url.searchParams.get('reason') === 'subscription_required' && url.searchParams.get('from') === route);
      await paused.getByRole('heading', { name: 'This time clock is paused', exact: true }).waitFor();
      expect(await paused.getByRole('link', { name: 'Try again', exact: true }).getAttribute('href')).toBe(route);
      await capture(engine, 'clocker-paused', paused);
      await paused.getByRole('link', { name: 'Try again', exact: true }).click();
      await paused.getByRole('heading', { name: 'This time clock is paused', exact: true }).waitFor();
    }
  });
}
