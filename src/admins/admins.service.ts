import { Injectable, Logger } from '@nestjs/common';
import { hash } from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotFoundError,
  BadRequestError,
  InternalServerError,
} from '../common/exceptions';
import {
  AdminType,
  AdminRole,
  AdminPermission,
  Language,
} from '../graphql/enums';
import { RegisterAdminInput, UpdateAdminInput } from './dto';
import { adminMessages } from './admins.i18n';

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

function buildPageInfo(total: number, page: number, pageSize: number) {
  const totalPages = Math.ceil(total / pageSize) || 1;
  return {
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    startCursor: null,
    endCursor: null,
    totalCount: total,
    totalPages,
    currentPage: page,
    pageSize,
  };
}

@Injectable()
export class AdminsService {
  private readonly logger = new Logger(AdminsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Queries ──────────────────────────────────────────────────────────────────

  async getAdmins(
    language: Language,
    adminType?: AdminType,
    role?: AdminRole,
    isActive?: boolean,
    page: number = 1,
    pageSize: number = 10,
  ) {
    const t = adminMessages[language];
    try {
      const where = {
        ...(adminType && { adminType }),
        ...(role && { role }),
        ...(isActive !== undefined && { isActive }),
      };

      const skip = (page - 1) * pageSize;

      const [count, admins] = await Promise.all([
        this.prisma.admin.count({ where }),
        this.prisma.admin.findMany({
          where,
          select: ADMIN_SELECT,
          orderBy: { createdAt: 'desc' },
          skip,
          take: pageSize,
        }),
      ]);

      return {
        nodes: admins,
        pageInfo: buildPageInfo(count, page, pageSize),
      };
    } catch (error) {
      this.logger.error('Error fetching admins:', error);
      throw new InternalServerError(t.errorGetAdmins);
    }
  }

  async getAdmin(id: string, language: Language) {
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

  async getMyData(adminId: string, language: Language) {
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

  async createAdmin(input: RegisterAdminInput, language: Language) {
    const t = adminMessages[language];
    try {
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
      if (error instanceof BadRequestError) throw error;
      this.logger.error('Error creating admin:', error);
      throw new InternalServerError(t.errorCreateAdmin);
    }
  }

  async updateAdmin(id: string, input: UpdateAdminInput, language: Language) {
    const t = adminMessages[language];
    try {
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
      if (error instanceof NotFoundError || error instanceof BadRequestError)
        throw error;
      this.logger.error('Error updating admin:', error);
      throw new InternalServerError(t.errorUpdateAdmin);
    }
  }

  async deleteAdmin(id: string, language: Language) {
    const t = adminMessages[language];
    try {
      const existing = await this.prisma.admin.findUnique({
        where: { id },
        select: ADMIN_SELECT,
      });

      if (!existing) {
        throw new NotFoundError(t.adminNotFound);
      }

      await this.prisma.admin.delete({ where: { id } });

      return existing;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      this.logger.error('Error deleting admin:', error);
      throw new InternalServerError(t.errorDeleteAdmin);
    }
  }

  async toggleAdminStatus(id: string, isActive: boolean, language: Language) {
    const t = adminMessages[language];
    try {
      const admin = await this.prisma.admin.update({
        where: { id },
        data: { isActive },
        select: ADMIN_SELECT,
      });

      return admin;
    } catch (error) {
      this.logger.error('Error toggling admin status:', error);
      throw new InternalServerError(t.errorToggleAdminStatus);
    }
  }

  async assignPermissions(
    id: string,
    permissions: AdminPermission[],
    language: Language,
  ) {
    const t = adminMessages[language];
    try {
      const admin = await this.prisma.admin.update({
        where: { id },
        data: { permissions },
        select: ADMIN_SELECT,
      });

      return admin;
    } catch (error) {
      this.logger.error('Error assigning permissions:', error);
      throw new InternalServerError(t.errorAssignPermissions);
    }
  }
}
