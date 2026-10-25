import { QuietSystemState } from '@/components/quiet-system-state';

/** T-21: a signed-in 404 is the Quiet "Page not found" with Back to Home (never "Go to sign in"). */
export default function NotFound() {
 return <QuietSystemState kind="not-found" />;
}
