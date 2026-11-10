/** Reviewed non-secret destinations, compiled with the source. Profiles contain
 * credentials, never authority to redirect them. Production is not admitted by
 * this bounded staging plan; endpoint rotation requires a reviewed source edit.
 * Observed through the selected Neon project/branch APIs on 2026-11-09. */
export const managedDestinations=Object.freeze({test:Object.freeze({
 controlHostname:'ep-dark-mud-bbzmbx2i.c-15.us-east-1.aws.neon.tech',
 controlDatabase:'nevora_onboarding_control',
 commerceOrigin:'https://br-hidden-mud-bbnc2fxk-commerceapi.compute.c-15.us-east-1.aws.neon.tech',
 portalBaseDomain:'portal-staging.nevora.team',
})});
