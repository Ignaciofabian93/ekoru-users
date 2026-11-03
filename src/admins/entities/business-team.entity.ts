import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { DateTimeScalar } from '../../graphql/scalars';
import {
  AdminRole,
  AdminPermission,
  BusinessSubscriptionPlan,
} from '../../graphql/enums';

/** One of a business's panel accounts, as its own Team screen shows it (USR-15). */
@ObjectType()
export class BusinessTeamMember {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field()
  name: string;

  @Field(() => String, { nullable: true })
  lastName?: string | null;

  @Field(() => AdminRole)
  role: AdminRole;

  @Field(() => [AdminPermission])
  permissions: AdminPermission[];

  @Field()
  isActive: boolean;

  @Field({
    description:
      'Whether the account can sign in now: active, and within the plan’s accounts (the owner first, then the oldest).',
  })
  hasSeat: boolean;

  @Field(() => DateTimeScalar, {
    nullable: true,
    description: 'Null until the member first signs in.',
  })
  lastLoginAt?: Date | null;

  @Field(() => DateTimeScalar)
  createdAt: Date;
}

/** A business's panel accounts and what its plan allows (USR-15). */
@ObjectType()
export class BusinessTeam {
  @Field(() => BusinessSubscriptionPlan, { description: 'The plan in force.' })
  plan: BusinessSubscriptionPlan;

  @Field(() => Int, { description: 'Panel accounts the plan includes.' })
  seats: number;

  @Field(() => Int, { description: 'Active accounts, seated or not.' })
  used: number;

  @Field(() => [BusinessTeamMember])
  members: BusinessTeamMember[];
}
