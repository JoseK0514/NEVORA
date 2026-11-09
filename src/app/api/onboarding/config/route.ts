import {readOnboardingConfig} from '@/lib/onboarding/config.server';
import {publicOnboardingConfig} from '@/lib/onboarding/registration-http.server';
import {verificationDelivery} from '@/lib/onboarding/verification-delivery.server';
import {onboardingJson} from '@/lib/onboarding/http.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export function GET(){const c=readOnboardingConfig();return onboardingJson(publicOnboardingConfig(c,c.enabled&&verificationDelivery(process.env,c)!==null));}
