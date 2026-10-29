import { deriveDeviceState, readDismissal, saveDismissal, type DeviceCapabilities, type DeviceSetupState, type DeviceStatusView } from './device-state';
import type { DeviceStatus } from './types';
import {DeviceRequestError,parseDeviceStatus,parseDeviceEnrollment,parseDeviceReceipt} from './device-protocol';

export type DeviceRuntime = {
  strict?:boolean; validUntil?():number;
  capabilities: DeviceCapabilities; standalone: boolean | 'unknown';
  permission(): NotificationPermission | 'unsupported'; requestPermission(): Promise<NotificationPermission>;
  api(operation: 'status' | 'subscribe' | 'unsubscribe' | 'test', body?: object): Promise<object>;
  prepare(): Promise<void>; hasSubscription(): Promise<boolean>; subscribe(key: string, current: () => boolean): Promise<object>; own(generation: string): Promise<boolean>;
  suppress(generation: string): Promise<void>; unsubscribe(current: () => boolean): Promise<void>;
  /** QA-OWN-3: a turn-off intent kept apart from the worker's IndexedDB, so it survives when that write, the native
   * unsubscribe and the server all fail. Optional: runtimes without it keep the earlier behavior. */
  pendingTurnOff?(generation: string): boolean; rememberTurnOff?(generation: string, pending: boolean): boolean;
  beginOwnershipChange(): void; withEnrollment(action: () => Promise<void>): Promise<void>; cleanupFence(current: () => boolean): () => boolean;
  readOwner(): string | undefined; writeOwner(generation: string): void;
  readDismissal(scope?: string): boolean; saveDismissal(scope?: string): boolean;
};
export type DeviceSnapshot = { state: DeviceSetupState; server: DeviceStatusView; message?: string; standalone: boolean | 'unknown'; capabilities: DeviceCapabilities; validUntil?:number; cleanupPending?:boolean; cleanupGeneration?:string; accessChanged?:boolean };
const emptyStatus: DeviceStatusView = { supported: false, enabled: false, configurationAvailable: false, testAllowed: false, phase: 'loading' };
/** Bound the UI wait only. Timing out does not cancel the underlying promise; native
 * subscription operations still require ownership fences and their lifecycle lock. */
export function bounded<T>(promise: Promise<T>, ms = 2500): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Device operation timed out')), ms);
    promise.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}
function isStatus(value: object): value is DeviceStatus {
  const s = value as DeviceStatus;
  return typeof s.supported === 'boolean' && typeof s.enabled === 'boolean' && typeof s.configurationAvailable === 'boolean' && typeof s.testAllowed === 'boolean';
}
/** Each controller is tied to one authenticated shell lifetime. Every awaited result is fenced. */
export class DeviceController {
  private epoch = 0;
  private dead = false;
  private dismissed = false;
  private refreshTask?: Promise<void>;
  private nativeOperations = 0;
  private testing = false;
  private cleanupGeneration?: string;
  private intentUnsaved = false;
  private async trackNative<T>(operation: () => Promise<T>): Promise<T> {
    this.nativeOperations++;
    try { return await operation(); } finally { this.nativeOperations--; }
  }
  snapshot: DeviceSnapshot;
  constructor(private runtime: DeviceRuntime, private changed: (snapshot: DeviceSnapshot) => void) {
    this.snapshot = { state: 'loading', server: { ...emptyStatus }, capabilities: runtime.capabilities, standalone: runtime.standalone };
  }
  dispose() { this.dead = true; this.epoch++; }
  invalidate() { this.snapshot={...this.snapshot,accessChanged:true};this.publish({ ...emptyStatus, phase: 'error', localOwned: false }, 'Account or device ownership changed. Reload NEVORA to check this session.'); this.dispose(); }
  private fresh(){return !this.runtime.validUntil||this.runtime.validUntil()>performance.now();}
  private current(epoch: number) { return !this.dead && epoch === this.epoch; }
  private publish(server = this.snapshot.server, message?: string) {
    if (this.dead) return;
    if(this.runtime.strict&&!this.fresh()&&!['loading','pending','error'].includes(server.phase??'')){
      server={...server,phase:'error',localOwned:false,testAllowed:false};
      message='Device status expired. Check again before starting a new request.';
    }
    this.snapshot = { ...this.snapshot, server, message, validUntil:this.runtime.validUntil?.(),cleanupPending:!!this.cleanupGeneration,cleanupGeneration:this.cleanupGeneration,state: deriveDeviceState({ ...this.snapshot, permission: this.runtime.permission(), server, dismissed: this.dismissed }) };
    this.changed(this.snapshot);
  }
  start() { return this.refresh(false); }
  /** Visibility/reopening never prompts or cancels a user/native operation.
   * One bounded pass coalesces concurrent events; dismissal is a UI choice. */
  reconcile() { return this.refresh(!this.cleanupGeneration); }
  private refresh(passive: boolean): Promise<void> {
    if (this.dead || this.nativeOperations || this.testing || this.snapshot.server.phase === 'pending') return Promise.resolve();
    if (this.refreshTask) return this.refreshTask;
    const epoch = ++this.epoch;
    this.refreshTask = bounded(this.readStatus(epoch, passive), 20000).catch(() => {
      if (this.current(epoch)) {
        this.epoch++;
        this.publish({ ...this.snapshot.server, phase: 'error' }, 'Device setup is unavailable. Retry, or turn off notifications if cleanup is pending.');
      }
    }).finally(() => { this.refreshTask = undefined; });
    return this.refreshTask;
  }
  private async readStatus(epoch: number, passive: boolean) {
    if (!passive) this.publish({ ...this.snapshot.server, phase: 'loading' });
    try {
      const status = await this.runtime.api('status');
      if (!this.current(epoch)) return;
      if (!isStatus(status)) throw Error('Invalid status');
      // A replaced controller/worker has lost the in-memory cleanup; the remembered intent for this exact enabled
      // generation restores it, so cleanup resumes instead of passive re-ownership. Other generations are unaffected.
      if (!this.cleanupGeneration && status.enabled && status.ownershipGeneration && this.runtime.pendingTurnOff?.(status.ownershipGeneration)) this.cleanupGeneration = status.ownershipGeneration;
      if (this.cleanupGeneration) {
        await this.runtime.suppress(this.cleanupGeneration);
        if (!this.current(epoch)) return;
        if (status.enabled) {
          this.publish({ ...status, phase: 'error', localOwned: false }, 'Server cleanup is pending. Notifications remain suppressed locally where possible. Retry Turn Off; you can still sign out.');
          return;
        }
        this.runtime.rememberTurnOff?.(this.cleanupGeneration, false);
        this.cleanupGeneration = undefined;
      }
      if (!passive) this.dismissed = this.runtime.readDismissal(status.dismissalScope);
      if (!passive) this.publish({ ...status, phase: 'loading' });
      if (status.configurationAvailable && this.runtime.capabilities.serviceWorker && this.runtime.capabilities.secure&&this.runtime.capabilities.push&&this.runtime.capabilities.notifications&&(!this.runtime.capabilities.requiresStandalone||this.runtime.standalone===true)) {
        await this.runtime.prepare();
        if (!this.current(epoch)) return;
        const old = this.runtime.readOwner();
        if (old && old !== status.ownershipGeneration) {
          await this.runtime.suppress(old);
          if (!this.current(epoch)) return;
        }
        if (status.enabled && status.ownershipGeneration) {
          const hasSubscription = await this.runtime.hasSubscription();
          if (!this.current(epoch)) return;
          if (this.runtime.permission() !== 'granted' || !hasSubscription) {
            await this.runtime.suppress(status.ownershipGeneration);
            if (!this.current(epoch)) return;
            this.publish({ ...status, subscriptionMissing: !hasSubscription });
            return;
          } else {
            if(!this.fresh())throw Error('Device status expired');
            const owned = await this.runtime.own(status.ownershipGeneration);
            if (!this.current(epoch)) { await this.runtime.suppress(status.ownershipGeneration); return; }
            if (!owned) throw Error('Local ownership unavailable');
            if(!this.fresh()){await this.runtime.suppress(status.ownershipGeneration);throw Error('Device status expired');}
            this.runtime.writeOwner(status.ownershipGeneration);
            if(!this.fresh()){await this.runtime.suppress(status.ownershipGeneration);throw Error('Device status expired');}
            this.publish({ ...status, localOwned: true });
            return;
          }
        }
      }
      this.publish(status);
    } catch(error) {
      if(error instanceof DeviceRequestError&&(error.status===401||error.status===403)){this.invalidate();return;}
      if (this.current(epoch)) this.publish({ ...this.snapshot.server, phase: 'error' }, 'Device setup is unavailable. Retry, or turn off notifications if cleanup is pending.');
    }
  }
  async enable() {
    if (this.snapshot.state !== 'ready' || this.dead || !this.snapshot.server.vapidPublicKey) return;
    if(this.nativeOperations||this.testing)return;
    if(!this.fresh()){await this.start();return;}
    if (this.runtime.permission() === 'denied' || this.runtime.permission() === 'unsupported') { this.publish(); return; }
    const epoch = ++this.epoch;
    try { this.runtime.beginOwnershipChange(); }
    catch { this.publish({ ...this.snapshot.server, phase: 'error' }, 'Device setup cannot safely coordinate this browser. Check browser storage and try again.'); return; }
    // This call is deliberately synchronous in the click handler, before any await.
    let permission: Promise<NotificationPermission>;
    try { permission = this.runtime.permission() === 'granted' ? Promise.resolve('granted') : this.runtime.requestPermission(); }
    catch { this.publish({ ...this.snapshot.server, phase: 'error' }, 'Permission could not be requested. Check your browser settings.'); return; }
    this.publish({ ...this.snapshot.server, phase: 'pending' });
    let generation: string | undefined;
    try {
      const result = await permission;
      if (!this.current(epoch)) return;
      if (result !== 'granted') { this.publish({ ...this.snapshot.server, phase: undefined }); return; }
      if(this.runtime.strict){const fresh=await this.runtime.api('status');if(!this.current(epoch))return;if(!isStatus(fresh)||fresh.enabled||!fresh.configurationAvailable||fresh.vapidPublicKey!==this.snapshot.server.vapidPublicKey)throw Error('Device setup changed');}
      await bounded(this.trackNative(() => this.runtime.withEnrollment(async () => {
        const subscription = await this.runtime.subscribe(this.snapshot.server.vapidPublicKey!, () => this.current(epoch));
        if (!this.current(epoch)) return;
        const status = await this.runtime.api('subscribe', { subscription });
        if (isStatus(status)) generation = status.ownershipGeneration;
        if (!this.current(epoch)) { if (generation) await this.runtime.suppress(generation); return; }
        if (!isStatus(status) || !status.enabled || !generation) throw Error('Enrollment incomplete');
        let verifiedStatus:DeviceStatus=status;
        if(this.runtime.strict){const fresh=await this.runtime.api('status');if(!this.current(epoch)){await this.runtime.suppress(generation);return;}if(!isStatus(fresh)||!fresh.enabled||fresh.ownershipGeneration!==generation)throw Error('Enrollment changed');verifiedStatus=fresh;}
        this.publish({ ...verifiedStatus, phase: 'pending' });
        const owned = await this.runtime.own(generation);
        if (!this.current(epoch)) { await this.runtime.suppress(generation); return; }
        if (!owned||!this.fresh()) throw Error('Local ownership unavailable');
        this.runtime.writeOwner(generation);
        if(!this.fresh())throw Error('Device status expired');
        this.publish({ ...verifiedStatus, localOwned: true }, 'Notifications enabled on this device.');
      })), 20000);
    } catch(error) {
      if (generation) await this.runtime.suppress(generation).catch(() => {});
      if(error instanceof DeviceRequestError&&(error.status===401||error.status===403)){this.invalidate();return;}
      if (this.current(epoch)) {
        this.epoch++; // A bounded UI wait cannot let a late native operation enroll.
        this.publish({ ...this.snapshot.server, phase: 'error' }, 'Setup could not finish. Turn off stops server delivery. If reopening does not help, this browser notification setup may need recovery. Ask your manager for help.');
      }
    }
  }
  dismiss() {
    const saved = this.runtime.saveDismissal(this.snapshot.server.dismissalScope);
    this.dismissed = true;
    this.publish(this.snapshot.server, saved ? undefined : 'Could not remember Not Now on this device. Browser storage may be unavailable.');
  }
  reopen() { this.dismissed = false; this.publish(this.snapshot.server, this.snapshot.message); return this.reconcile(); }
  async turnOff(expectedGeneration?:string|null) {
    if (this.dead || this.snapshot.server.phase === 'pending') return;
    const epoch = ++this.epoch;
    const generation = this.cleanupGeneration ?? this.snapshot.server.ownershipGeneration ?? this.runtime.readOwner();
    if(expectedGeneration!==undefined&&expectedGeneration!==(generation??null)){this.publish({...this.snapshot.server,phase:'error'},'Device setup changed. Check again before turning alerts off.');return;}
    this.cleanupGeneration = generation;
    // Before any of the three cleanups: if all of them fail, this is what keeps a replacement from re-owning it.
    this.intentUnsaved = !!generation && this.runtime.rememberTurnOff?.(generation, true) === false;
    this.publish({ ...this.snapshot.server, phase: 'pending', localOwned: false });
    const cleanupCurrent = this.runtime.cleanupFence(() => this.current(epoch));
    // Local and server cleanup are independent; failure of either cannot skip the other.
    const local = this.trackNative(async () => {
      if (generation) await this.runtime.suppress(generation).catch(() => {});
      if (cleanupCurrent()) await this.runtime.unsubscribe(cleanupCurrent).catch(() => {});
    });
    try {
      const result = await this.runtime.api('unsubscribe', generation ? { ownershipGeneration: generation } : {});
      await bounded(local).catch(() => {});
      if (!this.current(epoch)) return;
      if ((result as {status?: string}).status !== 'complete') throw Error('cleanup pending');
      if(this.runtime.strict&&this.nativeOperations)throw Error('Local cleanup pending');
      if(this.runtime.strict){const fresh=await this.runtime.api('status');if(!this.current(epoch))return;if(!isStatus(fresh)||fresh.enabled)throw Error('Cleanup not confirmed');}
      this.cleanupGeneration = undefined;
      if (generation) this.runtime.rememberTurnOff?.(generation, false);
      this.publish({ ...this.snapshot.server, phase: undefined, enabled: false, ownershipGeneration: undefined, testAllowed: false, localOwned: false }, 'Notifications turned off on this device.');
    } catch(error) {
      if(error instanceof DeviceRequestError&&(error.status===401||error.status===403)){this.invalidate();return;}
      // OWN-CR-2: say so when nothing in this browser could keep the request.
      if (this.current(epoch)) this.publish({ ...this.snapshot.server, phase: 'error' }, 'Server cleanup is pending. Notifications remain suppressed locally where possible. Retry Turn Off; you can still sign out.' + (this.intentUnsaved ? ' This browser couldn’t save the recovery reminder. To stop alerts now, block NEVORA notifications in your device or browser settings, then retry cleanup.' : ''));
    }
  }
  async test() {
    if (this.dead || this.snapshot.state !== 'enabled' || !this.snapshot.server.testAllowed) return;
    const epoch = ++this.epoch;
    this.testing = true;
    this.publish({ ...this.snapshot.server, testAllowed: false }, 'Queuing test…');
    try {
      const result = await this.runtime.api('test', { ownershipGeneration: this.snapshot.server.ownershipGeneration });
      if (!this.current(epoch)) return;
      if ((result as {status?:string}).status !== 'queued') throw Error('test unavailable');
      this.publish(this.snapshot.server, 'Test queued. Provider acceptance does not confirm receipt. Wait five minutes before another test.');
    } catch(error) {
      if(error instanceof DeviceRequestError&&(error.status===401||error.status===403&&error.code!=='test_not_allowed')){this.invalidate();return;}
      if (this.current(epoch)) this.publish(this.snapshot.server, 'Test unavailable or rate limited. Wait five minutes, then reload NEVORA to check again.');
    } finally { this.testing = false; }
  }
}

const OWNER_KEY = 'fuel-portal-owner-generation';
const FENCE_KEY = 'fuel-portal-account-fence';
const PROBE_KEY = 'fuel-portal-coordination-probe';
const OPERATION_KEY = 'fuel-portal-subscription-operation';
const TURN_OFF_KEY = 'fuel-portal-turn-off-pending';
const TURN_OFF_LIMIT = 8;
/** The remembered turn-off generations; an earlier single value is read as a one-item list. */
function readTurnOffs(): string[] {
  try {
    const raw = localStorage.getItem(TURN_OFF_KEY);
    if (!raw) return [];
    if (!raw.startsWith('[')) return [raw];
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0 && item.length <= 128) : [];
  } catch { return []; }
}
const SUBSCRIPTION_LOCK = 'fuel-portal-subscription-lifecycle';
const controllers = new Set<DeviceController>();
let preparedRegistration: ServiceWorkerRegistration | undefined;
let browserOwnershipLifetime = 0;
let coordinationWriteFailed = false;
function writeCoordination(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    if (localStorage.getItem(key) !== value) throw Error('Coordination write unavailable');
    return true;
  } catch { coordinationWriteFailed = true; return false; }
}
function announceOwnershipChange(): boolean {
  browserOwnershipLifetime++;
  const written = writeCoordination(FENCE_KEY, `${Date.now()}:${Math.random()}`);
  // Only a freshly published ownership transition can restore coordination.
  if (written) coordinationWriteFailed = false;
  return written;
}
/** Acquisition is bounded; a granted lock is held until the real operation settles.
 * Never time out/release a lock around noncancelable native unsubscribe/subscribe. */
async function withSubscriptionLock<T>(action: () => Promise<T>): Promise<T> {
  if (!navigator.locks?.request) throw Error('Browser lifecycle coordination unavailable');
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 2500);
  try {
    return await navigator.locks.request(SUBSCRIPTION_LOCK, { mode: 'exclusive', signal: abort.signal }, async () => {
      clearTimeout(timer);
      return action();
    });
  } finally { clearTimeout(timer); }
}
/** Endpoint/object identity is insufficient: a new account can reuse a subscription.
 * Capture before any cleanup await. Storage failure is deliberately fail-closed. */
function captureCleanupFence(current: () => boolean = () => true): () => boolean {
  const lifetime = browserOwnershipLifetime;
  if (coordinationWriteFailed || !writeCoordination(PROBE_KEY, '1')) return () => false;
  try {
    const owner = localStorage.getItem(OWNER_KEY), fence = localStorage.getItem(FENCE_KEY);
    return () => {
      if (!current() || lifetime !== browserOwnershipLifetime || coordinationWriteFailed || !writeCoordination(PROBE_KEY, '1')) return false;
      try { return owner === localStorage.getItem(OWNER_KEY) && fence === localStorage.getItem(FENCE_KEY); }
      catch { return false; }
    };
  } catch { return () => false; }
}
/** A document teardown releases Web Locks, but native completion can be unknown.
 * Persist the opaque operation until its actual promise settles; never reset it
 * on timeout, logout, new account, or a later successful coordination write. */
async function recordedOperation<T>(action: () => Promise<T>): Promise<T> {
  if (localStorage.getItem(OPERATION_KEY)) throw Error('Browser operation completion is unknown');
  const operation = `${Date.now()}:${Math.random()}`;
  if (!writeCoordination(OPERATION_KEY, operation)) throw Error('Browser operation cannot be coordinated');
  try { return await action(); }
  finally {
    try { if (localStorage.getItem(OPERATION_KEY) === operation) writeCoordination(OPERATION_KEY, ''); }
    catch { coordinationWriteFailed = true; }
  }
}
async function unsubscribeCurrent(registration: ServiceWorkerRegistration | undefined, current: () => boolean) {
  if (!current() || !navigator.locks?.request) return;
  await withSubscriptionLock(async () => {
    if (!current()) return;
    const subscription = await bounded(registration?.pushManager.getSubscription() ?? Promise.resolve(null));
    if (!current()) return;
    if (subscription) await recordedOperation(() => subscription.unsubscribe());
  });
}
export function sendOwnerMessage(worker: ServiceWorker, type: 'SET_OWNER' | 'SUPPRESS_OWNER' | 'UPDATE_WAITING', generation: string): Promise<boolean> {
  return new Promise(resolve => {
    const channel = new MessageChannel();
    const finish = (success: boolean) => { clearTimeout(timer); channel.port1.close(); channel.port2.close(); resolve(success); };
    const timer = setTimeout(() => finish(false), 1800);
    channel.port1.onmessage = event => {
      const data = event.data;
      finish(data?.version === 1 && data.type === 'OWNER_STATE' && data.generation === generation && data.status === (type === 'SUPPRESS_OWNER' ? 'suppressed' : 'active'));
    };
    try { worker.postMessage({ version: 1, type, generation }, [channel.port2]); } catch { finish(false); }
  });
}
function readOwner() { try { return localStorage.getItem(OWNER_KEY) ?? undefined; } catch { return undefined; } }
async function suppressRegistration(registration: ServiceWorkerRegistration | undefined, generation: string) {
  if (!registration) return;
  await Promise.all([registration.active, registration.waiting].filter((w): w is ServiceWorker => !!w).map(worker => sendOwnerMessage(worker, 'SUPPRESS_OWNER', generation)));
  const notifications = await bounded(registration.getNotifications()).catch(() => []);
  for (const notification of notifications) if (notification.data?.ownershipGeneration === generation) notification.close();
}
/** Does not prevent, await, or replace the server-action form submission. */
export function cleanupForSignout(): void {
  const generations = new Set<string>();
  const stored = readOwner();
  if (stored) generations.add(stored);
  for (const controller of controllers) {
    const generation = controller.snapshot.server.ownershipGeneration;
    if (generation) generations.add(generation);
    controller.dispose();
  }
  announceOwnershipChange();
  const cleanupCurrent = captureCleanupFence();
  // Already-prepared workers receive suppression synchronously before navigation.
  for (const generation of generations) if (preparedRegistration) void suppressRegistration(preparedRegistration, generation).catch(() => {});
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    void bounded(navigator.serviceWorker.getRegistration('/app')).then(async registration => {
      await Promise.all([...generations].map(generation => suppressRegistration(registration, generation)));
      // Discovery and suppression may outlive the initiating account.
      if (cleanupCurrent()) await unsubscribeCurrent(registration, cleanupCurrent).catch(() => {});
    }).catch(() => {});
  }
}
export function observeController(controller: DeviceController) {
  controllers.add(controller);
  const fence = (event: StorageEvent) => { if (event.key === FENCE_KEY || event.key === OWNER_KEY) { browserOwnershipLifetime++; controller.invalidate(); } };
  window.addEventListener('storage', fence);
  return () => { controller.dispose(); controllers.delete(controller); window.removeEventListener('storage', fence); };
}
export function browserRuntime(authority?:string): DeviceRuntime {
  let validUntil=0;
  let lifetime = ++browserOwnershipLifetime;
  const beginOwnershipChange = () => {
    const written = announceOwnershipChange(); lifetime = browserOwnershipLifetime;
    if (!written) throw Error('Ownership coordination write failed');
  };
  let enrollmentLockHeld = false;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = typeof window.matchMedia === 'function' ? window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true : 'unknown';
  const capabilities = { secure: window.isSecureContext, serviceWorker: 'serviceWorker' in navigator, push: 'PushManager' in window, notifications: 'Notification' in window, requiresStandalone: ios, installPrompt: false };
  let registration: ServiceWorkerRegistration | undefined;
  return {
    strict:!!authority,...(authority?{validUntil:()=>validUntil}:{}),
    capabilities, standalone,
    beginOwnershipChange,
    withEnrollment: action => withSubscriptionLock(async () => {
      if (lifetime !== browserOwnershipLifetime || coordinationWriteFailed || !writeCoordination(PROBE_KEY, '1')) throw Error('Stale or unverifiable enrollment');
      enrollmentLockHeld = true;
      try { await recordedOperation(action); } finally { enrollmentLockHeld = false; }
    }),
    cleanupFence: current => captureCleanupFence(() => lifetime === browserOwnershipLifetime && current()),
    permission: () => 'Notification' in window ? Notification.permission : 'unsupported',
    requestPermission: () => Notification.requestPermission(),
    api: async (operation, body) => {
      const execute=async()=>{
      const abort = new AbortController(); const timer = setTimeout(() => abort.abort(), 8000);
      const started=performance.now();
      try {
        const response = await fetch(`/app/api/push/${operation}`, { method: operation === 'status' ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store', signal: abort.signal,headers:{...(authority?{'X-Nevora-Device-Authority':authority}:{}),...(operation==='status'?{}:{'Content-Type':'application/json'})}, ...(operation === 'status' ? {} : { body: JSON.stringify(body ?? {}) }) });
        const value = await response.json();
        if (!response.ok) throw authority?new DeviceRequestError(response.status,typeof value?.error==='string'?value.error:'unavailable'):Error(value.error === 'cleanup_pending' ? 'cleanup pending' : 'Device request unavailable');
        if(authority){
          if(operation==='status'){if(response.status!==200)throw Error('Invalid device response');const status=parseDeviceStatus(value,authority);validUntil=performance.now()+status.validForMs-(performance.now()-started);if(validUntil<=performance.now())throw Error('Device status expired');}
          else if(operation==='subscribe'){if(response.status!==200)throw Error('Invalid enrollment response');parseDeviceEnrollment(value);}
          else parseDeviceReceipt(value,operation,(body as {ownershipGeneration?:string}|undefined)?.ownershipGeneration,response.status);
        }
        return value;
      } finally { clearTimeout(timer); }
      };
      // Status can issue an HttpOnly installation proof. Its actual response joins the native lifecycle lock so late
      // headers cannot race enrollment. Bound and legacy unbound reads alike: the server keeps refreshing an unchanged
      // proof for unbound reads (its one-year expiry slides), so only ordering here keeps an older one from landing last.
      return operation==='status'&&!enrollmentLockHeld&&typeof navigator.locks?.request==='function'?withSubscriptionLock(execute):execute();
    },
    prepare: async () => {
      if (!navigator.locks?.request) throw Error('Browser lifecycle coordination unavailable');
      if (!(location.pathname === '/app' || location.pathname.startsWith('/app/'))) throw Error('Portal only');
      registration = await bounded(navigator.serviceWorker.register('/fuel-portal-sw.js', { scope: '/app' }));
      if (!registration.active) await bounded(navigator.serviceWorker.ready);
      if (!registration.active) throw Error('Worker unavailable');
      preparedRegistration = registration;
    },
    hasSubscription: async () => !!await bounded(registration?.pushManager.getSubscription() ?? Promise.resolve(null)),
    subscribe: async (key, current) => {
      if (!registration?.active || !current()) throw Error('Worker unavailable');
      if (!enrollmentLockHeld || lifetime !== browserOwnershipLifetime || coordinationWriteFailed) throw Error('Enrollment requires lifecycle coordination');
      const bytes = Uint8Array.from(atob(key.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
      // PushManager validates options and reuses a compatible existing subscription.
      // Keep the lock until the native promise settles, even if the UI stops waiting.
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes });
      return subscription.toJSON();
    },
    own: async generation => {
      const establish = async () => {
        if (!registration?.active || lifetime !== browserOwnershipLifetime || coordinationWriteFailed) return false;
        // Status restoration must join the same exclusion as enrollment. A server
        // status alone cannot resolve a native operation lost with another document.
        if (!enrollmentLockHeld && (localStorage.getItem(OPERATION_KEY) || !await bounded(registration.pushManager.getSubscription()))) return false;
        if (lifetime !== browserOwnershipLifetime || !writeCoordination(PROBE_KEY, '1')) return false;
        if (readOwner() !== generation) beginOwnershipChange();
        const active = registration.active;
        const owned = await sendOwnerMessage(active, 'SET_OWNER', generation) && registration.active === active && lifetime === browserOwnershipLifetime;
        if (owned && registration.waiting) void sendOwnerMessage(registration.waiting, 'UPDATE_WAITING', generation);
        return owned;
      };
      return enrollmentLockHeld ? establish() : withSubscriptionLock(establish);
    },
    suppress: generation => suppressRegistration(registration ?? preparedRegistration, generation),
    unsubscribe: current => unsubscribeCurrent(registration, current),
    pendingTurnOff: generation => readTurnOffs().includes(generation),
    rememberTurnOff: (generation, pending) => {
      // Independent of coordinationWriteFailed: losing this ledger must not disable other coordination.
      // A bounded list, so another account's failed turn-off on a shared device cannot displace this one (OWN-CR-3).
      try {
        const kept = readTurnOffs().filter(item => item !== generation);
        const next = pending ? [...kept, generation].slice(-TURN_OFF_LIMIT) : kept;
        if (next.length) localStorage.setItem(TURN_OFF_KEY, JSON.stringify(next)); else localStorage.removeItem(TURN_OFF_KEY);
        return readTurnOffs().includes(generation) === pending;
      } catch { return false; }
    },
    readOwner, writeOwner: generation => { if (!writeCoordination(OWNER_KEY, generation)) throw Error('Ownership coordination write failed'); },
    readDismissal: scope => { try { return readDismissal(localStorage, scope); } catch { return false; } },
    saveDismissal: scope => { try { return saveDismissal(localStorage, scope); } catch { return false; } },
  };
}
