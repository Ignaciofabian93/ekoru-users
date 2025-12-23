import { Test, TestingModule } from '@nestjs/testing';
import { LocationService } from './location.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  UnAuthorizedError,
  BadRequestError,
  NotFoundError,
  InternalServerError,
} from '../common/exceptions';

describe('LocationService', () => {
  let service: LocationService;
  let prisma: any;

  const mockCountries = [
    { id: 1, name: 'Chile', code: 'CL' },
    { id: 2, name: 'Argentina', code: 'AR' },
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
      country: {
        findMany: jest.fn(),
      },
      region: {
        findMany: jest.fn(),
      },
      city: {
        findMany: jest.fn(),
      },
      county: {
        findMany: jest.fn(),
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
    it('should return all countries successfully', async () => {
      prisma.country.findMany.mockResolvedValue(mockCountries);

      const result = await service.getCountries('seller-123');

      expect(result).toEqual(mockCountries);
      expect(prisma.country.findMany).toHaveBeenCalled();
    });

    it('should throw UnAuthorizedError when sellerId is not provided', async () => {
      await expect(service.getCountries('')).rejects.toThrow(UnAuthorizedError);
      expect(prisma.country.findMany).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when no countries are found', async () => {
      prisma.country.findMany.mockResolvedValue(null);

      await expect(service.getCountries('seller-123')).rejects.toThrow(
        NotFoundError,
      );
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.country.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getCountries('seller-123')).rejects.toThrow(
        InternalServerError,
      );
    });
  });

  describe('getRegionsByCountry', () => {
    it('should return regions by country successfully', async () => {
      prisma.region.findMany.mockResolvedValue(mockRegions);

      const result = await service.getRegionsByCountry(1, 'seller-123');

      expect(result).toEqual(mockRegions);
      expect(prisma.region.findMany).toHaveBeenCalledWith({
        where: { countryId: 1 },
      });
    });

    it('should throw UnAuthorizedError when sellerId is not provided', async () => {
      await expect(service.getRegionsByCountry(1, '')).rejects.toThrow(
        UnAuthorizedError,
      );
      expect(prisma.region.findMany).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError when countryId is not provided', async () => {
      await expect(
        service.getRegionsByCountry(null as any, 'seller-123'),
      ).rejects.toThrow(BadRequestError);
      expect(prisma.region.findMany).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when no regions are found', async () => {
      prisma.region.findMany.mockResolvedValue(null);

      await expect(
        service.getRegionsByCountry(1, 'seller-123'),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.region.findMany.mockRejectedValue(new Error('Database error'));

      await expect(
        service.getRegionsByCountry(1, 'seller-123'),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe('getCitiesByRegion', () => {
    it('should return cities by region successfully', async () => {
      prisma.city.findMany.mockResolvedValue(mockCities);

      const result = await service.getCitiesByRegion(1, 'seller-123');

      expect(result).toEqual(mockCities);
      expect(prisma.city.findMany).toHaveBeenCalledWith({
        where: { regionId: 1 },
      });
    });

    it('should throw UnAuthorizedError when sellerId is not provided', async () => {
      await expect(service.getCitiesByRegion(1, '')).rejects.toThrow(
        UnAuthorizedError,
      );
      expect(prisma.city.findMany).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError when regionId is not provided', async () => {
      await expect(
        service.getCitiesByRegion(null as any, 'seller-123'),
      ).rejects.toThrow(BadRequestError);
      expect(prisma.city.findMany).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when no cities are found', async () => {
      prisma.city.findMany.mockResolvedValue(null);

      await expect(service.getCitiesByRegion(1, 'seller-123')).rejects.toThrow(
        NotFoundError,
      );
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.city.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getCitiesByRegion(1, 'seller-123')).rejects.toThrow(
        InternalServerError,
      );
    });
  });

  describe('getCountiesByCity', () => {
    it('should return counties by city successfully', async () => {
      prisma.county.findMany.mockResolvedValue(mockCounties);

      const result = await service.getCountiesByCity(1, 'seller-123');

      expect(result).toEqual(mockCounties);
      expect(prisma.county.findMany).toHaveBeenCalledWith({
        where: { cityId: 1 },
      });
    });

    it('should throw UnAuthorizedError when sellerId is not provided', async () => {
      await expect(service.getCountiesByCity(1, '')).rejects.toThrow(
        UnAuthorizedError,
      );
      expect(prisma.county.findMany).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError when cityId is not provided', async () => {
      await expect(
        service.getCountiesByCity(null as any, 'seller-123'),
      ).rejects.toThrow(BadRequestError);
      expect(prisma.county.findMany).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when no counties are found', async () => {
      prisma.county.findMany.mockResolvedValue(null);

      await expect(service.getCountiesByCity(1, 'seller-123')).rejects.toThrow(
        NotFoundError,
      );
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.county.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getCountiesByCity(1, 'seller-123')).rejects.toThrow(
        InternalServerError,
      );
    });
  });
});
