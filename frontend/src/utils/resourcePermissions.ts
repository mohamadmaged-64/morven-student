import type { AuthUser } from '@/services/authApi';
import type { Resource } from '@/data/resources';

/**
 * Whether the authenticated user can manage (edit/delete/add content to)
 * a given Resource. A user can manage a Resource if they are an Admin or
 * if they are the Resource owner.
 */
export function canManageResource(
  user: AuthUser | null,
  resource: Pick<Resource, 'ownerId'> | null | undefined,
): boolean {
  if (!user) return false;
  if (!resource) return false;
  return user.role === 'ADMIN' || user.id === resource.ownerId;
}
