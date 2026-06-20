import { Test, TestingModule } from '@nestjs/testing';
import { AdminType, Language } from '../graphql/enums';
import { LocationService } from './location.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  UnAuthorizedError,
  NotFoundError,
  ConflictError,
} from '../common/exceptions';
import { locationMessages } from './location.i18n';

describe('LocationService', () => {
  let service: LocationService;
  let prisma: any;

  const mockCountries = [
    {
      id: 1,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      translation: [{ name: 'Chile' }],
    },
    {
      id: 2,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      translation: [{ name: 'Argentina' }],
    },
  ];

  const mockRegions = [
    { id: 1, name: 'Región Metropolitana', countryId: 1 },
    { id: 2, name: 'Valparaíso', countryId: 1 },
  ];

  const mockCities = [
    { id: 1, name: 'Santiago', regionId: 1 },
    { id: 2, name: 'Puente Alto', regionId: 1 },
  ];

  const mockCounties = [
    { id: 1, name: 'Las Condes', cityId: 1 },
    { id: 2, name: 'Providencia', cityId: 1 },
  ];

  beforeEach(async () => {
    const mockPrismaService = {
      admin: {
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      seller: {
        count: jest.fn().mockResolvedValue(0),
      },
      personMembershipPricing: {
        count: jest.fn().mockResolvedValue(0),
      },
      businessMembershipPricing: {
        count: jest.fn().mockResolvedValue(0),
      },
      country: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      region: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      city: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      county: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LocationService>(LocationService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCountries', () => {
    it('should return mapped countries successfully (ES)', async () => {
      prisma.country.findMany.mockResolvedValue(mockCountries);

      const result = await service.getCountries({
        sellerId: 'seller-123',
        language: Language.ES,
      });

      expect(result).toEqual([
        {
          id: 1,
          country: 'Chile',
          createdAt: mockCountries[0].createdAt,
          updatedAt: mockCountries[0].updatedAt,
        },
        {
          id: 2,
          country: 'Argentina',
          createdAt: mockCountries[1].createdAt,
          updatedAt: mockCountries[1].updatedAt,
        },
      ]);
      expect(prisma.country.findMany).toHaveBeenCalledWith({
        include: { translation: { where: { language: Language.ES } } },
      });
    });

    it('should query with the correct language filter (EN)', async () => {
      prisma.country.findMany.mockResolvedValue(mockCountries);

      await service.getCountries({
        sellerId: 'seller-123',
        language: Language.EN,
      });

      expect(prisma.country.findMany).toHaveBeenCalledWith({
        include: { translation: { where: { language: Language.EN } } },
      });
    });

    it('should throw UnAuthorizedError with ES message when sellerId is not provided', async () => {
      await expect(
        service.getCountries({ sellerId: '', language: Language.ES }),
      ).rejects.toThrow(UnAuthorizedError);
      await expect(
        service.getCountries({ sellerId: '', language: Language.ES }),
      ).rejects.toThrow(locationMessages[Language.ES].unauthorized);
      expect(prisma.country.findMany).not.toHaveBeenCalled();
    });

    it('should throw UnAuthorizedError with EN message when sellerId is not provided', async () => {
      await expect(
        service.getCountries({ sellerId: '', language: Language.EN }),
      ).rejects.toThrow(locationMessages[Language.EN].unauthorized);
    });

    it('should throw UnAuthorizedError with FR message when sellerId is not provided', async () => {
      await expect(
        service.getCountries({ sellerId: '', language: Language.FR }),
      ).rejects.toThrow(locationMessages[Language.FR].unauthorized);
    });

    it('should throw UnAuthorizedError with PT message when sellerId is not provided', async () => {
      await expect(
        service.getCountries({ sellerId: '', language: Language.PT }),
      ).rejects.toThrow(locationMessages[Language.PT].unauthorized);
    });

    it('should throw UnAuthorizedError with DE message when sellerId is not provided', async () => {
      await expect(
        service.getCountries({ sellerId: '', language: Language.DE }),
      ).rejects.toThrow(locationMessages[Language.DE].unauthorized);
    });

    it('should throw NotFoundError with translated message when no countries are found', async () => {
      prisma.country.findMany.mockResolvedValue(null);

      await expect(
        service.getCountries({ sellerId: 'seller-123', language: Language.ES }),
      ).rejects.toThrow(locationMessages[Language.ES].noCountries);

      prisma.country.findMany.mockResolvedValue(null);
      await expect(
        service.getCountries({ sellerId: 'seller-123', language: Language.EN }),
      ).rejects.toThrow(locationMessages[Language.EN].noCountries);
    });

    it('should throw InternalServerError with translated message on database error', async () => {
      prisma.country.findMany.mockRejectedValue(new Error('Database error'));

      await expect(
        service.getCountries({ sellerId: 'seller-123', language: Language.ES }),
      ).rejects.toThrow(locationMessages[Language.ES].errorCountries);

      prisma.country.findMany.mockRejectedValue(new Error('Database error'));
      await expect(
        service.getCountries({ sellerId: 'seller-123', language: Language.EN }),
      ).rejects.toThrow(locationMessages[Language.EN].errorCountries);
    });
  });

  describe('getRegionsByCountry', () => {
    it('should return regions by country successfully', async () => {
      prisma.region.findMany.mockResolvedValue(mockRegions);

      const result = await service.getRegionsByCountry({
        countryId: 1,
        sellerId: 'seller-123',
        language: Language.ES,
      });

      expect(result).toEqual(mockRegions);
      expect(prisma.region.findMany).toHaveBeenCalledWith({
        where: { countryId: 1 },
      });
    });

    it('should throw UnAuthorizedError with ES message when sellerId is not provided', async () => {
      await expect(
        service.getRegionsByCountry({
          countryId: 1,
          sellerId: '',
          language: Language.ES,
        }),
      ).rejects.toThrow(locationMessages[Language.ES].unauthorized);
      expect(prisma.region.findMany).not.toHaveBeenCalled();
    });

    it('should throw UnAuthorizedError with EN message when sellerId is not provided', async () => {
      await expect(
        service.getRegionsByCountry({
          countryId: 1,
          sellerId: '',
          language: Language.EN,
        }),
      ).rejects.toThrow(locationMessages[Language.EN].unauthorized);
    });

    it('should throw BadRequestError with ES message when countryId is not provided', async () => {
      await expect(
        service.getRegionsByCountry({
          countryId: null as any,
          sellerId: 'seller-123',
          language: Language.ES,
        }),
      ).rejects.toThrow(locationMessages[Language.ES].invalidCountryId);
      expect(prisma.region.findMany).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError with EN message when countryId is not provided', async () => {
      await expect(
        service.getRegionsByCountry({
          countryId: null as any,
          sellerId: 'seller-123',
          language: Language.EN,
        }),
      ).rejects.toThrow(locationMessages[Language.EN].invalidCountryId);
    });

    it('should throw NotFoundError with translated message when no regions are found', async () => {
      prisma.region.findMany.mockResolvedValue(null);

      await expect(
        service.getRegionsByCountry({
          countryId: 1,
          sellerId: 'seller-123',
          language: Language.ES,
        }),
      ).rejects.toThrow(locationMessages[Language.ES].noRegions);

      prisma.region.findMany.mockResolvedValue(null);
      await expect(
        service.getRegionsByCountry({
          countryId: 1,
          sellerId: 'seller-123',
          language: Language.EN,
        }),
      ).rejects.toThrow(locationMessages[Language.EN].noRegions);
    });

    it('should throw InternalServerError with translated message on database error', async () => {
      prisma.region.findMany.mockRejectedValue(new Error('Database error'));

      await expect(
        service.getRegionsByCountry({
          countryId: 1,
          sellerId: 'seller-123',
          language: Language.ES,
        }),
      ).rejects.toThrow(locationMessages[Language.ES].errorRegions);

      prisma.region.findMany.mockRejectedValue(new Error('Database error'));
      await expect(
        service.getRegionsByCountry({
          countryId: 1,
          sellerId: 'seller-123',
          language: Language.EN,
        }),
      ).rejects.toThrow(locationMessages[Language.EN].errorRegions);
    });
  });

  describe('getCitiesByRegion', () => {
    it('should return cities by region successfully', async () => {
      prisma.city.findMany.mockResolvedValue(mockCities);

      const result = await service.getCitiesByRegion({
        regionId: 1,
        sellerId: 'seller-123',
        language: Language.ES,
      });

      expect(result).toEqual(mockCities);
      expect(prisma.city.findMany).toHaveBeenCalledWith({
        where: { regionId: 1 },
      });
    });

    it('should throw UnAuthorizedError with ES message when sellerId is not provided', async () => {
      await expect(
        service.getCitiesByRegion({
          regionId: 1,
          sellerId: '',
          language: Language.ES,
        }),
      ).rejects.toThrow(locationMessages[Language.ES].unauthorized);
      expect(prisma.city.findMany).not.toHaveBeenCalled();
    });

    it('should throw UnAuthorizedError with EN message when sellerId is not provided', async () => {
      await expect(
        service.getCitiesByRegion({
          regionId: 1,
          sellerId: '',
          language: Language.EN,
        }),
      ).rejects.toThrow(locationMessages[Language.EN].unauthorized);
    });

    it('should throw BadRequestError with ES message when regionId is not provided', async () => {
      await expect(
        service.getCitiesByRegion({
          regionId: null as any,
          sellerId: 'seller-123',
          language: Language.ES,
        }),
      ).rejects.toThrow(locationMessages[Language.ES].invalidRegionId);
      expect(prisma.city.findMany).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError with EN message when regionId is not provided', async () => {
      await expect(
        service.getCitiesByRegion({
          regionId: null as any,
          sellerId: 'seller-123',
          language: Language.EN,
        }),
      ).rejects.toThrow(locationMessages[Language.EN].invalidRegionId);
    });

    it('should throw NotFoundError with translated message when no cities are found', async () => {
      prisma.city.findMany.mockResolvedValue(null);

      await expect(
        service.getCitiesByRegion({
          regionId: 1,
          sellerId: 'seller-123',
          language: Language.ES,
        }),
      ).rejects.toThrow(locationMessages[Language.ES].noCities);

      prisma.city.findMany.mockResolvedValue(null);
      await expect(
        service.getCitiesByRegion({
          regionId: 1,
          sellerId: 'seller-123',
          language: Language.EN,
        }),
      ).rejects.toThrow(locationMessages[Language.EN].noCities);
    });

    it('should throw InternalServerError with translated message on database error', async () => {
      prisma.city.findMany.mockRejectedValue(new Error('Database error'));

      await expect(
        service.getCitiesByRegion({
          regionId: 1,
          sellerId: 'seller-123',
          language: Language.ES,
        }),
      ).rejects.toThrow(locationMessages[Language.ES].errorCities);

      prisma.city.findMany.mockRejectedValue(new Error('Database error'));
      await expect(
        service.getCitiesByRegion({
          regionId: 1,
          sellerId: 'seller-123',
          language: Language.EN,
        }),
      ).rejects.toThrow(locationMessages[Language.EN].errorCities);
    });
  });

  describe('getCountiesByCity', () => {
    it('should return counties by city successfully', async () => {
      prisma.county.findMany.mockResolvedValue(mockCounties);

      const result = await service.getCountiesByCity({
        cityId: 1,
        sellerId: 'seller-123',
        language: Language.ES,
      });

      expect(result).toEqual(mockCounties);
      expect(prisma.county.findMany).toHaveBeenCalledWith({
        where: { cityId: 1 },
      });
    });

    it('should throw UnAuthorizedError with ES message when sellerId is not provided', async () => {
      await expect(
        service.getCountiesByCity({
          cityId: 1,
          sellerId: '',
          language: Language.ES,
        }),
      ).rejects.toThrow(locationMessages[Language.ES].unauthorized);
      expect(prisma.county.findMany).not.toHaveBeenCalled();
    });

    it('should throw UnAuthorizedError with EN message when sellerId is not provided', async () => {
      await expect(
        service.getCountiesByCity({
          cityId: 1,
          sellerId: '',
          language: Language.EN,
        }),
      ).rejects.toThrow(locationMessages[Language.EN].unauthorized);
    });

    it('should throw BadRequestError with ES message when cityId is not provided', async () => {
      await expect(
        service.getCountiesByCity({
          cityId: null as any,
          sellerId: 'seller-123',
          language: Language.ES,
        }),
      ).rejects.toThrow(locationMessages[Language.ES].invalidCityId);
      expect(prisma.county.findMany).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError with EN message when cityId is not provided', async () => {
      await expect(
        service.getCountiesByCity({
          cityId: null as any,
          sellerId: 'seller-123',
          language: Language.EN,
        }),
      ).rejects.toThrow(locationMessages[Language.EN].invalidCityId);
    });

    it('should throw NotFoundError with translated message when no counties are found', async () => {
      prisma.county.findMany.mockResolvedValue(null);

      await expect(
        service.getCountiesByCity({
          cityId: 1,
          sellerId: 'seller-123',
          language: Language.ES,
        }),
      ).rejects.toThrow(locationMessages[Language.ES].noCounties);

      prisma.county.findMany.mockResolvedValue(null);
      await expect(
        service.getCountiesByCity({
          cityId: 1,
          sellerId: 'seller-123',
          language: Language.EN,
        }),
      ).rejects.toThrow(locationMessages[Language.EN].noCounties);
    });

    it('should throw InternalServerError with translated message on database error', async () => {
      prisma.county.findMany.mockRejectedValue(new Error('Database error'));

      await expect(
        service.getCountiesByCity({
          cityId: 1,
          sellerId: 'seller-123',
          language: Language.ES,
        }),
      ).rejects.toThrow(locationMessages[Language.ES].errorCounties);

      prisma.county.findMany.mockRejectedValue(new Error('Database error'));
      await expect(
        service.getCountiesByCity({
          cityId: 1,
          sellerId: 'seller-123',
          language: Language.EN,
        }),
      ).rejects.toThrow(locationMessages[Language.EN].errorCounties);
    });
  });

  // ─── Create mutations ────────────────────────────────────────────────────────

  const platformAdmin = { adminType: AdminType.PLATFORM };
  const businessAdmin = { adminType: AdminType.BUSINESS };

  describe('createCountry', () => {
    const input = {
      translations: [
        { language: Language.ES, name: 'Chile' },
        { language: Language.EN, name: 'Chile' },
      ],
    };

    it('should create a country when called by a platform admin', async () => {
      const created = { id: 1, translation: input.translations };
      prisma.admin.findUnique.mockResolvedValue(platformAdmin);
      prisma.country.create.mockResolvedValue(created);

      const result = await service.createCountry({
        adminId: 'admin-1',
        input,
        language: Language.ES,
      });

      expect(result).toEqual(created);
      expect(prisma.country.create).toHaveBeenCalled();
    });

    it('should throw UnAuthorizedError when adminId is empty', async () => {
      await expect(
        service.createCountry({ adminId: '', input, language: Language.ES }),
      ).rejects.toThrow(UnAuthorizedError);
      expect(prisma.country.create).not.toHaveBeenCalled();
    });

    it('should throw UnAuthorizedError when admin is not PLATFORM type', async () => {
      prisma.admin.findUnique.mockResolvedValue(businessAdmin);

      await expect(
        service.createCountry({
          adminId: 'admin-biz',
          input,
          language: Language.ES,
        }),
      ).rejects.toThrow(
        locationMessages[Language.ES].forbiddenNotPlatformAdmin,
      );
      expect(prisma.country.create).not.toHaveBeenCalled();
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.admin.findUnique.mockResolvedValue(platformAdmin);
      prisma.country.create.mockRejectedValue(new Error('DB error'));

      await expect(
        service.createCountry({
          adminId: 'admin-1',
          input,
          language: Language.ES,
        }),
      ).rejects.toThrow(locationMessages[Language.ES].errorCreateCountry);
    });
  });

  describe('createRegion', () => {
    const input = { region: 'Metropolitana', countryId: 1 };

    it('should create a region when called by a platform admin', async () => {
      const created = { id: 1, region: 'Metropolitana', countryId: 1 };
      prisma.admin.findUnique.mockResolvedValue(platformAdmin);
      prisma.region.create.mockResolvedValue(created);

      const result = await service.createRegion({
        adminId: 'admin-1',
        input,
        language: Language.ES,
      });

      expect(result).toEqual(created);
    });

    it('should throw UnAuthorizedError when adminId is empty', async () => {
      await expect(
        service.createRegion({ adminId: '', input, language: Language.ES }),
      ).rejects.toThrow(UnAuthorizedError);
    });

    it('should throw UnAuthorizedError when admin is not PLATFORM type', async () => {
      prisma.admin.findUnique.mockResolvedValue(businessAdmin);

      await expect(
        service.createRegion({
          adminId: 'admin-biz',
          input,
          language: Language.ES,
        }),
      ).rejects.toThrow(UnAuthorizedError);
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.admin.findUnique.mockResolvedValue(platformAdmin);
      prisma.region.create.mockRejectedValue(new Error('DB error'));

      await expect(
        service.createRegion({
          adminId: 'admin-1',
          input,
          language: Language.ES,
        }),
      ).rejects.toThrow(locationMessages[Language.ES].errorCreateRegion);
    });
  });

  describe('createCity', () => {
    const input = { city: 'Santiago', regionId: 1 };

    it('should create a city when called by a platform admin', async () => {
      const created = { id: 1, city: 'Santiago', regionId: 1 };
      prisma.admin.findUnique.mockResolvedValue(platformAdmin);
      prisma.city.create.mockResolvedValue(created);

      const result = await service.createCity({
        adminId: 'admin-1',
        input,
        language: Language.ES,
      });

      expect(result).toEqual(created);
    });

    it('should throw UnAuthorizedError when adminId is empty', async () => {
      await expect(
        service.createCity({ adminId: '', input, language: Language.ES }),
      ).rejects.toThrow(UnAuthorizedError);
    });

    it('should throw UnAuthorizedError when admin is not PLATFORM type', async () => {
      prisma.admin.findUnique.mockResolvedValue(businessAdmin);

      await expect(
        service.createCity({
          adminId: 'admin-biz',
          input,
          language: Language.ES,
        }),
      ).rejects.toThrow(UnAuthorizedError);
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.admin.findUnique.mockResolvedValue(platformAdmin);
      prisma.city.create.mockRejectedValue(new Error('DB error'));

      await expect(
        service.createCity({
          adminId: 'admin-1',
          input,
          language: Language.ES,
        }),
      ).rejects.toThrow(locationMessages[Language.ES].errorCreateCity);
    });
  });

  describe('createCounty', () => {
    const input = { county: 'Las Condes', cityId: 1 };

    it('should create a county when called by a platform admin', async () => {
      const created = { id: 1, county: 'Las Condes', cityId: 1 };
      prisma.admin.findUnique.mockResolvedValue(platformAdmin);
      prisma.county.create.mockResolvedValue(created);

      const result = await service.createCounty({
        adminId: 'admin-1',
        input,
        language: Language.ES,
      });

      expect(result).toEqual(created);
    });

    it('should throw UnAuthorizedError when adminId is empty', async () => {
      await expect(
        service.createCounty({ adminId: '', input, language: Language.ES }),
      ).rejects.toThrow(UnAuthorizedError);
    });

    it('should throw UnAuthorizedError when admin is not PLATFORM type', async () => {
      prisma.admin.findUnique.mockResolvedValue(businessAdmin);

      await expect(
        service.createCounty({
          adminId: 'admin-biz',
          input,
          language: Language.ES,
        }),
      ).rejects.toThrow(UnAuthorizedError);
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.admin.findUnique.mockResolvedValue(platformAdmin);
      prisma.county.create.mockRejectedValue(new Error('DB error'));

      await expect(
        service.createCounty({
          adminId: 'admin-1',
          input,
          language: Language.ES,
        }),
      ).rejects.toThrow(locationMessages[Language.ES].errorCreateCounty);
    });
  });

  // ─── Update mutations ────────────────────────────────────────────────────────

  describe('updateCountry', () => {
    const input = {
      translations: [{ language: Language.ES, name: 'Chile' }],
    };

    it('should replace translations when called by a platform admin', async () => {
      const updated = { id: 1, translation: input.translations };
      prisma.admin.findUnique.mockResolvedValue(platformAdmin);
      prisma.country.findUnique.mockResolvedValue({ id: 1 });
      prisma.country.update.mockResolvedValue(updated);

      const result = await service.updateCountry({
        adminId: 'admin-1',
        countryId: 1,
        input,
        language: Language.ES,
      });

      expect(result).toEqual(updated);
      expect(prisma.country.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            translation: expect.objectContaining({ deleteMany: {} }),
          }),
        }),
      );
    });

    it('should throw NotFoundError when the country does not exist', async () => {
      prisma.admin.findUnique.mockResolvedValue(platformAdmin);
      prisma.country.findUnique.mockResolvedValue(null);

      await expect(
        service.updateCountry({
          adminId: 'admin-1',
          countryId: 99,
          input,
          language: Language.ES,
        }),
      ).rejects.toThrow(NotFoundError);
      expect(prisma.country.update).not.toHaveBeenCalled();
    });

    it('should throw UnAuthorizedError when admin is not PLATFORM type', async () => {
      prisma.admin.findUnique.mockResolvedValue(businessAdmin);

      await expect(
        service.updateCountry({
          adminId: 'admin-biz',
          countryId: 1,
          input,
          language: Language.ES,
        }),
      ).rejects.toThrow(UnAuthorizedError);
      expect(prisma.country.update).not.toHaveBeenCalled();
    });
  });

  describe('updateRegion', () => {
    const input = { region: 'Metropolitana', countryId: 1 };

    it('should update a region when called by a platform admin', async () => {
      const updated = { id: 1, ...input };
      prisma.admin.findUnique.mockResolvedValue(platformAdmin);
      prisma.region.findUnique.mockResolvedValue({ id: 1 });
      prisma.region.update.mockResolvedValue(updated);

      const result = await service.updateRegion({
        adminId: 'admin-1',
        regionId: 1,
        input,
        language: Language.ES,
      });

      expect(result).toEqual(updated);
    });

    it('should throw NotFoundError when the region does not exist', async () => {
      prisma.admin.findUnique.mockResolvedValue(platformAdmin);
      prisma.region.findUnique.mockResolvedValue(null);

      await expect(
        service.updateRegion({
          adminId: 'admin-1',
          regionId: 99,
          input,
          language: Language.ES,
        }),
      ).rejects.toThrow(NotFoundError);
      expect(prisma.region.update).not.toHaveBeenCalled();
    });
  });

  describe('updateCity', () => {
    const input = { city: 'Santiago', regionId: 1 };

    it('should update a city when called by a platform admin', async () => {
      const updated = { id: 1, ...input };
      prisma.admin.findUnique.mockResolvedValue(platformAdmin);
      prisma.city.findUnique.mockResolvedValue({ id: 1 });
      prisma.city.update.mockResolvedValue(updated);

      const result = await service.updateCity({
        adminId: 'admin-1',
        cityId: 1,
        input,
        language: Language.ES,
      });

      expect(result).toEqual(updated);
    });

    it('should throw NotFoundError when the city does not exist', async () => {
      prisma.admin.findUnique.mockResolvedValue(platformAdmin);
      prisma.city.findUnique.mockResolvedValue(null);

      await expect(
        service.updateCity({
          adminId: 'admin-1',
          cityId: 99,
          input,
          language: Language.ES,
        }),
      ).rejects.toThrow(NotFoundError);
      expect(prisma.city.update).not.toHaveBeenCalled();
    });
  });

  describe('updateCounty', () => {
    const input = { county: 'Las Condes', cityId: 1 };

    it('should update a county when called by a platform admin', async () => {
      const updated = { id: 1, ...input };
      prisma.admin.findUnique.mockResolvedValue(platformAdmin);
      prisma.county.findUnique.mockResolvedValue({ id: 1 });
      prisma.county.update.mockResolvedValue(updated);

      const result = await service.updateCounty({
        adminId: 'admin-1',
        countyId: 1,
        input,
        language: Language.ES,
      });

      expect(result).toEqual(updated);
    });

    it('should throw NotFoundError when the county does not exist', async () => {
      prisma.admin.findUnique.mockResolvedValue(platformAdmin);
      prisma.county.findUnique.mockResolvedValue(null);

      await expect(
        service.updateCounty({
          adminId: 'admin-1',
          countyId: 99,
          input,
          language: Language.ES,
        }),
      ).rejects.toThrow(NotFoundError);
      expect(prisma.county.update).not.toHaveBeenCalled();
    });
  });

  // ─── Delete mutations ────────────────────────────────────────────────────────

  describe('deleteCountry', () => {
    it('should delete a country with no references', async () => {
      const existing = { id: 1, translation: [] };
      prisma.admin.findUnique.mockResolvedValue(platformAdmin);
      prisma.country.findUnique.mockResolvedValue(existing);
      prisma.country.delete.mockResolvedValue(existing);

      const result = await service.deleteCountry({
        adminId: 'admin-1',
        countryId: 1,
        language: Language.ES,
      });

      expect(result).toEqual(existing);
      expect(prisma.country.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw NotFoundError when the country does not exist', async () => {
      prisma.admin.findUnique.mockResolvedValue(platformAdmin);
      prisma.country.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteCountry({
          adminId: 'admin-1',
          countryId: 99,
          language: Language.ES,
        }),
      ).rejects.toThrow(NotFoundError);
      expect(prisma.country.delete).not.toHaveBeenCalled();
    });

    it('should throw ConflictError when the country still has regions', async () => {
      prisma.admin.findUnique.mockResolvedValue(platformAdmin);
      prisma.country.findUnique.mockResolvedValue({ id: 1, translation: [] });
      prisma.region.count.mockResolvedValue(2);

      await expect(
        service.deleteCountry({
          adminId: 'admin-1',
          countryId: 1,
          language: Language.ES,
        }),
      ).rejects.toThrow(ConflictError);
      expect(prisma.country.delete).not.toHaveBeenCalled();
    });

    it('should throw UnAuthorizedError when admin is not PLATFORM type', async () => {
      prisma.admin.findUnique.mockResolvedValue(businessAdmin);

      await expect(
        service.deleteCountry({
          adminId: 'admin-biz',
          countryId: 1,
          language: Language.ES,
        }),
      ).rejects.toThrow(UnAuthorizedError);
      expect(prisma.country.delete).not.toHaveBeenCalled();
    });
  });

  describe('deleteRegion', () => {
    it('should delete a region with no references', async () => {
      const existing = { id: 1, region: 'Metropolitana', countryId: 1 };
      prisma.admin.findUnique.mockResolvedValue(platformAdmin);
      prisma.region.findUnique.mockResolvedValue(existing);
      prisma.region.delete.mockResolvedValue(existing);

      const result = await service.deleteRegion({
        adminId: 'admin-1',
        regionId: 1,
        language: Language.ES,
      });

      expect(result).toEqual(existing);
    });

    it('should throw ConflictError when the region still has cities', async () => {
      prisma.admin.findUnique.mockResolvedValue(platformAdmin);
      prisma.region.findUnique.mockResolvedValue({ id: 1 });
      prisma.city.count.mockResolvedValue(3);

      await expect(
        service.deleteRegion({
          adminId: 'admin-1',
          regionId: 1,
          language: Language.ES,
        }),
      ).rejects.toThrow(ConflictError);
      expect(prisma.region.delete).not.toHaveBeenCalled();
    });
  });

  describe('deleteCity', () => {
    it('should delete a city with no references', async () => {
      const existing = { id: 1, city: 'Santiago', regionId: 1 };
      prisma.admin.findUnique.mockResolvedValue(platformAdmin);
      prisma.city.findUnique.mockResolvedValue(existing);
      prisma.city.delete.mockResolvedValue(existing);

      const result = await service.deleteCity({
        adminId: 'admin-1',
        cityId: 1,
        language: Language.ES,
      });

      expect(result).toEqual(existing);
    });

    it('should throw ConflictError when the city still has counties', async () => {
      prisma.admin.findUnique.mockResolvedValue(platformAdmin);
      prisma.city.findUnique.mockResolvedValue({ id: 1 });
      prisma.county.count.mockResolvedValue(1);

      await expect(
        service.deleteCity({
          adminId: 'admin-1',
          cityId: 1,
          language: Language.ES,
        }),
      ).rejects.toThrow(ConflictError);
      expect(prisma.city.delete).not.toHaveBeenCalled();
    });
  });

  describe('deleteCounty', () => {
    it('should delete a county with no references', async () => {
      const existing = { id: 1, county: 'Las Condes', cityId: 1 };
      prisma.admin.findUnique.mockResolvedValue(platformAdmin);
      prisma.county.findUnique.mockResolvedValue(existing);
      prisma.county.delete.mockResolvedValue(existing);

      const result = await service.deleteCounty({
        adminId: 'admin-1',
        countyId: 1,
        language: Language.ES,
      });

      expect(result).toEqual(existing);
    });

    it('should throw ConflictError when the county is referenced by a seller', async () => {
      prisma.admin.findUnique.mockResolvedValue(platformAdmin);
      prisma.county.findUnique.mockResolvedValue({ id: 1 });
      prisma.seller.count.mockResolvedValue(5);

      await expect(
        service.deleteCounty({
          adminId: 'admin-1',
          countyId: 1,
          language: Language.ES,
        }),
      ).rejects.toThrow(ConflictError);
      expect(prisma.county.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when the county does not exist', async () => {
      prisma.admin.findUnique.mockResolvedValue(platformAdmin);
      prisma.county.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteCounty({
          adminId: 'admin-1',
          countyId: 99,
          language: Language.ES,
        }),
      ).rejects.toThrow(NotFoundError);
      expect(prisma.county.delete).not.toHaveBeenCalled();
    });
  });
});
