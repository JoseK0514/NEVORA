import { describe, expect, it } from 'vitest';
import { migrationBody, readCompanyInput, readOwnerLocations, readSetupTarget } from './company-setup';

const env = {
  COMPANY_NAME: '  Cedar Atelier Fictional  ', COMPANY_TIME_ZONE: 'Pacific/Honolulu',
  COMPANY_LOCATION_NAME: 'Harbor Studio', COMPANY_LOCATION_SHORT_NAME: 'Harbor', COMPANY_LOCATION_KEY: 'harbor-studio',
  BOOTSTRAP_EMPLOYEE_ID: 'cedar-owner', BOOTSTRAP_FIRST_NAME: 'Cedar', BOOTSTRAP_LAST_NAME: 'Owner',
  BOOTSTRAP_PHONE: '2025550123', BOOTSTRAP_PASSWORD: 'Fictional-company-only!',
};

describe('single-company setup input', () => {
  it('uses supplied company, timezone, location and owner data', () => {
    const input = readCompanyInput(env);
    expect(input.name).toBe('Cedar Atelier Fictional');
    expect(input.timeZone).toBe('Pacific/Honolulu');
    expect(input.locationKey).toBe('harbor-studio');
    expect(input.owner.id).toBe('CEDAR-OWNER');
    expect(input.owner.phone).toBe('202-555-0123');
  });
  it('requires all company data and rejects invalid timezones and location keys', () => {
    expect(() => readCompanyInput({ ...env, COMPANY_NAME: '' })).toThrow();
    expect(() => readCompanyInput({ ...env, COMPANY_TIME_ZONE: 'Invalid/Zone' })).toThrow();
    expect(() => readCompanyInput({ ...env, COMPANY_LOCATION_KEY: '../harbor' })).toThrow();
    expect(() => readCompanyInput({ ...env, COMPANY_LOCATION_NAME: 'Harbor\nStudio' })).toThrow();
  });
  it('rejects invalid owner details without printing secret input', () => {
    expect(() => readCompanyInput({ ...env, BOOTSTRAP_PASSWORD: 'short' })).toThrow('at least 8');
    expect(() => readCompanyInput({ ...env, BOOTSTRAP_PHONE: '12' })).toThrow('ten-digit');
    expect(() => readCompanyInput({ ...env, BOOTSTRAP_EMAIL: 'bad email' })).toThrow('email address');
  });
  it('requires explicit eligibility including the primary location', () => {
    expect(() => readOwnerLocations({ BOOTSTRAP_PRIMARY_LOCATION_ID: 'studio' })).toThrow();
    expect(() => readOwnerLocations({ BOOTSTRAP_PRIMARY_LOCATION_ID: 'studio', BOOTSTRAP_ELIGIBLE_LOCATION_IDS: 'annex' })).toThrow('include the primary');
    expect(readOwnerLocations({ BOOTSTRAP_PRIMARY_LOCATION_ID: 'studio', BOOTSTRAP_ELIGIBLE_LOCATION_IDS: 'studio, annex, studio' }))
      .toEqual({ primaryLocationId: 'studio', eligibleLocationIds: ['studio', 'annex'] });
  });
  it('requires a separate selected database and exact database name', () => {
    expect(() => readSetupTarget({ DATABASE_URL: 'postgresql://localhost/live' })).toThrow();
    const target = { NEVORA_SETUP_ENVIRONMENT: 'development', NEVORA_SETUP_DATABASE_URL: 'postgresql://localhost/company', NEVORA_SETUP_DATABASE_NAME: 'company' };
    expect(readSetupTarget(target)).toBe(target.NEVORA_SETUP_DATABASE_URL);
    expect(() => readSetupTarget({ ...target, NEVORA_SETUP_DATABASE_NAME: 'other' })).toThrow();
    expect(() => readSetupTarget({ ...target, NEVORA_SETUP_ENVIRONMENT: 'production' })).toThrow('verify-full');
  });
  it('removes outer migration transactions while preserving function bodies', () => {
    const functionBody = 'CREATE FUNCTION sample() RETURNS void LANGUAGE plpgsql AS $$\nBEGIN\n RETURN;\nEND $$;';
    expect(migrationBody(`-- migration\nBEGIN;\n${functionBody}\nCOMMIT;\n`)).toContain(functionBody);
    expect(migrationBody(functionBody)).toBe(functionBody);
    expect(() => migrationBody('BEGIN;\nSELECT 1;')).toThrow('boundaries');
    expect(() => migrationBody('BEGIN;\nBEGIN;\nCOMMIT;\nCOMMIT;')).toThrow('boundaries');
  });
});
