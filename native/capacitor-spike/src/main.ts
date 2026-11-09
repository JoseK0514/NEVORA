import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { handleBack, requestDialogDismissal } from './navigation';
import './style.css';

const get = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing fixture element: ${id}`);
  return element as T;
};
const sampleKey = 'nevora.native-spike.fictional-marker.v1';
const overlayStack: HTMLDialogElement[] = [];
const shiftDialog = get<HTMLDialogElement>('shift-dialog');
const keyboardDialog = get<HTMLDialogElement>('keyboard-dialog');

function openDialog(dialog: HTMLDialogElement) {
  if (dialog.open) return;
  dialog.showModal();
  overlayStack.push(dialog);
}

for (const dialog of [shiftDialog, keyboardDialog]) {
  dialog.querySelector<HTMLButtonElement>('.close-dialog')?.addEventListener('click', () => requestDialogDismissal(dialog));
  dialog.addEventListener('close', () => {
    const index = overlayStack.lastIndexOf(dialog);
    if (index !== -1) overlayStack.splice(index, 1);
    if (dialog === keyboardDialog) {
      get<HTMLFormElement>('keyboard-form').reset();
      get('keyboard-status').textContent = '';
    }
  });
}
get('open-shift').addEventListener('click', () => openDialog(shiftDialog));
get('open-keyboard').addEventListener('click', () => openDialog(keyboardDialog));
get('keyboard-form').addEventListener('submit', (event) => {
  event.preventDefault();
  get<HTMLFormElement>('keyboard-form').reset();
  get<HTMLTextAreaElement>('practice-note').blur();
  get('keyboard-status').textContent = 'Keyboard check completed. Nothing was saved.';
});
get('practice-note').setAttribute('aria-describedby', 'note-help');

function renderMarker() {
  try {
    get('sample-state').textContent = localStorage.getItem(sampleKey) === 'sample-saved'
      ? 'Fictional marker is saved on this device.'
      : 'No fictional marker saved.';
  } catch {
    get('sample-state').textContent = 'Local storage is unavailable in this runtime.';
  }
}
get('save-sample').addEventListener('click', () => {
  try { localStorage.setItem(sampleKey, 'sample-saved'); renderMarker(); }
  catch { get('sample-state').textContent = 'The fictional marker could not be saved.'; }
});
get('clear-sample').addEventListener('click', () => {
  try { localStorage.removeItem(sampleKey); renderMarker(); }
  catch { get('sample-state').textContent = 'The fictional marker could not be cleared.'; }
});
renderMarker();

const platform = Capacitor.getPlatform();
get('runtime').textContent = Capacitor.isNativePlatform() ? `${platform === 'ios' ? 'iOS' : 'Android'} · Capacitor` : 'Web browser · not a native test';
get('passkeys').textContent = typeof PublicKeyCredential !== 'undefined' && !!navigator.credentials
  ? 'API present · sign-in untested'
  : 'API unavailable here';
function renderConnection() {
  get('connection').textContent = navigator.onLine ? 'Online signal · server untested' : 'Offline signal';
}
renderConnection();
window.addEventListener('online', renderConnection);
window.addEventListener('offline', renderConnection);

if (Capacitor.isNativePlatform()) {
  App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) { renderMarker(); renderConnection(); }
  }).catch(() => { get('app-status').textContent = 'App resume listener unavailable. Manual restart checks are still needed.'; });
}
if (platform === 'android') {
  App.addListener('backButton', ({ canGoBack }) => {
    void handleBack({
      dismissTopOverlay() {
        const dialog = [...overlayStack].reverse().find((item) => item.open);
        if (!dialog) return false;
        requestDialogDismissal(dialog);
        return true;
      },
      canGoBack,
      goBack: () => window.history.back(),
      minimize: () => App.minimizeApp(),
    }).catch(() => { get('app-status').textContent = 'Back action could not complete. Use the visible Close control.'; });
  }).catch(() => { get('app-status').textContent = 'Native Back listener unavailable. This check needs investigation.'; });
}
