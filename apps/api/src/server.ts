import { resolve } from 'node:path';
import { buildApp } from './app.ts';
import { createLlmClient } from './llm/index.ts';

const port = Number(process.env.PORT ?? 4000);

const app = buildApp({
  llm: createLlmClient(),
  testMode: process.env.TEST_MODE === '1',
  feedbackFile: process.env.FEEDBACK_FILE ?? resolve(import.meta.dirname, '../data/feedback.jsonl'),
  logger: process.env.LOG !== 'off',
});

await app.listen({ port, host: '127.0.0.1' });
