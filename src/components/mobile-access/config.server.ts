import {readFeatureFlags} from '../../lib/feature-flags';
import 'server-only';

/** Rollout only; never substitutes for session/role authorization. Off until explicitly configured. */
export const mobileAccessEnabled = () => readFeatureFlags(process.env).mobileAccess;
/** Intake is separately held until monitoring and the operating procedure are approved. */
export const mobileSupportEnabled = () => mobileAccessEnabled() && readFeatureFlags(process.env).mobileSupport;
