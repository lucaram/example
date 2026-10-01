import { z } from 'zod';

// Single source of truth for API shapes. docs/contracts/openapi.yaml is generated from this
// file (npm run contracts:build) and CI fails if the two drift apart (contracts:check).

export const Role = z.enum(['employee', 'compliance_officer']);
export type Role = z.infer<typeof Role>;

export const Side = z.enum(['buy', 'sell']);
export type Side = z.infer<typeof Side>;

export const RequestStatus = z.enum(['pending', 'blocked', 'approved', 'rejected']);
export type RequestStatus = z.infer<typeof RequestStatus>;

/** Business rule IDs that exist in docs/business-rules/trading.yaml. */
export const RULE_IDS = ['BR-007', 'BR-012', 'BR-020'] as const;
export const RuleId = z.enum(RULE_IDS);
export type RuleId = z.infer<typeof RuleId>;

export const CreateRequestBody = z.object({
  employeeId: z.string().min(1),
  security: z.string().min(1).max(100),
  side: Side,
  quantity: z.number().int().positive(),
  note: z.string().max(500).optional(),
});
export type CreateRequestBody = z.infer<typeof CreateRequestBody>;

export const RiskLevel = z.enum(['low', 'medium', 'high']);
export type RiskLevel = z.infer<typeof RiskLevel>;

export const RiskSummary = z.object({
  risk: RiskLevel,
  reasons: z.array(z.string().min(1)).min(1).max(5),
  citedRules: z.array(RuleId),
});
export type RiskSummary = z.infer<typeof RiskSummary>;

export const PreClearanceRequest = z.object({
  id: z.string(),
  employeeId: z.string(),
  security: z.string(),
  side: Side,
  quantity: z.number().int(),
  note: z.string().optional(),
  status: RequestStatus,
  reason: z.string().optional(),
  rulesTriggered: z.array(RuleId),
  createdAt: z.string(),
  riskSummary: RiskSummary.optional(),
});
export type PreClearanceRequest = z.infer<typeof PreClearanceRequest>;

export const DecisionBody = z.object({
  decision: z.enum(['approve', 'reject']),
});
export type DecisionBody = z.infer<typeof DecisionBody>;

export const FeedbackBody = z.object({
  rating: z.enum(['up', 'down']),
  comment: z.string().max(500).optional(),
});
export type FeedbackBody = z.infer<typeof FeedbackBody>;

export const ErrorResponse = z.object({
  error: z.string(),
  message: z.string().optional(),
  details: z.array(z.string()).optional(),
});
export type ErrorResponse = z.infer<typeof ErrorResponse>;

export const RESTRICTED_REASON = 'Restricted list match';
