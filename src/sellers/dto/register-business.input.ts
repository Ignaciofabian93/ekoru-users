import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { SellerType, BusinessType } from '@prisma/client';

@InputType()
export class RegisterBusinessInput {
  @Field()
  @IsEmail()
  email: string;

  @Field()
  @IsString()
  @MinLength(6)
  password: string;

  @Field()
  @IsString()
  businessName: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  displayName?: string;

  @Field(() => String)
  @IsEnum(SellerType)
  sellerType: SellerType;

  @Field(() => String)
  @IsEnum(BusinessType)
  businessType: BusinessType;
}
