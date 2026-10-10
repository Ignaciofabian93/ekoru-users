import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  ID,
  Float,
  Context,
} from '@nestjs/graphql';
import { TransactionKind as PrismaTransactionKind } from '@prisma/client';
import { PointsService } from './points.service';
import { PointsAwardConnection } from './entities/points-award.entity';
import { CurrentSeller } from '../common/decorators';
import { UnAuthorizedError } from '../common/exceptions';
import { TransactionKind } from '../graphql/enums';

@Resolver()
export class PointsResolver {
  constructor(private readonly points: PointsService) {}

  @Query(() => PointsAwardConnection, {
    name: 'myPointsHistory',
    description: "The signed-in seller's points history, newest first.",
  })
  async myPointsHistory(
    @CurrentSeller() sellerId: string | undefined,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 20 }) pageSize: number,
  ) {
    if (!sellerId) throw new UnAuthorizedError('Unauthorized');
    return this.points.history({
      sellerId,
      page,
      pageSize: Math.min(Math.max(pageSize, 1), 100),
    });
  }

  /**
   * Internal: a completed activity earns points (docs/POINTS.md). Called by
   * ekoru-transactions (orders, deals), ekoru-services (bookings, quotations)
   * and ekoru-blog-community (event attendance). Guarded by
   * INTERNAL_SERVICE_SECRET. Idempotent per seller + reference. Returns the
   * points credited, 0 when the reference was already paid.
   */
  @Mutation(() => Int, { name: 'awardActivityPoints' })
  async awardActivityPoints(
    @Args('sellerId', { type: () => ID }) sellerId: string,
    @Args('kind', { type: () => TransactionKind }) kind: TransactionKind,
    @Args('reference') reference: string,
    @Context() ctx: { internalSecret?: string },
    @Args('co2SavingsKG', { type: () => Float, nullable: true })
    co2SavingsKG?: number,
    @Args('waterSavingsLT', { type: () => Float, nullable: true })
    waterSavingsLT?: number,
  ): Promise<number> {
    const expected = process.env.INTERNAL_SERVICE_SECRET;
    if (!expected) throw new Error('INTERNAL_SERVICE_SECRET no configurado');
    if (!ctx.internalSecret || ctx.internalSecret !== expected) {
      throw new Error('Unauthorized');
    }
    return this.points.award({
      sellerId,
      kind: kind as unknown as PrismaTransactionKind,
      reference: reference.slice(0, 200),
      co2SavingsKG,
      waterSavingsLT,
    });
  }
}
