import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  UnAuthorizedError,
  BadRequestError,
  NotFoundError,
  InternalServerError,
} from '../common/exceptions';

@Injectable()
export class LocationService {
  constructor(private readonly prisma: PrismaService) {}

  async getCountries(sellerId: string) {
    try {
      if (!sellerId) {
        throw new UnAuthorizedError('No autorizado');
      }

      const countries = await this.prisma.country.findMany();

      if (!countries) {
        throw new NotFoundError('No hay países disponibles');
      }

      return countries;
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof NotFoundError
      ) {
        throw error;
      }
      throw new InternalServerError('Error al obtener los países');
    }
  }

  async getRegionsByCountry(countryId: number, sellerId: string) {
    try {
      if (!sellerId) {
        throw new UnAuthorizedError('No autorizado');
      }

      if (!countryId) {
        throw new BadRequestError('No se proporcionó un ID de país válido');
      }

      const parsedId = Number(countryId);
      const regions = await this.prisma.region.findMany({
        where: { countryId: parsedId },
      });

      if (!regions) {
        throw new NotFoundError('No hay regiones disponibles');
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
      throw new InternalServerError('Error al obtener las regiones');
    }
  }

  async getCitiesByRegion(regionId: number, sellerId: string) {
    try {
      if (!sellerId) {
        throw new UnAuthorizedError('No autorizado');
      }

      if (!regionId) {
        throw new BadRequestError('No se proporcionó un ID de región válido');
      }

      const parsedId = Number(regionId);
      const cities = await this.prisma.city.findMany({
        where: { regionId: parsedId },
      });

      if (!cities) {
        throw new NotFoundError('No hay ciudades disponibles');
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
      throw new InternalServerError('Error al obtener las ciudades');
    }
  }

  async getCountiesByCity(cityId: number, sellerId: string) {
    try {
      if (!sellerId) {
        throw new UnAuthorizedError('No autorizado');
      }

      if (!cityId) {
        throw new BadRequestError('No se proporcionó un ID de ciudad válido');
      }

      const parsedId = Number(cityId);
      const counties = await this.prisma.county.findMany({
        where: { cityId: parsedId },
      });

      if (!counties) {
        throw new NotFoundError('No hay comunas disponibles');
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
      throw new InternalServerError('Error al obtener las comunas');
    }
  }
}
