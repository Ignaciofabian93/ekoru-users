import { InputType, Field, Int } from '@nestjs/graphql';
import { IsString, IsOptional, IsEnum, IsInt } from 'class-validator';
import { BusinessType } from '../../graphql/enums';
import { DateTimeScalar, JSONScalar } from '../../graphql/scalars';

@InputType()
export class UpdateBusinessProfileInput {
  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  businessName?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  description?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  logo?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  coverImage?: string;

  @Field(() => String, { nullable: true })
  @IsEnum(BusinessType)
  @IsOptional()
  businessType?: BusinessType;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  legalBusinessName?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  taxId?: string;

  @Field(() => DateTimeScalar, { nullable: true })
  @IsOptional()
  businessStartDate?: Date;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  legalRepresentative?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  legalRepresentativeTaxId?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  shippingPolicy?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  returnPolicy?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  serviceArea?: string;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @IsOptional()
  yearsOfExperience?: number;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  certifications?: string[];

  @Field(() => Int, { nullable: true })
  @IsInt()
  @IsOptional()
  travelRadius?: number;

  @Field(() => JSONScalar, { nullable: true })
  @IsOptional()
  businessHours?: any;
}
