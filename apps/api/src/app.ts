import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import cors from '@fastify/cors';
import Fastify from 'fastify';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  CreateRequestBody,
  DecisionBody,
  FeedbackBody,
  RESTRICTED_REASON,
} from '@preclear/contracts';
import type { PreClearanceRequest } from '@preclear/contracts';
import { readActor } from './auth.ts';
import type { Actor } from './auth.ts';
import type { LlmClient } from './llm/client.ts';
import { generateRiskSummary } from './risk-summary.ts';
import { rulesTriggered } from './rules.ts';
import { RequestStore } from './store.ts';

export interface AppOptions {
  llm: LlmClient;
  store?: RequestStore;
  /** Enables POST /__test/reset so e2e tests can start from a clean state. Never enable in production. */
  testMode?: boolean;
  feedbackFile?: string;
  logger?: boolean;
}

function fail(reply: FastifyReply, status: number, error: string, message?: string, details?: string[]) {
  return reply.status(status).send({ error, message, details });
}

export function buildApp(opts: AppOptions): FastifyInstance {
  const app = Fastify({ logger: opts.logger ?? false });
  const store = opts.store ?? new RequestStore();
  const summaryMeta = new Map<string, { model: string; promptVersion: string }>();

  // Demo only: allow the Next.js app on another port to call this API.
  void app.register(cors, { origin: true });

  /** Returns the actor, or sends 401/403 and returns null. */
  function requireActor(req: FastifyRequest, reply: FastifyReply, role?: Actor['role']): Actor | null {
    const actor = readActor(req.headers as Record<string, unknown>);
    if (!actor) {
      fail(reply, 401, 'unauthenticated', 'x-user-id and x-role headers are required');
      return null;
    }
    if (role && actor.role !== role) {
      const who = role === 'employee' ? 'employees' : 'compliance officers';
      fail(reply, 403, 'forbidden', `Only ${who} may do this (BR-012)`);
      return null;
    }
    return actor;
  }

  app.get('/health', async () => ({ status: 'ok' }));

  // REQ-101 + REQ-142: submit a request. BR-007 is decided by code, never by the AI.
  app.post('/requests', async (req, reply) => {
    const actor = requireActor(req, reply, 'employee');
    if (!actor) return;
    const body = CreateRequestBody.safeParse(req.body);
    if (!body.success) {
      return fail(reply, 400, 'validation_error', 'Invalid request body', body.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
    }
    const triggered = rulesTriggered(body.data.security);
    const blocked = triggered.includes('BR-007');
    const item: PreClearanceRequest = {
      id: store.nextId(),
      ...body.data,
      status: blocked ? 'blocked' : 'pending',
      reason: blocked ? RESTRICTED_REASON : undefined,
      rulesTriggered: triggered,
      createdAt: new Date().toISOString(),
    };
    store.save(item);
    return reply.status(201).send(item);
  });

  // REQ-150: only officers list requests.
  app.get('/requests', async (req, reply) => {
    if (!requireActor(req, reply, 'compliance_officer')) return;
    return store.list();
  });

  app.get<{ Params: { id: string } }>('/requests/:id', async (req, reply) => {
    const actor = requireActor(req, reply);
    if (!actor) return;
    const item = store.get(req.params.id);
    if (!item) return fail(reply, 404, 'not_found');
    if (actor.role === 'employee' && item.employeeId !== actor.userId) return fail(reply, 403, 'forbidden', 'Not your request');
    return item;
  });

  // REQ-150 + BR-012: only officers decide.
  app.post<{ Params: { id: string } }>('/requests/:id/decision', async (req, reply) => {
    if (!requireActor(req, reply, 'compliance_officer')) return;
    const body = DecisionBody.safeParse(req.body);
    if (!body.success) return fail(reply, 400, 'validation_error', 'Invalid decision', body.error.issues.map((i) => i.message));
    const item = store.get(req.params.id);
    if (!item) return fail(reply, 404, 'not_found');
    if (item.status !== 'pending') return fail(reply, 409, 'conflict', `Request is already ${item.status}`);
    item.status = body.data.decision === 'approve' ? 'approved' : 'rejected';
    return store.save(item);
  });

  // REQ-160 + REQ-161 + BR-020: AI advises. The note is untrusted data.
  app.post<{ Params: { id: string } }>('/requests/:id/risk-summary', async (req, reply) => {
    if (!requireActor(req, reply, 'compliance_officer')) return;
    const item = store.get(req.params.id);
    if (!item) return fail(reply, 404, 'not_found');
    try {
      const result = await generateRiskSummary(opts.llm, item);
      app.log.info(
        { event: 'llm_call', requestId: item.id, model: result.model, promptVersion: result.promptVersion, latencyMs: result.latencyMs, usage: result.usage },
        'risk summary generated',
      );
      item.riskSummary = result.summary;
      summaryMeta.set(item.id, { model: result.model, promptVersion: result.promptVersion });
      store.save(item);
      return result.summary;
    } catch (err) {
      app.log.error({ event: 'llm_error', requestId: item.id, err: String(err) }, 'risk summary failed');
      return fail(reply, 502, 'model_output_invalid', 'The AI summary could not be produced. Decide without it.');
    }
  });

  // Production-to-eval loop: a thumbs-down becomes a candidate golden case (scripts/flag-to-case.mjs).
  app.post<{ Params: { id: string } }>('/requests/:id/risk-summary/feedback', async (req, reply) => {
    if (!requireActor(req, reply, 'compliance_officer')) return;
    const body = FeedbackBody.safeParse(req.body);
    if (!body.success) return fail(reply, 400, 'validation_error', 'Invalid feedback');
    const item = store.get(req.params.id);
    if (!item?.riskSummary) return fail(reply, 404, 'not_found', 'No summary for this request');
    if (opts.feedbackFile) {
      mkdirSync(dirname(opts.feedbackFile), { recursive: true });
      const meta = summaryMeta.get(item.id);
      appendFileSync(
        opts.feedbackFile,
        JSON.stringify({
          ts: new Date().toISOString(),
          requestId: item.id,
          rating: body.data.rating,
          comment: body.data.comment,
          input: { security: item.security, side: item.side, quantity: item.quantity, note: item.note, rulesTriggered: item.rulesTriggered },
          summary: item.riskSummary,
          ...meta,
        }) + '\n',
      );
    }
    return reply.status(204).send();
  });

  if (opts.testMode) {
    app.post('/__test/reset', async (_req, reply) => {
      store.reset();
      summaryMeta.clear();
      return reply.status(204).send();
    });
  }

  return app;
}
