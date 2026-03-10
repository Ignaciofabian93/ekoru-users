import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  UnAuthorizedError,
  BadRequestError,
  NotFoundError,
  InternalServerError,
} from '../common/exceptions';
import { Language } from '@prisma/client';
import { locationMessages } from './location.i18n';

@Injectable()
export class LocationService {
  constructor(private readonly prisma: PrismaService) {}

  async getCountries(sellerId: string, language: Language) {
    const t = locationMessages[language];
    try {
      if (!sellerId) {
        throw new UnAuthorizedError(t.unauthorized);
      }

      const countries = await this.prisma.country.findMany({
        include: {
          translation: {
            where: { language },
          },
        },
      });

      if (!countries) {
        throw new NotFoundError(t.noCountries);
      }

      const mappedCountries = countries.map((c) => ({
        id: c.id,
        country: c.translation[0]?.name,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }));

      return mappedCountries;
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof NotFoundError
      ) {
        throw error;
      }
      throw new InternalServerError(t.errorCountries);
    }
  }

  async getRegionsByCountry(
    countryId: number,
    sellerId: string,
    language: Language,
  ) {
    const t = locationMessages[language];
    try {
      if (!sellerId) {
        throw new UnAuthorizedError(t.unauthorized);
      }

      if (!countryId) {
        throw new BadRequestError(t.invalidCountryId);
      }

      const parsedId = Number(countryId);
      const regions = await this.prisma.region.findMany({
        where: { countryId: parsedId },
      });

      if (!regions) {
        throw new NotFoundError(t.noRegions);
      }

      return regions;
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof NotFoundError ||
        error instanceof BadRequestError
      ) {
        throw error;
      }
      throw new InternalServerError(t.errorRegions);
    }
  }

  async getCitiesByRegion(
    regionId: number,
    sellerId: string,
    language: Language,
  ) {
    const t = locationMessages[language];
    try {
      if (!sellerId) {
        throw new UnAuthorizedError(t.unauthorized);
      }

      if (!regionId) {
        throw new BadRequestError(t.invalidRegionId);
      }

      const parsedId = Number(regionId);
      const cities = await this.prisma.city.findMany({
        where: { regionId: parsedId },
      });

      if (!cities) {
        throw new NotFoundError(t.noCities);
      }

      return cities;
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof NotFoundError ||
        error instanceof BadRequestError
      ) {
        throw error;
      }
      throw new InternalServerError(t.errorCities);
    }
  }

  async getCountiesByCity(
    cityId: number,
    sellerId: string,
    language: Language,
  ) {
    const t = locationMessages[language];
    try {
      if (!sellerId) {
        throw new UnAuthorizedError(t.unauthorized);
      }

      if (!cityId) {
        throw new BadRequestError(t.invalidCityId);
      }

      const parsedId = Number(cityId);
      const counties = await this.prisma.county.findMany({
        where: { cityId: parsedId },
      });

      if (!counties) {
        throw new NotFoundError(t.noCounties);
      }

      return counties;
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof NotFoundError ||
        error instanceof BadRequestError
      ) {
        throw error;
      }
      throw new InternalServerError(t.errorCounties);
    }
  }
}
