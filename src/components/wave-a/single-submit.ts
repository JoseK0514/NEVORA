/** One request per tap (ST-WA double tap): while a form's request is out, further submits of that form are stopped
 * before React sees them. The first submit marks the form as sending; the mark clears when the form's aria-busy goes
 * true and then false again, or after 1.5s if it never went busy (the form refused to send, e.g. offline).
 * Attached once per form, in the capture phase on the form itself, so it runs before React's root listener. */
const guarded = new WeakSet<HTMLFormElement>();

export function guardSingleSubmit(form: HTMLFormElement) {
  if (guarded.has(form)) return;
  guarded.add(form);
  let sending = false, sawBusy = false, timer = 0;
  const release = () => { sending = false; sawBusy = false; window.clearTimeout(timer); };
  form.addEventListener("submit", event => {
    if (sending) { event.preventDefault(); event.stopImmediatePropagation(); return; }
    sending = true;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => { if (!sawBusy) release(); }, 1500);
  }, true);
  new MutationObserver(() => {
    const busy = form.getAttribute("aria-busy") === "true";
    if (busy) sawBusy = true;
    else if (sawBusy) release();
  }).observe(form, { attributes: true, attributeFilter: ["aria-busy"] });
}
