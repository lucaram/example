import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const API = 'http://127.0.0.1:4000';
const WEB = 'http://127.0.0.1:3000';

export default defineConfig({
  // One worker: the API keeps state in memory and tests reset it. No retries: a retry hides flakiness,
  // and the flaky-test rate is one of our success measures.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  outputDir: 'test-results/artifacts',
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: { trace: 'retain-on-failure' },
  webServer: [
    {
      command: 'npm run start -w apps/api',
      url: `${API}/health`,
      reuseExistingServer: false,
      // Tests never call a real model. Evals do, in a separate job.
      env: {
        PORT: '4000',
        LLM_MODE: 'mock',
        TEST_MODE: '1',
        LOG: 'off',
        FEEDBACK_FILE: resolve(import.meta.dirname, 'test-results/feedback.jsonl'),
      },
    },
    {
      // Needs `npm run build` first. CI does this.
      command: 'npm run start -w apps/web',
      url: WEB,
      reuseExistingServer: false,
    },
  ],
  projects: [
    { name: 'api', testDir: './tests/api', use: { baseURL: API } },
    { name: 'e2e', testDir: './tests/e2e', use: { ...devices['Desktop Chrome'], baseURL: WEB } },
  ],
});
