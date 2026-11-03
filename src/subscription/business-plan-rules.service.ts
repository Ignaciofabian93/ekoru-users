import { Injectable } from '@nestjs/common';
import { BusinessSubscriptionPlan as PrismaBusinessPlan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestError } from '../common/exceptions';
import {
  AdminPermission,
  BusinessSubscriptionPlan,
  Language,
} from '../graphql/enums';
import { assertAdminCan } from '../common/admin-access';
import { subscriptionMessages } from './subscription.i18n';
import { BusinessPlanRule } from './entities/business-plan-rule.entity';

/** Far above any plan EKORU sells; it only catches typos. */
export const MAX_PANEL_SEATS = 50;

/**
 * The rules of each business plan (USR-15), set in the panel's Membresías
 * screen. Today one rule: how many admin accounts the plan gives in the panel,
 * where the free plan's 0 means no panel. Enforced when an admin is created or
 * reactivated (AdminsService) and at login (gateway).
 */
@Injectable()
export class BusinessPlanRulesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Every business plan in plan order; a plan without a row has no panel. */
  async list(): Promise<BusinessPlanRule[]> {
    const rows = await this.prisma.businessPlanRule.findMany({
      select: { plan: true, panelSeats: true },
    });
    const seats = new Map<string, number>(
      rows.map((r) => [r.plan, r.panelSeats]),
    );
    return Object.values(BusinessSubscriptionPlan).map((plan) => ({
      plan,
      panelSeats: seats.get(plan) ?? 0,
    }));
  }

  async update({
    adminId,
    language,
    plan,
    panelSeats,
  }: {
    adminId?: string;
    language: Language;
    plan: BusinessSubscriptionPlan;
    panelSeats: number;
  }): Promise<BusinessPlanRule> {
    const t = subscriptionMessages[language];
    await assertAdminCan(this.prisma, {
      adminId,
      permission: AdminPermission.MANAGE_SETTINGS,
      messages: { unauthorized: t.unauthorized, forbidden: t.forbidden },
    });
    if (
      !Number.isInteger(panelSeats) ||
      panelSeats < 0 ||
      panelSeats > MAX_PANEL_SEATS
    ) {
      throw new BadRequestError(t.invalidPanelSeats);
    }
    const row = await this.prisma.businessPlanRule.upsert({
      where: { plan: plan as PrismaBusinessPlan },
      create: { plan: plan as PrismaBusinessPlan, panelSeats },
      update: { panelSeats },
      select: { panelSeats: true },
    });
    return { plan, panelSeats: row.panelSeats };
  }
}
