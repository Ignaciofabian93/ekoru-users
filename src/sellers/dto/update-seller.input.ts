import { InputType, Field, Int } from '@nestjs/graphql';
import { IsEmail, IsString, IsOptional, IsEnum, IsInt } from 'class-validator';
import { ContactMethod } from '@prisma/client';
import { JSONScalar } from '../../graphql/scalars';

@InputType()
export class UpdateSellerInput {
  @Field({ nullable: true })
  @IsEmail()
  @IsOptional()
  email?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  address?: string;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @IsOptional()
  cityId?: number;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @IsOptional()
  countyId?: number;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @IsOptional()
  regionId?: number;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @IsOptional()
  countryId?: number;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  phone?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  website?: string;

  @Field(() => String, { nullable: true })
  @IsEnum(ContactMethod)
  @IsOptional()
  preferredContactMethod?: ContactMethod;

  @Field(() => JSONScalar, { nullable: true })
  @IsOptional()
  socialMediaLinks?: any;
}
