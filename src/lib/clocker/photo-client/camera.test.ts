import { afterEach, expect, it, vi } from 'vitest';
import { PunchCamera, type CameraEnvironment } from './camera';

function fixture() {
  const stop = vi.fn();
  const stream = { getTracks: () => [{ stop }], getVideoTracks: () => [{ readyState: 'live' }] } as unknown as MediaStream;
  const video = { srcObject: null, playsInline: false, muted: false, autoplay: false, readyState: 2,
    videoWidth: 1280, videoHeight: 720, play: vi.fn(async () => undefined), pause: vi.fn() } as unknown as HTMLVideoElement;
  const drawImage = vi.fn();
  const canvas = { width: 0, height: 0, getContext: () => ({ drawImage }),
    toBlob: (callback: BlobCallback) => callback(new Blob([new Uint8Array([255, 216, 255, 217])], { type: 'image/jpeg' })) } as unknown as HTMLCanvasElement;
  const media = vi.fn(async () => stream);
  const env: CameraEnvironment = { secureContext: true, getUserMedia: media, createCanvas: () => canvas };
  return { stop, stream, video, drawImage, canvas, media, env, camera: new PunchCamera(env) };
}
afterEach(() => vi.useRealTimers());

it('requests only video with preferred front camera and inline muted playback', async () => {
  const f = fixture(); await f.camera.open(f.video, new AbortController().signal, 1000);
  expect(f.media).toHaveBeenCalledWith({ audio: false, video: { facingMode: { ideal: 'user' }, width: { ideal: 640 }, height: { ideal: 640 } } });
  expect(f.video).toMatchObject({ playsInline: true, muted: true, autoplay: true, srcObject: f.stream });
  expect(f.video.play).toHaveBeenCalledOnce(); f.camera.close();
});
it('re-encodes a bounded JPEG, clears canvas and stops tracks immediately after capture', async () => {
  const f = fixture(); await f.camera.open(f.video, new AbortController().signal, 1000);
  const image = await f.camera.capture();
  expect(image).toMatchObject({ width: 640, height: 360 }); expect(image.blob.type).toBe('image/jpeg');
  expect(f.drawImage).toHaveBeenCalledWith(f.video, 0, 0, 640, 360);
  expect(f.stop).toHaveBeenCalledOnce(); expect(f.video.srcObject).toBeNull();
  expect(f.canvas.width).toBe(0); expect(f.canvas.height).toBe(0);
});
it('stops a late permission grant after cancellation instead of attaching it', async () => {
  const f = fixture(); let resolve!: (s: MediaStream) => void;
  f.env.getUserMedia = () => new Promise(r => { resolve = r; });
  const controller = new AbortController(), camera = new PunchCamera(f.env);
  const result = camera.open(f.video, controller.signal, 1000); controller.abort();
  await expect(result).rejects.toMatchObject({ code: 'CANCELLED' });
  resolve(f.stream); await Promise.resolve();
  expect(f.stop).toHaveBeenCalledOnce(); expect(f.video.srcObject).toBeNull();
});
it('times out an ignored permission prompt and stops a later granted stream', async () => {
  vi.useFakeTimers(); const f = fixture(); let resolve!: (s: MediaStream) => void;
  f.env.getUserMedia = () => new Promise(r => { resolve = r; });
  const result = new PunchCamera(f.env).open(f.video, new AbortController().signal, 40);
  const check = expect(result).rejects.toMatchObject({ code: 'CAMERA_TIMEOUT' });
  await vi.advanceTimersByTimeAsync(40); await check; resolve(f.stream); await Promise.resolve();
  expect(f.stop).toHaveBeenCalledOnce();
});
it('maps permission denial without leaking provider error details', async () => {
  const f = fixture(); f.env.getUserMedia = async () => { throw new DOMException('private detail', 'NotAllowedError'); };
  await expect(new PunchCamera(f.env).open(f.video, new AbortController().signal, 1000)).rejects.toMatchObject({ code: 'CAMERA_DENIED' });
});
it('cleans up stream if inline playback fails', async () => {
  const f = fixture(); f.video.play = async () => { throw Error('play blocked'); };
  await expect(f.camera.open(f.video, new AbortController().signal, 1000)).rejects.toMatchObject({ code: 'CAMERA_UNAVAILABLE' });
  expect(f.stop).toHaveBeenCalledOnce(); expect(f.video.srcObject).toBeNull();
});
it('refuses insecure context without requesting camera permission', async () => {
  const f = fixture(); f.env.secureContext = false;
  await expect(new PunchCamera(f.env).open(f.video, new AbortController().signal, 1000)).rejects.toMatchObject({ code: 'CAMERA_UNAVAILABLE' });
  expect(f.media).not.toHaveBeenCalled();
});
it('does not manufacture a photo from a zero-sized or ended video track', async () => {
  const f = fixture(); await f.camera.open(f.video, new AbortController().signal, 1000);
  Object.defineProperty(f.video, 'videoWidth', { value: 0 });
  await expect(f.camera.capture()).rejects.toMatchObject({ code: 'CAPTURE_FAILED' }); expect(f.stop).toHaveBeenCalledOnce();
});
it('rejects a non-JPEG encoding result and clears the stream and canvas', async () => {
  const f = fixture(); f.canvas.toBlob = callback => callback(new Blob(['synthetic'], { type: 'image/png' }));
  await f.camera.open(f.video, new AbortController().signal, 1000);
  await expect(f.camera.capture()).rejects.toMatchObject({ code: 'CAPTURE_FAILED' });
  expect(f.stop).toHaveBeenCalledOnce(); expect(f.canvas.width).toBe(0);
});
it('does not install video listeners after playback resolves for a closed camera', async () => {
  const f = fixture(); let resolve!: () => void;
  f.video.play = () => new Promise(r => { resolve = r; });
  Object.defineProperty(f.video, 'readyState', { value: 0 });
  f.video.addEventListener = vi.fn();
  const promise = f.camera.open(f.video, new AbortController().signal, 1000);
  await Promise.resolve(); await Promise.resolve(); f.camera.close();
  await expect(promise).rejects.toMatchObject({ code: 'CANCELLED' }); resolve(); await Promise.resolve();
  expect(f.video.addEventListener).not.toHaveBeenCalled(); expect(f.stop).toHaveBeenCalledOnce();
});
