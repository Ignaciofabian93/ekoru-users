import { Test, TestingModule } from '@nestjs/testing';
import { Language } from '../graphql/enums';
import { SellersService } from './sellers.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { BusinessType, SellerType } from '../graphql/enums';
import { sellerMessages } from './sellers.i18n';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('SellersService', () => {
  let service: SellersService;
  let prisma: any;
  let mailService: any;

  const mockSeller = {
    id: 'seller-123',
    email: 'test@example.com',
    password: 'hashed-password',
    sellerType: SellerType.PERSON,
    isActive: true,
    isVerified: false,
    points: 0,
    sellerLevelId: 1,
    country: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPersonProfile = {
    id: 1,
    sellerId: 'seller-123',
    firstName: 'John',
    lastName: 'Doe',
    birthday: new Date('1990-01-01'),
  };

  const mockBusinessProfile = {
    id: 1,
    sellerId: 'seller-123',
    businessName: 'Acme Corp',
    businessType: 'RETAIL',
    updatedAt: new Date(),
  };

  const mockSellerLevel = {
    id: 1,
    levelName: 'Bronze',
    description: 'Entry level',
  };

  beforeEach(async () => {
    const mockPrismaService = {
      seller: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        update: jest.fn(),
      },
      personProfile: {
        create: jest.fn(),
        update: jest.fn(),
      },
      businessProfile: {
        create: jest.fn(),
        update: jest.fn(),
      },
      sellerLevel: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      sellerPreferences: {
        upsert: jest.fn(),
      },
      pointsByTransactionKind: {
        findFirst: jest.fn().mockResolvedValue({ pointsAwarded: 10 }),
      },
      $transaction: jest.fn(),
    };

    const mockMailService = {
      sendWelcomeEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SellersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
      ],
    }).compile();

    service = module.get<SellersService>(SellersService);
    prisma = module.get(PrismaService);
    mailService = module.get(MailService);

    (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSellers', () => {
    it('should return a paginated list of sellers successfully', async () => {
      const sellers = [mockSeller];
      prisma.seller.findMany.mockResolvedValue(sellers);
      prisma.seller.count.mockResolvedValue(1);

      const result = await service.getSellers({
        adminId: 'seller-123',
        language: Language.ES,
      });

      expect(result.nodes).toEqual(sellers);
      expect(result.pageInfo.totalCount).toBe(1);
      expect(result.pageInfo.currentPage).toBe(1);
      expect(result.pageInfo.pageSize).toBe(10);
      expect(prisma.seller.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 0,
      });
    });

    it('should filter sellers by sellerType', async () => {
      const sellers = [mockSeller];
      prisma.seller.findMany.mockResolvedValue(sellers);

      await service.getSellers({
        adminId: 'seller-123',
        language: Language.ES,
        sellerType: SellerType.PERSON,
      });

      expect(prisma.seller.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sellerType: SellerType.PERSON },
        }),
      );
    });

    it('should filter sellers by isActive', async () => {
      const sellers = [mockSeller];
      prisma.seller.findMany.mockResolvedValue(sellers);

      await service.getSellers({
        adminId: 'seller-123',
        language: Language.ES,
        isActive: true,
      });

      expect(prisma.seller.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        }),
      );
    });

    it('should filter sellers by isVerified', async () => {
      const sellers = [mockSeller];
      prisma.seller.findMany.mockResolvedValue(sellers);

      await service.getSellers({
        adminId: 'seller-123',
        language: Language.ES,
        isVerified: true,
      });

      expect(prisma.seller.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isVerified: true },
        }),
      );
    });

    it('should apply page and pageSize', async () => {
      const sellers = [mockSeller];
      prisma.seller.findMany.mockResolvedValue(sellers);

      await service.getSellers({
        adminId: 'seller-123',
        language: Language.ES,
        page: 2,
        pageSize: 5,
      });

      expect(prisma.seller.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
          skip: 5,
        }),
      );
    });

    it('should throw UnAuthorizedError with ES message when sellerId is not provided', async () => {
      await expect(
        service.getSellers({ adminId: '', language: Language.ES }),
      ).rejects.toThrow(sellerMessages[Language.ES].unauthorized);
      expect(prisma.seller.findMany).not.toHaveBeenCalled();
    });

    it('should throw UnAuthorizedError with EN message when sellerId is not provided', async () => {
      await expect(
        service.getSellers({ adminId: '', language: Language.EN }),
      ).rejects.toThrow(sellerMessages[Language.EN].unauthorized);
    });

    it('should throw InternalServerError with ES message on database error', async () => {
      prisma.seller.findMany.mockRejectedValue(new Error('Database error'));
      await expect(
        service.getSellers({ adminId: 'seller-123', language: Language.ES }),
      ).rejects.toThrow(sellerMessages[Language.ES].errorGetSellers);
    });

    it('should throw InternalServerError with EN message on database error', async () => {
      prisma.seller.findMany.mockRejectedValue(new Error('Database error'));
      await expect(
        service.getSellers({ adminId: 'seller-123', language: Language.EN }),
      ).rejects.toThrow(sellerMessages[Language.EN].errorGetSellers);
    });
  });

  describe('getSellerById', () => {
    it('should return seller by id successfully', async () => {
      prisma.seller.findUnique.mockResolvedValue(mockSeller);

      const result = await service.getSellerById({
        id: 'seller-123',
        sellerId: 'seller-456',
        language: Language.ES,
        adminId: 'admin-1',
      });

      expect(result).toEqual(mockSeller);
      expect(prisma.seller.findUnique).toHaveBeenCalledWith({
        where: { id: 'seller-123' },
        include: expect.any(Object),
      });
    });

    it('should throw UnAuthorizedError with ES message when sellerId is not provided', async () => {
      await expect(
        service.getSellerById({
          id: 'seller-123',
          sellerId: '',
          language: Language.ES,
          adminId: '',
        }),
      ).rejects.toThrow(sellerMessages[Language.ES].unauthorized);
      expect(prisma.seller.findUnique).not.toHaveBeenCalled();
    });

    it('should throw UnAuthorizedError with EN message when sellerId is not provided', async () => {
      await expect(
        service.getSellerById({
          id: 'seller-123',
          sellerId: '',
          language: Language.EN,
          adminId: '',
        }),
      ).rejects.toThrow(sellerMessages[Language.EN].unauthorized);
    });

    it('should throw InternalServerError with ES message on database error', async () => {
      prisma.seller.findUnique.mockRejectedValue(new Error('Database error'));
      await expect(
        service.getSellerById({
          id: 'seller-123',
          sellerId: 'seller-456',
          language: Language.ES,
          adminId: '',
        }),
      ).rejects.toThrow(sellerMessages[Language.ES].errorGetSellerById);
    });

    it('should throw InternalServerError with EN message on database error', async () => {
      prisma.seller.findUnique.mockRejectedValue(new Error('Database error'));
      await expect(
        service.getSellerById({
          id: 'seller-123',
          sellerId: 'seller-456',
          language: Language.EN,
          adminId: '',
        }),
      ).rejects.toThrow(sellerMessages[Language.EN].errorGetSellerById);
    });
  });

  describe('getSellerByIdForReference', () => {
    it('should return seller for reference', async () => {
      prisma.seller.findUnique.mockResolvedValue(mockSeller);

      const result = await service.getSellerByIdForReference('seller-123');

      expect(result).toEqual(mockSeller);
    });

    it('should return null on error', async () => {
      prisma.seller.findUnique.mockRejectedValue(new Error('Database error'));

      const result = await service.getSellerByIdForReference('seller-123');

      expect(result).toBeNull();
    });
  });

  describe('getMe', () => {
    it('should return mapped person profile with translated country name', async () => {
      const countryDate = new Date('2024-01-01');
      const sellerWithProfile = {
        ...mockSeller,
        personProfile: mockPersonProfile,
        country: {
          id: 1,
          createdAt: countryDate,
          updatedAt: countryDate,
          translation: [{ name: 'Chile' }],
        },
        region: null,
        city: null,
        county: null,
        sellerLevel: null,
        sellerPreferences: null,
      };
      prisma.seller.findUnique
        .mockResolvedValueOnce({ sellerType: SellerType.PERSON })
        .mockResolvedValueOnce(sellerWithProfile);

      const result = await service.getMe({
        sellerId: 'seller-123',
        language: Language.ES,
        adminId: 'admin-1',
      });

      expect(result).toMatchObject({
        country: {
          id: 1,
          country: 'Chile',
          createdAt: countryDate,
          updatedAt: countryDate,
        },
      });
      expect(prisma.seller.findUnique).toHaveBeenCalledTimes(2);
    });

    it('should pass language filter to country translation query', async () => {
      const sellerWithProfile = {
        ...mockSeller,
        personProfile: mockPersonProfile,
        country: null,
        region: null,
        city: null,
        county: null,
        sellerLevel: null,
        sellerPreferences: null,
      };
      prisma.seller.findUnique
        .mockResolvedValueOnce({ sellerType: SellerType.PERSON })
        .mockResolvedValueOnce(sellerWithProfile);

      await service.getMe({
        sellerId: 'seller-123',
        language: Language.EN,
        adminId: 'admin-1',
      });

      expect(prisma.seller.findUnique).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          include: expect.objectContaining({
            country: expect.objectContaining({
              select: expect.objectContaining({
                translation: {
                  where: { language: Language.EN },
                  select: { name: true },
                },
              }),
            }),
          }),
        }),
      );
    });

    it('should return business profile for STARTUP seller type', async () => {
      const sellerWithProfile = {
        ...mockSeller,
        sellerType: SellerType.STARTUP,
        businessProfile: mockBusinessProfile,
      };
      prisma.seller.findUnique
        .mockResolvedValueOnce({ sellerType: SellerType.STARTUP })
        .mockResolvedValueOnce(sellerWithProfile);

      const result = await service.getMe({
        sellerId: 'seller-123',
        language: Language.ES,
        adminId: 'admin-1',
      });

      expect(result).toEqual(sellerWithProfile);
    });

    it('should return business profile for COMPANY seller type', async () => {
      const sellerWithProfile = {
        ...mockSeller,
        sellerType: SellerType.COMPANY,
        businessProfile: mockBusinessProfile,
      };
      prisma.seller.findUnique
        .mockResolvedValueOnce({ sellerType: SellerType.COMPANY })
        .mockResolvedValueOnce(sellerWithProfile);

      const result = await service.getMe({
        sellerId: 'seller-123',
        language: Language.ES,
        adminId: 'admin-1',
      });

      expect(result).toEqual(sellerWithProfile);
    });

    it('should return null for unknown seller type', async () => {
      prisma.seller.findUnique.mockResolvedValue({ sellerType: null });

      const result = await service.getMe({
        sellerId: 'seller-123',
        language: Language.ES,
        adminId: 'admin-1',
      });

      expect(result).toBeNull();
    });

    it('should throw UnAuthorizedError with ES message when sellerId is not provided', async () => {
      await expect(
        service.getMe({
          sellerId: '',
          language: Language.ES,
          adminId: '',
        }),
      ).rejects.toThrow(sellerMessages[Language.ES].unauthorized);
    });

    it('should throw UnAuthorizedError with EN message when sellerId is not provided', async () => {
      await expect(
        service.getMe({
          sellerId: '',
          language: Language.EN,
          adminId: '',
        }),
      ).rejects.toThrow(sellerMessages[Language.EN].unauthorized);
    });

    it('should throw InternalServerError with ES message on database error', async () => {
      prisma.seller.findUnique.mockRejectedValue(new Error('Database error'));
      await expect(
        service.getMe({
          sellerId: 'seller-123',
          language: Language.ES,
          adminId: '',
        }),
      ).rejects.toThrow(sellerMessages[Language.ES].errorGetMe);
    });

    it('should throw InternalServerError with EN message on database error', async () => {
      prisma.seller.findUnique.mockRejectedValue(new Error('Database error'));
      await expect(
        service.getMe({
          sellerId: 'seller-123',
          language: Language.EN,
          adminId: '',
        }),
      ).rejects.toThrow(sellerMessages[Language.EN].errorGetMe);
    });
  });

  describe('getSellerLevels', () => {
    it('should return all seller levels', async () => {
      const levels = [mockSellerLevel];
      prisma.sellerLevel.findMany.mockResolvedValue(levels);

      const result = await service.getSellerLevels(Language.ES);

      expect(result).toEqual(levels);
      expect(prisma.sellerLevel.findMany).toHaveBeenCalledWith({
        orderBy: { levelName: 'asc' },
      });
    });

    it('should throw InternalServerError with ES message on database error', async () => {
      prisma.sellerLevel.findMany.mockRejectedValue(
        new Error('Database error'),
      );
      await expect(service.getSellerLevels(Language.ES)).rejects.toThrow(
        sellerMessages[Language.ES].errorGetSellerLevels,
      );
    });

    it('should throw InternalServerError with EN message on database error', async () => {
      prisma.sellerLevel.findMany.mockRejectedValue(
        new Error('Database error'),
      );
      await expect(service.getSellerLevels(Language.EN)).rejects.toThrow(
        sellerMessages[Language.EN].errorGetSellerLevels,
      );
    });
  });

  describe('getSellerLevel', () => {
    it('should return seller level by id', async () => {
      prisma.sellerLevel.findUnique.mockResolvedValue(mockSellerLevel);

      const result = await service.getSellerLevel({
        id: '1',
        language: Language.ES,
      });

      expect(result).toEqual(mockSellerLevel);
      expect(prisma.sellerLevel.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw InternalServerError with ES message on database error', async () => {
      prisma.sellerLevel.findUnique.mockRejectedValue(
        new Error('Database error'),
      );
      await expect(
        service.getSellerLevel({ id: '1', language: Language.ES }),
      ).rejects.toThrow(sellerMessages[Language.ES].errorGetSellerLevel);
    });

    it('should throw InternalServerError with EN message on database error', async () => {
      prisma.sellerLevel.findUnique.mockRejectedValue(
        new Error('Database error'),
      );
      await expect(
        service.getSellerLevel({ id: '1', language: Language.EN }),
      ).rejects.toThrow(sellerMessages[Language.EN].errorGetSellerLevel);
    });
  });

  describe('registerPerson', () => {
    const input = {
      email: 'TEST@EXAMPLE.COM',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should register person successfully and send welcome email with language', async () => {
      prisma.seller.findUnique.mockResolvedValue(null);
      prisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          seller: {
            create: jest.fn().mockResolvedValue(mockSeller),
          },
          personProfile: {
            create: jest.fn().mockResolvedValue(mockPersonProfile),
          },
        });
      });

      const result = await service.registerPerson({
        input,
        language: Language.ES,
      });

      expect(result).toEqual(mockSeller);
      expect(prisma.seller.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(bcrypt.genSalt).toHaveBeenCalledWith(12);
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 'salt');
      expect(mailService.sendWelcomeEmail).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'John',
        businessName: '',
        locale: Language.ES.toLowerCase(),
      });
    });

    it('should pass the correct language to sendWelcomeEmail', async () => {
      prisma.seller.findUnique.mockResolvedValue(null);
      prisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          seller: { create: jest.fn().mockResolvedValue(mockSeller) },
          personProfile: {
            create: jest.fn().mockResolvedValue(mockPersonProfile),
          },
        });
      });

      await service.registerPerson({ input, language: Language.EN });

      expect(mailService.sendWelcomeEmail).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'John',
        businessName: '',
        locale: Language.EN.toLowerCase(),
      });
    });

    it('should throw BadRequestError with ES message when email already exists', async () => {
      prisma.seller.findUnique.mockResolvedValue(mockSeller);
      await expect(
        service.registerPerson({ input, language: Language.ES }),
      ).rejects.toThrow(sellerMessages[Language.ES].emailAlreadyExists);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError with EN message when email already exists', async () => {
      prisma.seller.findUnique.mockResolvedValue(mockSeller);
      await expect(
        service.registerPerson({ input, language: Language.EN }),
      ).rejects.toThrow(sellerMessages[Language.EN].emailAlreadyExists);
    });

    it('should throw InternalServerError with ES message on database error', async () => {
      prisma.seller.findUnique.mockRejectedValue(new Error('Database error'));
      await expect(
        service.registerPerson({ input, language: Language.ES }),
      ).rejects.toThrow(sellerMessages[Language.ES].errorRegisterPerson);
    });

    it('should throw InternalServerError with EN message on database error', async () => {
      prisma.seller.findUnique.mockRejectedValue(new Error('Database error'));
      await expect(
        service.registerPerson({ input, language: Language.EN }),
      ).rejects.toThrow(sellerMessages[Language.EN].errorRegisterPerson);
    });
  });

  describe('registerBusiness', () => {
    const input = {
      email: 'BUSINESS@EXAMPLE.COM',
      password: 'password123',
      businessName: 'Acme Corp',
      businessType: BusinessType.RETAIL,
      sellerType: SellerType.STARTUP,
    };

    it('should register business successfully and send welcome email with language', async () => {
      const businessSeller = {
        ...mockSeller,
        sellerType: SellerType.STARTUP,
      };
      prisma.seller.findUnique.mockResolvedValue(null);
      prisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          seller: {
            create: jest.fn().mockResolvedValue(businessSeller),
          },
          businessProfile: {
            create: jest.fn().mockResolvedValue(mockBusinessProfile),
          },
        });
      });

      const result = await service.registerBusiness({
        input,
        language: Language.ES,
      });

      expect(result).toEqual(businessSeller);
      expect(prisma.seller.findUnique).toHaveBeenCalledWith({
        where: { email: 'business@example.com' },
      });
      expect(mailService.sendWelcomeEmail).toHaveBeenCalledWith({
        email: 'business@example.com',
        name: '',
        businessName: 'Acme Corp',
        locale: Language.ES.toLowerCase(),
      });
    });

    it('should pass the correct language to sendWelcomeEmail', async () => {
      const businessSeller = { ...mockSeller, sellerType: SellerType.STARTUP };
      prisma.seller.findUnique.mockResolvedValue(null);
      prisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          seller: { create: jest.fn().mockResolvedValue(businessSeller) },
          businessProfile: {
            create: jest.fn().mockResolvedValue(mockBusinessProfile),
          },
        });
      });

      await service.registerBusiness({ input, language: Language.EN });

      expect(mailService.sendWelcomeEmail).toHaveBeenCalledWith({
        email: 'business@example.com',
        name: '',
        businessName: 'Acme Corp',
        locale: Language.EN.toLowerCase(),
      });
    });

    it('should throw BadRequestError with ES message when email already exists', async () => {
      prisma.seller.findUnique.mockResolvedValue(mockSeller);
      await expect(
        service.registerBusiness({ input, language: Language.ES }),
      ).rejects.toThrow(sellerMessages[Language.ES].emailAlreadyExists);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError with EN message when email already exists', async () => {
      prisma.seller.findUnique.mockResolvedValue(mockSeller);
      await expect(
        service.registerBusiness({ input, language: Language.EN }),
      ).rejects.toThrow(sellerMessages[Language.EN].emailAlreadyExists);
    });

    it('should throw InternalServerError with ES message on database error', async () => {
      prisma.seller.findUnique.mockRejectedValue(new Error('Database error'));
      await expect(
        service.registerBusiness({ input, language: Language.ES }),
      ).rejects.toThrow(sellerMessages[Language.ES].errorRegisterBusiness);
    });

    it('should throw InternalServerError with EN message on database error', async () => {
      prisma.seller.findUnique.mockRejectedValue(new Error('Database error'));
      await expect(
        service.registerBusiness({ input, language: Language.EN }),
      ).rejects.toThrow(sellerMessages[Language.EN].errorRegisterBusiness);
    });
  });

  describe('updateSeller', () => {
    const input = {
      countryId: 1,
      regionId: 2,
      cityId: 3,
      countyId: 4,
    };

    it('should update seller successfully', async () => {
      const updatedSeller = { ...mockSeller, ...input };
      prisma.seller.update.mockResolvedValue(updatedSeller);

      const result = await service.updateSeller({
        sellerId: 'seller-123',
        adminId: 'admin-1',
        input,
        language: Language.ES,
      });

      expect(result).toEqual(updatedSeller);
      expect(prisma.seller.update).toHaveBeenCalledWith({
        where: { id: 'seller-123' },
        data: input,
        include: expect.any(Object),
      });
    });

    it('should throw UnAuthorizedError with ES message when sellerId is not provided', async () => {
      await expect(
        service.updateSeller({
          sellerId: '',
          adminId: '',
          input,
          language: Language.ES,
        }),
      ).rejects.toThrow(sellerMessages[Language.ES].unauthorized);
      expect(prisma.seller.update).not.toHaveBeenCalled();
    });

    it('should throw UnAuthorizedError with EN message when sellerId is not provided', async () => {
      await expect(
        service.updateSeller({
          sellerId: '',
          adminId: '',
          input,
          language: Language.EN,
        }),
      ).rejects.toThrow(sellerMessages[Language.EN].unauthorized);
    });

    it('should throw InternalServerError with ES message on database error', async () => {
      prisma.seller.update.mockRejectedValue(new Error('Database error'));
      await expect(
        service.updateSeller({
          sellerId: 'seller-123',
          adminId: '',
          input,
          language: Language.ES,
        }),
      ).rejects.toThrow(sellerMessages[Language.ES].errorUpdateSeller);
    });

    it('should throw InternalServerError with EN message on database error', async () => {
      prisma.seller.update.mockRejectedValue(new Error('Database error'));
      await expect(
        service.updateSeller({
          sellerId: 'seller-123',
          adminId: '',
          input,
          language: Language.EN,
        }),
      ).rejects.toThrow(sellerMessages[Language.EN].errorUpdateSeller);
    });
  });

  describe('updatePersonProfile', () => {
    it('should update person profile successfully', async () => {
      const input = { firstName: 'Jane', lastName: 'Smith' };
      const updatedProfile = { ...mockPersonProfile, ...input };
      prisma.personProfile.update.mockResolvedValue(updatedProfile);

      const result = await service.updatePersonProfile({
        sellerId: 'seller-123',
        adminId: 'admin-1',
        input,
        language: Language.ES,
      });

      expect(result).toEqual(updatedProfile);
      expect(prisma.personProfile.update).toHaveBeenCalledWith({
        where: { sellerId: 'seller-123' },
        data: input,
      });
    });

    it('should process birthday date correctly', async () => {
      const input = { birthday: new Date('1990-01-01') };
      prisma.personProfile.update.mockResolvedValue(mockPersonProfile);

      await service.updatePersonProfile({
        sellerId: 'seller-123',
        adminId: 'admin-1',
        input,
        language: Language.ES,
      });

      expect(prisma.personProfile.update).toHaveBeenCalledWith({
        where: { sellerId: 'seller-123' },
        data: expect.objectContaining({
          birthday: expect.any(Date),
        }),
      });
    });

    it('should throw UnAuthorizedError with ES message when sellerId is not provided', async () => {
      await expect(
        service.updatePersonProfile({
          sellerId: '',
          adminId: '',
          input: { firstName: 'Jane' },
          language: Language.ES,
        }),
      ).rejects.toThrow(sellerMessages[Language.ES].unauthorized);
      expect(prisma.personProfile.update).not.toHaveBeenCalled();
    });

    it('should throw UnAuthorizedError with EN message when sellerId is not provided', async () => {
      await expect(
        service.updatePersonProfile({
          sellerId: '',
          adminId: '',
          input: { firstName: 'Jane' },
          language: Language.EN,
        }),
      ).rejects.toThrow(sellerMessages[Language.EN].unauthorized);
    });

    it('should throw InternalServerError with ES message on database error', async () => {
      prisma.personProfile.update.mockRejectedValue(
        new Error('Database error'),
      );
      await expect(
        service.updatePersonProfile({
          sellerId: 'seller-123',
          adminId: '',
          input: { firstName: 'Jane' },
          language: Language.ES,
        }),
      ).rejects.toThrow(sellerMessages[Language.ES].errorUpdatePersonProfile);
    });

    it('should throw InternalServerError with EN message on database error', async () => {
      prisma.personProfile.update.mockRejectedValue(
        new Error('Database error'),
      );
      await expect(
        service.updatePersonProfile({
          sellerId: 'seller-123',
          adminId: '',
          input: { firstName: 'Jane' },
          language: Language.EN,
        }),
      ).rejects.toThrow(sellerMessages[Language.EN].errorUpdatePersonProfile);
    });
  });

  describe('updateBusinessProfile', () => {
    it('should update business profile successfully', async () => {
      const input = { businessName: 'New Corp' };
      const updatedProfile = { ...mockBusinessProfile, ...input };
      prisma.businessProfile.update.mockResolvedValue(updatedProfile);

      const result = await service.updateBusinessProfile({
        sellerId: 'seller-123',
        adminId: 'admin-1',
        input,
        language: Language.ES,
      });

      expect(result).toEqual(updatedProfile);
      expect(prisma.businessProfile.update).toHaveBeenCalledWith({
        where: { sellerId: 'seller-123' },
        data: input,
      });
    });

    it('should throw UnAuthorizedError with ES message when sellerId is not provided', async () => {
      await expect(
        service.updateBusinessProfile({
          sellerId: '',
          adminId: '',
          input: { businessName: 'New Corp' },
          language: Language.ES,
        }),
      ).rejects.toThrow(sellerMessages[Language.ES].unauthorized);
      expect(prisma.businessProfile.update).not.toHaveBeenCalled();
    });

    it('should throw UnAuthorizedError with EN message when sellerId is not provided', async () => {
      await expect(
        service.updateBusinessProfile({
          sellerId: '',
          adminId: '',
          input: { businessName: 'New Corp' },
          language: Language.EN,
        }),
      ).rejects.toThrow(sellerMessages[Language.EN].unauthorized);
    });

    it('should throw InternalServerError with ES message on database error', async () => {
      prisma.businessProfile.update.mockRejectedValue(
        new Error('Database error'),
      );
      await expect(
        service.updateBusinessProfile({
          sellerId: 'seller-123',
          adminId: '',
          input: { businessName: 'New' },
          language: Language.ES,
        }),
      ).rejects.toThrow(sellerMessages[Language.ES].errorUpdateBusinessProfile);
    });

    it('should throw InternalServerError with EN message on database error', async () => {
      prisma.businessProfile.update.mockRejectedValue(
        new Error('Database error'),
      );
      await expect(
        service.updateBusinessProfile({
          sellerId: 'seller-123',
          adminId: '',
          input: { businessName: 'New' },
          language: Language.EN,
        }),
      ).rejects.toThrow(sellerMessages[Language.EN].errorUpdateBusinessProfile);
    });
  });

  describe('updateSellerPreferences', () => {
    it('should upsert seller preferences successfully', async () => {
      const input = { language: 'en', currency: 'USD' };
      const preferences = { id: 1, sellerId: 'seller-123', ...input };
      prisma.sellerPreferences.upsert.mockResolvedValue(preferences);

      const result = await service.updateSellerPreferences({
        sellerId: 'seller-123',
        input,
        language: Language.ES,
        adminId: 'admin-1',
      });

      expect(result).toEqual(preferences);
      expect(prisma.sellerPreferences.upsert).toHaveBeenCalledWith({
        where: { sellerId: 'seller-123' },
        update: input,
        create: {
          sellerId: 'seller-123',
          ...input,
        },
      });
    });

    it('should throw UnAuthorizedError with ES message when sellerId is not provided', async () => {
      await expect(
        service.updateSellerPreferences({
          sellerId: '',
          input: {},
          language: Language.ES,
          adminId: '',
        }),
      ).rejects.toThrow(sellerMessages[Language.ES].unauthorized);
      expect(prisma.sellerPreferences.upsert).not.toHaveBeenCalled();
    });

    it('should throw UnAuthorizedError with EN message when sellerId is not provided', async () => {
      await expect(
        service.updateSellerPreferences({
          sellerId: '',
          input: {},
          language: Language.EN,
          adminId: '',
        }),
      ).rejects.toThrow(sellerMessages[Language.EN].unauthorized);
    });

    it('should throw InternalServerError with ES message on database error', async () => {
      prisma.sellerPreferences.upsert.mockRejectedValue(
        new Error('Database error'),
      );
      await expect(
        service.updateSellerPreferences({
          sellerId: 'seller-123',
          input: {},
          language: Language.ES,
          adminId: '',
        }),
      ).rejects.toThrow(sellerMessages[Language.ES].errorUpdatePreferences);
    });

    it('should throw InternalServerError with EN message on database error', async () => {
      prisma.sellerPreferences.upsert.mockRejectedValue(
        new Error('Database error'),
      );
      await expect(
        service.updateSellerPreferences({
          sellerId: 'seller-123',
          input: {},
          language: Language.EN,
          adminId: '',
        }),
      ).rejects.toThrow(sellerMessages[Language.EN].errorUpdatePreferences);
    });
  });

  describe('resolveProfile', () => {
    it('should resolve person profile', () => {
      const seller = {
        ...mockSeller,
        personProfile: mockPersonProfile,
      } as any;

      const result = service.resolveProfile(seller);

      expect(result).toEqual({
        ...mockPersonProfile,
        __typename: 'PersonProfile',
      });
    });

    it('should resolve business profile for STARTUP', () => {
      const seller = {
        ...mockSeller,
        sellerType: SellerType.STARTUP,
        businessProfile: mockBusinessProfile,
      } as any;

      const result = service.resolveProfile(seller);

      expect(result).toEqual({
        ...mockBusinessProfile,
        __typename: 'BusinessProfile',
      });
    });

    it('should resolve business profile for COMPANY', () => {
      const seller = {
        ...mockSeller,
        sellerType: SellerType.COMPANY,
        businessProfile: mockBusinessProfile,
      } as any;

      const result = service.resolveProfile(seller);

      expect(result).toEqual({
        ...mockBusinessProfile,
        __typename: 'BusinessProfile',
      });
    });

    it('should return null when no profile is available', () => {
      const seller = {
        ...mockSeller,
        personProfile: null,
        businessProfile: null,
      } as any;

      const result = service.resolveProfile(seller);

      expect(result).toBeNull();
    });
  });
});
