export type CapturedPhoto = { blob: Blob; width: number; height: number };
export type CameraEnvironment = {
  secureContext: boolean;
  getUserMedia: ((constraints: MediaStreamConstraints) => Promise<MediaStream>) | null;
  createCanvas: () => HTMLCanvasElement;
};
export type CameraErrorCode = 'CANCELLED' | 'CAMERA_TIMEOUT' | 'CAMERA_DENIED' | 'CAMERA_UNAVAILABLE' | 'CAPTURE_FAILED';
export class CameraError extends Error {
  constructor(readonly code: CameraErrorCode) { super(code); }
}
function stop(stream: MediaStream): void { stream.getTracks().forEach(track => track.stop()); }
function mapError(error: unknown): CameraError {
  if (error instanceof CameraError) return error;
  return new CameraError(error instanceof DOMException && error.name === 'NotAllowedError' ? 'CAMERA_DENIED' : 'CAMERA_UNAVAILABLE');
}

/** One temporary camera lease. No audio, file picker, persistence or recording. */
export class PunchCamera {
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private generation = 0;
  private cancelOpening: (() => void) | null = null;
  private readonly env: CameraEnvironment;
  constructor(environment?: CameraEnvironment) {
    this.env = environment ?? {
      secureContext: typeof window !== 'undefined' && window.isSecureContext,
      getUserMedia: typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia
        ? constraints => navigator.mediaDevices.getUserMedia(constraints) : null,
      createCanvas: () => document.createElement('canvas'),
    };
  }
  async open(video: HTMLVideoElement, signal: AbortSignal, timeoutMs: number): Promise<void> {
    this.close();
    if (!this.env.secureContext || !this.env.getUserMedia) throw new CameraError('CAMERA_UNAVAILABLE');
    if (signal.aborted) throw new CameraError('CANCELLED');
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 12000) throw new CameraError('CAMERA_TIMEOUT');
    const generation = this.generation;
    let settled = false, timer: ReturnType<typeof setTimeout>;
    let cancel!: () => void;
    const cancelled = new Promise<never>((_, reject) => {
      cancel = () => { settled = true; reject(new CameraError('CANCELLED')); };
      timer = setTimeout(() => { settled = true; reject(new CameraError('CAMERA_TIMEOUT')); }, timeoutMs);
    });
    this.cancelOpening = cancel;
    signal.addEventListener('abort', cancel, { once: true });
    try {
      const acquired = this.env.getUserMedia({ audio: false, video: {
        facingMode: { ideal: 'user' }, width: { ideal: 640 }, height: { ideal: 640 },
      } }).then(stream => {
        // getUserMedia cannot be aborted. Late permission grants still need cleanup.
        if (settled || signal.aborted || generation !== this.generation) {
          stop(stream); throw new CameraError('CANCELLED');
        }
        this.stream = stream; this.video = video;
        video.playsInline = true; video.muted = true; video.autoplay = true; video.srcObject = stream;
        return stream;
      });
      const ready = acquired.then(async () => {
        await video.play();
        if (settled || signal.aborted || generation !== this.generation) throw new CameraError('CANCELLED');
        if (video.readyState < 2) await new Promise<void>((resolve, reject) => {
          const clean = () => {
            video.removeEventListener('loadeddata', loaded); video.removeEventListener('error', failed);
            signal.removeEventListener('abort', aborted);
          };
          const loaded = () => { clean(); resolve(); };
          const failed = () => { clean(); reject(new CameraError('CAMERA_UNAVAILABLE')); };
          const aborted = () => { clean(); reject(new CameraError('CANCELLED')); };
          video.addEventListener('loadeddata', loaded, { once: true }); video.addEventListener('error', failed, { once: true });
          signal.addEventListener('abort', aborted, { once: true });
          // Permission timeout also clears this readiness wait through close().
          this.cancelOpening = () => { cancel(); aborted(); };
        });
      });
      await Promise.race([ready, cancelled]);
      if (signal.aborted || generation !== this.generation) throw new CameraError('CANCELLED');
    } catch (error) { this.close(); throw mapError(error); }
    finally {
      settled = true; clearTimeout(timer!); signal.removeEventListener('abort', cancel); this.cancelOpening = null;
    }
  }
  async capture(): Promise<CapturedPhoto> {
    const video = this.video, stream = this.stream, generation = this.generation;
    const canvas = this.env.createCanvas();
    try {
      if (!video || !stream || !stream.getVideoTracks().some(track => track.readyState === 'live') ||
          video.readyState < 2 || video.videoWidth <= 0 || video.videoHeight <= 0) throw new CameraError('CAPTURE_FAILED');
      const ratio = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
      const width = Math.max(1, Math.round(video.videoWidth * ratio)), height = Math.max(1, Math.round(video.videoHeight * ratio));
      canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d'); if (!context) throw new CameraError('CAPTURE_FAILED');
      context.drawImage(video, 0, 0, width, height);
      // A canvas-generated JPEG carries no original file/EXIF metadata.
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.82));
      if (generation !== this.generation || !blob || blob.type !== 'image/jpeg' || blob.size === 0 || blob.size > 524288)
        throw new CameraError('CAPTURE_FAILED');
      return { blob, width, height };
    } catch (error) { throw error instanceof CameraError ? error : new CameraError('CAPTURE_FAILED'); }
    finally { canvas.width = 0; canvas.height = 0; this.close(); }
  }
  close(): void {
    ++this.generation;
    const cancel = this.cancelOpening; this.cancelOpening = null; cancel?.();
    if (this.stream) stop(this.stream); this.stream = null;
    if (this.video) { this.video.pause(); this.video.srcObject = null; } this.video = null;
  }
}
