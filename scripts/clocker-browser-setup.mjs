import assert from 'node:assert/strict';

export async function saveClockerPin(page, pin) {
  await page.getByLabel('New PIN', {exact: true}).fill(pin);
  await page.getByLabel('Type it again', {exact: true}).fill(pin);
  const save = page.getByRole('button', {name: 'Save PIN', exact: true});
  assert.equal(await save.evaluate(button => button.form?.id), 'clocker-pin-form');
  await save.click();
  await page.getByRole('status').filter({hasText: /^PIN set for .+\. Tell them in person\./}).waitFor();
}

export async function registerTestTablet(page, name) {
  await page.getByRole('heading', {name: 'Clocker tablets', exact: true}).waitFor();
  await page.getByRole('button', {name: /^Add (?:a )?tablet$/}).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('heading', {name: 'Add a tablet', exact: true}).waitFor();
  await dialog.getByLabel('Tablet name', {exact: true}).fill(name);
  await dialog.getByRole('combobox', {name: 'Location', exact: true}).selectOption('loc-1');
  await dialog.getByRole('button', {name: 'Get setup code', exact: true}).click();
  await dialog.waitFor({state: 'hidden'});

  const ticket = page.getByRole('region', {name: 'Connect ' + name, exact: true});
  await ticket.getByText(/Good until .+\. It works one time\./).waitFor();
  const field = ticket.getByRole('textbox', {name: 'Setup code', exact: true});
  assert.equal(await field.count(), 0);
  await ticket.getByRole('button', {name: 'Show code', exact: true}).click();
  assert.equal(await field.getAttribute('readonly'), '');
  const code = await field.inputValue();
  assert(code);
  return code;
}
