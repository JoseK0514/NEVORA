/** The portal session cookie's name. Its value is an opaque bearer (sealed per workspace in isolated mode); only
 * session.ts reads or writes the value. Other code may check whether one was presented, never what it holds. */
export const SESSION_COOKIE = "fuel_session";
