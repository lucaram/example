import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stringify } from 'yaml';
import { z } from 'zod';
import {
  CreateRequestBody,
  DecisionBody,
  ErrorResponse,
  FeedbackBody,
  PreClearanceRequest,
  RiskSummary,
} from '../src/index.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const outFile = resolve(root, 'docs/contracts/openapi.yaml');

const schema = (s: z.ZodType) => {
  const { $schema: _ignored, ...rest } = z.toJSONSchema(s, { target: 'openapi-3.0' }) as Record<string, unknown>;
  return rest;
};
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const json = (name: string) => ({ content: { 'application/json': { schema: ref(name) } } });
const headers = [
  { name: 'x-user-id', in: 'header', required: true, schema: { type: 'string' } },
  { name: 'x-role', in: 'header', required: true, schema: { type: 'string', enum: ['employee', 'compliance_officer'] } },
];
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'string' } };
const err = (description: string) => ({ description, ...json('ErrorResponse') });

const doc = {
  openapi: '3.0.3',
  info: {
    title: 'PreClear API',
    version: '0.1.0',
    description: 'GENERATED from packages/contracts/src/index.ts. Do not edit by hand (npm run contracts:build).',
  },
  paths: {
    '/health': { get: { operationId: 'health', responses: { '200': { description: 'OK' } } } },
    '/requests': {
      post: {
        operationId: 'createRequest',
        summary: 'Employee submits a pre-clearance request (REQ-101, REQ-142)',
        parameters: headers,
        requestBody: { required: true, ...json('CreateRequestBody') },
        responses: {
          '201': { description: 'Created. status is "blocked" with reason "Restricted list match" when BR-007 applies', ...json('PreClearanceRequest') },
          '400': err('Validation error, e.g. missing employeeId'),
          '401': err('Missing identity headers'),
          '403': err('Only employees may submit requests'),
        },
      },
      get: {
        operationId: 'listRequests',
        summary: 'Compliance officer lists requests (REQ-150)',
        parameters: headers,
        responses: {
          '200': { description: 'List', content: { 'application/json': { schema: { type: 'array', items: ref('PreClearanceRequest') } } } },
          '401': err('Missing identity headers'),
          '403': err('Only compliance officers may list requests'),
        },
      },
    },
    '/requests/{id}': {
      get: {
        operationId: 'getRequest',
        parameters: [...headers, idParam],
        responses: { '200': { description: 'Request', ...json('PreClearanceRequest') }, '404': err('Not found') },
      },
    },
    '/requests/{id}/decision': {
      post: {
        operationId: 'decideRequest',
        summary: 'Only compliance officers approve or reject (REQ-150, BR-012)',
        parameters: [...headers, idParam],
        requestBody: { required: true, ...json('DecisionBody') },
        responses: {
          '200': { description: 'Decision recorded', ...json('PreClearanceRequest') },
          '400': err('Validation error'),
          '403': err('Only compliance officers may decide'),
          '404': err('Not found'),
          '409': err('Request is blocked or already decided'),
        },
      },
    },
    '/requests/{id}/risk-summary': {
      post: {
        operationId: 'createRiskSummary',
        summary: 'AI advisory risk summary for the officer (REQ-160, REQ-161). Never decides.',
        parameters: [...headers, idParam],
        responses: {
          '200': { description: 'Summary', ...json('RiskSummary') },
          '403': err('Only compliance officers'),
          '404': err('Not found'),
          '502': err('The model output failed validation'),
        },
      },
    },
    '/requests/{id}/risk-summary/feedback': {
      post: {
        operationId: 'summaryFeedback',
        summary: 'Officer flags a summary; feeds production-to-eval loop',
        parameters: [...headers, idParam],
        requestBody: { required: true, ...json('FeedbackBody') },
        responses: { '204': { description: 'Recorded' }, '404': err('Not found') },
      },
    },
  },
  components: {
    schemas: {
      CreateRequestBody: schema(CreateRequestBody),
      PreClearanceRequest: schema(PreClearanceRequest),
      DecisionBody: schema(DecisionBody),
      RiskSummary: schema(RiskSummary),
      FeedbackBody: schema(FeedbackBody),
      ErrorResponse: schema(ErrorResponse),
    },
  },
};

const generated = stringify(doc, { lineWidth: 0, aliasDuplicateObjects: false });

if (process.argv.includes('--check')) {
  const current = existsSync(outFile) ? readFileSync(outFile, 'utf8').replace(/\r\n/g, '\n') : '';
  if (current !== generated) {
    console.error('docs/contracts/openapi.yaml is out of sync with packages/contracts/src/index.ts.');
    console.error('Run: npm run contracts:build  (a human owner must review the change, see CODEOWNERS)');
    process.exit(1);
  }
  console.log('Contract is in sync.');
} else {
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, generated);
  console.log(`Wrote ${outFile}`);
}
