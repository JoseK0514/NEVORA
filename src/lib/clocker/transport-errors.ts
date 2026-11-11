/** Stable, public PIN/setup failures. Never encode employee or enrollment details. */
export const CLOCKER_TRANSPORT_ERRORS = {
  "SETUP_UNAVAILABLE": "Clocker setup is not configured for this environment.",
  "ORIGIN_REJECTED": "Open Clocker directly on this site and try again.",
  "LOCATION_INVALID": "Choose a valid Clocker location.",
  "SETUP_INPUT_INVALID": "Check the setup code and try again.",
  "SETUP_COOKIE_REQUIRED": "Allow cookies, then start tablet setup again.",
  "ENROLLMENT_INVALID": "This setup code is expired, already used, or for another location. Ask the Owner for a new code.",
  "SETUP_UNCONFIRMED": "We could not confirm tablet setup. Check the connection, then choose Check Setup. Do not enter a new code yet.",
  "PIN_INPUT_INVALID": "Enter exactly four PIN digits.",
  "DEVICE_REQUIRED": "Reconnect this tablet before entering an employee PIN.",
  "PIN_DENIED": "PIN not recognized for this location. Try again or ask your manager.",
  "PIN_LIMITED": "Too many attempts. Wait a few minutes before trying again.",
  "PIN_UNAVAILABLE": "PIN verification is unavailable. Check the connection and try again."
} as const;
export type ClockerTransportErrorCode = keyof typeof CLOCKER_TRANSPORT_ERRORS;
