import { InputType, Field } from '@nestjs/graphql';
import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { SellerType, BusinessType } from '../../graphql/enums';

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

  @Field(() => SellerType)
  @IsEnum(SellerType)
  sellerType: SellerType;

  @Field(() => BusinessType)
  @IsEnum(BusinessType)
  businessType: BusinessType;
}
