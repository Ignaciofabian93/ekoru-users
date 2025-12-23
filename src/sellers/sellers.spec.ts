import { Test, TestingModule } from '@nestjs/testing';
import { SellersService } from './sellers.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import {
  UnAuthorizedError,
  BadRequestError,
  InternalServerError,
} from '../common/exceptions';
import { BusinessType, SellerType } from '../graphql/enums';
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
    it('should return all sellers successfully', async () => {
      const sellers = [mockSeller];
      prisma.seller.findMany.mockResolvedValue(sellers);

      const result = await service.getSellers('seller-123');

      expect(result).toEqual(sellers);
      expect(prisma.seller.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        take: undefined,
        skip: undefined,
      });
    });

    it('should filter sellers by sellerType', async () => {
      const sellers = [mockSeller];
      prisma.seller.findMany.mockResolvedValue(sellers);

      await service.getSellers('seller-123', SellerType.PERSON);

      expect(prisma.seller.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sellerType: SellerType.PERSON },
        }),
      );
    });

    it('should filter sellers by isActive', async () => {
      const sellers = [mockSeller];
      prisma.seller.findMany.mockResolvedValue(sellers);

      await service.getSellers('seller-123', undefined, true);

      expect(prisma.seller.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        }),
      );
    });

    it('should filter sellers by isVerified', async () => {
      const sellers = [mockSeller];
      prisma.seller.findMany.mockResolvedValue(sellers);

      await service.getSellers('seller-123', undefined, undefined, true);

      expect(prisma.seller.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isVerified: true },
        }),
      );
    });

    it('should apply limit and offset', async () => {
      const sellers = [mockSeller];
      prisma.seller.findMany.mockResolvedValue(sellers);

      await service.getSellers(
        'seller-123',
        undefined,
        undefined,
        undefined,
        10,
        5,
      );

      expect(prisma.seller.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 5,
        }),
      );
    });

    it('should throw UnAuthorizedError when sellerId is not provided', async () => {
      await expect(service.getSellers('')).rejects.toThrow(UnAuthorizedError);
      expect(prisma.seller.findMany).not.toHaveBeenCalled();
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.seller.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getSellers('seller-123')).rejects.toThrow(
        InternalServerError,
      );
    });
  });

  describe('getSellerById', () => {
    it('should return seller by id successfully', async () => {
      prisma.seller.findUnique.mockResolvedValue(mockSeller);

      const result = await service.getSellerById('seller-123', 'seller-456');

      expect(result).toEqual(mockSeller);
      expect(prisma.seller.findUnique).toHaveBeenCalledWith({
        where: { id: 'seller-123' },
        include: expect.any(Object),
      });
    });

    it('should throw UnAuthorizedError when sellerId is not provided', async () => {
      await expect(service.getSellerById('seller-123', '')).rejects.toThrow(
        UnAuthorizedError,
      );
      expect(prisma.seller.findUnique).not.toHaveBeenCalled();
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.seller.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(
        service.getSellerById('seller-123', 'seller-456'),
      ).rejects.toThrow(InternalServerError);
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
    it('should return person profile for PERSON seller type', async () => {
      const sellerWithProfile = {
        ...mockSeller,
        personProfile: mockPersonProfile,
      };
      prisma.seller.findUnique
        .mockResolvedValueOnce({ sellerType: SellerType.PERSON })
        .mockResolvedValueOnce(sellerWithProfile);

      const result = await service.getMe('seller-123');

      expect(result).toEqual(sellerWithProfile);
      expect(prisma.seller.findUnique).toHaveBeenCalledTimes(2);
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

      const result = await service.getMe('seller-123');

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

      const result = await service.getMe('seller-123');

      expect(result).toEqual(sellerWithProfile);
    });

    it('should return null for unknown seller type', async () => {
      prisma.seller.findUnique.mockResolvedValue({ sellerType: null });

      const result = await service.getMe('seller-123');

      expect(result).toBeNull();
    });

    it('should throw UnAuthorizedError when sellerId is not provided', async () => {
      await expect(service.getMe('')).rejects.toThrow(UnAuthorizedError);
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.seller.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(service.getMe('seller-123')).rejects.toThrow(
        InternalServerError,
      );
    });
  });

  describe('getSellerLevels', () => {
    it('should return all seller levels', async () => {
      const levels = [mockSellerLevel];
      prisma.sellerLevel.findMany.mockResolvedValue(levels);

      const result = await service.getSellerLevels();

      expect(result).toEqual(levels);
      expect(prisma.sellerLevel.findMany).toHaveBeenCalledWith({
        orderBy: { levelName: 'asc' },
      });
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.sellerLevel.findMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.getSellerLevels()).rejects.toThrow(
        InternalServerError,
      );
    });
  });

  describe('getSellerLevel', () => {
    it('should return seller level by id', async () => {
      prisma.sellerLevel.findUnique.mockResolvedValue(mockSellerLevel);

      const result = await service.getSellerLevel('1');

      expect(result).toEqual(mockSellerLevel);
      expect(prisma.sellerLevel.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.sellerLevel.findUnique.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.getSellerLevel('1')).rejects.toThrow(
        InternalServerError,
      );
    });
  });

  describe('registerPerson', () => {
    const input = {
      email: 'TEST@EXAMPLE.COM',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should register person successfully', async () => {
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

      const result = await service.registerPerson(input);

      expect(result).toEqual(mockSeller);
      expect(prisma.seller.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(bcrypt.genSalt).toHaveBeenCalledWith(12);
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 'salt');
      expect(mailService.sendWelcomeEmail).toHaveBeenCalledWith(
        'test@example.com',
        'John',
        '',
      );
    });

    it('should throw BadRequestError when email already exists', async () => {
      prisma.seller.findUnique.mockResolvedValue(mockSeller);

      await expect(service.registerPerson(input)).rejects.toThrow(
        BadRequestError,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.seller.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(service.registerPerson(input)).rejects.toThrow(
        InternalServerError,
      );
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

    it('should register business successfully', async () => {
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

      const result = await service.registerBusiness(input);

      expect(result).toEqual(businessSeller);
      expect(prisma.seller.findUnique).toHaveBeenCalledWith({
        where: { email: 'business@example.com' },
      });
      expect(mailService.sendWelcomeEmail).toHaveBeenCalledWith(
        'business@example.com',
        '',
        'Acme Corp',
      );
    });

    it('should throw BadRequestError when email already exists', async () => {
      prisma.seller.findUnique.mockResolvedValue(mockSeller);

      await expect(service.registerBusiness(input)).rejects.toThrow(
        BadRequestError,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.seller.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(service.registerBusiness(input)).rejects.toThrow(
        InternalServerError,
      );
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

      const result = await service.updateSeller('seller-123', input);

      expect(result).toEqual(updatedSeller);
      expect(prisma.seller.update).toHaveBeenCalledWith({
        where: { id: 'seller-123' },
        data: input,
        include: expect.any(Object),
      });
    });

    it('should throw UnAuthorizedError when sellerId is not provided', async () => {
      await expect(service.updateSeller('', input)).rejects.toThrow(
        UnAuthorizedError,
      );
      expect(prisma.seller.update).not.toHaveBeenCalled();
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.seller.update.mockRejectedValue(new Error('Database error'));

      await expect(service.updateSeller('seller-123', input)).rejects.toThrow(
        InternalServerError,
      );
    });
  });

  describe('updatePersonProfile', () => {
    it('should update person profile successfully', async () => {
      const input = { firstName: 'Jane', lastName: 'Smith' };
      const updatedProfile = { ...mockPersonProfile, ...input };
      prisma.personProfile.update.mockResolvedValue(updatedProfile);

      const result = await service.updatePersonProfile('seller-123', input);

      expect(result).toEqual(updatedProfile);
      expect(prisma.personProfile.update).toHaveBeenCalledWith({
        where: { sellerId: 'seller-123' },
        data: input,
      });
    });

    it('should process birthday date correctly', async () => {
      const input = { birthday: new Date('1990-01-01') };
      prisma.personProfile.update.mockResolvedValue(mockPersonProfile);

      await service.updatePersonProfile('seller-123', input);

      expect(prisma.personProfile.update).toHaveBeenCalledWith({
        where: { sellerId: 'seller-123' },
        data: expect.objectContaining({
          birthday: expect.any(Date),
        }),
      });
    });

    it('should throw UnAuthorizedError when sellerId is not provided', async () => {
      await expect(
        service.updatePersonProfile('', { firstName: 'Jane' }),
      ).rejects.toThrow(UnAuthorizedError);
      expect(prisma.personProfile.update).not.toHaveBeenCalled();
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.personProfile.update.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.updatePersonProfile('seller-123', { firstName: 'Jane' }),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe('updateBusinessProfile', () => {
    it('should update business profile successfully', async () => {
      const input = { businessName: 'New Corp' };
      const updatedProfile = { ...mockBusinessProfile, ...input };
      prisma.businessProfile.update.mockResolvedValue(updatedProfile);

      const result = await service.updateBusinessProfile('seller-123', input);

      expect(result).toEqual(updatedProfile);
      expect(prisma.businessProfile.update).toHaveBeenCalledWith({
        where: { sellerId: 'seller-123' },
        data: input,
      });
    });

    it('should throw UnAuthorizedError when sellerId is not provided', async () => {
      await expect(
        service.updateBusinessProfile('', { businessName: 'New Corp' }),
      ).rejects.toThrow(UnAuthorizedError);
      expect(prisma.businessProfile.update).not.toHaveBeenCalled();
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.businessProfile.update.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.updateBusinessProfile('seller-123', { businessName: 'New' }),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe('updateSellerPreferences', () => {
    it('should upsert seller preferences successfully', async () => {
      const input = { language: 'en', currency: 'USD' };
      const preferences = { id: 1, sellerId: 'seller-123', ...input };
      prisma.sellerPreferences.upsert.mockResolvedValue(preferences);

      const result = await service.updateSellerPreferences('seller-123', input);

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
  });

  describe('resolveProfile', () => {
    it('should resolve person profile', () => {
      const seller = {
        ...mockSeller,
        profile: mockPersonProfile,
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
        profile: mockBusinessProfile,
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
        profile: mockBusinessProfile,
      } as any;

      const result = service.resolveProfile(seller);

      expect(result).toEqual({
        ...mockBusinessProfile,
        __typename: 'BusinessProfile',
      });
    });

    it('should return null when profile is not available', () => {
      const seller = {
        ...mockSeller,
        profile: null,
      } as any;

      const result = service.resolveProfile(seller);

      expect(result).toBeNull();
    });
  });
});
