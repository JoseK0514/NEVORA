import 'server-only';

/** Rollout only; never substitutes for session/role authorization. Off until explicitly configured. */
export const mobileAccessEnabled = () => process.env.NEVORA_MOBILE_ACCESS_ENABLED === 'true';
/** Intake is separately held until monitoring and the operating procedure are approved. */
export const mobileSupportEnabled = () => mobileAccessEnabled() && process.env.NEVORA_MOBILE_ACCESS_SUPPORT_ENABLED === 'true';
