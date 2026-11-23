import { renderToStaticMarkup } from 'react-dom/server';
import { SigPendingLabel } from '../../components/signature/sig-button';

/** Use the real accessible pending label in the browser's locator control. */
export function pendingDeletionLabelMarkup(pending: boolean) {
  return renderToStaticMarkup(<SigPendingLabel pending={pending} pendingText="Deleting…">Delete</SigPendingLabel>);
}
