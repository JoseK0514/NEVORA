import {projectConfig} from './vitest.shared.mts';
import {defineConfig} from 'vitest/config';
export default projectConfig('mobile-access-browser', defineConfig({test:{include:['src/test/integration/mobile-access-browser.integration.ts','src/test/integration/mobile-access-landscape.integration.ts','src/test/integration/mobile-onboarding-ui.integration.tsx','src/test/integration/commerce-recovery-browser.integration.ts','src/test/integration/commerce-recovery-effects.integration.ts'],fileParallelism:false,testTimeout:360000,hookTimeout:30000}}));
