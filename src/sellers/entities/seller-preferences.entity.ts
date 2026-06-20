import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class SellerPreferences {
  @Field(() => Int)
  id: number;

  @Field(() => ID)
  sellerId: string;

  @Field({ nullable: true })
  preferredLanguage?: string;

  @Field({ nullable: true })
  currency?: string;

  @Field()
  emailNotifications: boolean;

  @Field()
  pushNotifications: boolean;

  @Field()
  orderUpdates: boolean;

  @Field()
  communityUpdates: boolean;

  @Field()
  securityAlerts: boolean;

  @Field()
  weeklySummary: boolean;

  @Field()
  twoFactorAuth: boolean;
}
