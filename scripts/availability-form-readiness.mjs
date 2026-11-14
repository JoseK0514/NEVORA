export async function waitForMobileAvailabilityForm(page, selection, timeout = 15000) {
  if (!/^(normal|\d{4}-\d{2}-\d{2})$/.test(selection)) throw new TypeError('Expected an availability selection');
  // The server-rendered editor shares this form class. Its local sheet state
  // disappears when the responsive mobile owner replaces it after hydration.
  // Wait for the matching protected mobile read before targeting its controls.
  const form = page.locator(`.em-planning[data-planning-state="ready"][data-planning-selection="${selection}"] form.c-avail__form`);
  await form.waitFor({timeout});
  return form;
}
