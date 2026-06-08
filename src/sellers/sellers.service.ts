import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import {
  UnAuthorizedError,
  BadRequestError,
  NotFoundError,
  InternalServerError,
} from '../common/exceptions';
import { hash, genSalt } from 'bcrypt';
import {
  RegisterPersonInput,
  RegisterBusinessInput,
  UpdateSellerInput,
  UpdatePersonProfileInput,
  UpdateBusinessProfileInput,
  UpdateSellerPreferencesInput,
  BanSellerInput,
} from './dto';
import {
  Language,
  SellerType,
  AdminType,
  AdminRole,
  AdminPermission,
} from '../graphql/enums';
import { sellerMessages, SellerMessages } from './sellers.i18n';
import {
  calculatePrismaParams,
  createPaginatedResponse,
} from '../utils/pagination';

@Injectable()
export class SellersService {
  private readonly logger = new Logger(SellersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  private getSellerInclude(language: Language) {
    return {
      personProfile: true,
      businessProfile: true,
      country: {
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          translation: { where: { language }, select: { name: true } },
        },
      },
      region: true,
      city: true,
      county: true,
      sellerLevel: true,
      sellerPreferences: true,
    };
  }

  private mapCountry(
    country: {
      id: number;
      createdAt: Date;
      updatedAt: Date;
      translation?: { name: string }[];
    } | null,
  ) {
    if (!country) return null;
    return {
      id: country.id,
      country: country.translation?.[0]?.name ?? null,
      createdAt: country.createdAt,
      updatedAt: country.updatedAt,
    };
  }

  async getSellers(
    adminId: string,
    language: Language,
    sellerType?: SellerType,
    isActive?: boolean,
    isVerified?: boolean,
    page: number = 1,
    pageSize: number = 10,
    searchQuery?: string,
  ) {
    const t = sellerMessages[language];
    try {
      if (!adminId) {
        throw new UnAuthorizedError(t.unauthorized);
      }

      const where: Record<string, any> = {};
      if (sellerType) where.sellerType = sellerType;
      if (isActive !== undefined) where.isActive = isActive;
      if (isVerified !== undefined) where.isVerified = isVerified;
      if (searchQuery) {
        where.OR = [{ email: { contains: searchQuery, mode: 'insensitive' } }];
      }

      const { skip, take } = calculatePrismaParams(page, pageSize);

      const [count, sellers] = await Promise.all([
        this.prisma.seller.count({ where }),
        this.prisma.seller.findMany({
          where,
          include: this.getSellerInclude(language),
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        }),
      ]);

      const nodes = sellers.map((seller) => ({
        ...seller,
        country: this.mapCountry(seller.country),
      }));

      return createPaginatedResponse(nodes, count, page, pageSize);
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      this.logger.error(t.errorGetSellers, error);
      throw new InternalServerError(t.errorGetSellers);
    }
  }

  async getSellerById(id: string, sellerId: string, language: Language) {
    const t = sellerMessages[language];
    try {
      if (!sellerId) {
        throw new UnAuthorizedError(t.unauthorized);
      }

      const seller = await this.prisma.seller.findUnique({
        where: { id },
        include: this.getSellerInclude(language),
      });

      if (!seller) return null;
      return { ...seller, country: this.mapCountry(seller.country) };
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      this.logger.error(t.errorGetSellerById, error);
      throw new InternalServerError(t.errorGetSellerById);
    }
  }

  async getSellerByIdForReference(id: string) {
    try {
      const seller = await this.prisma.seller.findUnique({
        where: { id },
        include: this.getSellerInclude(Language.ES),
      });

      if (!seller) return null;
      return { ...seller, country: this.mapCountry(seller.country) };
    } catch (error) {
      this.logger.error('Error al obtener seller para federación:', error);
      return null;
    }
  }

  async getMe(sellerId: string, language: Language) {
    const t = sellerMessages[language];
    try {
      if (!sellerId) {
        throw new UnAuthorizedError(t.unauthorized);
      }

      const sellerType = await this.prisma.seller.findUnique({
        where: { id: sellerId },
        select: { sellerType: true },
      });

      if (sellerType?.sellerType === SellerType.PERSON) {
        const userProfile = await this.prisma.seller.findUnique({
          where: { id: sellerId },
          include: {
            personProfile: true,
            country: {
              select: {
                id: true,
                createdAt: true,
                updatedAt: true,
                translation: { where: { language }, select: { name: true } },
              },
            },
            region: true,
            city: true,
            county: true,
            sellerLevel: true,
            sellerPreferences: true,
          },
        });

        if (!userProfile) return null;

        const { country, ...rest } = userProfile;
        const mappedProfile = {
          ...rest,
          country: country
            ? {
                id: country.id,
                country: country.translation?.[0]?.name ?? null,
                createdAt: country.createdAt,
                updatedAt: country.updatedAt,
              }
            : null,
        };

        return mappedProfile;
      } else if (
        sellerType?.sellerType === SellerType.STARTUP ||
        sellerType?.sellerType === SellerType.COMPANY
      ) {
        const businessProfile = await this.prisma.seller.findUnique({
          where: { id: sellerId },
          include: {
            businessProfile: true,
            country: {
              select: {
                id: true,
                createdAt: true,
                updatedAt: true,
                translation: { where: { language }, select: { name: true } },
              },
            },
            region: true,
            city: true,
            county: true,
            sellerLevel: true,
            sellerPreferences: true,
          },
        });

        if (!businessProfile) return null;
        const { country, ...businessRest } = businessProfile;
        return { ...businessRest, country: this.mapCountry(country) };
      }

      return null;
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      this.logger.error(t.errorGetMe, error);
      throw new InternalServerError(t.errorGetMe);
    }
  }

  async getSellerLevels(language: Language) {
    const t = sellerMessages[language];
    try {
      const levels = await this.prisma.sellerLevel.findMany({
        orderBy: { levelName: 'asc' },
      });
      return levels;
    } catch (error) {
      this.logger.error(t.errorGetSellerLevels, error);
      throw new InternalServerError(t.errorGetSellerLevels);
    }
  }

  async getSellerLevel(id: string, language: Language) {
    const t = sellerMessages[language];
    try {
      const level = await this.prisma.sellerLevel.findUnique({
        where: { id: Number(id) },
      });
      return level;
    } catch (error) {
      this.logger.error(t.errorGetSellerLevel, error);
      throw new InternalServerError(t.errorGetSellerLevel);
    }
  }

  async registerPerson(input: RegisterPersonInput, language: Language) {
    const t = sellerMessages[language];
    try {
      const { email, password, firstName, lastName } = input;

      const existingUser = await this.prisma.seller.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        throw new BadRequestError(t.emailAlreadyExists);
      }

      const salt = await genSalt(12);
      const hashedPassword = await hash(password, salt);

      const pointsForRegistration =
        await this.prisma.pointsByTransactionKind.findFirst({
          where: { transactionKind: 'REGISTRATION' },
        });

      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.seller.create({
          data: {
            email: email.toLowerCase(),
            password: hashedPassword,
            sellerType: SellerType.PERSON,
            updatedAt: new Date(),
            points: pointsForRegistration?.pointsAwarded || 10,
          },
        });

        await tx.personProfile.create({
          data: {
            sellerId: user.id,
            firstName,
            lastName,
          },
        });

        return user;
      });

      await this.mailService.sendWelcomeEmail(
        email.toLowerCase(),
        firstName,
        '',
        language.toLowerCase() as Language,
      );

      return result;
    } catch (error) {
      if (error instanceof BadRequestError) throw error;
      this.logger.error(t.errorRegisterPerson, error);
      throw new InternalServerError(t.errorRegisterPerson);
    }
  }

  async registerBusiness(input: RegisterBusinessInput, language: Language) {
    const t = sellerMessages[language];
    try {
      const { email, password, businessName, businessType, sellerType } = input;

      const existingUser = await this.prisma.seller.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        throw new BadRequestError(t.emailAlreadyExists);
      }

      const salt = await genSalt(12);
      const hashedPassword = await hash(password, salt);

      const pointsForRegistration =
        await this.prisma.pointsByTransactionKind.findFirst({
          where: { transactionKind: 'REGISTRATION' },
        });

      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.seller.create({
          data: {
            email: email.toLowerCase(),
            password: hashedPassword,
            sellerType,
            updatedAt: new Date(),
            points: pointsForRegistration?.pointsAwarded || 10,
          },
        });

        await tx.businessProfile.create({
          data: {
            sellerId: user.id,
            businessName,
            updatedAt: new Date(),
            businessType,
          },
        });

        return user;
      });

      await this.mailService.sendWelcomeEmail(
        email.toLowerCase(),
        '',
        businessName,
        language.toLowerCase() as Language,
      );

      return result;
    } catch (error) {
      if (error instanceof BadRequestError) throw error;
      this.logger.error(t.errorRegisterBusiness, error);
      throw new InternalServerError(t.errorRegisterBusiness);
    }
  }

  async updateSeller(
    sellerId: string,
    input: UpdateSellerInput,
    language: Language,
  ) {
    const t = sellerMessages[language];
    try {
      if (!sellerId) {
        throw new UnAuthorizedError(t.unauthorized);
      }

      const result = await this.prisma.seller.update({
        where: { id: sellerId },
        data: input,
        include: {
          country: {
            select: {
              id: true,
              createdAt: true,
              updatedAt: true,
              translation: { where: { language }, select: { name: true } },
            },
          },
          region: true,
          city: true,
          county: true,
          sellerLevel: true,
        },
      });

      const { country, ...updateRest } = result;
      return { ...updateRest, country: this.mapCountry(country) };
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      this.logger.error(t.errorUpdateSeller, error);
      throw new InternalServerError(t.errorUpdateSeller);
    }
  }

  async updatePersonProfile(
    sellerId: string,
    input: UpdatePersonProfileInput,
    language: Language,
  ) {
    const t = sellerMessages[language];
    try {
      if (!sellerId) {
        throw new UnAuthorizedError(t.unauthorized);
      }

      const processedInput: UpdatePersonProfileInput & {
        birthday?: Date | string;
      } = { ...input };
      if (
        processedInput.birthday &&
        typeof processedInput.birthday === 'string'
      ) {
        const date = new Date(processedInput.birthday);
        const now = new Date();
        date.setHours(
          now.getHours(),
          now.getMinutes(),
          now.getSeconds(),
          now.getMilliseconds(),
        );
        processedInput.birthday = date;
      }

      const person = await this.prisma.personProfile.update({
        where: { sellerId },
        data: processedInput,
      });

      return person;
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      this.logger.error(t.errorUpdatePersonProfile, error);
      throw new InternalServerError(t.errorUpdatePersonProfile);
    }
  }

  async updateBusinessProfile(
    sellerId: string,
    input: UpdateBusinessProfileInput,
    language: Language,
  ) {
    const t = sellerMessages[language];
    try {
      if (!sellerId) {
        throw new UnAuthorizedError(t.unauthorized);
      }

      const business = await this.prisma.businessProfile.update({
        where: { sellerId },
        data: input,
      });

      return business;
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      this.logger.error(t.errorUpdateBusinessProfile, error);
      throw new InternalServerError(t.errorUpdateBusinessProfile);
    }
  }

  async updateSellerPreferences(
    sellerId: string,
    input: UpdateSellerPreferencesInput,
    language: Language,
  ) {
    const t = sellerMessages[language];
    try {
      if (!sellerId) {
        throw new UnAuthorizedError(t.unauthorized);
      }

      const preferences = await this.prisma.sellerPreferences.upsert({
        where: { sellerId },
        update: input,
        create: {
          sellerId,
          ...input,
        },
      });

      return preferences;
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      this.logger.error(t.errorUpdatePreferences, error);
      throw new InternalServerError(t.errorUpdatePreferences);
    }
  }

  /**
   * Ensures the caller is an admin allowed to moderate sellers. Only active
   * PLATFORM admins who are SUPER_ADMIN or hold the given permission may act.
   */
  private async assertAdminCan(
    adminId: string,
    permission: AdminPermission,
    t: SellerMessages,
  ) {
    if (!adminId) {
      throw new UnAuthorizedError(t.unauthorized);
    }

    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        adminType: true,
        role: true,
        permissions: true,
        isActive: true,
      },
    });

    const allowed =
      !!admin &&
      admin.isActive &&
      (admin.adminType as AdminType) === AdminType.PLATFORM &&
      ((admin.role as AdminRole) === AdminRole.SUPER_ADMIN ||
        (admin.permissions as AdminPermission[]).includes(permission));

    if (!allowed) {
      throw new UnAuthorizedError(t.forbidden);
    }
  }

  /**
   * Toggles a seller's verified status. Done manually by an admin after
   * reviewing the account and its initial activity. Requires MANAGE_USERS.
   */
  async verifySeller(adminId: string, id: string, language: Language) {
    const t = sellerMessages[language];
    try {
      await this.assertAdminCan(adminId, AdminPermission.MANAGE_USERS, t);

      const seller = await this.prisma.seller.findUnique({
        where: { id },
        select: { id: true, isVerified: true },
      });

      if (!seller) {
        throw new NotFoundError(t.sellerNotFound);
      }

      const updated = await this.prisma.seller.update({
        where: { id },
        data: { isVerified: !seller.isVerified },
        include: this.getSellerInclude(language),
      });

      return { ...updated, country: this.mapCountry(updated.country) };
    } catch (error) {
      if (error instanceof UnAuthorizedError || error instanceof NotFoundError)
        throw error;
      this.logger.error(t.errorVerifySeller, error);
      throw new InternalServerError(t.errorVerifySeller);
    }
  }

  /**
   * Counts every still-open obligation tied to a seller — whether they act as
   * buyer/seller, payer/receiver, client/provider. All subgraphs share one
   * physical database, but `ekoru-users`' Prisma client only models the entities
   * it owns, so these cross-service tables (Order, Payment, Quotation, …) are
   * reached with a single parameterised raw query. Run it inside the ban
   * transaction (pass `tx`) so the check and the ban commit atomically.
   *
   * "Open" definitions:
   *   • Order        — PENDING_PAYMENT, or PAID but not yet DELIVERED/RETURNED/CANCELED
   *   • Payment      — PENDING or PROCESSING
   *   • PaymentRefund— PENDING or PROCESSING
   *   • Quotation    — PENDING or ACCEPTED (agreed work not yet completed)
   *   • ServiceBooking — PENDING/CONFIRMED/IN_PROGRESS, or payment PENDING/PROCESSING
   *   • Exchange     — PENDING or ACCEPTED
   */
  private async getPendingObligations(
    client: Prisma.TransactionClient | PrismaService,
    sellerId: string,
  ) {
    const [row] = await client.$queryRaw<
      Array<{
        orders: number;
        payments: number;
        refunds: number;
        quotations: number;
        bookings: number;
        exchanges: number;
      }>
    >`
      SELECT
        (SELECT COUNT(*)::int FROM "Order" o
           JOIN "ShippingStatus" s ON s.id = o."shippingStatusId"
          WHERE (o."buyerId" = ${sellerId} OR o."sellerId" = ${sellerId})
            AND (o.status = 'PENDING_PAYMENT'
                 OR (o.status = 'PAID'
                     AND s.status NOT IN ('DELIVERED', 'RETURNED', 'CANCELED')))
        ) AS "orders",
        (SELECT COUNT(*)::int FROM "Payment"
          WHERE ("payerId" = ${sellerId} OR "receiverId" = ${sellerId})
            AND status IN ('PENDING', 'PROCESSING')
        ) AS "payments",
        (SELECT COUNT(*)::int FROM "PaymentRefund" r
           JOIN "Payment" p ON p.id = r."paymentId"
          WHERE (p."payerId" = ${sellerId} OR p."receiverId" = ${sellerId})
            AND r.status IN ('PENDING', 'PROCESSING')
        ) AS "refunds",
        (SELECT COUNT(*)::int FROM "Quotation"
          WHERE ("clientId" = ${sellerId} OR "providerId" = ${sellerId})
            AND status IN ('PENDING', 'ACCEPTED')
        ) AS "quotations",
        (SELECT COUNT(*)::int FROM "ServiceBooking"
          WHERE ("clientId" = ${sellerId} OR "providerId" = ${sellerId})
            AND (status IN ('PENDING', 'CONFIRMED', 'IN_PROGRESS')
                 OR "paymentStatus" IN ('PENDING', 'PROCESSING'))
        ) AS "bookings",
        (SELECT COUNT(*)::int FROM "Exchange" e
           JOIN "Product" po ON po.id = e."offeredProductId"
           JOIN "Product" pr ON pr.id = e."requestedProductId"
          WHERE (po."sellerId" = ${sellerId} OR pr."sellerId" = ${sellerId})
            AND e.status IN ('PENDING', 'ACCEPTED')
        ) AS "exchanges"
    `;

    const obligations = {
      orders: row?.orders ?? 0,
      payments: row?.payments ?? 0,
      refunds: row?.refunds ?? 0,
      quotations: row?.quotations ?? 0,
      bookings: row?.bookings ?? 0,
      exchanges: row?.exchanges ?? 0,
    };
    const total = Object.values(obligations).reduce((a, b) => a + b, 0);

    return { obligations, total };
  }

  /**
   * Bans a seller. A ban is only allowed once the seller has zero open
   * obligations (orders, payments, refunds, quotations, bookings, exchanges) —
   * otherwise it is hard-blocked and the open counts are returned in the error.
   *
   * Performed atomically (Serializable) so nothing new can slip in between the
   * check and the ban. On success the seller is deactivated (`isActive=false`)
   * and unverified (`isVerified=false`), a `BannedSeller` history row is written,
   * all refresh tokens are revoked, membership auto-renewal is stopped, and the
   * action is audited. Requires BAN_USERS.
   */
  async banSeller(
    adminId: string,
    id: string,
    input: BanSellerInput,
    language: Language,
  ) {
    const t = sellerMessages[language];
    try {
      await this.assertAdminCan(adminId, AdminPermission.BAN_USERS, t);

      const existing = await this.prisma.seller.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!existing) {
        throw new NotFoundError(t.sellerNotFound);
      }

      const updated = await this.prisma.$transaction(
        async (tx) => {
          // Only one ban may be active at a time.
          const activeBan = await tx.bannedSeller.findFirst({
            where: { sellerId: id, isActive: true },
            select: { id: true },
          });
          if (activeBan) {
            throw new BadRequestError(t.sellerAlreadyBanned);
          }

          // Hard gate: refuse the ban while anything is still in flight.
          const { obligations, total } = await this.getPendingObligations(
            tx,
            id,
          );
          if (total > 0) {
            throw new BadRequestError(t.sellerHasPendingObligations, {
              obligations,
            });
          }

          const seller = await tx.seller.update({
            where: { id },
            data: { isActive: false, isVerified: false },
            include: this.getSellerInclude(language),
          });

          const ban = await tx.bannedSeller.create({
            data: {
              sellerId: id,
              reasonCode: input.reasonCode,
              reason: input.reason,
              notes: input.notes ?? null,
              evidence: input.evidence ?? undefined,
              expiresAt: input.expiresAt ?? null,
              bannedById: adminId,
            },
            select: { id: true },
          });

          // Kill existing sessions. RefreshToken is owned by the gateway
          // subgraph, so it is reached via raw SQL on the shared database.
          await tx.$executeRaw`
            UPDATE "RefreshToken" SET "isRevoked" = true
            WHERE "userId" = ${id} AND "userType" = 'seller'
          `;

          // Stop billing: a banned account must never auto-renew a membership.
          await tx.personMembershipSubscription.updateMany({
            where: { sellerId: id, isActive: true },
            data: { isActive: false, autoRenew: false },
          });
          await tx.businessMembershipSubscription.updateMany({
            where: { sellerId: id, isActive: true },
            data: { isActive: false, autoRenew: false },
          });

          await tx.adminActivityLog.create({
            data: {
              adminId,
              action: 'BAN_SELLER',
              entityType: 'Seller',
              entityId: id,
              changes: { isActive: false, isVerified: false },
              metadata: {
                banId: ban.id,
                reasonCode: input.reasonCode,
                reason: input.reason,
                expiresAt: input.expiresAt
                  ? input.expiresAt.toISOString()
                  : null,
              },
            },
          });

          return seller;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      this.logger.warn(
        `Seller ${id} banned by admin ${adminId} — reason: ${input.reasonCode}`,
      );

      return { ...updated, country: this.mapCountry(updated.country) };
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof NotFoundError ||
        error instanceof BadRequestError
      )
        throw error;
      this.logger.error(t.errorBanSeller, error);
      throw new InternalServerError(t.errorBanSeller);
    }
  }

  /**
   * Lifts the seller's currently-active ban: the `BannedSeller` row is closed
   * (isActive=false, unbannedAt/By recorded) and the seller is reactivated.
   * `isVerified` is intentionally NOT restored — verification must be re-earned
   * through admin review. Requires BAN_USERS.
   */
  async reinstateSeller(
    adminId: string,
    id: string,
    language: Language,
    unbanReason?: string,
  ) {
    const t = sellerMessages[language];
    try {
      await this.assertAdminCan(adminId, AdminPermission.BAN_USERS, t);

      const existing = await this.prisma.seller.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!existing) {
        throw new NotFoundError(t.sellerNotFound);
      }

      const activeBan = await this.prisma.bannedSeller.findFirst({
        where: { sellerId: id, isActive: true },
        orderBy: { bannedAt: 'desc' },
        select: { id: true },
      });

      if (!activeBan) {
        throw new BadRequestError(t.sellerNotBanned);
      }

      const updated = await this.prisma.$transaction(async (tx) => {
        await tx.bannedSeller.update({
          where: { id: activeBan.id },
          data: {
            isActive: false,
            unbannedAt: new Date(),
            unbannedById: adminId,
            unbanReason: unbanReason ?? null,
          },
        });

        const seller = await tx.seller.update({
          where: { id },
          data: { isActive: true },
          include: this.getSellerInclude(language),
        });

        await tx.adminActivityLog.create({
          data: {
            adminId,
            action: 'REINSTATE_SELLER',
            entityType: 'Seller',
            entityId: id,
            changes: { isActive: true },
            metadata: { banId: activeBan.id, unbanReason: unbanReason ?? null },
          },
        });

        return seller;
      });

      this.logger.warn(
        `Seller ${id} reinstated by admin ${adminId}` +
          (unbanReason ? ` — reason: ${unbanReason}` : ''),
      );

      return { ...updated, country: this.mapCountry(updated.country) };
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof NotFoundError ||
        error instanceof BadRequestError
      )
        throw error;
      this.logger.error(t.errorReinstateSeller, error);
      throw new InternalServerError(t.errorReinstateSeller);
    }
  }

  resolveProfile(seller: any) {
    if (
      seller &&
      seller.sellerType === SellerType.PERSON &&
      seller.personProfile
    ) {
      return { ...seller.personProfile, __typename: 'PersonProfile' };
    }
    if (
      seller &&
      (seller.sellerType === SellerType.STARTUP ||
        seller.sellerType === SellerType.COMPANY) &&
      seller.businessProfile
    ) {
      return { ...seller.businessProfile, __typename: 'BusinessProfile' };
    }
    return null;
  }
}
