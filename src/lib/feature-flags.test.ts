import {expect, it} from '@rstest/core';
import {readFeatureFlags} from './feature-flags';
import {FEATURE_FLAGS} from './feature-flags';
import {readFileSync} from 'node:fs';

it('keeps every opt-in feature off when configuration is absent', () => {
  expect(Object.values(readFeatureFlags({})).every(enabled => enabled === false)).toBe(true);
});
it.each(['false', 'TRUE', '1', ' true', 'true ', '', 'yes'])('never enables features for ambiguous value %j', value => {
  expect(readFeatureFlags({NEVORA_PAYROLL_ENABLED:value, NEVORA_COMMERCE_ENABLED:value,
    NEVORA_INVITATION_DELIVERY_ENABLED:value, NEVORA_MOBILE_ACCESS_ENABLED:value})).toMatchObject({
    payroll:false, commerce:false, invitationDelivery:false, mobileAccess:false,
  });
});
it('keeps independent feature and delivery gates independent', () => {
  expect(readFeatureFlags({NEVORA_COMMERCE_ENABLED:'true', NEVORA_ONBOARDING_ENABLED:'true',
    NEVORA_PAYROLL_ENABLED:'true', NEVORA_OWNER_ADVISOR_ENABLED:'true'})).toMatchObject({
    commerce:true, commerceApi:false, onboarding:true, onboardingProvider:false,
    onboardingEmail:false, invitationDelivery:false, provisionerWorker:false,
    payroll:true, ownerAdvisor:true, mobileAccess:false, clockerPunch:false,
  });
});
it('reads the supplied environment on each call without caching or mutating it', () => {
  const env = Object.freeze({NEVORA_INVITATION_DELIVERY_ENABLED:'true', NEVORA_MOBILE_ACCESS_ENABLED:'true'});
  expect(readFeatureFlags(env)).toMatchObject({invitationDelivery:true, mobileAccess:true});
  expect(readFeatureFlags({})).toMatchObject({invitationDelivery:false, mobileAccess:false});
  expect(env).toEqual({NEVORA_INVITATION_DELIVERY_ENABLED:'true', NEVORA_MOBILE_ACCESS_ENABLED:'true'});
});
it('keeps business imports and model retrieval independent and explicitly off by default', () => {
  expect(readFeatureFlags({})).toMatchObject({ownerAdvisorBusinessImports:false,ownerAdvisorBusinessRetrieval:false});
  expect(readFeatureFlags({NEVORA_OWNER_ADVISOR_BUSINESS_IMPORTS_ENABLED:'true'})).toMatchObject({ownerAdvisor:false,ownerAdvisorBusinessImports:true,ownerAdvisorBusinessRetrieval:false});
  expect(readFeatureFlags({NEVORA_OWNER_ADVISOR_BUSINESS_RETRIEVAL_ENABLED:'true'})).toMatchObject({ownerAdvisorBusinessImports:false,ownerAdvisorBusinessRetrieval:true});
});

it('keeps public-page analytics independent and off by default', () => {
  expect(readFeatureFlags({})).toMatchObject({webAnalytics:false});
  expect(readFeatureFlags({NEVORA_WEB_ANALYTICS_ENABLED:'true'})).toMatchObject({webAnalytics:true,ownerAdvisor:false,commerce:false});
  expect(readFeatureFlags({NEVORA_WEB_ANALYTICS_ENABLED:'1'})).toMatchObject({webAnalytics:false});
});

it('ships an explicit disabled example for every registered opt-in gate', () => {
  const lines = readFileSync('.env.example', 'utf8').split('\n');
  const example = Object.fromEntries(lines.flatMap(line => {
    const match = /^(NEVORA_[A-Z0-9_]+)=["']?([^"'\s]*)["']?\s*$/.exec(line);
    return match ? [[match[1], match[2]]] : [];
  }));
  for (const name of Object.values(FEATURE_FLAGS)) expect(example[name], name).toBe('false');
});
