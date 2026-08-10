import { Injectable, Logger } from '@nestjs/common';
import { DevicePlatform } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestError } from '../common/exceptions';

/**
 * Push-token registry, written by the mobile app on launch.
 *
 * Expo hands the same push token to whichever install currently owns it, so a
 * token is unique platform-wide, not per seller. Registering a token that
 * already exists therefore **moves** it to the calling seller rather than
 * creating a second row — that is what happens when two people share a phone,
 * or when someone signs out and a colleague signs in. Getting this wrong sends
 * one user's notifications to another, so the upsert is on `pushToken`.
 */
@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async register({
    sellerId,
    pushToken,
    platform,
    deviceName,
  }: {
    sellerId: string;
    pushToken: string;
    platform: DevicePlatform;
    deviceName?: string | null;
  }) {
    if (!sellerId) throw new BadRequestError('Debe iniciar sesión');
    if (!pushToken.trim()) {
      throw new BadRequestError('Token de push inválido');
    }

    return this.prisma.sellerDevice.upsert({
      where: { pushToken },
      create: {
        sellerId,
        pushToken,
        platform,
        deviceName: deviceName ?? null,
      },
      update: {
        // Re-registration: claim the token for whoever is signed in now.
        sellerId,
        platform,
        deviceName: deviceName ?? null,
        isActive: true,
        lastSeenAt: new Date(),
      },
    });
  }

  /**
   * Called on sign-out. Deletes rather than deactivates: keeping a signed-out
   * device around only creates a chance of notifying the wrong person later.
   * Scoped to the caller so a token can't be unregistered by someone else.
   */
  async unregister(sellerId: string, pushToken: string): Promise<boolean> {
    if (!sellerId) throw new BadRequestError('Debe iniciar sesión');

    const { count } = await this.prisma.sellerDevice.deleteMany({
      where: { pushToken, sellerId },
    });
    return count > 0;
  }

  myDevices(sellerId: string) {
    return this.prisma.sellerDevice.findMany({
      where: { sellerId, isActive: true },
      orderBy: { lastSeenAt: 'desc' },
    });
  }
}
