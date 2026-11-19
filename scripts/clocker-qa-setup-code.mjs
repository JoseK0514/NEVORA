/** Follow the Owner's explicit disclosure before reading the one-time setup code. */
export async function showClockerSetupCode(page) {
  const field = page.getByRole('textbox', { name: 'Setup code', exact: true });
  if (!await field.isVisible()) await page.getByRole('button', { name: 'Show code', exact: true }).click();
  await field.waitFor({ state: 'visible' });
  return field;
}
