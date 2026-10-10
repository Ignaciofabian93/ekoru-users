import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { hash, genSalt } from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminPermission, Language } from '../../graphql/enums';
import { assertAdminCan } from '../../common/admin-access';
import {
  pickDefined,
  processBulkRows,
  requireBulkFields,
  type BulkResult,
} from '../../common/bulk';
import {
  calculatePrismaParams,
  createPaginatedResponse,
} from '../../utils/pagination';
import { sellerMessages } from '../sellers.i18n';
import {
  BusinessProfileUpsertRowInput,
  PersonProfileUpsertRowInput,
  SellerPreferencesUpsertRowInput,
  SellerUpsertRowInput,
} from './seller-bulk.input';

const MAX_PAGE_SIZE = 500;

/** JSON text from a spreadsheet cell: undefined keeps, empty clears. */
function jsonCell(
  value: string | undefined,
  field: string,
): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined {
  if (value === undefined) return undefined;
  if (value.trim() === '') return Prisma.DbNull;
  try {
    return JSON.parse(value) as Prisma.InputJsonValue;
  } catch {
    throw new Error(`${field}: not valid JSON`);
  }
}

/** ISO date from a spreadsheet cell: undefined keeps, empty clears. */
function dateCell(
  value: string | undefined,
  field: string,
): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value.trim() === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime()))
    throw new Error(`${field}: not a valid date`);
  return date;
}

const toJsonText = (value: Prisma.JsonValue | null): string | null =>
  value === null || value === undefined ? null : JSON.stringify(value);

/**
 * The sellers workbook in the admin panel: export every column as stored, edit
 * in a spreadsheet, import it back. For maintenance, bulk edits and restoring a
 * backup. Needs MANAGE_USERS.
 *
 * Values are taken as they are in the file. Nothing is emailed, no points are
 * awarded, and approval changes made here skip the approve/reject emails.
 * A seller created here (a new row, or a backup row whose id no longer exists)
 * gets a random password nobody knows: the person signs in after "forgot
 * password". Passwords are never exported.
 */
@Injectable()
export class SellerAdminService {
  private readonly logger = new Logger(SellerAdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  private assertCanManage(adminId: string | undefined, language: Language) {
    const t = sellerMessages[language];
    return assertAdminCan(this.prisma, {
      adminId,
      permission: AdminPermission.MANAGE_USERS,
      messages: { unauthorized: t.unauthorized, forbidden: t.forbidden },
    });
  }

  async rawSellers({
    adminId,
    language,
    page = 1,
    pageSize = 100,
    search,
    sellerType,
    ids,
  }: {
    adminId?: string;
    language: Language;
    page?: number;
    pageSize?: number;
    search?: string;
    sellerType?: string;
    ids?: string[];
  }) {
    await this.assertCanManage(adminId, language);
    const size = Math.min(Math.max(pageSize, 1), MAX_PAGE_SIZE);
    const { skip, take } = calculatePrismaParams(page, size);
    const where: Prisma.SellerWhereInput = {
      ...(ids?.length && { id: { in: ids } }),
      ...(sellerType && {
        sellerType: sellerType as Prisma.SellerWhereInput['sellerType'],
      }),
      ...(search && { email: { contains: search, mode: 'insensitive' } }),
    };
    const [count, rows] = await Promise.all([
      this.prisma.seller.count({ where }),
      this.prisma.seller.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip,
        take,
        // The password hash never leaves the server.
        omit: { password: true },
        include: {
          personProfile: true,
          businessProfile: true,
          sellerPreferences: true,
        },
      }),
    ]);
    const nodes = rows.map(
      ({ personProfile, businessProfile, sellerPreferences, ...seller }) => ({
        ...seller,
        socialMediaLinks: toJsonText(seller.socialMediaLinks),
        personProfile,
        businessProfile: businessProfile && {
          ...businessProfile,
          businessHours: toJsonText(businessProfile.businessHours),
        },
        preferences: sellerPreferences,
      }),
    );
    return createPaginatedResponse(nodes, count, page, size);
  }

  async bulkUpsertSellers({
    adminId,
    rows,
    language,
  }: {
    adminId?: string;
    rows: SellerUpsertRowInput[];
    language: Language;
  }): Promise<BulkResult> {
    const admin = await this.assertCanManage(adminId, language);
    const result = await processBulkRows(this.logger, rows, async (row) => {
      const data = pickDefined({
        email: row.email?.trim().toLowerCase(),
        sellerType: row.sellerType,
        isActive: row.isActive,
        isVerified: row.isVerified,
        points: row.points,
        sellerLevelId: row.sellerLevelId,
        phone: row.phone,
        address: row.address,
        website: row.website,
        preferredContactMethod: row.preferredContactMethod,
        socialMediaLinks: jsonCell(row.socialMediaLinks, 'socialMediaLinks'),
        countryId: row.countryId,
        regionId: row.regionId,
        cityId: row.cityId,
        countyId: row.countyId,
        contentLanguage: row.contentLanguage,
      }) as Prisma.SellerUncheckedUpdateInput;

      const existing = row.id
        ? await this.prisma.seller.findUnique({
            where: { id: row.id },
            select: { id: true },
          })
        : data.email
          ? await this.prisma.seller.findUnique({
              where: { email: data.email as string },
              select: { id: true },
            })
          : null;

      if (existing) {
        await this.prisma.seller.update({ where: { id: existing.id }, data });
        return { outcome: 'updated', id: existing.id };
      }

      requireBulkFields(row, ['email', 'sellerType']);
      const created = await this.prisma.seller.create({
        data: {
          ...(data as Prisma.SellerUncheckedCreateInput),
          ...(row.id && { id: row.id }),
          email: data.email as string,
          sellerType: row.sellerType!,
          // Nobody knows this password: the person uses "forgot password".
          password: await hash(randomUUID(), await genSalt(10)),
        },
        select: { id: true },
      });
      return { outcome: 'created', id: created.id };
    });
    await this.logImport(admin, 'sellers', result);
    return result;
  }

  async bulkUpsertPersonProfiles({
    adminId,
    rows,
    language,
  }: {
    adminId?: string;
    rows: PersonProfileUpsertRowInput[];
    language: Language;
  }): Promise<BulkResult> {
    const admin = await this.assertCanManage(adminId, language);
    const keyed = rows.map((row) => ({ ...row, id: row.sellerId }));
    const result = await processBulkRows(this.logger, keyed, async (row) => {
      const data = pickDefined({
        firstName: row.firstName,
        lastName: row.lastName,
        displayName: row.displayName,
        bio: row.bio,
        birthday: dateCell(row.birthday, 'birthday'),
        profileImage: row.profileImage,
        coverImage: row.coverImage,
        allowExchanges: row.allowExchanges,
      });
      const existing = await this.prisma.personProfile.findUnique({
        where: { sellerId: row.sellerId },
        select: { id: true },
      });
      if (existing) {
        await this.prisma.personProfile.update({
          where: { sellerId: row.sellerId },
          data,
        });
        return { outcome: 'updated', id: row.sellerId };
      }
      requireBulkFields(row, ['firstName']);
      await this.prisma.personProfile.create({
        data: { ...data, sellerId: row.sellerId, firstName: row.firstName! },
      });
      return { outcome: 'created', id: row.sellerId };
    });
    await this.logImport(admin, 'persons', result);
    return result;
  }

  async bulkUpsertBusinessProfiles({
    adminId,
    rows,
    language,
  }: {
    adminId?: string;
    rows: BusinessProfileUpsertRowInput[];
    language: Language;
  }): Promise<BulkResult> {
    const admin = await this.assertCanManage(adminId, language);
    const keyed = rows.map((row) => ({ ...row, id: row.sellerId }));
    const result = await processBulkRows(this.logger, keyed, async (row) => {
      const data = pickDefined({
        businessName: row.businessName,
        description: row.description,
        logo: row.logo,
        coverImage: row.coverImage,
        businessType: row.businessType,
        legalBusinessName: row.legalBusinessName,
        taxId: row.taxId,
        businessStartDate: dateCell(row.businessStartDate, 'businessStartDate'),
        legalRepresentative: row.legalRepresentative,
        legalRepresentativeTaxId: row.legalRepresentativeTaxId,
        shippingPolicy: row.shippingPolicy,
        returnPolicy: row.returnPolicy,
        serviceArea: row.serviceArea,
        yearsOfExperience: row.yearsOfExperience,
        certifications: row.certifications,
        travelRadius: row.travelRadius,
        businessHours: jsonCell(row.businessHours, 'businessHours'),
        approvalStatus: row.approvalStatus,
        applicationMessage: row.applicationMessage,
        reviewedAt: dateCell(row.reviewedAt, 'reviewedAt'),
        reviewedById: row.reviewedById,
        rejectionReason: row.rejectionReason,
      }) as Prisma.BusinessProfileUncheckedUpdateInput;
      const existing = await this.prisma.businessProfile.findUnique({
        where: { sellerId: row.sellerId },
        select: { id: true },
      });
      if (existing) {
        await this.prisma.businessProfile.update({
          where: { sellerId: row.sellerId },
          data,
        });
        return { outcome: 'updated', id: row.sellerId };
      }
      requireBulkFields(row, ['businessName', 'businessType']);
      await this.prisma.businessProfile.create({
        data: {
          ...(data as Prisma.BusinessProfileUncheckedCreateInput),
          sellerId: row.sellerId,
          businessName: row.businessName!,
          businessType: row.businessType!,
        },
      });
      return { outcome: 'created', id: row.sellerId };
    });
    await this.logImport(admin, 'businesses', result);
    return result;
  }

  async bulkUpsertSellerPreferences({
    adminId,
    rows,
    language,
  }: {
    adminId?: string;
    rows: SellerPreferencesUpsertRowInput[];
    language: Language;
  }): Promise<BulkResult> {
    const admin = await this.assertCanManage(adminId, language);
    const keyed = rows.map((row) => ({ ...row, id: row.sellerId }));
    const result = await processBulkRows(this.logger, keyed, async (row) => {
      const data = pickDefined({
        enableEmailNotifications: row.enableEmailNotifications,
        enablePushNotifications: row.enablePushNotifications,
        showMySocials: row.showMySocials,
        showMyAddress: row.showMyAddress,
        enableTwoFactorAuth: row.enableTwoFactorAuth,
        enableLoginAlerts: row.enableLoginAlerts,
      });
      const existing = await this.prisma.sellerPreferences.findUnique({
        where: { sellerId: row.sellerId },
        select: { id: true },
      });
      if (existing) {
        await this.prisma.sellerPreferences.update({
          where: { sellerId: row.sellerId },
          data,
        });
        return { outcome: 'updated', id: row.sellerId };
      }
      await this.prisma.sellerPreferences.create({
        data: { ...data, sellerId: row.sellerId },
      });
      return { outcome: 'created', id: row.sellerId };
    });
    await this.logImport(admin, 'preferences', result);
    return result;
  }

  /** One activity-log row per imported sheet. Best-effort. */
  private async logImport(adminId: string, sheet: string, result: BulkResult) {
    try {
      await this.prisma.adminActivityLog.create({
        data: {
          adminId,
          action: 'BULK_IMPORT_SELLERS',
          entityType: 'Seller',
          entityId: sheet,
          metadata: {
            sheet,
            created: result.created,
            updated: result.updated,
            failed: result.failed,
          },
        },
      });
    } catch (error) {
      this.logger.error('Could not log the seller import', error);
    }
  }
}
