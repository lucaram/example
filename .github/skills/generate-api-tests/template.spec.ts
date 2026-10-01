// Template for the generate-api-tests skill. Copy to tests/api/<feature>.spec.ts and fill in the TODOs.
// It lives outside tests/ on purpose, so it never runs by itself.
import { expect, test } from '@playwright/test';
import { EMPLOYEE, OFFICER, newRequest } from '../fixtures/actors.ts';

test.beforeEach(async ({ request }) => {
  expect((await request.post('/__test/reset')).status()).toBe(204);
});

test.describe('REQ-TODO <feature name>', () => {
  test('success: TODO describe the rule it proves', { tag: ['@REQ-TODO', '@BR-TODO'] }, async ({ request }) => {
    const res = await request.post('/requests', { headers: EMPLOYEE, data: newRequest() });
    expect(res.status()).toBe(201);
  });

  test('validation: a missing required field returns 400', { tag: ['@REQ-TODO'] }, async ({ request }) => {
    const res = await request.post('/requests', { headers: EMPLOYEE, data: {} });
    expect(res.status()).toBe(400);
  });

  test('permission: the wrong role is refused with 403', { tag: ['@REQ-TODO', '@BR-012'] }, async ({ request }) => {
    const res = await request.get('/requests', { headers: EMPLOYEE });
    expect(res.status()).toBe(403);
    expect((await request.get('/requests', { headers: OFFICER })).status()).toBe(200);
  });
});
