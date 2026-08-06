import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, IsBoolean } from 'class-validator';

@InputType()
export class UpdateSellerPreferencesInput {
  @Field({ nullable: true })
  @IsBoolean()
  @IsOptional()
  enableEmailNotifications?: boolean;

  @Field({ nullable: true })
  @IsBoolean()
  @IsOptional()
  enablePushNotifications?: boolean;

  @Field({ nullable: true })
  @IsBoolean()
  @IsOptional()
  showMySocials?: boolean;

  @Field({ nullable: true })
  @IsBoolean()
  @IsOptional()
  showMyAddress?: boolean;

  @Field({ nullable: true })
  @IsBoolean()
  @IsOptional()
  enableTwoFactorAuth?: boolean;

  @Field({ nullable: true })
  @IsBoolean()
  @IsOptional()
  enableLoginAlerts?: boolean;
}
