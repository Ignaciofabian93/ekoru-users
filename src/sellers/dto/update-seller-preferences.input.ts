import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

@InputType()
export class UpdateSellerPreferencesInput {
  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  preferredLanguage?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  currency?: string;

  @Field({ nullable: true })
  @IsBoolean()
  @IsOptional()
  emailNotifications?: boolean;

  @Field({ nullable: true })
  @IsBoolean()
  @IsOptional()
  pushNotifications?: boolean;

  @Field({ nullable: true })
  @IsBoolean()
  @IsOptional()
  orderUpdates?: boolean;

  @Field({ nullable: true })
  @IsBoolean()
  @IsOptional()
  communityUpdates?: boolean;

  @Field({ nullable: true })
  @IsBoolean()
  @IsOptional()
  securityAlerts?: boolean;

  @Field({ nullable: true })
  @IsBoolean()
  @IsOptional()
  weeklySummary?: boolean;

  @Field({ nullable: true })
  @IsBoolean()
  @IsOptional()
  twoFactorAuth?: boolean;
}
