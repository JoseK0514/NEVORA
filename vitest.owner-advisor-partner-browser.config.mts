import base from './vitest.owner-advisor-browser.config.mts';
import {defineConfig} from 'vitest/config';
export default defineConfig({...base,test:{...base.test,maxWorkers:1,include:['src/test/integration/owner-advisor-partner-browser.integration.ts']}});
