/** Back behavior for the fictional fixture. The live Next.js app is separate. */
export interface DialogPort {
  requestClose?: () => void;
  dispatchEvent(event: Event): boolean;
  close(): void;
}

/** Preserve cancel handlers, including sheets that animate before router.back(). */
export function requestDialogDismissal(dialog: DialogPort): void {
  if (typeof dialog.requestClose === 'function') {
    dialog.requestClose();
    return;
  }
  const proceed = dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
  if (proceed) dialog.close();
}

export interface BackPort {
  /** True means the overlay owns Back, including an animated/delayed close. */
  dismissTopOverlay(): boolean;
  canGoBack: boolean;
  goBack(): void;
  minimize(): Promise<void> | void;
}

export async function handleBack(port: BackPort): Promise<'overlay' | 'history' | 'minimize'> {
  if (port.dismissTopOverlay()) return 'overlay';
  if (port.canGoBack) {
    port.goBack();
    return 'history';
  }
  await port.minimize();
  return 'minimize';
}
