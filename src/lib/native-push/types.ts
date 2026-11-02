export type NativePlatform = 'ios' | 'android';
export type NativeProvider = 'apns-sandbox' | 'apns-production' | 'fcm';
export type NativeEnvironment = 'test' | 'production';

/** Public metadata only. Syntax/key possession never establishes account authority. */
export type NativeBinding = Readonly<{
  origin: string;
  environment: NativeEnvironment;
  platform: NativePlatform;
  appId: string;
  provider: NativeProvider;
  keyFingerprint: string;
}>;
export type NativeMaterialBinding = NativeBinding & Readonly<{generation: string}>;
export type NativeChallenge = NativeBinding & Readonly<{
  version: 1;
  operation: 'enroll' | 'rotate' | 'detach';
  challengeId: string;
  nonce: string;
  expectedGeneration: string | null;
  issuedAt: string;
  expiresAt: string;
}>;
