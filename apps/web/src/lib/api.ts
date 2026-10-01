import type { PreClearanceRequest, RiskSummary, Role } from '@preclear/contracts';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:4000';

export interface Actor {
  id: string;
  role: Role;
  label: string;
}

export const ACTORS: Actor[] = [
  { id: 'E-1001', role: 'employee', label: 'Employee E-1001' },
  { id: 'O-2001', role: 'compliance_officer', label: 'Compliance officer O-2001' },
];

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function call<T>(actor: Actor, path: string, init?: { method: string; body?: unknown }): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: init?.method ?? 'GET',
    headers: {
      // Fastify rejects a JSON content-type with an empty body, so only send it when there is a body.
      ...(init?.body === undefined ? {} : { 'content-type': 'application/json' }),
      'x-user-id': actor.id,
      'x-role': actor.role,
    },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (res.status === 204) return undefined as T;
  const data = (await res.json()) as { message?: string; error?: string } & T;
  if (!res.ok) throw new ApiError(res.status, data.message ?? data.error ?? `Request failed (${res.status})`);
  return data;
}

export const api = {
  create: (actor: Actor, body: { employeeId: string; security: string; side: 'buy' | 'sell'; quantity: number; note?: string }) =>
    call<PreClearanceRequest>(actor, '/requests', { method: 'POST', body }),
  list: (actor: Actor) => call<PreClearanceRequest[]>(actor, '/requests'),
  decide: (actor: Actor, id: string, decision: 'approve' | 'reject') =>
    call<PreClearanceRequest>(actor, `/requests/${id}/decision`, { method: 'POST', body: { decision } }),
  riskSummary: (actor: Actor, id: string) => call<RiskSummary>(actor, `/requests/${id}/risk-summary`, { method: 'POST' }),
  flagSummary: (actor: Actor, id: string) =>
    call<void>(actor, `/requests/${id}/risk-summary/feedback`, { method: 'POST', body: { rating: 'down' } }),
};
