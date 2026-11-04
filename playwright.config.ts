import { defineConfig,devices } from '@playwright/test';
import path from 'node:path';
export default defineConfig({
  testDir:'./tests',testMatch:'**/*.spec.ts',fullyParallel:false,workers:1,timeout:45000,
  outputDir:path.resolve('../../../audits/nensync/evidence/browser-results'),
  reporter:[['list'],['json',{outputFile:path.resolve('../../../audits/nensync/evidence/browser-results.json')}]],
  use:{baseURL:'http://127.0.0.1:3210',trace:'retain-on-failure',screenshot:'only-on-failure',...devices['Desktop Chrome'],channel:'msedge',launchOptions:{args:['--disable-crash-reporter']}},
});
