import { Injectable, Logger } from '@nestjs/common';
import { hash } from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotFoundError,
  BadRequestError,
  UnAuthorizedError,
  InternalServerError,
} from '../common/exceptions';
import {
  AdminType,
  AdminRole,
  AdminPermission,
  Language,
} from '../graphql/enums';
import { RegisterAdminInput, UpdateAdminInput } from './dto';
import { adminMessages, AdminMessages } from './admins.i18n';
import {
  calculatePrismaParams,
  createPaginatedResponse,
} from '../utils/pagination';

const ADMIN_SELECT = {
  id: true,
  email: true,
  name: true,
  lastName: true,
  adminType: true,
  role: true,
  permissions: true,
  sellerId: true,
  isActive: true,
  isEmailVerified: true,
  accountLocked: true,
  loginAttempts: true,
  lastLoginAt: true,
  lastLoginIp: true,
  createdAt: true,
  updatedAt: true,
  cityId: true,
  countryId: true,
  countyId: true,
  regionId: true,
} as const;

@Injectable()
export class AdminsService {
  private readonly logger = new Logger(AdminsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Queries ──────────────────────────────────────────────────────────────────

  async getAdmins({
    adminId,
    language,
    adminType,
    role,
    isActive,
    page = 1,
    pageSize = 10,
    searchQuery,
  }: {
    adminId: string;
    language: Language;
    adminType?: AdminType;
    role?: AdminRole;
    isActive?: boolean;
    page?: number;
    pageSize?: number;
    searchQuery?: string;
  }) {
    const t = adminMessages[language];
    try {
      if (!adminId) {
        throw new UnAuthorizedError(t.unauthorized);
      }

      const where: Record<string, any> = {};
      if (adminType) where.adminType = adminType;
      if (role) where.role = role;
      if (isActive !== undefined) where.isActive = isActive;
      if (searchQuery) {
        where.OR = [{ email: { contains: searchQuery, mode: 'insensitive' } }];
      }

      const { skip, take } = calculatePrismaParams(page, pageSize);

      const [count, admins] = await Promise.all([
        this.prisma.admin.count({ where }),
        this.prisma.admin.findMany({
          where,
          select: ADMIN_SELECT,
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        }),
      ]);

      return createPaginatedResponse(admins, count, page, pageSize);
    } catch (error) {
      this.logger.error('Error fetching admins:', error);
      throw new InternalServerError(t.errorGetAdmins);
    }
  }

  async getAdmin({ id, language }: { id: string; language: Language }) {
    const t = adminMessages[language];
    try {
      const admin = await this.prisma.admin.findUnique({
        where: { id },
        select: ADMIN_SELECT,
      });

      if (!admin) {
        throw new NotFoundError(t.adminNotFound);
      }

      return admin;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      this.logger.error('Error fetching admin:', error);
      throw new InternalServerError(t.errorGetAdmin);
    }
  }

  async getMyData({
    adminId,
    language,
  }: {
    adminId: string;
    language: Language;
  }) {
    const t = adminMessages[language];
    try {
      const admin = await this.prisma.admin.findUnique({
        where: { id: adminId },
        select: {
          ...ADMIN_SELECT,
          region: { select: { id: true, region: true, countryId: true } },
          city: { select: { id: true, city: true, regionId: true } },
          county: { select: { id: true, county: true, cityId: true } },
          country: {
            select: {
              id: true,
              translation: { select: { id: true, name: true, language: true } },
            },
          },
        },
      });

      if (!admin) {
        throw new NotFoundError(t.adminNotFound);
      }

      return admin;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      this.logger.error('Error fetching admin data:', error);
      throw new InternalServerError(t.errorGetMyData);
    }
  }

  // ─── Mutations ────────────────────────────────────────────────────────────────

  /**
   * Ensures the calling admin is allowed to manage admins.
   * Only active PLATFORM admins who are SUPER_ADMIN or hold the MANAGE_ADMINS
   * permission may create, update or deactivate admins (of any type).
   */
  private async assertCanManageAdmins({
    callerId,
    t,
  }: {
    callerId: string;
    t: AdminMessages;
  }) {
    if (!callerId) {
      throw new UnAuthorizedError(t.unauthorized);
    }

    const caller = await this.prisma.admin.findUnique({
      where: { id: callerId },
      select: {
        adminType: true,
        role: true,
        permissions: true,
        isActive: true,
      },
    });

    const canManage =
      !!caller &&
      caller.isActive &&
      (caller.adminType as AdminType) === AdminType.PLATFORM &&
      ((caller.role as AdminRole) === AdminRole.SUPER_ADMIN ||
        (caller.permissions as AdminPermission[]).includes(
          AdminPermission.MANAGE_ADMINS,
        ));

    if (!canManage) {
      throw new UnAuthorizedError(t.forbiddenManageAdmins);
    }
  }

  async createAdmin({
    callerId,
    input,
    language,
  }: {
    callerId: string;
    input: RegisterAdminInput;
    language: Language;
  }) {
    const t = adminMessages[language];
    try {
      await this.assertCanManageAdmins({ callerId, t });

      const existing = await this.prisma.admin.findUnique({
        where: { email: input.email.toLowerCase() },
      });

      if (existing) {
        throw new BadRequestError(t.emailAlreadyExists);
      }

      if (input.adminType === AdminType.BUSINESS && !input.sellerId) {
        throw new BadRequestError(t.businessIdRequired);
      }

      const passwordHash = await hash(input.password, 10);

      const admin = await this.prisma.admin.create({
        data: {
          email: input.email.toLowerCase(),
          password: passwordHash,
          name: input.name,
          lastName: input.lastName,
          adminType: input.adminType,
          role: input.role,
          permissions: input.permissions,
          sellerId: input.sellerId || null,
        },
        select: ADMIN_SELECT,
      });

      return admin;
    } catch (error) {
      if (
        error instanceof BadRequestError ||
        error instanceof UnAuthorizedError
      )
        throw error;
      this.logger.error('Error creating admin:', error);
      throw new InternalServerError(t.errorCreateAdmin);
    }
  }

  async updateAdmin({
    callerId,
    id,
    input,
    language,
  }: {
    callerId: string;
    id: string;
    input: UpdateAdminInput;
    language: Language;
  }) {
    const t = adminMessages[language];
    try {
      await this.assertCanManageAdmins({ callerId, t });

      const existing = await this.prisma.admin.findUnique({ where: { id } });

      if (!existing) {
        throw new NotFoundError(t.adminNotFound);
      }

      if (
        (input.adminType ?? existing.adminType) === AdminType.BUSINESS &&
        !(input.sellerId ?? existing.sellerId)
      ) {
        throw new BadRequestError(t.businessIdRequired);
      }

      const admin = await this.prisma.admin.update({
        where: { id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.lastName !== undefined && { lastName: input.lastName }),
          ...(input.adminType !== undefined && { adminType: input.adminType }),
          ...(input.role !== undefined && { role: input.role }),
          ...(input.permissions !== undefined && {
            permissions: input.permissions,
          }),
          ...(input.sellerId !== undefined && {
            sellerId: input.sellerId || null,
          }),
        },
        select: ADMIN_SELECT,
      });

      return admin;
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof BadRequestError ||
        error instanceof UnAuthorizedError
      )
        throw error;
      this.logger.error('Error updating admin:', error);
      throw new InternalServerError(t.errorUpdateAdmin);
    }
  }

  /**
   * Soft delete: deactivates the admin (isActive = false) but keeps the record
   * so audit logs, foreign-key references and history stay intact. Re-enable
   * with toggleAdminStatus. The caller cannot deactivate their own account.
   */
  async deleteAdmin({
    callerId,
    id,
    language,
  }: {
    callerId: string;
    id: string;
    language: Language;
  }) {
    const t = adminMessages[language];
    try {
      await this.assertCanManageAdmins({ callerId, t });

      const existing = await this.prisma.admin.findUnique({
        where: { id },
        select: ADMIN_SELECT,
      });

      if (!existing) {
        throw new NotFoundError(t.adminNotFound);
      }

      if (id === callerId) {
        throw new BadRequestError(t.cannotDeactivateSelf);
      }

      const admin = await this.prisma.admin.update({
        where: { id },
        data: { isActive: false },
        select: ADMIN_SELECT,
      });

      return admin;
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof BadRequestError ||
        error instanceof UnAuthorizedError
      )
        throw error;
      this.logger.error('Error deleting admin:', error);
      throw new InternalServerError(t.errorDeleteAdmin);
    }
  }

  async toggleAdminStatus({
    callerId,
    id,
    isActive,
    language,
  }: {
    callerId: string;
    id: string;
    isActive: boolean;
    language: Language;
  }) {
    const t = adminMessages[language];
    try {
      await this.assertCanManageAdmins({ callerId, t });

      const existing = await this.prisma.admin.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!existing) {
        throw new NotFoundError(t.adminNotFound);
      }

      if (id === callerId && !isActive) {
        throw new BadRequestError(t.cannotDeactivateSelf);
      }

      const admin = await this.prisma.admin.update({
        where: { id },
        data: { isActive },
        select: ADMIN_SELECT,
      });

      return admin;
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof BadRequestError ||
        error instanceof UnAuthorizedError
      )
        throw error;
      this.logger.error('Error toggling admin status:', error);
      throw new InternalServerError(t.errorToggleAdminStatus);
    }
  }

  async assignPermissions({
    callerId,
    id,
    permissions,
    language,
  }: {
    callerId: string;
    id: string;
    permissions: AdminPermission[];
    language: Language;
  }) {
    const t = adminMessages[language];
    try {
      await this.assertCanManageAdmins({ callerId, t });

      const existing = await this.prisma.admin.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!existing) {
        throw new NotFoundError(t.adminNotFound);
      }

      const admin = await this.prisma.admin.update({
        where: { id },
        data: { permissions },
        select: ADMIN_SELECT,
      });

      return admin;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof UnAuthorizedError)
        throw error;
      this.logger.error('Error assigning permissions:', error);
      throw new InternalServerError(t.errorAssignPermissions);
    }
  }
}
