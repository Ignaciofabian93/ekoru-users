import { Test, TestingModule } from '@nestjs/testing';
import { AdminsService } from './admins.service';
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
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AdminsService', () => {
  let service: AdminsService;
  let prisma: any;

  const mockAdmin = {
    id: 'admin-123',
    email: 'admin@example.com',
    name: 'John',
    lastName: 'Doe',
    adminType: AdminType.PLATFORM,
    role: AdminRole.SUPER_ADMIN,
    permissions: [],
    sellerId: null,
    isActive: true,
    isEmailVerified: false,
    accountLocked: false,
    loginAttempts: 0,
    lastLoginAt: null,
    lastLoginIp: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    cityId: null,
    countryId: null,
    countyId: null,
    regionId: null,
  };

  const mockRegisterInput = {
    email: 'new@example.com',
    password: 'password123',
    name: 'Jane',
    lastName: 'Smith',
    adminType: AdminType.PLATFORM,
    role: AdminRole.SUPER_ADMIN,
    permissions: [],
  };

  const mockUpdateInput = {
    name: 'Updated',
  };

  beforeEach(async () => {
    const mockPrismaService = {
      admin: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AdminsService>(AdminsService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── getAdmins ────────────────────────────────────────────────────────────────

  describe('getAdmins', () => {
    it('should return paginated admins', async () => {
      prisma.admin.count.mockResolvedValue(1);
      prisma.admin.findMany.mockResolvedValue([mockAdmin]);

      const result = await service.getAdmins(Language.ES);

      expect(result.nodes).toEqual([mockAdmin]);
      expect(result.pageInfo.totalCount).toBe(1);
      expect(result.pageInfo.currentPage).toBe(1);
    });

    it('should filter by adminType, role, and isActive', async () => {
      prisma.admin.count.mockResolvedValue(0);
      prisma.admin.findMany.mockResolvedValue([]);

      await service.getAdmins(
        Language.EN,
        AdminType.PLATFORM,
        AdminRole.SUPER_ADMIN,
        true,
        2,
        5,
      );

      expect(prisma.admin.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            adminType: AdminType.PLATFORM,
            role: AdminRole.SUPER_ADMIN,
            isActive: true,
          },
          skip: 5,
          take: 5,
        }),
      );
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.admin.count.mockRejectedValue(new Error('Database error'));

      await expect(service.getAdmins(Language.ES)).rejects.toThrow(
        InternalServerError,
      );
    });
  });

  // ─── getAdmin ─────────────────────────────────────────────────────────────────

  describe('getAdmin', () => {
    it('should return admin by id', async () => {
      prisma.admin.findUnique.mockResolvedValue(mockAdmin);

      const result = await service.getAdmin('admin-123', Language.ES);

      expect(result).toEqual(mockAdmin);
      expect(prisma.admin.findUnique).toHaveBeenCalledWith({
        where: { id: 'admin-123' },
        select: expect.any(Object),
      });
    });

    it('should throw NotFoundError when admin does not exist', async () => {
      prisma.admin.findUnique.mockResolvedValue(null);

      await expect(service.getAdmin('unknown', Language.ES)).rejects.toThrow(
        NotFoundError,
      );
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.admin.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(service.getAdmin('admin-123', Language.ES)).rejects.toThrow(
        InternalServerError,
      );
    });

    it('should use language-specific error message', async () => {
      prisma.admin.findUnique.mockResolvedValue(null);

      await expect(service.getAdmin('unknown', Language.EN)).rejects.toThrow(
        'Admin not found',
      );
      await expect(service.getAdmin('unknown', Language.ES)).rejects.toThrow(
        'Administrador no encontrado',
      );
    });
  });

  // ─── getMyData ────────────────────────────────────────────────────────────────

  describe('getMyData', () => {
    const mockAdminWithRelations = {
      ...mockAdmin,
      region: null,
      city: null,
      county: null,
      country: null,
    };

    it('should return admin with relations', async () => {
      prisma.admin.findUnique.mockResolvedValue(mockAdminWithRelations);

      const result = await service.getMyData('admin-123', Language.ES);

      expect(result).toEqual(mockAdminWithRelations);
    });

    it('should throw NotFoundError when admin does not exist', async () => {
      prisma.admin.findUnique.mockResolvedValue(null);

      await expect(service.getMyData('unknown', Language.ES)).rejects.toThrow(
        NotFoundError,
      );
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.admin.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(service.getMyData('admin-123', Language.ES)).rejects.toThrow(
        InternalServerError,
      );
    });
  });

  // ─── createAdmin ──────────────────────────────────────────────────────────────

  describe('createAdmin', () => {
    beforeEach(() => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    });

    it('should create admin successfully', async () => {
      prisma.admin.findUnique.mockResolvedValue(null);
      prisma.admin.create.mockResolvedValue(mockAdmin);

      const result = await service.createAdmin(mockRegisterInput, Language.ES);

      expect(result).toEqual(mockAdmin);
      expect(prisma.admin.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'new@example.com',
            password: 'hashed-password',
          }),
        }),
      );
    });

    it('should throw BadRequestError when email already exists', async () => {
      prisma.admin.findUnique.mockResolvedValue(mockAdmin);

      await expect(
        service.createAdmin(mockRegisterInput, Language.ES),
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError when BUSINESS admin has no sellerId', async () => {
      prisma.admin.findUnique.mockResolvedValue(null);

      await expect(
        service.createAdmin(
          { ...mockRegisterInput, adminType: AdminType.BUSINESS },
          Language.ES,
        ),
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.admin.findUnique.mockResolvedValue(null);
      prisma.admin.create.mockRejectedValue(new Error('Database error'));

      await expect(
        service.createAdmin(mockRegisterInput, Language.ES),
      ).rejects.toThrow(InternalServerError);
    });

    it('should use language-specific error message for email exists', async () => {
      prisma.admin.findUnique.mockResolvedValue(mockAdmin);

      await expect(
        service.createAdmin(mockRegisterInput, Language.EN),
      ).rejects.toThrow('An admin with this email already exists');
      await expect(
        service.createAdmin(mockRegisterInput, Language.ES),
      ).rejects.toThrow('Ya existe un administrador con ese email');
    });
  });

  // ─── updateAdmin ──────────────────────────────────────────────────────────────

  describe('updateAdmin', () => {
    it('should update admin successfully', async () => {
      const updated = { ...mockAdmin, name: 'Updated' };
      prisma.admin.findUnique.mockResolvedValue(mockAdmin);
      prisma.admin.update.mockResolvedValue(updated);

      const result = await service.updateAdmin(
        'admin-123',
        mockUpdateInput,
        Language.ES,
      );

      expect(result).toEqual(updated);
      expect(prisma.admin.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'admin-123' } }),
      );
    });

    it('should throw NotFoundError when admin does not exist', async () => {
      prisma.admin.findUnique.mockResolvedValue(null);

      await expect(
        service.updateAdmin('unknown', mockUpdateInput, Language.ES),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw BadRequestError when changing to BUSINESS type without sellerId', async () => {
      prisma.admin.findUnique.mockResolvedValue({
        ...mockAdmin,
        sellerId: null,
      });

      await expect(
        service.updateAdmin(
          'admin-123',
          { adminType: AdminType.BUSINESS },
          Language.ES,
        ),
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.admin.findUnique.mockResolvedValue(mockAdmin);
      prisma.admin.update.mockRejectedValue(new Error('Database error'));

      await expect(
        service.updateAdmin('admin-123', mockUpdateInput, Language.ES),
      ).rejects.toThrow(InternalServerError);
    });
  });

  // ─── deleteAdmin ──────────────────────────────────────────────────────────────

  describe('deleteAdmin', () => {
    it('should delete admin and return it', async () => {
      prisma.admin.findUnique.mockResolvedValue(mockAdmin);
      prisma.admin.delete.mockResolvedValue(mockAdmin);

      const result = await service.deleteAdmin('admin-123', Language.ES);

      expect(result).toEqual(mockAdmin);
      expect(prisma.admin.delete).toHaveBeenCalledWith({
        where: { id: 'admin-123' },
      });
    });

    it('should throw NotFoundError when admin does not exist', async () => {
      prisma.admin.findUnique.mockResolvedValue(null);

      await expect(service.deleteAdmin('unknown', Language.ES)).rejects.toThrow(
        NotFoundError,
      );
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.admin.findUnique.mockResolvedValue(mockAdmin);
      prisma.admin.delete.mockRejectedValue(new Error('Database error'));

      await expect(
        service.deleteAdmin('admin-123', Language.ES),
      ).rejects.toThrow(InternalServerError);
    });
  });

  // ─── toggleAdminStatus ────────────────────────────────────────────────────────

  describe('toggleAdminStatus', () => {
    it('should deactivate admin', async () => {
      const deactivated = { ...mockAdmin, isActive: false };
      prisma.admin.update.mockResolvedValue(deactivated);

      const result = await service.toggleAdminStatus(
        'admin-123',
        false,
        Language.ES,
      );

      expect(result).toEqual(deactivated);
      expect(prisma.admin.update).toHaveBeenCalledWith({
        where: { id: 'admin-123' },
        data: { isActive: false },
        select: expect.any(Object),
      });
    });

    it('should activate admin', async () => {
      const activated = { ...mockAdmin, isActive: true };
      prisma.admin.update.mockResolvedValue(activated);

      const result = await service.toggleAdminStatus(
        'admin-123',
        true,
        Language.EN,
      );

      expect(result).toEqual(activated);
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.admin.update.mockRejectedValue(new Error('Database error'));

      await expect(
        service.toggleAdminStatus('admin-123', false, Language.ES),
      ).rejects.toThrow(InternalServerError);
    });
  });

  // ─── assignPermissions ────────────────────────────────────────────────────────

  describe('assignPermissions', () => {
    it('should assign permissions successfully', async () => {
      const withPerms = {
        ...mockAdmin,
        permissions: [AdminPermission.APPROVE_PRODUCTS],
      };
      prisma.admin.update.mockResolvedValue(withPerms);

      const result = await service.assignPermissions(
        'admin-123',
        [AdminPermission.APPROVE_PRODUCTS],
        Language.ES,
      );

      expect(result).toEqual(withPerms);
      expect(prisma.admin.update).toHaveBeenCalledWith({
        where: { id: 'admin-123' },
        data: { permissions: [AdminPermission.APPROVE_PRODUCTS] },
        select: expect.any(Object),
      });
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.admin.update.mockRejectedValue(new Error('Database error'));

      await expect(
        service.assignPermissions(
          'admin-123',
          [AdminPermission.APPROVE_PRODUCTS],
          Language.ES,
        ),
      ).rejects.toThrow(InternalServerError);
    });
  });
});
