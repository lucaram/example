// Synthetic identities and data only. Never put real client or employee data here.
export const EMPLOYEE = { 'x-user-id': 'E-1001', 'x-role': 'employee' };
export const OTHER_EMPLOYEE = { 'x-user-id': 'E-1002', 'x-role': 'employee' };
export const OFFICER = { 'x-user-id': 'O-2001', 'x-role': 'compliance_officer' };

export const newRequest = (over: Record<string, unknown> = {}) => ({
  employeeId: 'E-1001',
  security: 'GLOBEX',
  side: 'buy',
  quantity: 100,
  ...over,
});
