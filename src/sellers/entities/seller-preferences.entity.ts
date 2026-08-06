import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class SellerPreferences {
  @Field(() => Int)
  id: number;

  @Field(() => ID)
  sellerId: string;

  @Field()
  enableEmailNotifications: boolean;

  @Field()
  enablePushNotifications: boolean;

  @Field()
  showMySocials: boolean;

  @Field()
  showMyAddress: boolean;

  @Field()
  enableTwoFactorAuth: boolean;

  @Field()
  enableLoginAlerts: boolean;
}
