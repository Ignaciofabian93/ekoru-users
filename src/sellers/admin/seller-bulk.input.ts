import { Field, ID, InputType, Int } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  BusinessApprovalStatus,
  BusinessType,
  ContactMethod,
  Language,
  SellerType,
} from '../../graphql/enums';

/**
 * Spreadsheet rows for the sellers workbook (sheets `sellers`, `persons`,
 * `businesses`, `preferences`). Values are taken as they are in the file:
 * a field left out keeps its current value. Dates are ISO strings and JSON
 * columns JSON text, as the export writes them.
 */
@InputType()
export class SellerUpsertRowInput {
  @Field(() => ID, {
    nullable: true,
    description:
      'Update this seller; when no seller has this id it is created with it (restore). Without an id the row matches by email, else creates.',
  })
  @IsOptional()
  @IsString()
  id?: string;

  @Field({ nullable: true, description: 'Required when creating.' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field(() => SellerType, {
    nullable: true,
    description: 'Required when creating.',
  })
  @IsOptional()
  @IsEnum(SellerType)
  sellerType?: SellerType;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @Field(() => Int, {
    nullable: true,
    description: 'Set directly (restore or correction); not a points award.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  points?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  sellerLevelId?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  address?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  website?: string;

  @Field(() => ContactMethod, { nullable: true })
  @IsOptional()
  @IsEnum(ContactMethod)
  preferredContactMethod?: ContactMethod;

  @Field({ nullable: true, description: 'JSON text; empty clears it.' })
  @IsOptional()
  @IsString()
  socialMediaLinks?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  countryId?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  regionId?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  cityId?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  countyId?: number;

  @Field(() => Language, { nullable: true })
  @IsOptional()
  @IsEnum(Language)
  contentLanguage?: Language;
}

@InputType()
export class PersonProfileUpsertRowInput {
  @Field(() => ID, { description: 'The seller this profile belongs to.' })
  @IsString()
  sellerId: string;

  @Field({ nullable: true, description: 'Required when creating.' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  lastName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  displayName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  bio?: string;

  @Field({ nullable: true, description: 'ISO date.' })
  @IsOptional()
  @IsString()
  birthday?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  profileImage?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  allowExchanges?: boolean;
}

@InputType()
export class BusinessProfileUpsertRowInput {
  @Field(() => ID, { description: 'The seller this profile belongs to.' })
  @IsString()
  sellerId: string;

  @Field({ nullable: true, description: 'Required when creating.' })
  @IsOptional()
  @IsString()
  businessName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  logo?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @Field(() => BusinessType, {
    nullable: true,
    description: 'Required when creating.',
  })
  @IsOptional()
  @IsEnum(BusinessType)
  businessType?: BusinessType;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  legalBusinessName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  taxId?: string;

  @Field({ nullable: true, description: 'ISO date.' })
  @IsOptional()
  @IsString()
  businessStartDate?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  legalRepresentative?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  legalRepresentativeTaxId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  shippingPolicy?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  returnPolicy?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  serviceArea?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  yearsOfExperience?: number;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsString({ each: true })
  certifications?: string[];

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  travelRadius?: number;

  @Field({ nullable: true, description: 'JSON text; empty clears it.' })
  @IsOptional()
  @IsString()
  businessHours?: string;

  @Field(() => BusinessApprovalStatus, {
    nullable: true,
    description:
      'Set as in the file; sends no email (use approve/reject for that).',
  })
  @IsOptional()
  @IsEnum(BusinessApprovalStatus)
  approvalStatus?: BusinessApprovalStatus;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  applicationMessage?: string;

  @Field({ nullable: true, description: 'ISO date.' })
  @IsOptional()
  @IsString()
  reviewedAt?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  reviewedById?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

@InputType()
export class SellerPreferencesUpsertRowInput {
  @Field(() => ID, { description: 'The seller these preferences belong to.' })
  @IsString()
  sellerId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  enableEmailNotifications?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  enablePushNotifications?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  showMySocials?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  showMyAddress?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  enableTwoFactorAuth?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  enableLoginAlerts?: boolean;
}
