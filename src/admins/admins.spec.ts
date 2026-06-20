import { Test, TestingModule } from '@nestjs/testing';
import { AdminsService } from './admins.service';
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

  // Caller used for management mutations: an active platform super admin.
  const CALLER_ID = 'caller-1';
  const platformManager = {
    id: CALLER_ID,
    adminType: AdminType.PLATFORM,
    role: AdminRole.SUPER_ADMIN,
    permissions: [],
    isActive: true,
  };

  // Routes prisma.admin.findUnique calls: the guard looks up the caller by id,
  // while the mutations look up a target by id or an email for uniqueness.
  function mockLookups(opts: { target?: any; email?: any; caller?: any } = {}) {
    const { target = null, email = null, caller = platformManager } = opts;
    prisma.admin.findUnique.mockImplementation((args: any) => {
      if (args.where?.id === CALLER_ID) return Promise.resolve(caller);
      if (args.where?.email !== undefined) return Promise.resolve(email);
      if (args.where?.id !== undefined) return Promise.resolve(target);
      return Promise.resolve(null);
    });
  }

  // ─── getAdmins ────────────────────────────────────────────────────────────────

  describe('getAdmins', () => {
    it('should return paginated admins', async () => {
      prisma.admin.count.mockResolvedValue(1);
      prisma.admin.findMany.mockResolvedValue([mockAdmin]);

      const result = await service.getAdmins({
        adminId: CALLER_ID,
        language: Language.ES,
      });

      expect(result.nodes).toEqual([mockAdmin]);
      expect(result.pageInfo.totalCount).toBe(1);
      expect(result.pageInfo.currentPage).toBe(1);
    });

    it('should filter by adminType, role, and isActive', async () => {
      prisma.admin.count.mockResolvedValue(0);
      prisma.admin.findMany.mockResolvedValue([]);

      await service.getAdmins({
        adminId: CALLER_ID,
        language: Language.EN,
        adminType: AdminType.PLATFORM,
        role: AdminRole.SUPER_ADMIN,
        isActive: true,
        page: 2,
        pageSize: 5,
      });

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

      await expect(
        service.getAdmins({ adminId: CALLER_ID, language: Language.ES }),
      ).rejects.toThrow(InternalServerError);
    });
  });

  // ─── getAdmin ─────────────────────────────────────────────────────────────────

  describe('getAdmin', () => {
    it('should return admin by id', async () => {
      prisma.admin.findUnique.mockResolvedValue(mockAdmin);

      const result = await service.getAdmin({
        id: 'admin-123',
        language: Language.ES,
      });

      expect(result).toEqual(mockAdmin);
      expect(prisma.admin.findUnique).toHaveBeenCalledWith({
        where: { id: 'admin-123' },
        select: expect.any(Object),
      });
    });

    it('should throw NotFoundError when admin does not exist', async () => {
      prisma.admin.findUnique.mockResolvedValue(null);

      await expect(
        service.getAdmin({ id: 'unknown', language: Language.ES }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.admin.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(
        service.getAdmin({ id: 'admin-123', language: Language.ES }),
      ).rejects.toThrow(InternalServerError);
    });

    it('should use language-specific error message', async () => {
      prisma.admin.findUnique.mockResolvedValue(null);

      await expect(
        service.getAdmin({ id: 'unknown', language: Language.EN }),
      ).rejects.toThrow('Admin not found');
      await expect(
        service.getAdmin({ id: 'unknown', language: Language.ES }),
      ).rejects.toThrow('Administrador no encontrado');
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

      const result = await service.getMyData({
        adminId: 'admin-123',
        language: Language.ES,
      });

      expect(result).toEqual(mockAdminWithRelations);
    });

    it('should throw NotFoundError when admin does not exist', async () => {
      prisma.admin.findUnique.mockResolvedValue(null);

      await expect(
        service.getMyData({ adminId: 'unknown', language: Language.ES }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.admin.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(
        service.getMyData({ adminId: 'admin-123', language: Language.ES }),
      ).rejects.toThrow(InternalServerError);
    });
  });

  // ─── createAdmin ──────────────────────────────────────────────────────────────

  describe('createAdmin', () => {
    beforeEach(() => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    });

    it('should create admin successfully', async () => {
      mockLookups({ email: null });
      prisma.admin.create.mockResolvedValue(mockAdmin);

      const result = await service.createAdmin({
        callerId: CALLER_ID,
        input: mockRegisterInput,
        language: Language.ES,
      });

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

    it('should allow a platform admin holding MANAGE_ADMINS (not super admin)', async () => {
      mockLookups({
        email: null,
        caller: {
          id: CALLER_ID,
          adminType: AdminType.PLATFORM,
          role: AdminRole.MODERATOR,
          permissions: [AdminPermission.MANAGE_ADMINS],
          isActive: true,
        },
      });
      prisma.admin.create.mockResolvedValue(mockAdmin);

      const result = await service.createAdmin({
        callerId: CALLER_ID,
        input: mockRegisterInput,
        language: Language.ES,
      });

      expect(result).toEqual(mockAdmin);
    });

    it('should throw UnAuthorizedError when caller lacks MANAGE_ADMINS', async () => {
      mockLookups({
        email: null,
        caller: {
          id: CALLER_ID,
          adminType: AdminType.PLATFORM,
          role: AdminRole.MODERATOR,
          permissions: [],
          isActive: true,
        },
      });

      await expect(
        service.createAdmin({
          callerId: CALLER_ID,
          input: mockRegisterInput,
          language: Language.ES,
        }),
      ).rejects.toThrow(UnAuthorizedError);
      expect(prisma.admin.create).not.toHaveBeenCalled();
    });

    it('should throw UnAuthorizedError when caller is a business admin', async () => {
      mockLookups({
        email: null,
        caller: {
          id: CALLER_ID,
          adminType: AdminType.BUSINESS,
          role: AdminRole.SUPER_ADMIN,
          permissions: [AdminPermission.MANAGE_ADMINS],
          isActive: true,
        },
      });

      await expect(
        service.createAdmin({
          callerId: CALLER_ID,
          input: mockRegisterInput,
          language: Language.ES,
        }),
      ).rejects.toThrow(UnAuthorizedError);
      expect(prisma.admin.create).not.toHaveBeenCalled();
    });

    it('should throw UnAuthorizedError when callerId is empty', async () => {
      await expect(
        service.createAdmin({
          callerId: '',
          input: mockRegisterInput,
          language: Language.ES,
        }),
      ).rejects.toThrow(UnAuthorizedError);
      expect(prisma.admin.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError when email already exists', async () => {
      mockLookups({ email: mockAdmin });

      await expect(
        service.createAdmin({
          callerId: CALLER_ID,
          input: mockRegisterInput,
          language: Language.ES,
        }),
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError when BUSINESS admin has no sellerId', async () => {
      mockLookups({ email: null });

      await expect(
        service.createAdmin({
          callerId: CALLER_ID,
          input: { ...mockRegisterInput, adminType: AdminType.BUSINESS },
          language: Language.ES,
        }),
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw InternalServerError on database error', async () => {
      mockLookups({ email: null });
      prisma.admin.create.mockRejectedValue(new Error('Database error'));

      await expect(
        service.createAdmin({
          callerId: CALLER_ID,
          input: mockRegisterInput,
          language: Language.ES,
        }),
      ).rejects.toThrow(InternalServerError);
    });

    it('should use language-specific error message for email exists', async () => {
      mockLookups({ email: mockAdmin });

      await expect(
        service.createAdmin({
          callerId: CALLER_ID,
          input: mockRegisterInput,
          language: Language.EN,
        }),
      ).rejects.toThrow('An admin with this email already exists');
      await expect(
        service.createAdmin({
          callerId: CALLER_ID,
          input: mockRegisterInput,
          language: Language.ES,
        }),
      ).rejects.toThrow('Ya existe un administrador con ese email');
    });
  });

  // ─── updateAdmin ──────────────────────────────────────────────────────────────

  describe('updateAdmin', () => {
    it('should update admin successfully', async () => {
      const updated = { ...mockAdmin, name: 'Updated' };
      mockLookups({ target: mockAdmin });
      prisma.admin.update.mockResolvedValue(updated);

      const result = await service.updateAdmin({
        callerId: CALLER_ID,
        id: 'admin-123',
        input: mockUpdateInput,
        language: Language.ES,
      });

      expect(result).toEqual(updated);
      expect(prisma.admin.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'admin-123' } }),
      );
    });

    it('should throw UnAuthorizedError when caller lacks MANAGE_ADMINS', async () => {
      mockLookups({
        target: mockAdmin,
        caller: {
          id: CALLER_ID,
          adminType: AdminType.PLATFORM,
          role: AdminRole.MODERATOR,
          permissions: [],
          isActive: true,
        },
      });

      await expect(
        service.updateAdmin({
          callerId: CALLER_ID,
          id: 'admin-123',
          input: mockUpdateInput,
          language: Language.ES,
        }),
      ).rejects.toThrow(UnAuthorizedError);
      expect(prisma.admin.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when admin does not exist', async () => {
      mockLookups({ target: null });

      await expect(
        service.updateAdmin({
          callerId: CALLER_ID,
          id: 'unknown',
          input: mockUpdateInput,
          language: Language.ES,
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw BadRequestError when changing to BUSINESS type without sellerId', async () => {
      mockLookups({ target: { ...mockAdmin, sellerId: null } });

      await expect(
        service.updateAdmin({
          callerId: CALLER_ID,
          id: 'admin-123',
          input: { adminType: AdminType.BUSINESS },
          language: Language.ES,
        }),
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw InternalServerError on database error', async () => {
      mockLookups({ target: mockAdmin });
      prisma.admin.update.mockRejectedValue(new Error('Database error'));

      await expect(
        service.updateAdmin({
          callerId: CALLER_ID,
          id: 'admin-123',
          input: mockUpdateInput,
          language: Language.ES,
        }),
      ).rejects.toThrow(InternalServerError);
    });
  });

  // ─── deleteAdmin ──────────────────────────────────────────────────────────────

  describe('deleteAdmin', () => {
    it('should soft delete (deactivate) the admin and keep the record', async () => {
      const deactivated = { ...mockAdmin, isActive: false };
      mockLookups({ target: mockAdmin });
      prisma.admin.update.mockResolvedValue(deactivated);

      const result = await service.deleteAdmin({
        callerId: CALLER_ID,
        id: 'admin-123',
        language: Language.ES,
      });

      expect(result).toEqual(deactivated);
      expect(prisma.admin.update).toHaveBeenCalledWith({
        where: { id: 'admin-123' },
        data: { isActive: false },
        select: expect.any(Object),
      });
      expect(prisma.admin.delete).not.toHaveBeenCalled();
    });

    it('should throw UnAuthorizedError when caller lacks MANAGE_ADMINS', async () => {
      mockLookups({
        target: mockAdmin,
        caller: {
          id: CALLER_ID,
          adminType: AdminType.PLATFORM,
          role: AdminRole.MODERATOR,
          permissions: [],
          isActive: true,
        },
      });

      await expect(
        service.deleteAdmin({
          callerId: CALLER_ID,
          id: 'admin-123',
          language: Language.ES,
        }),
      ).rejects.toThrow(UnAuthorizedError);
      expect(prisma.admin.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError when deactivating own account', async () => {
      mockLookups({ target: platformManager });

      await expect(
        service.deleteAdmin({
          callerId: CALLER_ID,
          id: CALLER_ID,
          language: Language.ES,
        }),
      ).rejects.toThrow(BadRequestError);
      expect(prisma.admin.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when admin does not exist', async () => {
      mockLookups({ target: null });

      await expect(
        service.deleteAdmin({
          callerId: CALLER_ID,
          id: 'unknown',
          language: Language.ES,
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw InternalServerError on database error', async () => {
      mockLookups({ target: mockAdmin });
      prisma.admin.update.mockRejectedValue(new Error('Database error'));

      await expect(
        service.deleteAdmin({
          callerId: CALLER_ID,
          id: 'admin-123',
          language: Language.ES,
        }),
      ).rejects.toThrow(InternalServerError);
    });
  });

  // ─── toggleAdminStatus ────────────────────────────────────────────────────────

  describe('toggleAdminStatus', () => {
    it('should deactivate admin', async () => {
      const deactivated = { ...mockAdmin, isActive: false };
      mockLookups({ target: { id: 'admin-123' } });
      prisma.admin.update.mockResolvedValue(deactivated);

      const result = await service.toggleAdminStatus({
        callerId: CALLER_ID,
        id: 'admin-123',
        isActive: false,
        language: Language.ES,
      });

      expect(result).toEqual(deactivated);
      expect(prisma.admin.update).toHaveBeenCalledWith({
        where: { id: 'admin-123' },
        data: { isActive: false },
        select: expect.any(Object),
      });
    });

    it('should activate admin', async () => {
      const activated = { ...mockAdmin, isActive: true };
      mockLookups({ target: { id: 'admin-123' } });
      prisma.admin.update.mockResolvedValue(activated);

      const result = await service.toggleAdminStatus({
        callerId: CALLER_ID,
        id: 'admin-123',
        isActive: true,
        language: Language.EN,
      });

      expect(result).toEqual(activated);
    });

    it('should throw BadRequestError when deactivating own account', async () => {
      mockLookups({ target: platformManager });

      await expect(
        service.toggleAdminStatus({
          callerId: CALLER_ID,
          id: CALLER_ID,
          isActive: false,
          language: Language.ES,
        }),
      ).rejects.toThrow(BadRequestError);
      expect(prisma.admin.update).not.toHaveBeenCalled();
    });

    it('should throw UnAuthorizedError when caller lacks MANAGE_ADMINS', async () => {
      mockLookups({
        target: { id: 'admin-123' },
        caller: {
          id: CALLER_ID,
          adminType: AdminType.PLATFORM,
          role: AdminRole.MODERATOR,
          permissions: [],
          isActive: true,
        },
      });

      await expect(
        service.toggleAdminStatus({
          callerId: CALLER_ID,
          id: 'admin-123',
          isActive: false,
          language: Language.ES,
        }),
      ).rejects.toThrow(UnAuthorizedError);
      expect(prisma.admin.update).not.toHaveBeenCalled();
    });

    it('should throw InternalServerError on database error', async () => {
      mockLookups({ target: { id: 'admin-123' } });
      prisma.admin.update.mockRejectedValue(new Error('Database error'));

      await expect(
        service.toggleAdminStatus({
          callerId: CALLER_ID,
          id: 'admin-123',
          isActive: false,
          language: Language.ES,
        }),
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
      mockLookups({ target: { id: 'admin-123' } });
      prisma.admin.update.mockResolvedValue(withPerms);

      const result = await service.assignPermissions({
        callerId: CALLER_ID,
        id: 'admin-123',
        permissions: [AdminPermission.APPROVE_PRODUCTS],
        language: Language.ES,
      });

      expect(result).toEqual(withPerms);
      expect(prisma.admin.update).toHaveBeenCalledWith({
        where: { id: 'admin-123' },
        data: { permissions: [AdminPermission.APPROVE_PRODUCTS] },
        select: expect.any(Object),
      });
    });

    it('should throw UnAuthorizedError when caller lacks MANAGE_ADMINS', async () => {
      mockLookups({
        target: { id: 'admin-123' },
        caller: {
          id: CALLER_ID,
          adminType: AdminType.PLATFORM,
          role: AdminRole.MODERATOR,
          permissions: [],
          isActive: true,
        },
      });

      await expect(
        service.assignPermissions({
          callerId: CALLER_ID,
          id: 'admin-123',
          permissions: [AdminPermission.APPROVE_PRODUCTS],
          language: Language.ES,
        }),
      ).rejects.toThrow(UnAuthorizedError);
      expect(prisma.admin.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when admin does not exist', async () => {
      mockLookups({ target: null });

      await expect(
        service.assignPermissions({
          callerId: CALLER_ID,
          id: 'unknown',
          permissions: [AdminPermission.APPROVE_PRODUCTS],
          language: Language.ES,
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw InternalServerError on database error', async () => {
      mockLookups({ target: { id: 'admin-123' } });
      prisma.admin.update.mockRejectedValue(new Error('Database error'));

      await expect(
        service.assignPermissions({
          callerId: CALLER_ID,
          id: 'admin-123',
          permissions: [AdminPermission.APPROVE_PRODUCTS],
          language: Language.ES,
        }),
      ).rejects.toThrow(InternalServerError);
    });
  });
});
