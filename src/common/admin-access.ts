import { PrismaService } from '../prisma/prisma.service';
import {
  AdminPermission,
  AdminRole,
  AdminType,
  Language,
} from '../graphql/enums';
import { ForbiddenError, UnAuthorizedError } from './exceptions';

/** The refusal messages, in the caller's language. */
export type AdminAccessMessages = {
  unauthorized: string;
  forbidden: string;
};

/** Defaults for modules without their own wording. */
export const adminAccessMessages: Record<Language, AdminAccessMessages> = {
  [Language.ES]: {
    unauthorized: 'No autorizado',
    forbidden: 'No tienes permisos para realizar esta acción',
  },
  [Language.EN]: {
    unauthorized: 'Unauthorized',
    forbidden: 'You do not have permission to perform this action',
  },
  [Language.FR]: {
    unauthorized: 'Non autorisé',
    forbidden: "Vous n'avez pas la permission d'effectuer cette action",
  },
  [Language.PT]: {
    unauthorized: 'Não autorizado',
    forbidden: 'Você não tem permissão para realizar esta ação',
  },
  [Language.DE]: {
    unauthorized: 'Nicht autorisiert',
    forbidden: 'Sie haben keine Berechtigung, diese Aktion auszuführen',
  },
};

export type AdminAccessRow = {
  adminType: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  sellerId: string | null;
};

/** Loads what the permission rule needs. Null when the admin does not exist. */
export function loadAdminAccess(
  prisma: PrismaService,
  adminId: string,
): Promise<AdminAccessRow | null> {
  return prisma.admin.findUnique({
    where: { id: adminId },
    select: {
      adminType: true,
      role: true,
      permissions: true,
      isActive: true,
      sellerId: true,
    },
  }) as Promise<AdminAccessRow | null>;
}

/**
 * The SEC-8 rule: an active PLATFORM admin who is SUPER_ADMIN or holds any one
 * of `permission`. Business admins never pass, whatever their permissions say.
 */
export function adminRowCan(
  admin: AdminAccessRow | null | undefined,
  permission: AdminPermission | readonly AdminPermission[],
): boolean {
  if (!admin || !admin.isActive) return false;
  if ((admin.adminType as AdminType) !== AdminType.PLATFORM) return false;
  if ((admin.role as AdminRole) === AdminRole.SUPER_ADMIN) return true;
  const accepted: readonly AdminPermission[] = Array.isArray(permission)
    ? permission
    : [permission as AdminPermission];
  return accepted.some((p) => (admin.permissions ?? []).includes(p));
}

/**
 * Ensures the caller is an active PLATFORM admin who is SUPER_ADMIN or holds
 * the permission (any one of them, when several are given). Returns the admin
 * id.
 *
 * A signed-out caller gets UNAUTHORIZED. A signed-in admin without the right
 * gets FORBIDDEN, so the panel keeps the session and shows the message. The
 * row is read on every call, so deactivating an admin or revoking a permission
 * takes effect at once.
 */
export async function assertAdminCan(
  prisma: PrismaService,
  {
    adminId,
    permission,
    messages,
  }: {
    adminId?: string | null;
    permission: AdminPermission | readonly AdminPermission[];
    messages: AdminAccessMessages;
  },
): Promise<string> {
  if (!adminId) throw new UnAuthorizedError(messages.unauthorized);
  const admin = await loadAdminAccess(prisma, adminId);
  if (!adminRowCan(admin, permission)) {
    throw new ForbiddenError(messages.forbidden);
  }
  return adminId;
}
