import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  UnAuthorizedError,
  BadRequestError,
  NotFoundError,
  ConflictError,
  InternalServerError,
} from '../common/exceptions';
import { AdminType, Language } from '../graphql/enums';
import { locationMessages } from './location.i18n';
import {
  CreateCountryInput,
  CreateRegionInput,
  CreateCityInput,
  CreateCountyInput,
  CountryUpsertRowInput,
  CountryTranslationUpsertRowInput,
  RegionUpsertRowInput,
  CityUpsertRowInput,
  CountyUpsertRowInput,
} from './dto';
import {
  calculatePrismaParams,
  createPaginatedResponse,
} from '../utils/pagination';
import {
  pickDefined,
  requireBulkFields,
  processBulkRows,
} from '../common/bulk';

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getRawCountries({
    adminId,
    language,
    page = 1,
    pageSize = 10,
  }: {
    adminId: string;
    language: Language;
    page?: number;
    pageSize?: number;
  }) {
    const t = locationMessages[language];
    try {
      if (!adminId) {
        throw new UnAuthorizedError(t.unauthorized);
      }

      const { skip, take } = calculatePrismaParams(page, pageSize);

      const [count, countries] = await Promise.all([
        this.prisma.country.count(),
        this.prisma.country.findMany({
          skip,
          take,
          orderBy: { id: 'asc' },
        }),
      ]);

      return createPaginatedResponse(countries, count, page, pageSize);
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

  async getRawCountryTranslations({
    adminId,
    language,
    countryId,
    page = 1,
    pageSize = 10,
  }: {
    adminId: string;
    language: Language;
    countryId?: number;
    page?: number;
    pageSize?: number;
  }) {
    const t = locationMessages[language];
    try {
      if (!adminId) {
        throw new UnAuthorizedError(t.unauthorized);
      }

      const where = countryId ? { countryId } : {};
      const { skip, take } = calculatePrismaParams(page, pageSize);

      const [count, translations] = await Promise.all([
        this.prisma.countryTranslation.count({ where }),
        this.prisma.countryTranslation.findMany({
          where,
          skip,
          take,
          orderBy: { id: 'asc' },
        }),
      ]);

      return createPaginatedResponse(translations, count, page, pageSize);
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

  async getRawRegions({
    adminId,
    language,
    countryId,
    page = 1,
    pageSize = 10,
  }: {
    adminId: string;
    language: Language;
    countryId?: number;
    page?: number;
    pageSize?: number;
  }) {
    const t = locationMessages[language];
    try {
      if (!adminId) {
        throw new UnAuthorizedError(t.unauthorized);
      }

      const where = countryId ? { countryId } : {};
      const { skip, take } = calculatePrismaParams(page, pageSize);

      const [count, regions] = await Promise.all([
        this.prisma.region.count({ where }),
        this.prisma.region.findMany({
          where,
          skip,
          take,
          orderBy: { id: 'asc' },
        }),
      ]);

      return createPaginatedResponse(regions, count, page, pageSize);
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof NotFoundError
      ) {
        throw error;
      }
      throw new InternalServerError(t.errorRegions);
    }
  }

  async getRawCities({
    adminId,
    language,
    regionId,
    page = 1,
    pageSize = 10,
  }: {
    adminId: string;
    language: Language;
    regionId?: number;
    page?: number;
    pageSize?: number;
  }) {
    const t = locationMessages[language];
    try {
      if (!adminId) {
        throw new UnAuthorizedError(t.unauthorized);
      }

      const where = regionId ? { regionId } : {};
      const { skip, take } = calculatePrismaParams(page, pageSize);

      const [count, cities] = await Promise.all([
        this.prisma.city.count({ where }),
        this.prisma.city.findMany({
          where,
          skip,
          take,
          orderBy: { id: 'asc' },
        }),
      ]);

      return createPaginatedResponse(cities, count, page, pageSize);
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof NotFoundError
      ) {
        throw error;
      }
      throw new InternalServerError(t.errorCities);
    }
  }

  async getRawCounties({
    adminId,
    language,
    cityId,
    page = 1,
    pageSize = 10,
  }: {
    adminId: string;
    language: Language;
    cityId?: number;
    page?: number;
    pageSize?: number;
  }) {
    const t = locationMessages[language];
    try {
      if (!adminId) {
        throw new UnAuthorizedError(t.unauthorized);
      }

      const where = cityId ? { cityId } : {};
      const { skip, take } = calculatePrismaParams(page, pageSize);

      const [count, counties] = await Promise.all([
        this.prisma.county.count({ where }),
        this.prisma.county.findMany({
          where,
          skip,
          take,
          orderBy: { id: 'asc' },
        }),
      ]);

      return createPaginatedResponse(counties, count, page, pageSize);
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof NotFoundError
      ) {
        throw error;
      }
      throw new InternalServerError(t.errorCounties);
    }
  }

  async getCountries({
    sellerId,
    adminId,
    language,
  }: {
    sellerId?: string;
    adminId?: string;
    language: Language;
  }) {
    const t = locationMessages[language];
    try {
      if (!sellerId && !adminId) {
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

  async getRegionsByCountry({
    countryId,
    sellerId,
    adminId,
    language,
  }: {
    countryId: number;
    sellerId?: string;
    adminId?: string;
    language: Language;
  }) {
    const t = locationMessages[language];
    try {
      if (!sellerId && !adminId) {
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

  async getCitiesByRegion({
    regionId,
    sellerId,
    adminId,
    language,
  }: {
    regionId: number;
    sellerId?: string;
    adminId?: string;
    language: Language;
  }) {
    const t = locationMessages[language];
    try {
      if (!sellerId && !adminId) {
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

  // ─── Mutations (Platform Admin only) ──────────────────────────────────────────

  private async assertPlatformAdmin({
    adminId,
    t,
  }: {
    adminId: string;
    t: { unauthorized: string; forbiddenNotPlatformAdmin: string };
  }) {
    if (!adminId) {
      throw new UnAuthorizedError(t.unauthorized);
    }

    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
      select: { adminType: true },
    });

    if (!admin || (admin.adminType as AdminType) !== AdminType.PLATFORM) {
      throw new UnAuthorizedError(t.forbiddenNotPlatformAdmin);
    }
  }

  async createCountry({
    adminId,
    input,
    language,
  }: {
    adminId: string;
    input: CreateCountryInput;
    language: Language;
  }) {
    const t = locationMessages[language];
    try {
      await this.assertPlatformAdmin({ adminId, t });

      const country = await this.prisma.country.create({
        data: {
          translation: {
            create: input.translations.map((tr) => ({
              language: tr.language,
              name: tr.name,
            })),
          },
        },
        include: { translation: true },
      });

      return country;
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      throw new InternalServerError(t.errorCreateCountry);
    }
  }

  async updateCountry({
    adminId,
    countryId,
    input,
    language,
  }: {
    adminId: string;
    countryId: number;
    input: CreateCountryInput;
    language: Language;
  }) {
    const t = locationMessages[language];
    try {
      await this.assertPlatformAdmin({ adminId, t });

      const existing = await this.prisma.country.findUnique({
        where: { id: countryId },
        select: { id: true },
      });

      if (!existing) {
        throw new NotFoundError(t.countryNotFound);
      }

      // Replace the full set of translations so updates don't accumulate
      // duplicate rows for the same language.
      const country = await this.prisma.country.update({
        where: { id: countryId },
        data: {
          translation: {
            deleteMany: {},
            create: input.translations.map((tr) => ({
              language: tr.language,
              name: tr.name,
            })),
          },
        },
        include: { translation: true },
      });

      return country;
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof NotFoundError
      ) {
        throw error;
      }
      throw new InternalServerError(t.errorUpdateCountry);
    }
  }

  async createRegion({
    adminId,
    input,
    language,
  }: {
    adminId: string;
    input: CreateRegionInput;
    language: Language;
  }) {
    const t = locationMessages[language];
    try {
      await this.assertPlatformAdmin({ adminId, t });

      const region = await this.prisma.region.create({
        data: {
          region: input.region,
          countryId: input.countryId,
        },
      });

      return region;
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      throw new InternalServerError(t.errorCreateRegion);
    }
  }

  async updateRegion({
    adminId,
    regionId,
    input,
    language,
  }: {
    adminId: string;
    regionId: number;
    input: CreateRegionInput;
    language: Language;
  }) {
    const t = locationMessages[language];
    try {
      await this.assertPlatformAdmin({ adminId, t });

      const existing = await this.prisma.region.findUnique({
        where: { id: regionId },
        select: { id: true },
      });

      if (!existing) {
        throw new NotFoundError(t.regionNotFound);
      }

      const region = await this.prisma.region.update({
        where: { id: regionId },
        data: {
          region: input.region,
          countryId: input.countryId,
        },
      });

      return region;
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof NotFoundError
      ) {
        throw error;
      }
      throw new InternalServerError(t.errorUpdateRegion);
    }
  }

  async createCity({
    adminId,
    input,
    language,
  }: {
    adminId: string;
    input: CreateCityInput;
    language: Language;
  }) {
    const t = locationMessages[language];
    try {
      await this.assertPlatformAdmin({ adminId, t });

      const city = await this.prisma.city.create({
        data: {
          city: input.city,
          regionId: input.regionId,
        },
      });

      return city;
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      throw new InternalServerError(t.errorCreateCity);
    }
  }

  async updateCity({
    adminId,
    cityId,
    input,
    language,
  }: {
    adminId: string;
    cityId: number;
    input: CreateCityInput;
    language: Language;
  }) {
    const t = locationMessages[language];
    try {
      await this.assertPlatformAdmin({ adminId, t });

      const existing = await this.prisma.city.findUnique({
        where: { id: cityId },
        select: { id: true },
      });

      if (!existing) {
        throw new NotFoundError(t.cityNotFound);
      }

      const city = await this.prisma.city.update({
        where: { id: cityId },
        data: {
          city: input.city,
          regionId: input.regionId,
        },
      });

      return city;
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof NotFoundError
      ) {
        throw error;
      }
      throw new InternalServerError(t.errorUpdateCity);
    }
  }

  async createCounty({
    adminId,
    input,
    language,
  }: {
    adminId: string;
    input: CreateCountyInput;
    language: Language;
  }) {
    const t = locationMessages[language];
    try {
      await this.assertPlatformAdmin({ adminId, t });

      const county = await this.prisma.county.create({
        data: {
          county: input.county,
          cityId: input.cityId,
        },
      });

      return county;
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      throw new InternalServerError(t.errorCreateCounty);
    }
  }

  async updateCounty({
    adminId,
    countyId,
    input,
    language,
  }: {
    adminId: string;
    countyId: number;
    input: CreateCountyInput;
    language: Language;
  }) {
    const t = locationMessages[language];
    try {
      await this.assertPlatformAdmin({ adminId, t });

      const existing = await this.prisma.county.findUnique({
        where: { id: countyId },
        select: { id: true },
      });

      if (!existing) {
        throw new NotFoundError(t.countyNotFound);
      }

      const county = await this.prisma.county.update({
        where: { id: countyId },
        data: {
          county: input.county,
          cityId: input.cityId,
        },
      });

      return county;
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof NotFoundError
      ) {
        throw error;
      }
      throw new InternalServerError(t.errorUpdateCounty);
    }
  }

  async getCountiesByCity({
    cityId,
    sellerId,
    adminId,
    language,
  }: {
    cityId: number;
    sellerId?: string;
    adminId?: string;
    language: Language;
  }) {
    const t = locationMessages[language];
    try {
      if (!sellerId && !adminId) {
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

  async deleteCountry({
    adminId,
    countryId,
    language,
  }: {
    adminId: string;
    countryId: number;
    language: Language;
  }) {
    const t = locationMessages[language];
    try {
      await this.assertPlatformAdmin({ adminId, t });

      const existing = await this.prisma.country.findUnique({
        where: { id: countryId },
        include: { translation: true },
      });

      if (!existing) {
        throw new NotFoundError(t.countryNotFound);
      }

      const [regions, sellers, admins, personPricing, businessPricing] =
        await Promise.all([
          this.prisma.region.count({ where: { countryId } }),
          this.prisma.seller.count({ where: { countryId } }),
          this.prisma.admin.count({ where: { countryId } }),
          this.prisma.personMembershipPricing.count({ where: { countryId } }),
          this.prisma.businessMembershipPricing.count({ where: { countryId } }),
        ]);

      if (regions + sellers + admins + personPricing + businessPricing > 0) {
        throw new ConflictError(t.countryInUse);
      }

      // Translations are removed automatically (onDelete: Cascade).
      await this.prisma.country.delete({ where: { id: countryId } });

      return existing;
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof NotFoundError ||
        error instanceof ConflictError
      ) {
        throw error;
      }
      throw new InternalServerError(t.errorDeleteCountry);
    }
  }

  async deleteRegion({
    adminId,
    regionId,
    language,
  }: {
    adminId: string;
    regionId: number;
    language: Language;
  }) {
    const t = locationMessages[language];
    try {
      await this.assertPlatformAdmin({ adminId, t });

      const existing = await this.prisma.region.findUnique({
        where: { id: regionId },
      });

      if (!existing) {
        throw new NotFoundError(t.regionNotFound);
      }

      const [cities, sellers, admins] = await Promise.all([
        this.prisma.city.count({ where: { regionId } }),
        this.prisma.seller.count({ where: { regionId } }),
        this.prisma.admin.count({ where: { regionId } }),
      ]);

      if (cities + sellers + admins > 0) {
        throw new ConflictError(t.regionInUse);
      }

      await this.prisma.region.delete({ where: { id: regionId } });

      return existing;
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof NotFoundError ||
        error instanceof ConflictError
      ) {
        throw error;
      }
      throw new InternalServerError(t.errorDeleteRegion);
    }
  }

  async deleteCity({
    adminId,
    cityId,
    language,
  }: {
    adminId: string;
    cityId: number;
    language: Language;
  }) {
    const t = locationMessages[language];
    try {
      await this.assertPlatformAdmin({ adminId, t });

      const existing = await this.prisma.city.findUnique({
        where: { id: cityId },
      });

      if (!existing) {
        throw new NotFoundError(t.cityNotFound);
      }

      const [counties, sellers, admins] = await Promise.all([
        this.prisma.county.count({ where: { cityId } }),
        this.prisma.seller.count({ where: { cityId } }),
        this.prisma.admin.count({ where: { cityId } }),
      ]);

      if (counties + sellers + admins > 0) {
        throw new ConflictError(t.cityInUse);
      }

      await this.prisma.city.delete({ where: { id: cityId } });

      return existing;
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof NotFoundError ||
        error instanceof ConflictError
      ) {
        throw error;
      }
      throw new InternalServerError(t.errorDeleteCity);
    }
  }

  async deleteCounty({
    adminId,
    countyId,
    language,
  }: {
    adminId: string;
    countyId: number;
    language: Language;
  }) {
    const t = locationMessages[language];
    try {
      await this.assertPlatformAdmin({ adminId, t });

      const existing = await this.prisma.county.findUnique({
        where: { id: countyId },
      });

      if (!existing) {
        throw new NotFoundError(t.countyNotFound);
      }

      const [sellers, admins] = await Promise.all([
        this.prisma.seller.count({ where: { countyId } }),
        this.prisma.admin.count({ where: { countyId } }),
      ]);

      if (sellers + admins > 0) {
        throw new ConflictError(t.countyInUse);
      }

      await this.prisma.county.delete({ where: { id: countyId } });

      return existing;
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof NotFoundError ||
        error instanceof ConflictError
      ) {
        throw error;
      }
      throw new InternalServerError(t.errorDeleteCounty);
    }
  }

  // ─── Bulk upserts (admin panel XLSX import / row edits) ─────────────────────
  // Rows with an id update, rows without an id create; country translation rows
  // without an id are matched by (countryId, language). Per-row failures are
  // reported in `errors[]` without aborting the batch.

  async bulkUpsertCountries({
    adminId,
    rows,
    language,
  }: {
    adminId: string;
    rows: CountryUpsertRowInput[];
    language: Language;
  }) {
    await this.assertPlatformAdmin({ adminId, t: locationMessages[language] });

    return processBulkRows(this.logger, rows, async (row) => {
      const data = pickDefined({ code: row.code });
      if (row.id != null) {
        await this.prisma.country.update({ where: { id: row.id }, data });
        return { outcome: 'updated', id: row.id };
      }
      const created = await this.prisma.country.create({ data });
      return { outcome: 'created', id: created.id };
    });
  }

  async bulkUpsertCountryTranslations({
    adminId,
    rows,
    language,
  }: {
    adminId: string;
    rows: CountryTranslationUpsertRowInput[];
    language: Language;
  }) {
    await this.assertPlatformAdmin({ adminId, t: locationMessages[language] });

    return processBulkRows(this.logger, rows, async (row) => {
      const data = pickDefined({
        countryId: row.countryId,
        language: row.language,
        name: row.name,
      });

      if (row.id != null) {
        await this.prisma.countryTranslation.update({
          where: { id: row.id },
          data,
        });
        return { outcome: 'updated', id: row.id };
      }

      const { countryId, language: rowLanguage } = row;
      if (countryId == null || !rowLanguage) {
        throw new Error(
          'countryId and language are required when no id is provided',
        );
      }

      // No DB unique on (countryId, language), so match the pair manually to
      // keep re-imports idempotent instead of appending duplicate rows.
      const existing = await this.prisma.countryTranslation.findFirst({
        where: { countryId, language: rowLanguage },
        select: { id: true },
      });

      if (existing) {
        await this.prisma.countryTranslation.update({
          where: { id: existing.id },
          data,
        });
        return { outcome: 'updated', id: existing.id };
      }

      requireBulkFields(row, ['name']);
      const created = await this.prisma.countryTranslation.create({
        data: { countryId, language: rowLanguage, name: row.name! },
      });
      return { outcome: 'created', id: created.id };
    });
  }

  async bulkUpsertRegions({
    adminId,
    rows,
    language,
  }: {
    adminId: string;
    rows: RegionUpsertRowInput[];
    language: Language;
  }) {
    await this.assertPlatformAdmin({ adminId, t: locationMessages[language] });

    return processBulkRows(this.logger, rows, async (row) => {
      const data = pickDefined({
        region: row.region,
        countryId: row.countryId,
      });
      if (row.id != null) {
        await this.prisma.region.update({ where: { id: row.id }, data });
        return { outcome: 'updated', id: row.id };
      }
      requireBulkFields(row, ['region', 'countryId']);
      const created = await this.prisma.region.create({
        data: { region: row.region!, countryId: row.countryId! },
      });
      return { outcome: 'created', id: created.id };
    });
  }

  async bulkUpsertCities({
    adminId,
    rows,
    language,
  }: {
    adminId: string;
    rows: CityUpsertRowInput[];
    language: Language;
  }) {
    await this.assertPlatformAdmin({ adminId, t: locationMessages[language] });

    return processBulkRows(this.logger, rows, async (row) => {
      const data = pickDefined({ city: row.city, regionId: row.regionId });
      if (row.id != null) {
        await this.prisma.city.update({ where: { id: row.id }, data });
        return { outcome: 'updated', id: row.id };
      }
      requireBulkFields(row, ['city', 'regionId']);
      const created = await this.prisma.city.create({
        data: { city: row.city!, regionId: row.regionId! },
      });
      return { outcome: 'created', id: created.id };
    });
  }

  async bulkUpsertCounties({
    adminId,
    rows,
    language,
  }: {
    adminId: string;
    rows: CountyUpsertRowInput[];
    language: Language;
  }) {
    await this.assertPlatformAdmin({ adminId, t: locationMessages[language] });

    return processBulkRows(this.logger, rows, async (row) => {
      const data = pickDefined({ county: row.county, cityId: row.cityId });
      if (row.id != null) {
        await this.prisma.county.update({ where: { id: row.id }, data });
        return { outcome: 'updated', id: row.id };
      }
      requireBulkFields(row, ['county', 'cityId']);
      const created = await this.prisma.county.create({
        data: { county: row.county!, cityId: row.cityId! },
      });
      return { outcome: 'created', id: created.id };
    });
  }
}
