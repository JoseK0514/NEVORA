/** Offline (review B2, NV-001; Jose, Nov 10, 2026): when the connection drops, a page keeps the person's own loaded
 * information on screen, read-only, and the shell's line says "Offline · updated 9:24 PM". The information is cleared
 * only when the person steps away (the window is hidden or loses focus), as before. Readers announce what they hold;
 * the shell shows the oldest held time, and actions are disabled while offline (app-shell.tsx). */
export const OFFLINE_HELD_EVENT='nevora:offline-held';

/** A reader kept its snapshot (observed at `observedAt`) because the device went offline. */
export function announceOfflineHeld(observedAt:string){
 if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent<string>(OFFLINE_HELD_EVENT,{detail:observedAt}));
}

/** The person stepped away (hidden, blurred): readers clear, as they always have. */
export function steppedAway(){
 if(typeof document==='undefined')return false;
 return document.visibilityState==='hidden'||(typeof document.hasFocus==='function'&&!document.hasFocus());
}

/** `handlers.pause` when the person stepped away, otherwise `handlers.hold`: the 'offline' listener every reader uses. */
export function offlineListener(handlers:{pause:()=>void;hold:()=>void}){
 return ()=>{if(steppedAway())handlers.pause();else handlers.hold();};
}
