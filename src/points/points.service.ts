import { Injectable, Logger } from '@nestjs/common';
import { NotificationType, Prisma, TransactionKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { APP_BASE_URL } from '../mail/templates';
import { toLocale } from '../notifications/notifications.service';
import {
  calculatePrismaParams,
  createPaginatedResponse,
} from '../utils/pagination';
import {
  ActivityImpact,
  computePoints,
  EMPTY_RULE,
  PointsRule,
} from './points-rules';

export interface AwardInput extends ActivityImpact {
  sellerId: string;
  kind: TransactionKind;
  /**
   * What earned it, unique per seller: `order:12`, `deal:4`, `booking:9`,
   * `event-registration:3`, `registration`, `admin-grant:<uuid>`. The same
   * reference never pays twice.
   */
  reference: string;
  /** Fixed amount instead of the rule (admin grants and deductions). */
  points?: number;
}

/**
 * The single place points are earned (docs/POINTS.md).
 *
 * An award is recorded in `PointsAward` (unique per seller + reference, so a
 * retried or repeated event pays once), added to `Seller.points`, then moves
 * the seller to the level their total reaches and grants any label whose
 * activity count they now meet. Level-ups and new labels notify the seller.
 *
 * Callers in other services go through the internal `awardActivityPoints`
 * mutation; nothing else should write `Seller.points`.
 */
@Injectable()
export class PointsService {
  private readonly logger = new Logger(PointsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Points credited by this call: 0 when the reference was already paid. */
  async award(input: AwardInput): Promise<number> {
    const rule = await this.ruleFor(input.kind);
    const computed =
      input.points !== undefined
        ? {
            basePoints: Math.round(input.points),
            impactPoints: 0,
            points: Math.round(input.points),
          }
        : computePoints(rule, input);

    let total: number;
    try {
      total = await this.prisma.$transaction(async (tx) => {
        await tx.pointsAward.create({
          data: {
            sellerId: input.sellerId,
            kind: input.kind,
            reference: input.reference,
            points: computed.points,
            basePoints: computed.basePoints,
            impactPoints: computed.impactPoints,
            co2SavingsKG: input.co2SavingsKG ?? null,
            waterSavingsLT: input.waterSavingsLT ?? null,
          },
        });
        const seller = await tx.seller.update({
          where: { id: input.sellerId },
          data: { points: { increment: computed.points } },
          select: { points: true },
        });
        return seller.points;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return 0; // already awarded for this reference
      }
      throw error;
    }

    // Progress is best-effort: the points are in; a failed level or label
    // update is fixed by the next award.
    try {
      await this.updateLevel(input.sellerId, total);
      await this.updateLabels(input.sellerId, input.kind);
    } catch (error) {
      this.logger.error(
        `Level/label update failed for ${input.sellerId}`,
        error,
      );
    }
    return computed.points;
  }

  /**
   * Moves the seller to the highest level whose `minPoints` their total
   * reaches. Going up notifies them; going down (an admin deduction) does not.
   */
  async updateLevel(sellerId: string, total?: number): Promise<void> {
    const seller = await this.prisma.seller.findUnique({
      where: { id: sellerId },
      select: {
        points: true,
        sellerLevelId: true,
        contentLanguage: true,
        sellerLevel: { select: { minPoints: true } },
      },
    });
    if (!seller) return;
    const points = total ?? seller.points;

    const level = await this.prisma.sellerLevel.findFirst({
      where: { minPoints: { lte: points } },
      orderBy: { minPoints: 'desc' },
      select: {
        id: true,
        levelName: true,
        minPoints: true,
        translations: { select: { language: true, levelName: true } },
      },
    });
    const levelId = level?.id ?? null;
    if (levelId === seller.sellerLevelId) return;

    await this.prisma.seller.update({
      where: { id: sellerId },
      data: { sellerLevelId: levelId },
    });

    const wentUp =
      !!level && level.minPoints > (seller.sellerLevel?.minPoints ?? -1);
    if (wentUp) {
      const name =
        level.translations.find((t) => t.language === seller.contentLanguage)
          ?.levelName ?? level.levelName;
      await this.notifications.emit({
        sellerId,
        type: NotificationType.LEVEL_REACHED,
        relatedId: `level:${level.id}`,
        actionUrl: this.profileUrl(seller.contentLanguage),
        data: { levelName: name, points },
      });
    }
  }

  /**
   * Grants every label for this activity whose required count the seller now
   * meets, and keeps `currentCount` on the ones already earned up to date.
   */
  async updateLabels(sellerId: string, kind: TransactionKind): Promise<void> {
    const labels = await this.prisma.sellerLabel.findMany({
      where: { transactionKind: kind },
      select: {
        id: true,
        labelName: true,
        transactionsRequired: true,
        translations: { select: { language: true, labelName: true } },
      },
    });
    if (!labels.length) return;

    const [count, seller, achieved] = await Promise.all([
      this.prisma.pointsAward.count({ where: { sellerId, kind } }),
      this.prisma.seller.findUnique({
        where: { id: sellerId },
        select: { contentLanguage: true },
      }),
      this.prisma.sellerAchievedLabel.findMany({
        where: { sellerId, labelId: { in: labels.map((l) => l.id) } },
        select: { labelId: true },
      }),
    ]);
    const have = new Set(achieved.map((a) => a.labelId));

    if (have.size) {
      await this.prisma.sellerAchievedLabel.updateMany({
        where: { sellerId, labelId: { in: [...have] } },
        data: { currentCount: count },
      });
    }

    for (const label of labels) {
      if (have.has(label.id) || count < label.transactionsRequired) continue;
      try {
        await this.prisma.sellerAchievedLabel.create({
          data: { sellerId, labelId: label.id, currentCount: count },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          continue; // granted by a concurrent award
        }
        throw error;
      }
      const name =
        label.translations.find((t) => t.language === seller?.contentLanguage)
          ?.labelName ?? label.labelName;
      await this.notifications.emit({
        sellerId,
        type: NotificationType.LABEL_ACHIEVED,
        relatedId: `label:${label.id}`,
        actionUrl: this.profileUrl(seller?.contentLanguage ?? null),
        data: { labelName: name },
      });
    }
  }

  /** The seller's own points history, newest first. */
  async history({
    sellerId,
    page = 1,
    pageSize = 20,
  }: {
    sellerId: string;
    page?: number;
    pageSize?: number;
  }) {
    const { skip, take } = calculatePrismaParams(page, pageSize);
    const where = { sellerId };
    const [count, rows] = await Promise.all([
      this.prisma.pointsAward.count({ where }),
      this.prisma.pointsAward.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);
    return createPaginatedResponse(rows, count, page, pageSize);
  }

  private async ruleFor(kind: TransactionKind): Promise<PointsRule> {
    const rule = await this.prisma.pointsByTransactionKind.findUnique({
      where: { transactionKind: kind },
      select: {
        pointsAwarded: true,
        pointsPerKgCo2: true,
        pointsPerCubicMeterWater: true,
        maxImpactPoints: true,
      },
    });
    if (!rule) {
      this.logger.warn(`No points rule for ${kind}; awarding 0`);
      return EMPTY_RULE;
    }
    return rule;
  }

  private profileUrl(language: string | null): string {
    return `${APP_BASE_URL}/${toLocale(language)}/profile`;
  }
}
