// k6 smoke test (free, https://k6.io). Pillar 4: a performance gate in CI.
// Run: k6 run --summary-export perf/out/summary.json perf/smoke.js   (API must be running on :4000 with TEST_MODE=1)
import http from 'k6/http';
import { check } from 'k6';

const BASE = __ENV.BASE_URL || 'http://127.0.0.1:4000';
const headers = { 'content-type': 'application/json', 'x-user-id': 'E-1001', 'x-role': 'employee' };

export const options = {
  vus: 5,
  duration: '10s',
  // Keep in sync with docs/test-strategy/gates.json (perf.p95Ms).
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<300'],
  },
};

export default function () {
  const res = http.post(
    `${BASE}/requests`,
    JSON.stringify({ employeeId: 'E-1001', security: 'GLOBEX', side: 'buy', quantity: 10 }),
    { headers },
  );
  check(res, { 'created': (r) => r.status === 201 });
}
