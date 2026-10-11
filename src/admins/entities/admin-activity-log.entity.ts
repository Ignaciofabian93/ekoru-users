import { ObjectType, Field, Int, ID } from '@nestjs/graphql';
import { DateTimeScalar, JSONScalar } from '../../graphql/scalars';
import { PageInfo } from './page-info.entity';

/** One recorded admin action (AdminActivityLog), for the panel's audit view (ADM-7). */
@ObjectType()
export class AdminActivityLogEntry {
  @Field(() => Int)
  id: number;

  @Field(() => ID)
  adminId: string;

  /** The acting admin's email, so the list reads without a lookup. */
  @Field(() => String, { nullable: true })
  adminEmail?: string | null;

  @Field(() => String)
  action: string;

  @Field(() => String, { nullable: true })
  entityType?: string | null;

  @Field(() => String, { nullable: true })
  entityId?: string | null;

  @Field(() => JSONScalar, { nullable: true })
  changes?: unknown;

  @Field(() => JSONScalar, { nullable: true })
  metadata?: unknown;

  @Field(() => String, { nullable: true })
  ipAddress?: string | null;

  @Field(() => DateTimeScalar)
  createdAt: Date;
}

@ObjectType()
export class AdminActivityLogConnection {
  @Field(() => [AdminActivityLogEntry])
  nodes: AdminActivityLogEntry[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;
}
