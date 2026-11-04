/** Native provider material never enters this module. The browser contributes
 * its current HttpOnly session only to the fixed status/enrollment endpoints. */
export type NativeMethod = 'hello' | 'notifications.permission' | 'notifications.complete' | 'notifications.detach';
export type NativeDeviceRuntime = {
    request(method: NativeMethod, payload?: string): Promise<Record<string, unknown>>;
    api(action: 'status' | 'challenge', body: object, signal: AbortSignal): Promise<Record<string, unknown>>;
    close(): void;
};
export type NativeDeviceSnapshot = {
    state: 'loading' | 'unavailable' | 'ready' | 'enabled' | 'denied' | 'revoked' | 'pending' | 'error' | 'dismissed';
    generation?: string;
    message?: string;
    accessChanged?: boolean;
};
type Hello = {
    state: 'ready';
    platform: 'ios' | 'android';
    spki: string;
    keyFingerprint: string;
    permission: 'granted' | 'default' | 'denied';
    generation: string | null;
    revision: string | null;
    maintenance?: boolean;
};
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
function hello(value: Record<string, unknown>): Hello {
    if (value.state !== 'ready' || !['ios', 'android'].includes(String(value.platform)) || typeof value.spki !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value.spki) || typeof value.keyFingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(value.keyFingerprint) || !['granted', 'default', 'denied'].includes(String(value.permission)) || !(value.generation === null || typeof value.generation === 'string' && uuid.test(value.generation)))
        throw Error('Native setup unavailable');
    if (!(value.revision === null || typeof value.revision === 'string' && uuid.test(value.revision))) throw Error('Native revision unavailable');
    if(value.maintenance!==undefined&&typeof value.maintenance!=='boolean')throw Error('Native maintenance unavailable');
    if(value.generation!==null&&value.generation!==value.revision)throw Error('Native receipt mismatch');
    return value as Hello;
}
function status(value: Record<string, unknown>): string | null {
    if (value.state === 'off' && Object.keys(value).length === 1)
        return null;
    if (value.state === 'active' && Object.keys(value).length === 2 && typeof value.generation === 'string' && uuid.test(value.generation))
        return value.generation;
    throw Error('Device status unavailable');
}
export class NativeDeviceController {
    snapshot: NativeDeviceSnapshot = { state: 'loading' };
    private epoch = 0;
    private dead = false;
    private busy = false;
    private abort = new AbortController();
    private metadata?: Hello;
    private turnOffPending?: string;
    private retry?:ReturnType<typeof setTimeout>;
    private maintenanceUntil?:number;
    constructor(private runtime: NativeDeviceRuntime, private changed: (value: NativeDeviceSnapshot) => void) { }
    private publish(value: NativeDeviceSnapshot) { if (!this.dead) {
        this.snapshot = value;
        this.changed(value);
    } }
    private current(epoch: number) { return !this.dead && epoch === this.epoch && !this.abort.signal.aborted; }
    private async read(epoch: number) {
        const native = hello(await this.runtime.request('hello'));
        if (!this.current(epoch))
            return;
        this.metadata=native;
        if(native.maintenance){
            this.maintenanceUntil??=performance.now()+18000;
            if(performance.now()>=this.maintenanceUntil){this.publish({state:'error',message:'App setup is taking longer. Check again.'});return;}
            this.publish({state:'loading'});
            this.retry=setTimeout(()=>{this.retry=undefined;void this.start();},1000);
            return;
        }
        this.maintenanceUntil=undefined;
        const generation = status(await this.runtime.api('status', { keyFingerprint: native.keyFingerprint }, this.abort.signal));
        if (!this.current(epoch))
            return;
        this.metadata = native;
        if (this.turnOffPending && generation === null)
            this.turnOffPending = undefined;
        this.publish({ state: this.turnOffPending ? 'error' : native.permission === 'denied' ? 'denied' : generation ? native.permission === 'granted' && native.generation === generation ? 'enabled' : 'revoked' : 'ready', generation: generation ?? undefined, message: this.turnOffPending ? 'Turn-off is still pending. Check again or block NEVORA alerts in your phone settings.' : undefined });
    }
    async start() { if (this.dead || this.busy)
        return; if(this.retry){clearTimeout(this.retry);this.retry=undefined;}this.busy = true; const epoch = ++this.epoch; this.publish({ state: 'loading' }); try {
        await this.read(epoch);
    }
    catch {
        if (this.current(epoch))
            this.publish({ state: 'error', message: 'We could not verify this device. Check again.' });
    }
    finally {
        if (epoch === this.epoch)
            this.busy = false;
    } }
    async enable(reconcile = false) {
        if (this.dead || this.busy || !(reconcile ? ['error', 'revoked'].includes(this.snapshot.state) : this.snapshot.state === 'ready') || !this.metadata && !reconcile)
            return;
        const epoch = ++this.epoch;
        this.busy = true;
        this.publish({ ...this.snapshot, state: 'pending' });
        try {
            const initial = this.metadata ?? hello(await this.runtime.request('hello'));
            if (!this.current(epoch))
                return;
            const permission = initial.permission === 'granted' ? { permission: 'granted' } : await this.runtime.request('notifications.permission');
            if (!this.current(epoch))
                return;
            if (permission.permission !== 'granted') {
                this.publish({ state: 'denied' });
                return;
            }
            // Read fresh ownership after permission. A new document/account never
            // inherits this explicit action; pause/disposal fences every awaited result.
            const native = hello(await this.runtime.request('hello'));
            if (!this.current(epoch))
                return;
            if(native.maintenance){await this.read(epoch);return;}
            const active = status(await this.runtime.api('status', { keyFingerprint: native.keyFingerprint }, this.abort.signal));
            if (!this.current(epoch))
                return;
            if (native.permission !== 'granted' || active && !reconcile)
                throw Error('Device setup changed');
            const challenge = await this.runtime.api('challenge', { operation: reconcile ? 'reconcile' : 'enroll', platform: native.platform, spki: native.spki, operationId: crypto.randomUUID(), expectedGeneration: reconcile ? null : native.revision }, this.abort.signal);
            if (!this.current(epoch))
                return;
            if (challenge.state !== 'challenge' || Object.keys(challenge).length !== 2 || !challenge.challenge || typeof challenge.challenge !== 'object')
                throw Error('Enrollment unavailable');
            const result = await this.runtime.request('notifications.complete', JSON.stringify(challenge.challenge));
            if (!this.current(epoch))
                return;
            if (result.state !== 'active')
                throw Error('Enrollment unavailable');
            await this.read(epoch);
        }
        catch {
            if (this.current(epoch))
                this.publish({ state: 'error', message: 'Setup did not finish. Check again before starting a new request.' });
        }
        finally {
            if (epoch === this.epoch)
                this.busy = false;
        }
    }
    async turnOff(expected: string) {
        if (this.dead || this.busy)
            return;
        if (!uuid.test(expected) || expected !== this.snapshot.generation) {
            this.publish({ ...this.snapshot, state: 'error', message: 'Device setup changed. Check again before turning alerts off.' });
            return;
        }
        const epoch = ++this.epoch;
        this.busy = true;
        this.turnOffPending = expected;
        this.publish({ ...this.snapshot, state: 'pending' });
        try {
            const result = await this.runtime.request('notifications.detach', expected);
            if (!this.current(epoch))
                return;
            if (result.state !== 'complete' || typeof result.generation !== 'string' || !uuid.test(result.generation))
                throw Error('Turn-off unavailable');
            await this.read(epoch);
        }
        catch {
            if (this.current(epoch))
                this.publish({ state: 'error', generation: expected, message: 'Turn-off is still pending. Check again or block NEVORA alerts in your phone settings.' });
        }
        finally {
            if (epoch === this.epoch)
                this.busy = false;
        }
    }
    dismiss() { if (!this.busy && this.snapshot.state === 'ready')
        this.publish({ ...this.snapshot, state: 'dismissed' }); }
    pause() { this.epoch++; this.busy = false; if(this.retry)clearTimeout(this.retry);this.retry=undefined;this.maintenanceUntil=undefined;this.abort.abort(); this.abort = new AbortController(); this.runtime.close(); this.publish({ state: 'loading', message: 'Return to NEVORA to check this device.' }); }
    dispose() { this.pause(); this.dead = true; }
}
