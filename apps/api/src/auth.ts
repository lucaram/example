import { Role } from '@preclear/contracts';

// Demo-only identity: headers stand in for a real identity provider.
export interface Actor {
  userId: string;
  role: Role;
}

export function readActor(headers: Record<string, unknown>): Actor | null {
  const userId = headers['x-user-id'];
  const role = Role.safeParse(headers['x-role']);
  if (typeof userId !== 'string' || userId.length === 0 || !role.success) return null;
  return { userId, role: role.data };
}
