import { Injectable, Logger } from '@nestjs/common';
import { hash } from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotFoundError,
  BadRequestError,
  InternalServerError,
} from '../common/exceptions';
import { AdminType, AdminRole, AdminPermission } from '../graphql/enums';
import { RegisterAdminInput, UpdateAdminInput } from './dto';

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
    adminType?: AdminType,
    role?: AdminRole,
    isActive?: boolean,
    page: number = 1,
    pageSize: number = 10,
  ) {
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
      this.logger.error('Error al obtener administradores:', error);
      throw new InternalServerError('Error al obtener administradores');
    }
  }

  async getAdmin(id: string) {
    try {
      const admin = await this.prisma.admin.findUnique({
        where: { id },
        select: ADMIN_SELECT,
      });

      if (!admin) {
        throw new NotFoundError('Administrador no encontrado');
      }

      return admin;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      this.logger.error('Error al obtener administrador:', error);
      throw new InternalServerError('Error al obtener administrador');
    }
  }

  async getMyData(adminId: string) {
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
        throw new NotFoundError('Administrador no encontrado');
      }

      return admin;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      this.logger.error('Error al obtener datos del administrador:', error);
      throw new InternalServerError('Error al obtener datos del administrador');
    }
  }

  // ─── Mutations ────────────────────────────────────────────────────────────────

  async createAdmin(input: RegisterAdminInput) {
    try {
      const existing = await this.prisma.admin.findUnique({
        where: { email: input.email.toLowerCase() },
      });

      if (existing) {
        throw new BadRequestError('Ya existe un administrador con ese email');
      }

      if (input.adminType === AdminType.BUSINESS && !input.sellerId) {
        throw new BadRequestError(
          'El ID de negocio es requerido para administradores de negocio',
        );
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
      this.logger.error('Error al crear administrador:', error);
      throw new InternalServerError('Error al crear administrador');
    }
  }

  async updateAdmin(id: string, input: UpdateAdminInput) {
    try {
      const existing = await this.prisma.admin.findUnique({ where: { id } });

      if (!existing) {
        throw new NotFoundError('Administrador no encontrado');
      }

      if (
        (input.adminType ?? existing.adminType) === AdminType.BUSINESS &&
        !(input.sellerId ?? existing.sellerId)
      ) {
        throw new BadRequestError(
          'El ID de negocio es requerido para administradores de negocio',
        );
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
      this.logger.error('Error al actualizar administrador:', error);
      throw new InternalServerError('Error al actualizar administrador');
    }
  }

  async deleteAdmin(id: string) {
    try {
      const existing = await this.prisma.admin.findUnique({
        where: { id },
        select: ADMIN_SELECT,
      });

      if (!existing) {
        throw new NotFoundError('Administrador no encontrado');
      }

      await this.prisma.admin.delete({ where: { id } });

      return existing;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      this.logger.error('Error al eliminar administrador:', error);
      throw new InternalServerError('Error al eliminar administrador');
    }
  }

  async toggleAdminStatus(id: string, isActive: boolean) {
    try {
      const admin = await this.prisma.admin.update({
        where: { id },
        data: { isActive },
        select: ADMIN_SELECT,
      });

      return admin;
    } catch (error) {
      this.logger.error('Error al cambiar estado del administrador:', error);
      throw new InternalServerError(
        'Error al cambiar estado del administrador',
      );
    }
  }

  async assignPermissions(id: string, permissions: AdminPermission[]) {
    try {
      const admin = await this.prisma.admin.update({
        where: { id },
        data: { permissions },
        select: ADMIN_SELECT,
      });

      return admin;
    } catch (error) {
      this.logger.error('Error al asignar permisos:', error);
      throw new InternalServerError('Error al asignar permisos');
    }
  }
}
