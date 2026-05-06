import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable({ scope: Scope.REQUEST })
export class PersonMembershipLoader {
  readonly byId: DataLoader<number, any>;
  readonly bySubscriptionId: DataLoader<number, any>;

  constructor(private readonly prisma: PrismaService) {
    this.byId = new DataLoader<number, any>(async (ids) => {
      const memberships = await this.prisma.personMembership.findMany({
        where: { id: { in: [...ids] } },
        include: { translations: true, pricing: true },
      });
      const map = new Map(memberships.map((m) => [m.id, m]));
      return ids.map((id) => map.get(id) ?? null);
    });

    this.bySubscriptionId = new DataLoader<number, any>(async (ids) => {
      const subscriptions =
        await this.prisma.personMembershipSubscription.findMany({
          where: { id: { in: [...ids] } },
          include: {
            personMembership: {
              include: { translations: true, pricing: true },
            },
          },
        });
      const map = new Map(subscriptions.map((s) => [s.id, s.personMembership]));
      return ids.map((id) => map.get(id) ?? null);
    });
  }
}
